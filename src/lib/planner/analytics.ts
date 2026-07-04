import { getTopicState, type Difficulty, type TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { weeklyCapacityMinutes } from "./capacity";
import { addDays, startOfMonth, startOfWeek, todayStr } from "./dates";
import { paperShortName, resolveTopicIntel } from "./intel";
import { buildWorkPool } from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

/** Date a completed task actually counts towards (its completion day). */
function completionDate(task: PlannedTask): string | null {
  if (task.status !== "completed") return null;
  return task.completedAt ? task.completedAt.slice(0, 10) : task.date;
}

/** Minutes of completed study per day for the trailing `days` window. */
export function dailyStudyMinutes(
  tasks: PlannedTask[],
  days: number = PLANNER_CONFIG.hoursChartDays,
  today: string = todayStr(),
): { date: string; minutes: number }[] {
  const minutesByDate = new Map<string, number>();
  for (const task of tasks) {
    const date = completionDate(task);
    if (date) {
      minutesByDate.set(date, (minutesByDate.get(date) ?? 0) + task.minutes);
    }
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { date, minutes: minutesByDate.get(date) ?? 0 };
  });
}

export type CompletionRate = {
  planned: number;
  completed: number;
  percent: number;
};

/** Completion of tasks dated within [from, to]. */
export function completionRate(
  tasks: PlannedTask[],
  from: string,
  to: string,
): CompletionRate {
  let planned = 0;
  let completed = 0;
  for (const task of tasks) {
    if (task.date < from || task.date > to) continue;
    planned += 1;
    if (task.status === "completed") completed += 1;
  }
  return {
    planned,
    completed,
    percent: planned === 0 ? 0 : Math.round((completed / planned) * 100),
  };
}

export function weeklyCompletion(
  tasks: PlannedTask[],
  today: string = todayStr(),
): CompletionRate {
  return completionRate(tasks, startOfWeek(today), today);
}

export function monthlyCompletion(
  tasks: PlannedTask[],
  today: string = todayStr(),
): CompletionRate {
  return completionRate(tasks, startOfMonth(today), today);
}

/** Consecutive days with completed study, counting back from today
 * (yesterday, if today has none yet). */
export function currentStreak(
  tasks: PlannedTask[],
  today: string = todayStr(),
): number {
  const activeDays = new Set<string>();
  for (const task of tasks) {
    const date = completionDate(task);
    if (date) activeDays.add(date);
  }
  let cursor = activeDays.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Share of the trailing window's days that had completed study (0–100). */
export function consistency(
  tasks: PlannedTask[],
  windowDays: number = PLANNER_CONFIG.consistencyWindowDays,
  today: string = todayStr(),
): number {
  const daily = dailyStudyMinutes(tasks, windowDays, today);
  const activeDays = daily.filter((day) => day.minutes > 0).length;
  return Math.round((activeDays / windowDays) * 100);
}

/** Pending minutes scheduled in the next `days` days (including today). */
export function upcomingPendingMinutes(
  tasks: PlannedTask[],
  days: number = 7,
  today: string = todayStr(),
): number {
  const to = addDays(today, days - 1);
  return tasks
    .filter(
      (task) =>
        task.status === "pending" && task.date >= today && task.date <= to,
    )
    .reduce((sum, task) => sum + task.minutes, 0);
}

export type TodaySummary = {
  plannedMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  pendingCount: number;
  completedCount: number;
  percent: number;
};

export function todaySummary(
  tasks: PlannedTask[],
  today: string = todayStr(),
): TodaySummary {
  let plannedMinutes = 0;
  let completedMinutes = 0;
  let remainingMinutes = 0;
  let pendingCount = 0;
  let completedCount = 0;
  for (const task of tasks) {
    if (task.date !== today || task.status === "skipped") continue;
    plannedMinutes += task.minutes;
    if (task.status === "completed") {
      completedMinutes += task.minutes;
      completedCount += 1;
    } else if (task.status === "pending") {
      remainingMinutes += task.minutes;
      pendingCount += 1;
    }
  }
  return {
    plannedMinutes,
    completedMinutes,
    remainingMinutes,
    pendingCount,
    completedCount,
    percent:
      plannedMinutes === 0
        ? 0
        : Math.round((completedMinutes / plannedMinutes) * 100),
  };
}

/** Missed tasks in the trailing week — "overdue work" surfaced to the user. */
export function recentMissed(
  tasks: PlannedTask[],
  days: number = 7,
  today: string = todayStr(),
): PlannedTask[] {
  const from = addDays(today, -days);
  return tasks.filter(
    (task) =>
      task.status === "missed" && task.date >= from && task.date < today,
  );
}

export type RemainingSyllabus = {
  topics: number;
  minutes: number;
};

/** Unstudied workload left across the whole syllabus. */
export function remainingSyllabus(topics: TopicStateMap): RemainingSyllabus {
  const pool = buildWorkPool(topics);
  return {
    topics: pool.length,
    minutes: pool.reduce((sum, item) => sum + item.remaining, 0),
  };
}

/** Completed study minutes grouped by paper, largest first. */
export function subjectDistribution(
  tasks: PlannedTask[],
): { paper: string; minutes: number }[] {
  const byPaper = new Map<string, number>();
  for (const task of tasks) {
    if (task.status !== "completed") continue;
    const paper = paperShortName(task.topicId);
    byPaper.set(paper, (byPaper.get(paper) ?? 0) + task.minutes);
  }
  return [...byPaper.entries()]
    .map(([paper, minutes]) => ({ paper, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Planned minutes in the coming week by resolved difficulty. */
export function difficultyDistribution(
  tasks: PlannedTask[],
  topics: TopicStateMap,
  today: string = todayStr(),
  days: number = 7,
): Record<Difficulty, number> {
  const to = addDays(today, days - 1);
  const result: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const task of tasks) {
    if (task.date < today || task.date > to) continue;
    if (task.status !== "pending" && task.status !== "completed") continue;
    const intel = resolveTopicIntel(
      task.topicId,
      getTopicState(topics, task.topicId),
    );
    result[intel.difficulty] += task.minutes;
  }
  return result;
}

export type RevisionShare = {
  revisionMinutes: number;
  studyMinutes: number;
  /** Revision share of the coming week's plan, 0–100. */
  percent: number;
};

/** Revision vs fresh-study split of the coming week's plan. */
export function revisionShare(
  tasks: PlannedTask[],
  today: string = todayStr(),
  days: number = 7,
): RevisionShare {
  const to = addDays(today, days - 1);
  let revision = 0;
  let study = 0;
  for (const task of tasks) {
    if (task.date < today || task.date > to || task.status === "skipped")
      continue;
    if (task.status !== "pending" && task.status !== "completed") continue;
    if (task.kind === "revision") revision += task.minutes;
    else study += task.minutes;
  }
  const total = revision + study;
  return {
    revisionMinutes: revision,
    studyMinutes: study,
    percent: total === 0 ? 0 : Math.round((revision / total) * 100),
  };
}

export type BurnoutLevel = "sustainable" | "elevated" | "high";

export type BurnoutIndicator = {
  /** 0 (fresh) – 100 (overloaded). */
  score: number;
  level: BurnoutLevel;
  /** Coming week's planned load vs capacity (0–1+). */
  loadRatio: number;
  consecutiveDays: number;
  /** Share of the coming week that is hard material (0–1). */
  hardShare: number;
};

export const BURNOUT_META: Record<
  BurnoutLevel,
  { label: string; className: string }
> = {
  sustainable: {
    label: "Sustainable",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  elevated: {
    label: "Elevated",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  high: {
    label: "High",
    className:
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

/**
 * Burnout indicator combining load (planned vs capacity), fatigue
 * (consecutive study days) and strain (share of hard material ahead).
 */
export function burnoutIndicator(
  tasks: PlannedTask[],
  topics: TopicStateMap,
  settings: PlannerSettings,
  today: string = todayStr(),
): BurnoutIndicator {
  const cfg = PLANNER_CONFIG.burnout;
  const weekCapacity = weeklyCapacityMinutes(settings);
  const planned = upcomingPendingMinutes(tasks, 7, today);
  const loadRatio = weekCapacity === 0 ? 1 : planned / weekCapacity;

  const consecutiveDays = currentStreak(tasks, today);

  const byDifficulty = difficultyDistribution(tasks, topics, today, 7);
  const weekTotal = byDifficulty.easy + byDifficulty.medium + byDifficulty.hard;
  const hardShare = weekTotal === 0 ? 0 : byDifficulty.hard / weekTotal;

  const score = Math.round(
    cfg.loadWeight * Math.min(1, loadRatio / cfg.loadDanger) +
      cfg.streakWeight * Math.min(1, consecutiveDays / cfg.streakDanger) +
      cfg.hardWeight * Math.min(1, hardShare / cfg.hardShareDanger),
  );
  const level: BurnoutLevel =
    score >= cfg.highAt
      ? "high"
      : score >= cfg.elevatedAt
        ? "elevated"
        : "sustainable";

  return { score, level, loadRatio, consecutiveDays, hardShare };
}
