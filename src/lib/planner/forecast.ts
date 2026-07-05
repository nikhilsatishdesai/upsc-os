import { getAllNodes, isLeaf } from "@/lib/syllabus";
import { getTopicState, type TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { weeklyCapacityMinutes } from "./capacity";
import { addDays, diffDays } from "./dates";
import {
  needsRevisions,
  remainingStudyMinutes,
  revisionMinutes,
} from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

export type PaceStatus = "on-track" | "tight" | "behind";

export type CompletionForecast = {
  /** First-reading minutes still to study. */
  remainingStudyMinutes: number;
  /** Spaced-revision minutes still ahead (including for unstudied topics). */
  remainingRevisionMinutes: number;
  totalRemainingMinutes: number;
  weeklyCapacityMinutes: number;
  monthlyCapacityMinutes: number;
  /** Theoretical minutes/day from settings (capacity ÷ 7). */
  averageDailyMinutes: number;
  /** Observed minutes/day over the trailing pace window (null = too little
   * history yet). */
  actualDailyMinutes: number | null;
  /** Minutes/day the forecast trusts (blend of capacity and observation). */
  effectiveDailyMinutes: number;
  /** Calendar days needed at the effective pace. */
  daysRequired: number;
  /** null when there is no capacity at all. */
  expectedCompletionDate: string | null;
  /** ± days around the expected date (pace-variability heuristic). */
  confidenceIntervalDays: number;
  /** Days from today to Prelims; null when no exam date is set. */
  daysAvailable: number | null;
  paceStatus: PaceStatus | null;
  /** Probability (0–100) of finishing everything before each exam;
   * null without the corresponding date. */
  prelimsProbability: number | null;
  mainsProbability: number | null;
  /** Daily minutes needed to finish by Prelims; null without an exam date. */
  requiredDailyMinutes: number | null;
};

/** Logistic curve over schedule slack — the documented probability model:
 * slack = (available − required) / required, P = 1/(1+e^(−k·slack)).
 * Zero slack → 50%; comfortable slack → high; negative slack → low. */
function finishProbability(
  daysRequired: number,
  daysAvailable: number | null,
): number | null {
  if (daysAvailable === null || daysAvailable <= 0) return null;
  if (daysRequired <= 0) return 100;
  const slack = (daysAvailable - daysRequired) / daysRequired;
  const p = 1 / (1 + Math.exp(-PLANNER_CONFIG.probabilitySteepness * slack));
  return Math.round(p * 100);
}

/** Mean and variability of completed minutes/day over the pace window. */
function observedPace(
  tasks: PlannedTask[],
  today: string,
): { mean: number; variability: number; activeDays: number } | null {
  const window = PLANNER_CONFIG.paceWindowDays;
  const from = addDays(today, -window);
  const byDate = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== "completed") continue;
    const date = task.completedAt ? task.completedAt.slice(0, 10) : task.date;
    if (date < from || date >= today) continue;
    byDate.set(date, (byDate.get(date) ?? 0) + task.minutes);
  }
  const activeDays = byDate.size;
  if (activeDays < PLANNER_CONFIG.paceMinActiveDays) return null;

  const daily: number[] = [];
  for (let i = 1; i <= window; i++) {
    daily.push(byDate.get(addDays(today, -i)) ?? 0);
  }
  const mean = daily.reduce((sum, v) => sum + v, 0) / window;
  const variance =
    daily.reduce((sum, v) => sum + (v - mean) ** 2, 0) / window;
  const variability = mean === 0 ? 1 : Math.sqrt(variance) / mean;
  return { mean, variability, activeDays };
}

/**
 * The study-capacity engine: total workload ahead (readings + all pending
 * spaced revisions) measured against real capacity AND observed pace, with
 * an expected completion date, a confidence interval, and probabilities of
 * finishing before Prelims and Mains.
 */
export function computeForecast(
  topics: TopicStateMap,
  settings: PlannerSettings,
  prelimsDate: string | "",
  today: string,
  tasks: PlannedTask[] = [],
): CompletionForecast {
  const totalRevisions =
    settings.revisionIntervals?.length ??
    PLANNER_CONFIG.revisionIntervals.length;
  let studyMinutes = 0;
  let revisionMinutesLeft = 0;

  for (const node of getAllNodes()) {
    if (!isLeaf(node)) continue;
    const state = getTopicState(topics, node.id);
    // Excluded topics leave the forecast entirely; paused topics stay —
    // their work still has to happen eventually.
    if (state.planState === "excluded") continue;
    if (state.stage === "not-started") {
      studyMinutes += remainingStudyMinutes(node.id, state);
      revisionMinutesLeft += totalRevisions * revisionMinutes(node.id, state);
    } else if (needsRevisions(state, totalRevisions)) {
      revisionMinutesLeft +=
        (totalRevisions - state.revisionCount) *
        revisionMinutes(node.id, state);
    }
  }

  const total = studyMinutes + revisionMinutesLeft;
  const weekly = weeklyCapacityMinutes(settings);
  const plannedDaily = weekly / 7;

  // Pace realism: once there is history, blend what the settings promise
  // with what the user actually does (equal weight — transparent and easy
  // to reason about).
  const pace = observedPace(tasks, today);
  const effectiveDaily =
    pace === null ? plannedDaily : (plannedDaily + pace.mean) / 2;

  const daysRequired =
    effectiveDaily > 0
      ? Math.ceil(total / effectiveDaily)
      : Number.POSITIVE_INFINITY;
  const finiteDays = Number.isFinite(daysRequired) ? daysRequired : 0;
  const expectedCompletionDate = Number.isFinite(daysRequired)
    ? addDays(today, daysRequired)
    : null;
  const confidenceIntervalDays =
    pace === null
      ? Math.round(finiteDays * 0.15)
      : Math.round((finiteDays * Math.min(0.6, Math.max(0.1, pace.variability))) / 2);

  const daysAvailable = prelimsDate ? diffDays(today, prelimsDate) : null;
  const mainsDays = settings.mainsDate
    ? diffDays(today, settings.mainsDate)
    : null;

  let paceStatus: PaceStatus | null = null;
  let requiredDailyMinutes: number | null = null;
  if (daysAvailable !== null && daysAvailable > 0) {
    requiredDailyMinutes = Math.ceil(total / daysAvailable);
    if (finiteDays <= daysAvailable - PLANNER_CONFIG.forecastBufferDays) {
      paceStatus = "on-track";
    } else if (finiteDays <= daysAvailable) {
      paceStatus = "tight";
    } else {
      paceStatus = "behind";
    }
  }

  return {
    remainingStudyMinutes: studyMinutes,
    remainingRevisionMinutes: revisionMinutesLeft,
    totalRemainingMinutes: total,
    weeklyCapacityMinutes: weekly,
    monthlyCapacityMinutes: Math.round((weekly * 30) / 7),
    averageDailyMinutes: Math.round(plannedDaily),
    actualDailyMinutes: pace === null ? null : Math.round(pace.mean),
    effectiveDailyMinutes: Math.round(effectiveDaily),
    daysRequired: finiteDays,
    expectedCompletionDate,
    confidenceIntervalDays,
    daysAvailable,
    paceStatus,
    prelimsProbability: finishProbability(finiteDays, daysAvailable),
    mainsProbability: finishProbability(finiteDays, mainsDays),
    requiredDailyMinutes,
  };
}

export const PACE_META: Record<
  PaceStatus,
  { label: string; className: string }
> = {
  "on-track": {
    label: "On track",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  tight: {
    label: "Tight",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  behind: {
    label: "Behind pace",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};
