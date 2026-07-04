import type { TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { addDays, startOfMonth, startOfWeek, todayStr } from "./dates";
import { buildWorkPool } from "./workload";
import type { PlannedTask } from "./types";

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
