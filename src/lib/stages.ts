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

/**
 * Everything the app (and the future revision engine) knows about one topic.
 * `nextRevisionAt` is reserved for the V3 spaced-repetition engine.
 */
export type TopicState = {
  stage: StudyStage;
  /** Minutes of planner study completed towards the first reading. */
  studiedMinutes: number;
  /** YYYY-MM-DD of the last study/revision activity. */
  lastStudiedAt: string | null;
  revisionCount: number;
  difficulty: Difficulty;
  confidence: Confidence;
  /** Minutes a full first reading takes; null = planner default. */
  estimatedMinutes: number | null;
  /** Reserved for the V3 revision engine. */
  nextRevisionAt: string | null;
};

export const DEFAULT_TOPIC_STATE: TopicState = {
  stage: "not-started",
  studiedMinutes: 0,
  lastStudiedAt: null,
  revisionCount: 0,
  difficulty: "medium",
  confidence: 3,
  estimatedMinutes: null,
  nextRevisionAt: null,
};

export type TopicStateMap = Record<string, TopicState>;

/** Read a topic's state with defaults applied for anything unset. */
export function getTopicState(
  topics: TopicStateMap,
  topicId: string,
): TopicState {
  return topics[topicId] ?? DEFAULT_TOPIC_STATE;
}
