import { KNOWLEDGE_CONFIG } from "./config";
import { countWords, readingMinutes } from "./notes";
import type {
  Bookmark,
  BookReference,
  CurrentAffair,
  Flashcard,
  Keyword,
  Pyq,
  QuickNote,
  Resource,
  RichNote,
  TimelineEvent,
} from "./types";
import type { PlannedTask } from "@/lib/planner/types";

/** A card is due when never reviewed or unreviewed for the config window. */
export function isFlashcardDue(
  card: Flashcard,
  now: Date = new Date(),
): boolean {
  if (card.lastReviewedAt === null) return true;
  const ageDays =
    (now.getTime() - new Date(card.lastReviewedAt).getTime()) / 86_400_000;
  return ageDays >= KNOWLEDGE_CONFIG.flashcardDueAfterDays;
}

/** Cards to review (optionally for one topic), most-stale first. */
export function dueFlashcards(
  cards: Record<string, Flashcard>,
  topicId?: string,
  now: Date = new Date(),
): Flashcard[] {
  return Object.values(cards)
    .filter(
      (card) =>
        (topicId === undefined || card.topicId === topicId) &&
        isFlashcardDue(card, now),
    )
    .sort((a, b) =>
      (a.lastReviewedAt ?? "").localeCompare(b.lastReviewedAt ?? ""),
    );
}

/** Review order for a topic: due cards first, then the rest, stalest first. */
export function reviewQueue(
  cards: Record<string, Flashcard>,
  topicId: string,
  now: Date = new Date(),
): Flashcard[] {
  const topicCards = Object.values(cards).filter(
    (card) => card.topicId === topicId,
  );
  return topicCards.sort((a, b) => {
    const dueA = isFlashcardDue(a, now) ? 0 : 1;
    const dueB = isFlashcardDue(b, now) ? 0 : 1;
    return (
      dueA - dueB ||
      (a.lastReviewedAt ?? "").localeCompare(b.lastReviewedAt ?? "")
    );
  });
}

/** One entry of a topic's learning history. */
export type TimelineEntry = {
  at: string;
  type: TimelineEvent["type"] | "studied" | "revised";
  label: string;
};

/**
 * The knowledge timeline: knowledge events merged with the planner's
 * completed sessions — derived at read time, never double-stored.
 */
export function topicTimeline(
  topicId: string,
  events: TimelineEvent[],
  tasks: PlannedTask[],
  limit = 30,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const event of events) {
    if (event.topicId === topicId) {
      entries.push({ at: event.at, type: event.type, label: event.label });
    }
  }
  for (const task of tasks) {
    if (
      task.topicId === topicId &&
      task.status === "completed" &&
      task.completedAt
    ) {
      entries.push({
        at: task.completedAt,
        type: task.kind === "revision" ? "revised" : "studied",
        label: `${task.minutes} min ${task.kind === "revision" ? "revision" : "study"} session`,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export type KnowledgeStats = {
  notes: number;
  /** Writing statistics. */
  words: number;
  /** Reading statistics — minutes to re-read all notes. */
  readMinutes: number;
  quickNotes: number;
  cards: number;
  dueCards: number;
  keywords: number;
  pyqs: number;
  solvedPyqs: number;
  affairs: number;
  resources: number;
  books: number;
  bookmarks: number;
  /** Everything countable, for the growth figure. */
  totalItems: number;
};

/** Knowledge-base growth, reading and writing statistics. */
export function knowledgeStats(source: {
  richNotes: Record<string, RichNote>;
  quickNotes: Record<string, QuickNote>;
  flashcards: Record<string, Flashcard>;
  keywords: Record<string, Keyword>;
  bookRefs: Record<string, BookReference>;
  resources: Record<string, Resource>;
  pyqs: Record<string, Pyq>;
  currentAffairs: Record<string, CurrentAffair>;
  bookmarks: Record<string, Bookmark>;
}): KnowledgeStats {
  const notesList = Object.values(source.richNotes).filter(
    (note) => note.markdown.trim() !== "",
  );
  const words = notesList.reduce(
    (sum, note) => sum + countWords(note.markdown),
    0,
  );
  const pyqsList = Object.values(source.pyqs);
  const stats = {
    notes: notesList.length,
    words,
    readMinutes: readingMinutes(words),
    quickNotes: Object.keys(source.quickNotes).length,
    cards: Object.keys(source.flashcards).length,
    dueCards: dueFlashcards(source.flashcards).length,
    keywords: Object.keys(source.keywords).length,
    pyqs: pyqsList.length,
    solvedPyqs: pyqsList.filter((pyq) => pyq.solved).length,
    affairs: Object.keys(source.currentAffairs).length,
    resources: Object.keys(source.resources).length,
    books: Object.keys(source.bookRefs).length,
    bookmarks: Object.keys(source.bookmarks).length,
  };
  return {
    ...stats,
    totalItems:
      stats.notes +
      stats.quickNotes +
      stats.cards +
      stats.keywords +
      stats.pyqs +
      stats.affairs +
      stats.resources +
      stats.books,
  };
}

export type StudyHistoryRow = { label: string; value: string };

/** Per-topic study history, fully derived from existing data. */
export function topicStudyHistory(input: {
  tasks: PlannedTask[];
  events: TimelineEvent[];
  topicId: string;
  lastStudiedAt: string | null;
  revisionCount: number;
  completedSessions: number;
  flashcards: Record<string, Flashcard>;
  pyqsSolved: number;
  bookmarkCount: number;
  noteUpdatedAt: string | null;
}): StudyHistoryRow[] {
  const {
    tasks,
    events,
    topicId,
    lastStudiedAt,
    revisionCount,
    completedSessions,
    flashcards,
    pyqsSolved,
    bookmarkCount,
    noteUpdatedAt,
  } = input;

  let totalMinutes = 0;
  let lastRevisedAt: string | null = null;
  for (const task of tasks) {
    if (task.topicId !== topicId || task.status !== "completed") continue;
    totalMinutes += task.minutes;
    if (
      task.kind === "revision" &&
      task.completedAt &&
      (!lastRevisedAt || task.completedAt > lastRevisedAt)
    ) {
      lastRevisedAt = task.completedAt;
    }
  }

  const firstEvent = events.find((event) => event.topicId === topicId);
  const cardReviews = Object.values(flashcards)
    .filter((card) => card.topicId === topicId)
    .reduce((sum, card) => sum + card.reviewCount, 0);

  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return [
    { label: "First activity", value: date(firstEvent?.at ?? null) },
    { label: "Last studied", value: date(lastStudiedAt) },
    { label: "Last revised", value: date(lastRevisedAt) },
    {
      label: "Time invested",
      value: `${Math.round((totalMinutes / 60) * 10) / 10} h`,
    },
    { label: "Planner sessions", value: String(completedSessions) },
    { label: "Revisions done", value: String(revisionCount) },
    { label: "Flashcard reviews", value: String(cardReviews) },
    { label: "PYQs solved", value: String(pyqsSolved) },
    { label: "Bookmarks", value: String(bookmarkCount) },
    { label: "Notes updated", value: date(noteUpdatedAt) },
  ];
}
