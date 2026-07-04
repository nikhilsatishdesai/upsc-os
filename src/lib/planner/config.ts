import type { Difficulty, Priority } from "@/lib/stages";
import type { TaskSlot } from "./types";

/** Central planner tuning — no magic numbers anywhere else. */
export const PLANNER_CONFIG = {
  /** First reading of an average topic, in minutes. */
  defaultTopicMinutes: 90,
  /** Fallbacks when neither the user nor the curated data says otherwise. */
  defaultPriority: "medium" as Priority,
  defaultDifficulty: "medium" as Difficulty,
  /** Share of a topic's estimate one spaced revision takes. */
  defaultRevisionWeight: 0.3,
  /** Days after the previous study/revision that R1, R2, R3 fall due. */
  revisionIntervals: [3, 10, 30] as readonly number[],
  /** At most this share of a day's capacity goes to revisions. */
  revisionShareCap: 0.6,
  /** Without a weekly off day, insert a recovery day after this many
   * consecutive study days. */
  maxConsecutiveStudyDays: 6,
  /** How many rotation candidates to inspect to avoid back-to-back hard
   * topics. */
  hardSpacingLookahead: 4,
  /** Difficulty scales the estimated time. */
  difficultyMultiplier: { easy: 0.75, medium: 1, hard: 1.3 } satisfies Record<
    Difficulty,
    number
  >,
  /** How many days ahead the rolling plan is generated. */
  horizonDays: 14,
  /** Never create a task shorter than this. */
  minTaskMinutes: 15,
  /** Session-length choices offered in setup. */
  sessionOptions: [30, 45, 60, 90] as readonly number[],
  /** Display start times for the afternoon/evening slots
   * (morning uses the user's study start time). */
  slotStarts: { afternoon: "14:00", evening: "19:00" } as Partial<
    Record<TaskSlot, string>
  >,
  /** Days of history examined for consistency analytics. */
  consistencyWindowDays: 30,
  /** Days shown in the "hours studied" chart. */
  hoursChartDays: 14,
  /** Finish this many days before Prelims to count as "on track". */
  forecastBufferDays: 14,
  /** A day at/above this share of capacity is labelled "Heavy". */
  heavyDayLoadRatio: 0.85,
  /** A non-empty day at/below this share of capacity is "Light". */
  lightDayLoadRatio: 0.5,
  /** Burnout indicator tuning: factor weights (sum 100) and the levels at
   * which each factor maxes out. */
  burnout: {
    loadWeight: 40,
    streakWeight: 30,
    hardWeight: 30,
    /** Planned/capacity ratio treated as full overload. */
    loadDanger: 1.0,
    /** Consecutive study days treated as full fatigue. */
    streakDanger: 10,
    /** Share of hard sessions treated as fully draining. */
    hardShareDanger: 0.6,
    /** Score bands: below elevated = sustainable. */
    elevatedAt: 40,
    highAt: 70,
  },
} as const;

export const SLOT_ORDER: TaskSlot[] = ["morning", "afternoon", "evening"];

export const SLOT_LABEL: Record<TaskSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};
