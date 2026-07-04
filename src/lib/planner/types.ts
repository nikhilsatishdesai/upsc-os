/** Shared planner types — kept free of UI and store imports so the
 * scheduling services stay reusable by future modules (revision engine,
 * PYQ practice, current-affairs blocks). */

export type TaskSlot = "morning" | "afternoon" | "evening";

export type TaskStatus = "pending" | "completed" | "skipped" | "missed";

/** What kind of work a task represents. V2 generates "study"; the V3
 * revision engine will generate "revision" without schema changes. */
export type TaskKind = "study" | "revision";

export type PlannedTask = {
  id: string;
  topicId: string;
  /** YYYY-MM-DD (local). */
  date: string;
  slot: TaskSlot;
  minutes: number;
  kind: TaskKind;
  status: TaskStatus;
  /** ISO timestamp set when completed. */
  completedAt: string | null;
  /** "auto" tasks are replaced on every replan; "user" tasks are pinned. */
  createdBy: "auto" | "user";
};

export type PlannerSettings = {
  /** YYYY-MM-DD. The Prelims date lives in the store as `examDate`. */
  mainsDate: string;
  /** Total study hours available per day. */
  dailyHours: number;
  /** "HH:MM" — informational, shown on the plan. */
  wakeUpTime: string;
  /** "HH:MM" — start of the morning session. */
  studyStartTime: string;
  /** 0 (Sunday) – 6 (Saturday), or -1 for no weekly off day. */
  weeklyOffDay: number;
  maxSessionsPerDay: number;
  /** Preferred length of one study session. */
  sessionMinutes: number;
};
