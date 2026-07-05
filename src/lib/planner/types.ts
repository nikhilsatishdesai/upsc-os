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

/** One-per-day intelligence snapshot, kept for trend analytics. */
export type DailySnapshot = {
  /** 0–100 burnout score that day. */
  burnoutScore: number;
  /** 0–100 study health score; null for snapshots from older versions. */
  healthScore: number | null;
  /** First-reading minutes left across the syllabus. */
  remainingMinutes: number;
  /** Revisions overdue that day. */
  revisionBacklog: number;
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

  /* ---- Phase A additions (defaulted on read via withPlannerDefaults) ---- */
  /** Days after each study/revision that the next revision falls due.
   * Supports any number of rounds; the stage ladder caps at Revision 3. */
  revisionIntervals: number[];
  /** At most this many hard sessions per day. */
  maxHardPerDay: number;
  /** Tackle hard work first thing, or warm up with easier material. */
  morningDifficulty: "hard-first" | "easy-first";
  /** Weekends (Sat/Sun that aren't the off day): normal load, lighter load,
   * or revision-focused. */
  weekendStrategy: "normal" | "light" | "revision-heavy";
  /** Vacation period — no auto-scheduling inside it (inclusive). */
  vacationFrom: string | null;
  vacationTo: string | null;
  /** How much of theoretical capacity the planner fills. */
  aggressiveness: "relaxed" | "standard" | "intense";
  /** How strongly rising burnout reduces the planned load. */
  burnoutSensitivity: "low" | "medium" | "high";
};
