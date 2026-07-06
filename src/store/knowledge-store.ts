import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { makeId } from "@/lib/id";
import { getNode } from "@/lib/syllabus";
import { isDifficulty, type Confidence, type Difficulty } from "@/lib/stages";
import { KNOWLEDGE_CONFIG } from "@/lib/knowledge/config";
import {
  EMPTY_NOTE_AI,
  KEYWORD_KINDS,
  QUICK_NOTE_KINDS,
  RESOURCE_KINDS,
  type Bookmark,
  type BookmarkCollection,
  type BookmarkTargetType,
  type BookReference,
  type CurrentAffair,
  type CurrentAffairImportance,
  type Flashcard,
  type Keyword,
  type KeywordKind,
  type Pyq,
  type QuickNote,
  type QuickNoteKind,
  type Resource,
  type RichNote,
  type TimelineEvent,
  type TimelineEventType,
} from "@/lib/knowledge/types";

export const KNOWLEDGE_STORE_VERSION = 1;

/** The persisted knowledge data — also the backup-file section shape. */
export type KnowledgeExport = {
  richNotes: Record<string, RichNote>;
  quickNotes: Record<string, QuickNote>;
  flashcards: Record<string, Flashcard>;
  keywords: Record<string, Keyword>;
  bookRefs: Record<string, BookReference>;
  resources: Record<string, Resource>;
  pyqs: Record<string, Pyq>;
  currentAffairs: Record<string, CurrentAffair>;
  bookmarks: Record<string, Bookmark>;
  collections: Record<string, BookmarkCollection>;
  events: TimelineEvent[];
};

type KnowledgeState = KnowledgeExport & {
  saveRichNote: (topicId: string, markdown: string) => void;
  /** Persist AI output into a note's `ai` placeholders (Phase C). Creates
   * an empty note if none exists so cached AI artefacts survive reloads.
   * Additive and user-clearable; never touches the note's own markdown. */
  setNoteAi: (
    topicId: string,
    patch: Partial<import("@/lib/knowledge/types").NoteAiPlaceholder>,
  ) => void;
  addQuickNote: (topicId: string, text: string, kind: QuickNoteKind) => void;
  removeQuickNote: (id: string) => void;
  addFlashcard: (
    topicId: string,
    card: Pick<Flashcard, "front" | "back"> &
      Partial<Pick<Flashcard, "tags" | "difficulty" | "confidence">>,
  ) => void;
  updateFlashcard: (
    id: string,
    patch: Partial<
      Pick<Flashcard, "front" | "back" | "tags" | "difficulty" | "confidence">
    >,
  ) => void;
  removeFlashcard: (id: string) => void;
  reviewFlashcard: (id: string, correct: boolean) => void;
  addKeyword: (
    topicId: string,
    term: string,
    kind: KeywordKind,
    note?: string,
  ) => void;
  removeKeyword: (id: string) => void;
  addBookRef: (
    topicId: string,
    ref: Pick<BookReference, "book"> &
      Partial<Pick<BookReference, "chapter" | "pages" | "note">>,
  ) => void;
  updateBookRef: (
    id: string,
    patch: Partial<
      Pick<BookReference, "book" | "chapter" | "pages" | "note" | "completed">
    >,
  ) => void;
  removeBookRef: (id: string) => void;
  addResource: (
    topicId: string,
    resource: Pick<Resource, "title" | "url" | "kind"> &
      Partial<Pick<Resource, "note">>,
  ) => void;
  removeResource: (id: string) => void;
  addPyq: (
    topicId: string,
    pyq: Pick<Pyq, "year" | "paper" | "question"> &
      Partial<
        Pick<
          Pyq,
          | "linkedTopicIds"
          | "marks"
          | "difficulty"
          | "note"
          | "expectedAnswer"
        >
      >,
  ) => void;
  updatePyq: (
    id: string,
    patch: Partial<
      Pick<
        Pyq,
        | "year"
        | "paper"
        | "question"
        | "marks"
        | "difficulty"
        | "attempted"
        | "solved"
        | "note"
        | "expectedAnswer"
        | "linkedTopicIds"
      >
    >,
  ) => void;
  removePyq: (id: string) => void;
  addCurrentAffair: (
    affair: Pick<CurrentAffair, "title" | "topicIds"> &
      Partial<
        Pick<CurrentAffair, "date" | "source" | "summary" | "importance" | "note">
      >,
  ) => void;
  updateCurrentAffair: (
    id: string,
    patch: Partial<
      Pick<
        CurrentAffair,
        "title" | "date" | "source" | "summary" | "importance" | "note" | "topicIds"
      >
    >,
  ) => void;
  removeCurrentAffair: (id: string) => void;
  addBookmark: (
    targetType: BookmarkTargetType,
    targetId: string,
    topicId: string,
    collectionId: string,
  ) => void;
  removeBookmark: (id: string) => void;
  addCollection: (name: string) => void;
  renameCollection: (id: string, name: string) => void;
  removeCollection: (id: string) => void;
  importKnowledge: (data: KnowledgeExport) => void;
  resetKnowledge: () => void;
};

const nowIso = () => new Date().toISOString();

/** Fixed ids so built-in collections survive export/import stably. */
export const BUILTIN_COLLECTIONS: BookmarkCollection[] = [
  { id: "col-must-revise", name: "Must Revise", builtin: true, createdAt: "" },
  { id: "col-weak-areas", name: "Weak Areas", builtin: true, createdAt: "" },
  { id: "col-essay-material", name: "Essay Material", builtin: true, createdAt: "" },
  { id: "col-interview-notes", name: "Interview Notes", builtin: true, createdAt: "" },
];

function initialKnowledge(): KnowledgeExport {
  return {
    richNotes: {},
    quickNotes: {},
    flashcards: {},
    keywords: {},
    bookRefs: {},
    resources: {},
    pyqs: {},
    currentAffairs: {},
    bookmarks: {},
    collections: Object.fromEntries(
      BUILTIN_COLLECTIONS.map((collection) => [collection.id, collection]),
    ),
    events: [],
  };
}

/** Append a timeline event, pruning the oldest past the cap. */
function withEvent(
  events: TimelineEvent[],
  topicId: string,
  type: TimelineEventType,
  label: string,
): TimelineEvent[] {
  const next = [
    ...events,
    { id: makeId("ev"), topicId, at: nowIso(), type, label },
  ];
  return next.length > KNOWLEDGE_CONFIG.timelineEventCap
    ? next.slice(next.length - KNOWLEDGE_CONFIG.timelineEventCap)
    : next;
}

const truncate = (text: string, max = 60) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export const useKnowledgeStore = create<KnowledgeState>()(
  persist(
    (set) => ({
      ...initialKnowledge(),

      saveRichNote: (topicId, markdown) =>
        set((state) => {
          const now = nowIso();
          const existing = state.richNotes[topicId];
          if (!existing) {
            return {
              richNotes: {
                ...state.richNotes,
                [topicId]: {
                  topicId,
                  markdown,
                  createdAt: now,
                  updatedAt: now,
                  versionTimestamps: [now],
                  ai: EMPTY_NOTE_AI,
                },
              },
              events: withEvent(state.events, topicId, "note-updated", "Started notes"),
            };
          }
          const lastVersion =
            existing.versionTimestamps[existing.versionTimestamps.length - 1];
          const newVersion =
            Date.now() - new Date(lastVersion).getTime() >=
            KNOWLEDGE_CONFIG.noteVersionGapMinutes * 60_000;
          return {
            richNotes: {
              ...state.richNotes,
              [topicId]: {
                ...existing,
                markdown,
                updatedAt: now,
                versionTimestamps: newVersion
                  ? [...existing.versionTimestamps, now].slice(
                      -KNOWLEDGE_CONFIG.noteVersionCap,
                    )
                  : existing.versionTimestamps,
              },
            },
            events: newVersion
              ? withEvent(state.events, topicId, "note-updated", "Updated notes")
              : state.events,
          };
        }),

      setNoteAi: (topicId, patch) =>
        set((state) => {
          const now = nowIso();
          const existing = state.richNotes[topicId];
          const base: RichNote = existing ?? {
            topicId,
            markdown: "",
            createdAt: now,
            updatedAt: now,
            versionTimestamps: [],
            ai: EMPTY_NOTE_AI,
          };
          return {
            richNotes: {
              ...state.richNotes,
              [topicId]: { ...base, ai: { ...base.ai, ...patch } },
            },
          };
        }),

      addQuickNote: (topicId, text, kind) =>
        set((state) => {
          const note: QuickNote = {
            id: makeId("qn"),
            topicId,
            text,
            kind,
            createdAt: nowIso(),
          };
          return {
            quickNotes: { ...state.quickNotes, [note.id]: note },
            events: withEvent(
              state.events,
              topicId,
              "quick-note-added",
              truncate(text),
            ),
          };
        }),

      removeQuickNote: (id) =>
        set((state) => {
          const quickNotes = { ...state.quickNotes };
          delete quickNotes[id];
          return { quickNotes };
        }),

      addFlashcard: (topicId, card) =>
        set((state) => {
          const now = nowIso();
          const flashcard: Flashcard = {
            id: makeId("fc"),
            topicId,
            front: card.front,
            back: card.back,
            tags: card.tags ?? [],
            difficulty: card.difficulty ?? "medium",
            confidence: card.confidence ?? 3,
            lastReviewedAt: null,
            reviewCount: 0,
            correctStreak: 0,
            incorrectStreak: 0,
            createdAt: now,
            updatedAt: now,
            ai: null,
          };
          return {
            flashcards: { ...state.flashcards, [flashcard.id]: flashcard },
            events: withEvent(
              state.events,
              topicId,
              "flashcard-added",
              truncate(card.front),
            ),
          };
        }),

      updateFlashcard: (id, patch) =>
        set((state) => {
          const card = state.flashcards[id];
          if (!card) return state;
          return {
            flashcards: {
              ...state.flashcards,
              [id]: { ...card, ...patch, updatedAt: nowIso() },
            },
          };
        }),

      removeFlashcard: (id) =>
        set((state) => {
          const flashcards = { ...state.flashcards };
          delete flashcards[id];
          return { flashcards };
        }),

      reviewFlashcard: (id, correct) =>
        set((state) => {
          const card = state.flashcards[id];
          if (!card) return state;
          return {
            flashcards: {
              ...state.flashcards,
              [id]: {
                ...card,
                reviewCount: card.reviewCount + 1,
                correctStreak: correct ? card.correctStreak + 1 : 0,
                incorrectStreak: correct ? 0 : card.incorrectStreak + 1,
                lastReviewedAt: nowIso(),
              },
            },
            events: withEvent(
              state.events,
              card.topicId,
              "flashcard-reviewed",
              `${correct ? "✓" : "✗"} ${truncate(card.front, 50)}`,
            ),
          };
        }),

      addKeyword: (topicId, term, kind, note = "") =>
        set((state) => {
          const keyword: Keyword = {
            id: makeId("kw"),
            topicId,
            term,
            kind,
            note,
            createdAt: nowIso(),
          };
          return {
            keywords: { ...state.keywords, [keyword.id]: keyword },
            events: withEvent(state.events, topicId, "keyword-added", term),
          };
        }),

      removeKeyword: (id) =>
        set((state) => {
          const keywords = { ...state.keywords };
          delete keywords[id];
          return { keywords };
        }),

      addBookRef: (topicId, ref) =>
        set((state) => {
          const now = nowIso();
          const bookRef: BookReference = {
            id: makeId("bk"),
            topicId,
            book: ref.book,
            chapter: ref.chapter ?? "",
            pages: ref.pages ?? "",
            note: ref.note ?? "",
            completed: false,
            createdAt: now,
            updatedAt: now,
          };
          return {
            bookRefs: { ...state.bookRefs, [bookRef.id]: bookRef },
            events: withEvent(state.events, topicId, "book-added", ref.book),
          };
        }),

      updateBookRef: (id, patch) =>
        set((state) => {
          const ref = state.bookRefs[id];
          if (!ref) return state;
          return {
            bookRefs: {
              ...state.bookRefs,
              [id]: { ...ref, ...patch, updatedAt: nowIso() },
            },
          };
        }),

      removeBookRef: (id) =>
        set((state) => {
          const bookRefs = { ...state.bookRefs };
          delete bookRefs[id];
          return { bookRefs };
        }),

      addResource: (topicId, resource) =>
        set((state) => {
          const entry: Resource = {
            id: makeId("rs"),
            topicId,
            title: resource.title,
            url: resource.url,
            kind: resource.kind,
            note: resource.note ?? "",
            createdAt: nowIso(),
          };
          return {
            resources: { ...state.resources, [entry.id]: entry },
            events: withEvent(
              state.events,
              topicId,
              "resource-added",
              resource.title,
            ),
          };
        }),

      removeResource: (id) =>
        set((state) => {
          const resources = { ...state.resources };
          delete resources[id];
          return { resources };
        }),

      addPyq: (topicId, pyq) =>
        set((state) => {
          const now = nowIso();
          const entry: Pyq = {
            id: makeId("pq"),
            topicId,
            linkedTopicIds: pyq.linkedTopicIds ?? [],
            year: pyq.year,
            paper: pyq.paper,
            question: pyq.question,
            marks: pyq.marks ?? null,
            difficulty: pyq.difficulty ?? "medium",
            attempted: false,
            solved: false,
            note: pyq.note ?? "",
            expectedAnswer: pyq.expectedAnswer ?? "",
            aiExplanation: null,
            createdAt: now,
            updatedAt: now,
          };
          return {
            pyqs: { ...state.pyqs, [entry.id]: entry },
            events: withEvent(
              state.events,
              topicId,
              "pyq-added",
              `${pyq.year} · ${truncate(pyq.question, 50)}`,
            ),
          };
        }),

      updatePyq: (id, patch) =>
        set((state) => {
          const pyq = state.pyqs[id];
          if (!pyq) return state;
          const solvedNow = patch.solved === true && !pyq.solved;
          return {
            pyqs: {
              ...state.pyqs,
              [id]: { ...pyq, ...patch, updatedAt: nowIso() },
            },
            events: solvedNow
              ? withEvent(
                  state.events,
                  pyq.topicId,
                  "pyq-solved",
                  `${pyq.year} · ${truncate(pyq.question, 50)}`,
                )
              : state.events,
          };
        }),

      removePyq: (id) =>
        set((state) => {
          const pyqs = { ...state.pyqs };
          delete pyqs[id];
          return { pyqs };
        }),

      addCurrentAffair: (affair) =>
        set((state) => {
          const entry: CurrentAffair = {
            id: makeId("ca"),
            topicIds: affair.topicIds,
            title: affair.title,
            date: affair.date ?? nowIso().slice(0, 10),
            source: affair.source ?? "",
            summary: affair.summary ?? "",
            importance: affair.importance ?? "medium",
            note: affair.note ?? "",
            aiSummary: null,
            createdAt: nowIso(),
          };
          let events = state.events;
          for (const topicId of entry.topicIds) {
            events = withEvent(
              events,
              topicId,
              "current-affair-linked",
              entry.title,
            );
          }
          return {
            currentAffairs: { ...state.currentAffairs, [entry.id]: entry },
            events,
          };
        }),

      updateCurrentAffair: (id, patch) =>
        set((state) => {
          const affair = state.currentAffairs[id];
          if (!affair) return state;
          return {
            currentAffairs: {
              ...state.currentAffairs,
              [id]: { ...affair, ...patch },
            },
          };
        }),

      removeCurrentAffair: (id) =>
        set((state) => {
          const currentAffairs = { ...state.currentAffairs };
          delete currentAffairs[id];
          return { currentAffairs };
        }),

      addBookmark: (targetType, targetId, topicId, collectionId) =>
        set((state) => {
          if (!state.collections[collectionId]) return state;
          // One bookmark per target per collection.
          const duplicate = Object.values(state.bookmarks).some(
            (bookmark) =>
              bookmark.targetType === targetType &&
              bookmark.targetId === targetId &&
              bookmark.collectionId === collectionId,
          );
          if (duplicate) return state;
          const bookmark: Bookmark = {
            id: makeId("bm"),
            targetType,
            targetId,
            topicId,
            collectionId,
            createdAt: nowIso(),
          };
          return {
            bookmarks: { ...state.bookmarks, [bookmark.id]: bookmark },
            events: withEvent(
              state.events,
              topicId,
              "bookmark-added",
              state.collections[collectionId].name,
            ),
          };
        }),

      removeBookmark: (id) =>
        set((state) => {
          const bookmarks = { ...state.bookmarks };
          delete bookmarks[id];
          return { bookmarks };
        }),

      addCollection: (name) =>
        set((state) => {
          const collection: BookmarkCollection = {
            id: makeId("col"),
            name,
            builtin: false,
            createdAt: nowIso(),
          };
          return {
            collections: { ...state.collections, [collection.id]: collection },
          };
        }),

      renameCollection: (id, name) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection) return state;
          return {
            collections: {
              ...state.collections,
              [id]: { ...collection, name },
            },
          };
        }),

      removeCollection: (id) =>
        set((state) => {
          const collection = state.collections[id];
          if (!collection || collection.builtin) return state;
          const collections = { ...state.collections };
          delete collections[id];
          // Bookmarks in a deleted collection go with it.
          const bookmarks = Object.fromEntries(
            Object.entries(state.bookmarks).filter(
              ([, bookmark]) => bookmark.collectionId !== id,
            ),
          );
          return { collections, bookmarks };
        }),

      importKnowledge: (data) => set(() => ({ ...data })),

      resetKnowledge: () => set(() => ({ ...initialKnowledge() })),
    }),
    {
      name: "upsc-os-knowledge",
      version: KNOWLEDGE_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        richNotes: state.richNotes,
        quickNotes: state.quickNotes,
        flashcards: state.flashcards,
        keywords: state.keywords,
        bookRefs: state.bookRefs,
        resources: state.resources,
        pyqs: state.pyqs,
        currentAffairs: state.currentAffairs,
        bookmarks: state.bookmarks,
        collections: state.collections,
        events: state.events,
      }),
    },
  ),
);

/** Snapshot the persisted knowledge data (for backup files). */
export function exportKnowledge(): KnowledgeExport {
  const state = useKnowledgeStore.getState();
  return {
    richNotes: state.richNotes,
    quickNotes: state.quickNotes,
    flashcards: state.flashcards,
    keywords: state.keywords,
    bookRefs: state.bookRefs,
    resources: state.resources,
    pyqs: state.pyqs,
    currentAffairs: state.currentAffairs,
    bookmarks: state.bookmarks,
    collections: state.collections,
    events: state.events,
  };
}

/* ------------------------------------------------------------------ */
/* Import sanitization — drops anything malformed, never throws.       */
/* ------------------------------------------------------------------ */

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const bool = (value: unknown): boolean => value === true;
const num = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const count = (value: unknown): number => Math.max(0, num(value, 0));
const iso = (value: unknown): string =>
  typeof value === "string" && value !== "" ? value : new Date(0).toISOString();
const validTopic = (value: unknown): value is string =>
  typeof value === "string" && !!getNode(value);
const oneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);
const confidence = (value: unknown): Confidence =>
  [1, 2, 3, 4, 5].includes(value as number) ? (value as Confidence) : 3;
const difficulty = (value: unknown): Difficulty =>
  isDifficulty(value) ? value : "medium";

function entries(raw: unknown): [string, Record<string, unknown>][] {
  if (typeof raw !== "object" || raw === null) return [];
  return Object.entries(raw as Record<string, unknown>).filter(
    (entry): entry is [string, Record<string, unknown>] =>
      typeof entry[1] === "object" && entry[1] !== null,
  );
}

/** Validate a knowledge section from a backup file. */
export function sanitizeKnowledgeExport(raw: unknown): KnowledgeExport {
  const data = initialKnowledge();
  if (typeof raw !== "object" || raw === null) return data;
  const source = raw as Record<string, unknown>;

  for (const [key, value] of entries(source.richNotes)) {
    if (!validTopic(key)) continue;
    data.richNotes[key] = {
      topicId: key,
      markdown: str(value.markdown),
      createdAt: iso(value.createdAt),
      updatedAt: iso(value.updatedAt),
      versionTimestamps: Array.isArray(value.versionTimestamps)
        ? value.versionTimestamps.filter(
            (timestamp): timestamp is string => typeof timestamp === "string",
          )
        : [],
      ai: EMPTY_NOTE_AI,
    };
  }
  const quickKinds = QUICK_NOTE_KINDS.map((kind) => kind.value);
  for (const [id, value] of entries(source.quickNotes)) {
    if (!validTopic(value.topicId) || str(value.text) === "") continue;
    data.quickNotes[id] = {
      id,
      topicId: value.topicId,
      text: str(value.text),
      kind: oneOf(value.kind, quickKinds, "reminder"),
      createdAt: iso(value.createdAt),
    };
  }
  for (const [id, value] of entries(source.flashcards)) {
    if (!validTopic(value.topicId) || str(value.front) === "") continue;
    data.flashcards[id] = {
      id,
      topicId: value.topicId,
      front: str(value.front),
      back: str(value.back),
      tags: Array.isArray(value.tags)
        ? value.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      difficulty: difficulty(value.difficulty),
      confidence: confidence(value.confidence),
      lastReviewedAt:
        typeof value.lastReviewedAt === "string" ? value.lastReviewedAt : null,
      reviewCount: count(value.reviewCount),
      correctStreak: count(value.correctStreak),
      incorrectStreak: count(value.incorrectStreak),
      createdAt: iso(value.createdAt),
      updatedAt: iso(value.updatedAt),
      ai: null,
    };
  }
  const keywordKinds = KEYWORD_KINDS.map((kind) => kind.value);
  for (const [id, value] of entries(source.keywords)) {
    if (!validTopic(value.topicId) || str(value.term) === "") continue;
    data.keywords[id] = {
      id,
      topicId: value.topicId,
      term: str(value.term),
      kind: oneOf(value.kind, keywordKinds, "other"),
      note: str(value.note),
      createdAt: iso(value.createdAt),
    };
  }
  for (const [id, value] of entries(source.bookRefs)) {
    if (!validTopic(value.topicId) || str(value.book) === "") continue;
    data.bookRefs[id] = {
      id,
      topicId: value.topicId,
      book: str(value.book),
      chapter: str(value.chapter),
      pages: str(value.pages),
      note: str(value.note),
      completed: bool(value.completed),
      createdAt: iso(value.createdAt),
      updatedAt: iso(value.updatedAt),
    };
  }
  const resourceKinds = RESOURCE_KINDS.map((kind) => kind.value);
  for (const [id, value] of entries(source.resources)) {
    if (!validTopic(value.topicId) || str(value.title) === "") continue;
    data.resources[id] = {
      id,
      topicId: value.topicId,
      title: str(value.title),
      url: str(value.url),
      kind: oneOf(value.kind, resourceKinds, "link"),
      note: str(value.note),
      createdAt: iso(value.createdAt),
    };
  }
  for (const [id, value] of entries(source.pyqs)) {
    if (!validTopic(value.topicId) || str(value.question) === "") continue;
    data.pyqs[id] = {
      id,
      topicId: value.topicId,
      linkedTopicIds: Array.isArray(value.linkedTopicIds)
        ? value.linkedTopicIds.filter(validTopic)
        : [],
      year: Math.round(num(value.year, new Date().getFullYear())),
      paper: str(value.paper),
      question: str(value.question),
      marks: typeof value.marks === "number" ? value.marks : null,
      difficulty: difficulty(value.difficulty),
      attempted: bool(value.attempted),
      solved: bool(value.solved),
      note: str(value.note),
      expectedAnswer: str(value.expectedAnswer),
      aiExplanation: null,
      createdAt: iso(value.createdAt),
      updatedAt: iso(value.updatedAt),
    };
  }
  for (const [id, value] of entries(source.currentAffairs)) {
    const topicIds = Array.isArray(value.topicIds)
      ? value.topicIds.filter(validTopic)
      : [];
    if (topicIds.length === 0 || str(value.title) === "") continue;
    data.currentAffairs[id] = {
      id,
      topicIds,
      title: str(value.title),
      date: str(value.date, new Date(0).toISOString().slice(0, 10)),
      source: str(value.source),
      summary: str(value.summary),
      importance: oneOf(
        value.importance,
        ["low", "medium", "high"] as const,
        "medium",
      ) as CurrentAffairImportance,
      note: str(value.note),
      aiSummary: null,
      createdAt: iso(value.createdAt),
    };
  }
  for (const [id, value] of entries(source.collections)) {
    if (str(value.name) === "") continue;
    data.collections[id] = {
      id,
      name: str(value.name),
      builtin: data.collections[id]?.builtin ?? false,
      createdAt: iso(value.createdAt),
    };
  }
  const targetTypes: BookmarkTargetType[] = [
    "topic",
    "note",
    "quick-note",
    "flashcard",
    "pyq",
    "resource",
    "current-affair",
  ];
  for (const [id, value] of entries(source.bookmarks)) {
    if (!validTopic(value.topicId)) continue;
    const collectionId = str(value.collectionId);
    if (!data.collections[collectionId]) continue;
    data.bookmarks[id] = {
      id,
      targetType: oneOf(value.targetType, targetTypes, "topic"),
      targetId: str(value.targetId, str(value.topicId)),
      topicId: value.topicId,
      collectionId,
      createdAt: iso(value.createdAt),
    };
  }
  if (Array.isArray(source.events)) {
    data.events = source.events
      .filter(
        (event): event is TimelineEvent =>
          typeof event === "object" &&
          event !== null &&
          validTopic((event as TimelineEvent).topicId) &&
          typeof (event as TimelineEvent).at === "string" &&
          typeof (event as TimelineEvent).type === "string",
      )
      .slice(-KNOWLEDGE_CONFIG.timelineEventCap);
  }
  return data;
}
