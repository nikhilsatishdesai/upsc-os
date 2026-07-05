import { getLeafIds, getStages } from "@/lib/syllabus";
import { getTopicState, type TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import {
  burnoutIndicator,
  consistency,
  weeklyCompletion,
} from "./analytics";
import { effectiveConfidence } from "./confidence";
import { diffDays, formatDateLong, todayStr } from "./dates";
import { computeForecast } from "./forecast";
import { buildRevisionQueue } from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

export type RecommendationLevel = "warning" | "info" | "success";

export type Recommendation = {
  id: string;
  level: RecommendationLevel;
  title: string;
  /** The WHY — every recommendation explains itself. */
  why: string;
};

export type RecommendationInput = {
  tasks: PlannedTask[];
  topics: TopicStateMap;
  settings: PlannerSettings;
  examDate: string;
  today?: string;
};

const LEVEL_ORDER: RecommendationLevel[] = ["warning", "info", "success"];

/**
 * The recommendation engine: a rule set over the forecast, burnout,
 * backlog, behaviour and confidence engines. Pure and deterministic;
 * every rule states its reason. Rules are evaluated independently so new
 * ones can be added without touching the others.
 */
export function buildRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const { tasks, topics, settings, examDate } = input;
  const today = input.today ?? todayStr();
  const cfg = PLANNER_CONFIG.recommendations;
  const items: Recommendation[] = [];

  const forecast = computeForecast(topics, settings, examDate, today, tasks);

  // Pace rules.
  if (forecast.paceStatus === "behind" && forecast.requiredDailyMinutes) {
    const extra = Math.max(
      5,
      Math.round(
        (forecast.requiredDailyMinutes - forecast.effectiveDailyMinutes) / 5,
      ) * 5,
    );
    items.push({
      id: "pace-behind",
      level: "warning",
      title: `Add ~${extra} minutes of study per day`,
      why: `At the current pace the syllabus needs ${forecast.daysRequired} days but only ${forecast.daysAvailable} remain before Prelims. Alternatives: trim Low-priority topics or switch weekends to revision-only in Planner settings.`,
    });
  } else if (forecast.paceStatus === "tight") {
    items.push({
      id: "pace-tight",
      level: "info",
      title: "Schedule is tight — protect your routine",
      why: `Expected completion ${
        forecast.expectedCompletionDate
          ? formatDateLong(forecast.expectedCompletionDate)
          : "—"
      } lands close to Prelims (${forecast.prelimsProbability ?? "—"}% finish probability). Missed days now are hard to absorb.`,
    });
  } else if (
    forecast.paceStatus === "on-track" &&
    forecast.daysAvailable !== null &&
    forecast.daysRequired <=
      forecast.daysAvailable - 2 * PLANNER_CONFIG.forecastBufferDays
  ) {
    items.push({
      id: "ahead",
      level: "success",
      title: "You are ahead of schedule",
      why: `The remaining workload needs ${forecast.daysRequired} days and ${forecast.daysAvailable} are available — a ${forecast.prelimsProbability}% probability of finishing before Prelims. Deeper notes or extra revisions are affordable.`,
    });
  }

  // Revision backlog.
  const backlog = buildRevisionQueue(
    topics,
    today,
    new Set(),
    settings.revisionIntervals.length,
  );
  if (backlog.length >= cfg.backlogWarning) {
    items.push({
      id: "backlog",
      level: "warning",
      title: "Revision backlog is growing",
      why: `${backlog.length} revisions are due or overdue. The planner front-loads them (up to 60% of each day)${
        settings.weekendStrategy !== "revision-heavy"
          ? "; switching the weekend strategy to revision-focused would clear it faster"
          : ""
      }.`,
    });
  }

  // Burnout.
  const burnout = burnoutIndicator(tasks, topics, settings, today);
  if (burnout.level !== "sustainable") {
    items.push({
      id: "burnout",
      level: burnout.level === "high" ? "warning" : "info",
      title:
        burnout.level === "high"
          ? "Burnout risk is high — ease off"
          : "Burnout risk is elevated",
      why: `${burnout.consecutiveDays} consecutive study days, coming week at ${Math.round(
        burnout.loadRatio * 100,
      )}% of capacity, ${Math.round(
        burnout.hardShare * 100,
      )}% hard material. The planner is already damping future days; a lighter day or an off day protects consistency.`,
    });
  }

  // Behaviour.
  const week = weeklyCompletion(tasks, today);
  if (
    week.planned >= cfg.strongWeekMinTasks &&
    week.percent >= cfg.strongWeekAt
  ) {
    items.push({
      id: "strong-week",
      level: "success",
      title: "Strong progress this week",
      why: `${week.completed} of ${week.planned} planned sessions completed (${week.percent}%). Consistency like this compounds.`,
    });
  }
  const consistencyScore = consistency(
    tasks,
    PLANNER_CONFIG.consistencyWindowDays,
    today,
  );
  const hasHistory = tasks.some((t) => t.status !== "pending");
  if (hasHistory && consistencyScore < cfg.lowConsistencyAt) {
    items.push({
      id: "consistency",
      level: "info",
      title: "Consistency beats intensity",
      why: `Study happened on ${consistencyScore}% of the last ${PLANNER_CONFIG.consistencyWindowDays} days. One completed session a day moves the forecast more than occasional marathons.`,
    });
  }

  // Falling confidence by paper (studied topics only).
  let weakest: { title: string; avg: number } | null = null;
  for (const { papers } of getStages()) {
    for (const paper of papers) {
      const studied = getLeafIds(paper.id).filter((id) => {
        const state = getTopicState(topics, id);
        return state.stage !== "not-started" || state.studiedMinutes > 0;
      });
      if (studied.length < cfg.paperConfidenceMinTopics) continue;
      const avg =
        studied.reduce(
          (sum, id) =>
            sum +
            effectiveConfidence(id, getTopicState(topics, id), today).value,
          0,
        ) / studied.length;
      if (avg < cfg.paperConfidenceWarning && (!weakest || avg < weakest.avg)) {
        weakest = { title: paper.title, avg };
      }
    }
  }
  if (weakest) {
    items.push({
      id: "confidence-falling",
      level: "warning",
      title: `${shortPaperTitle(weakest.title)} confidence is falling`,
      why: `Average effective confidence there is ${weakest.avg.toFixed(1)}/5 (revisions overdue, postponements and idle time erode it). The priority engine is already scheduling that material earlier.`,
    });
  }

  // Vacation heads-up.
  if (
    settings.vacationFrom &&
    diffDays(today, settings.vacationFrom) >= 0 &&
    diffDays(today, settings.vacationFrom) <= 7
  ) {
    items.push({
      id: "vacation",
      level: "info",
      title: "Vacation ahead — plan is already adjusted",
      why: `No sessions are scheduled from ${formatDateLong(settings.vacationFrom)}${
        settings.vacationTo ? ` to ${formatDateLong(settings.vacationTo)}` : ""
      }; the workload is redistributed around it.`,
    });
  }

  items.sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );
  return items.slice(0, cfg.maxItems);
}

function shortPaperTitle(title: string): string {
  return title.split("—")[0].trim();
}
