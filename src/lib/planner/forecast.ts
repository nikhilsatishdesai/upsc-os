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
import type { PlannerSettings } from "./types";

export type PaceStatus = "on-track" | "tight" | "behind";

export type CompletionForecast = {
  /** First-reading minutes still to study. */
  remainingStudyMinutes: number;
  /** Spaced-revision minutes still ahead (including for unstudied topics). */
  remainingRevisionMinutes: number;
  totalRemainingMinutes: number;
  weeklyCapacityMinutes: number;
  monthlyCapacityMinutes: number;
  averageDailyMinutes: number;
  /** Calendar days needed at the current settings. */
  daysRequired: number;
  /** null when there is no capacity at all. */
  expectedCompletionDate: string | null;
  /** Days from today to Prelims; null when no exam date is set. */
  daysAvailable: number | null;
  paceStatus: PaceStatus | null;
  /** Daily minutes needed to finish by Prelims; null without an exam date. */
  requiredDailyMinutes: number | null;
};

/**
 * The study-capacity engine: total workload ahead (readings + all pending
 * spaced revisions) measured against the user's real weekly capacity, with
 * an expected completion date and a pace verdict against the Prelims date.
 */
export function computeForecast(
  topics: TopicStateMap,
  settings: PlannerSettings,
  prelimsDate: string | "",
  today: string,
): CompletionForecast {
  const totalRevisions = PLANNER_CONFIG.revisionIntervals.length;
  let studyMinutes = 0;
  let revisionMinutesLeft = 0;

  for (const node of getAllNodes()) {
    if (!isLeaf(node)) continue;
    const state = getTopicState(topics, node.id);
    if (state.stage === "not-started") {
      studyMinutes += remainingStudyMinutes(node.id, state);
      revisionMinutesLeft += totalRevisions * revisionMinutes(node.id, state);
    } else if (needsRevisions(state)) {
      revisionMinutesLeft +=
        (totalRevisions - state.revisionCount) *
        revisionMinutes(node.id, state);
    }
  }

  const total = studyMinutes + revisionMinutesLeft;
  const weekly = weeklyCapacityMinutes(settings);
  const averageDaily = weekly / 7;
  const daysRequired =
    averageDaily > 0 ? Math.ceil(total / averageDaily) : Number.POSITIVE_INFINITY;
  const expectedCompletionDate = Number.isFinite(daysRequired)
    ? addDays(today, daysRequired)
    : null;

  const daysAvailable = prelimsDate ? diffDays(today, prelimsDate) : null;
  let paceStatus: PaceStatus | null = null;
  let requiredDailyMinutes: number | null = null;
  if (daysAvailable !== null && daysAvailable > 0) {
    requiredDailyMinutes = Math.ceil(total / daysAvailable);
    if (daysRequired <= daysAvailable - PLANNER_CONFIG.forecastBufferDays) {
      paceStatus = "on-track";
    } else if (daysRequired <= daysAvailable) {
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
    averageDailyMinutes: Math.round(averageDaily),
    daysRequired: Number.isFinite(daysRequired) ? daysRequired : 0,
    expectedCompletionDate,
    daysAvailable,
    paceStatus,
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
