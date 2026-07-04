/**
 * The study lifecycle of a leaf topic. Stages are cumulative milestones —
 * each stage means everything before it is done. "not-started" is the
 * implicit default and is never stored.
 */
export type StudyStage =
  | "not-started"
  | "first-reading"
  | "notes-made"
  | "revision-1"
  | "revision-2"
  | "revision-3"
  | "exam-ready";

export const STAGE_ORDER: StudyStage[] = [
  "not-started",
  "first-reading",
  "notes-made",
  "revision-1",
  "revision-2",
  "revision-3",
  "exam-ready",
];

/**
 * Stage metadata. `weight` is the topic's contribution to preparation
 * percentage (0–1): reaching "exam-ready" is the only true 100%.
 */
export const STAGE_META: Record<
  StudyStage,
  { label: string; weight: number; dot: string; text: string }
> = {
  "not-started": {
    label: "Not started",
    weight: 0,
    dot: "bg-muted-foreground/30",
    text: "text-muted-foreground",
  },
  "first-reading": {
    label: "First reading",
    weight: 0.4,
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
  },
  "notes-made": {
    label: "Notes made",
    weight: 0.55,
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  "revision-1": {
    label: "Revision 1",
    weight: 0.7,
    dot: "bg-lime-500",
    text: "text-lime-600 dark:text-lime-400",
  },
  "revision-2": {
    label: "Revision 2",
    weight: 0.8,
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  "revision-3": {
    label: "Revision 3",
    weight: 0.9,
    dot: "bg-teal-500",
    text: "text-teal-600 dark:text-teal-400",
  },
  "exam-ready": {
    label: "Exam ready",
    weight: 1,
    dot: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
};

export function isStudyStage(value: unknown): value is StudyStage {
  return (
    typeof value === "string" && STAGE_ORDER.includes(value as StudyStage)
  );
}

export function stageIndex(stage: StudyStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function stageAtLeast(stage: StudyStage, min: StudyStage): boolean {
  return stageIndex(stage) >= stageIndex(min);
}

export function revisionCountForStage(stage: StudyStage): number {
  switch (stage) {
    case "revision-1":
      return 1;
    case "revision-2":
      return 2;
    case "revision-3":
    case "exam-ready":
      return 3;
    default:
      return 0;
  }
}

export type Difficulty = "easy" | "medium" | "hard";
export type Confidence = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_META: Record<Difficulty, { label: string }> = {
  easy: { label: "Easy" },
  medium: { label: "Medium" },
  hard: { label: "Hard" },
};

export function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

/** Exam importance of a topic — drives scheduling order. */
export type Priority = "critical" | "high" | "medium" | "low";

export const PRIORITY_ORDER: Priority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

export const PRIORITY_META: Record<
  Priority,
  { label: string; rank: number; dot: string; badge: string }
> = {
  critical: {
    label: "Critical",
    rank: 0,
    dot: "bg-red-500",
    badge:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  high: {
    label: "High",
    rank: 1,
    dot: "bg-orange-500",
    badge:
      "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  medium: {
    label: "Medium",
    rank: 2,
    dot: "bg-sky-500",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  low: {
    label: "Low",
    rank: 3,
    dot: "bg-muted-foreground/40",
    badge: "border-border bg-secondary text-muted-foreground",
  },
};

export function isPriority(value: unknown): value is Priority {
  return (
    typeof value === "string" && PRIORITY_ORDER.includes(value as Priority)
  );
}

export function priorityRank(priority: Priority): number {
  return PRIORITY_META[priority].rank;
}

/**
 * Everything the app knows about one topic — the central object of the
 * application. Fields set to null fall back to the curated intelligence
 * layer (see src/lib/planner/intel.ts), so user choices always win but
 * every topic has sensible exam-aware values out of the box.
 */
export type TopicState = {
  stage: StudyStage;
  /** Minutes of planner study completed towards the first reading. */
  studiedMinutes: number;
  /** YYYY-MM-DD of the last study/revision activity. */
  lastStudiedAt: string | null;
  revisionCount: number;
  /** User override; null = curated intelligence value. */
  priority: Priority | null;
  /** User override; null = curated intelligence value. */
  difficulty: Difficulty | null;
  confidence: Confidence;
  /** User override in minutes; null = curated intelligence value. */
  estimatedMinutes: number | null;
  /** Next spaced revision due date (YYYY-MM-DD); null = none scheduled. */
  nextRevisionAt: string | null;
};

export const DEFAULT_TOPIC_STATE: TopicState = {
  stage: "not-started",
  studiedMinutes: 0,
  lastStudiedAt: null,
  revisionCount: 0,
  priority: null,
  difficulty: null,
  confidence: 3,
  estimatedMinutes: null,
  nextRevisionAt: null,
};

export type TopicStateMap = Record<string, TopicState>;

/**
 * Merged-state cache. Store updates replace topic objects immutably, so a
 * given stored object always merges to the same result — caching keeps the
 * returned reference stable, which React selectors depend on (an uncached
 * fresh object per call causes infinite re-render loops).
 */
const mergedStateCache = new WeakMap<object, TopicState>();

/**
 * Read a topic's state with defaults merged in for anything unset — new
 * fields added in later versions are backfilled automatically. Returns a
 * referentially stable object for the same stored input.
 */
export function getTopicState(
  topics: TopicStateMap,
  topicId: string,
): TopicState {
  const stored = topics[topicId];
  if (!stored) return DEFAULT_TOPIC_STATE;
  let merged = mergedStateCache.get(stored);
  if (!merged) {
    merged = { ...DEFAULT_TOPIC_STATE, ...stored };
    mergedStateCache.set(stored, merged);
  }
  return merged;
}
