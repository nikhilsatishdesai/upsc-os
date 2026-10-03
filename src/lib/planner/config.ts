import type { Difficulty, Priority } from "@/lib/stages";
import type { PlannerSettings, TaskSlot } from "./types";

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
  /** How many rotation candidates one session pick may sweep past when
   * filtering (e.g. hard sessions over the daily quota). Must exceed the
   * unit count so a filtered pick can always cycle to another subject. */
  pickSweepLimit: 40,
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

  /* ---------------- Phase A: adaptive intelligence ---------------- */

  /** Dynamic priority score = base + adjustments; higher schedules earlier. */
  priorityScore: {
    /** Base points per curated priority level. */
    base: { critical: 100, high: 70, medium: 45, low: 20 },
    /** Points per point of confidence below 5 (weak topics rise). */
    confidenceGapWeight: 8,
    /** Points per day a revision is overdue. */
    revisionOverduePerDay: 5,
    revisionOverdueCap: 50,
    /** Points per postponement (skips/misses/moves) — avoided topics rise. */
    postponeWeight: 6,
    postponeCap: 30,
    /** Extra share of base applied when the exam is close (scales linearly
     * from 0 at `proximityFromDays` out to this factor on exam day). */
    examProximityFactor: 0.3,
    proximityFromDays: 120,
  },

  /** Confidence decay model (all in confidence points, scale 1–5). */
  confidenceModel: {
    /** Boost per completed revision. */
    revisionBoost: 0.4,
    revisionBoostCap: 1.2,
    /** Decay per 30 days since last study/revision. */
    decayPer30Days: 1,
    decayCap: 2,
    /** Penalty per postponement. */
    postponePenalty: 0.15,
    postponePenaltyCap: 0.9,
    /** Standing penalty on hard topics. */
    hardPenalty: 0.4,
  },

  /** Capacity damping applied when burnout rises, by user sensitivity. */
  burnoutDamping: {
    low: { elevated: 1, high: 0.85 },
    medium: { elevated: 0.9, high: 0.75 },
    high: { elevated: 0.8, high: 0.65 },
  } as Record<string, { elevated: number; high: number }>,

  /** Aggressiveness: how much of theoretical capacity the planner fills. */
  aggressivenessFactor: {
    relaxed: 0.85,
    standard: 1,
    intense: 1.1,
  } as Record<string, number>,

  /** Weekend strategy: capacity factor for "light" Saturdays/Sundays. */
  weekendLightFactor: 0.7,

  /** Study health score weights (sum 100). */
  healthWeights: {
    consistency: 20,
    completion: 20,
    revision: 15,
    burnout: 15,
    confidence: 10,
    pace: 15,
    stability: 5,
  },
  /** Overdue revisions at which revision health reaches zero. */
  revisionBacklogDanger: 10,
  /** Missed-session ratio (14 days) at which stability reaches zero. */
  missedRatioDanger: 0.5,

  /** Completion-probability model: logistic steepness over schedule slack.
   * slack = (available - required) / required; P = 1/(1+e^(-k·slack)). */
  probabilitySteepness: 6,
  /** Days of recent history used to measure actual pace. */
  paceWindowDays: 14,
  /** Active days of history required before observed pace influences the
   * forecast (before that, settings capacity is trusted). */
  paceMinActiveDays: 3,
  /** Daily snapshots kept for trend analytics. */
  snapshotRetentionDays: 60,

  /** Recommendation thresholds. */
  recommendations: {
    /** Overdue revisions that count as a growing backlog. */
    backlogWarning: 5,
    /** Weekly completion % that counts as a strong week. */
    strongWeekAt: 80,
    /** Minimum planned tasks for the strong-week call. */
    strongWeekMinTasks: 5,
    /** Consistency % below which a routine nudge appears. */
    lowConsistencyAt: 40,
    /** Average effective confidence below which a paper is "falling". */
    paperConfidenceWarning: 2.8,
    /** Studied topics needed before judging a paper's confidence. */
    paperConfidenceMinTopics: 3,
    /** Maximum recommendations shown at once. */
    maxItems: 5,
  },

  /** Study-health score bands. */
  healthBands: { excellentAt: 80, goodAt: 60, fairAt: 40 },
} as const;

/** Default values for the Phase-A planner settings (merged on read so
 * pre-existing configurations keep working unchanged). */
export const PLANNER_SETTING_DEFAULTS = {
  revisionIntervals: [3, 10, 30] as number[],
  maxHardPerDay: 2,
  morningDifficulty: "hard-first" as "hard-first" | "easy-first",
  weekendStrategy: "normal" as "normal" | "light" | "revision-heavy",
  vacationFrom: null as string | null,
  vacationTo: null as string | null,
  aggressiveness: "standard" as "relaxed" | "standard" | "intense",
  burnoutSensitivity: "medium" as "low" | "medium" | "high",
  weekdayHours: [null, null, null, null, null, null, null] as (number | null)[],
  dayFocus: [null, null, null, null, null, null, null] as (string[] | null)[],
  afternoonStartTime: "14:00",
  eveningStartTime: "19:00",
  paperWeights: {} as Record<string, number>,
};

/** Subject emphasis levels offered in the timetable editor. */
export const PAPER_WEIGHT_OPTIONS = [
  { value: 1, label: "Normal" },
  { value: 2, label: "High" },
  { value: 3, label: "Very high" },
] as const;

/** Merge stored settings (possibly from an older version) with defaults. */
export function withPlannerDefaults(
  stored: Partial<PlannerSettings> &
    Pick<
      PlannerSettings,
      | "mainsDate"
      | "dailyHours"
      | "wakeUpTime"
      | "studyStartTime"
      | "weeklyOffDay"
      | "maxSessionsPerDay"
      | "sessionMinutes"
    >,
): PlannerSettings {
  return { ...PLANNER_SETTING_DEFAULTS, ...stored };
}

export const SLOT_ORDER: TaskSlot[] = ["morning", "afternoon", "evening"];

export const SLOT_LABEL: Record<TaskSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};
