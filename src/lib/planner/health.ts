import type { TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import {
  burnoutIndicator,
  consistency,
  weeklyCompletion,
} from "./analytics";
import { effectiveConfidence } from "./confidence";
import { todayStr } from "./dates";
import { computeForecast } from "./forecast";
import { buildRevisionQueue } from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

export type HealthComponentKey =
  | "consistency"
  | "completion"
  | "revision"
  | "burnout"
  | "confidence"
  | "pace"
  | "stability";

export type HealthComponent = {
  key: HealthComponentKey;
  label: string;
  /** 0–100. */
  score: number;
  /** Contribution weight (config-driven, sums to 100). */
  weight: number;
};

export type StudyHealth = {
  /** 0–100 weighted preparation health index. */
  score: number;
  band: "excellent" | "good" | "fair" | "poor";
  components: HealthComponent[];
};

export type HealthInput = {
  tasks: PlannedTask[];
  topics: TopicStateMap;
  settings: PlannerSettings;
  examDate: string;
  today?: string;
};

/**
 * Holistic preparation health — a planning instrument, not gamification.
 * Combines behaviour (consistency, completion, stability), workload state
 * (revision backlog, burnout) and outlook (confidence, pace) into one
 * weighted index with a full component breakdown.
 */
export function studyHealth(input: HealthInput): StudyHealth {
  const { tasks, topics, settings, examDate } = input;
  const today = input.today ?? todayStr();
  const weights = PLANNER_CONFIG.healthWeights;

  // Behaviour.
  const consistencyScore = consistency(
    tasks,
    PLANNER_CONFIG.consistencyWindowDays,
    today,
  );
  const week = weeklyCompletion(tasks, today);
  const completionScore = week.planned === 0 ? 50 : week.percent;

  let missed = 0;
  let completed = 0;
  for (const task of tasks) {
    if (task.status === "missed") missed += 1;
    if (task.status === "completed") completed += 1;
  }
  const missedRatio =
    missed + completed === 0 ? 0 : missed / (missed + completed);
  const stabilityScore = Math.round(
    100 * Math.max(0, 1 - missedRatio / PLANNER_CONFIG.missedRatioDanger),
  );

  // Workload state.
  const backlog = buildRevisionQueue(
    topics,
    today,
    new Set(),
    settings.revisionIntervals.length,
  ).length;
  const revisionScore = Math.round(
    100 * Math.max(0, 1 - backlog / PLANNER_CONFIG.revisionBacklogDanger),
  );
  const burnout = burnoutIndicator(tasks, topics, settings, today);
  const burnoutScore = 100 - burnout.score;

  // Outlook.
  const touched = Object.keys(topics).filter(
    (id) => topics[id].stage !== "not-started" || topics[id].studiedMinutes > 0,
  );
  let confidenceScore = 50;
  if (touched.length > 0) {
    const avg =
      touched.reduce(
        (sum, id) =>
          sum + effectiveConfidence(id, topics[id], today).value,
        0,
      ) / touched.length;
    confidenceScore = Math.round(((avg - 1) / 4) * 100);
  }
  const forecast = computeForecast(topics, settings, examDate, today, tasks);
  const paceScore =
    forecast.paceStatus === "on-track"
      ? 100
      : forecast.paceStatus === "tight"
        ? 65
        : forecast.paceStatus === "behind"
          ? 25
          : 70;

  const components: HealthComponent[] = [
    { key: "consistency", label: "Consistency", score: consistencyScore, weight: weights.consistency },
    { key: "completion", label: "Weekly completion", score: completionScore, weight: weights.completion },
    { key: "revision", label: "Revision health", score: revisionScore, weight: weights.revision },
    { key: "burnout", label: "Sustainability", score: burnoutScore, weight: weights.burnout },
    { key: "confidence", label: "Confidence", score: confidenceScore, weight: weights.confidence },
    { key: "pace", label: "Pace vs Prelims", score: paceScore, weight: weights.pace },
    { key: "stability", label: "Plan stability", score: stabilityScore, weight: weights.stability },
  ];

  const score = Math.round(
    components.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0),
  );
  const bands = PLANNER_CONFIG.healthBands;
  const band =
    score >= bands.excellentAt
      ? "excellent"
      : score >= bands.goodAt
        ? "good"
        : score >= bands.fairAt
          ? "fair"
          : "poor";

  return { score, band, components };
}

export const HEALTH_BAND_META: Record<
  StudyHealth["band"],
  { label: string; className: string }
> = {
  excellent: {
    label: "Excellent",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  good: {
    label: "Good",
    className:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  fair: {
    label: "Fair",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  poor: {
    label: "Needs care",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};
