import type { Confidence, Difficulty } from "@/lib/stages";

/**
 * Knowledge OS entity types. Every entity hangs off a syllabus topic id —
 * the Study Topic stays the central object of the application. AI fields
 * are deliberate null placeholders: clean extension points for the future
 * AI phase, never populated today.
 */

/** Extension points for the future AI phase (never populated in Phase B). */
export type NoteAiPlaceholder = {
  summary: string | null;
  quiz: string | null;
  explanation: string | null;
  difficultyEstimate: string | null;
  cleanup: string | null;
};

export const EMPTY_NOTE_AI: NoteAiPlaceholder = {
  summary: null,
  quiz: null,
  explanation: null,
  difficultyEstimate: null,
  cleanup: null,
};

/** One rich markdown note per topic — the topic's main knowledge page. */
export type RichNote = {
  topicId: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
  /** Save-version timestamps (newest last, capped) — lightweight history. */
  versionTimestamps: string[];
  ai: NoteAiPlaceholder;
};

export type QuickNoteKind =
  | "reminder"
  | "mnemonic"
  | "trick"
  | "hook"
  | "definition"
  | "formula";

export const QUICK_NOTE_KINDS: { value: QuickNoteKind; label: string }[] = [
  { value: "reminder", label: "Reminder" },
  { value: "mnemonic", label: "Mnemonic" },
  { value: "trick", label: "Revision trick" },
  { value: "hook", label: "Memory hook" },
  { value: "definition", label: "Definition" },
  { value: "formula", label: "Formula" },
];

export type QuickNote = {
  id: string;
  topicId: string;
  text: string;
  kind: QuickNoteKind;
  createdAt: string;
};

export type Flashcard = {
  id: string;
  topicId: string;
  front: string;
  back: string;
  tags: string[];
  difficulty: Difficulty;
  confidence: Confidence;
  lastReviewedAt: string | null;
  reviewCount: number;
  correctStreak: number;
  incorrectStreak: number;
  createdAt: string;
  updatedAt: string;
  /** Future AI / spaced-repetition metadata (SM-2, FSRS…) plugs in here. */
  ai: Record<string, unknown> | null;
};

export type KeywordKind =
  | "article"
  | "committee"
  | "scheme"
  | "act"
  | "concept"
  | "date"
  | "report"
  | "thinker"
  | "case"
  | "definition"
  | "other";

export const KEYWORD_KINDS: { value: KeywordKind; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "committee", label: "Committee" },
  { value: "scheme", label: "Scheme" },
  { value: "act", label: "Act" },
  { value: "concept", label: "Concept" },
  { value: "date", label: "Date" },
  { value: "report", label: "Report" },
  { value: "thinker", label: "Thinker" },
  { value: "case", label: "Case" },
  { value: "definition", label: "Definition" },
  { value: "other", label: "Other" },
];

export type Keyword = {
  id: string;
  topicId: string;
  term: string;
  kind: KeywordKind;
  note: string;
  createdAt: string;
};

export type BookReference = {
  id: string;
  topicId: string;
  book: string;
  chapter: string;
  pages: string;
  note: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ResourceKind =
  | "pdf"
  | "image"
  | "video"
  | "youtube"
  | "website"
  | "drive"
  | "document"
  | "link";

export const RESOURCE_KINDS: { value: ResourceKind; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website" },
  { value: "drive", label: "Google Drive" },
  { value: "document", label: "Document" },
  { value: "link", label: "Link" },
];

export type Resource = {
  id: string;
  topicId: string;
  title: string;
  url: string;
  kind: ResourceKind;
  note: string;
  createdAt: string;
};

export type Pyq = {
  id: string;
  /** Primary topic (where it lives); may link further topics. */
  topicId: string;
  linkedTopicIds: string[];
  year: number;
  paper: string;
  question: string;
  marks: number | null;
  difficulty: Difficulty;
  attempted: boolean;
  solved: boolean;
  note: string;
  expectedAnswer: string;
  /** Future AI explanation plugs in here. */
  aiExplanation: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CurrentAffairImportance = "low" | "medium" | "high";

export type CurrentAffair = {
  id: string;
  /** One article can connect to multiple syllabus topics. */
  topicIds: string[];
  title: string;
  date: string;
  source: string;
  summary: string;
  importance: CurrentAffairImportance;
  note: string;
  /** Future AI summary plugs in here. */
  aiSummary: string | null;
  createdAt: string;
};

export type BookmarkTargetType =
  | "topic"
  | "note"
  | "quick-note"
  | "flashcard"
  | "pyq"
  | "resource"
  | "current-affair";

export type Bookmark = {
  id: string;
  targetType: BookmarkTargetType;
  /** Entity id (for "topic"/"note" targets this is the topic id). */
  targetId: string;
  /** Topic context used for display and navigation. */
  topicId: string;
  collectionId: string;
  createdAt: string;
};

export type BookmarkCollection = {
  id: string;
  name: string;
  /** Built-in collections can't be deleted (they can be renamed). */
  builtin: boolean;
  createdAt: string;
};

export type TimelineEventType =
  | "note-updated"
  | "quick-note-added"
  | "flashcard-added"
  | "flashcard-reviewed"
  | "keyword-added"
  | "book-added"
  | "resource-added"
  | "pyq-added"
  | "pyq-solved"
  | "current-affair-linked"
  | "bookmark-added";

export type TimelineEvent = {
  id: string;
  topicId: string;
  at: string;
  type: TimelineEventType;
  label: string;
};
