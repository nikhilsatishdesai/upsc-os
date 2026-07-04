import type { Difficulty } from "@/lib/stages";
import type { TaskSlot } from "./types";

/** Central planner tuning — no magic numbers anywhere else. */
export const PLANNER_CONFIG = {
  /** First reading of an average topic, in minutes. */
  defaultTopicMinutes: 90,
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
} as const;

export const SLOT_ORDER: TaskSlot[] = ["morning", "afternoon", "evening"];

export const SLOT_LABEL: Record<TaskSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};
