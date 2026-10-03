import { addDays, diffDays, todayStr, weekdayOf } from "@/lib/planner/dates";
import type { PlannedTask } from "@/lib/planner/types";
import type { AnswerAttempt } from "@/lib/practice/types";
import type { TimelineEvent } from "@/lib/knowledge/types";
import { getLeafIds } from "@/lib/syllabus";
import {
  getTopicState,
  stageAtLeast,
  type TopicStateMap,
} from "@/lib/stages";

/**
 * Personal targets: weekly goals the student sets for themselves and
 * first-reading deadlines per paper. Pure progress maths — no stores.
 */

export type WeeklyTargets = {
  studyHours: number | null;
  sessions: number | null;
  answers: number | null;
  flashcardReviews: number | null;
};

export type Targets = WeeklyTargets & {
  /** Paper id → date (YYYY-MM-DD) to finish every first reading by. */
  paperDeadlines: Record<string, string>;
};

export const EMPTY_TARGETS: Targets = {
  studyHours: null,
  sessions: null,
  answers: null,
  flashcardReviews: null,
  paperDeadlines: {},
};

export const WEEKLY_TARGET_META: Record<
  keyof WeeklyTargets,
  { label: string; unit: string; max: number; step: number; hint: string }
> = {
  studyHours: { label: "Study hours", unit: "h", max: 100, step: 1, hint: "Completed planner sessions" },
  sessions: { label: "Sessions completed", unit: "", max: 60, step: 1, hint: "Study + revision sessions ticked off" },
  answers: { label: "Answers written", unit: "", max: 50, step: 1, hint: "Timed answers in Answer Writing" },
  flashcardReviews: { label: "Flashcard reviews", unit: "", max: 1000, step: 10, hint: "Cards reviewed in review mode" },
};

/** Monday-to-Sunday week containing `today`. */
export function currentWeek(today: string = todayStr()): { start: string; end: string } {
  const offset = (weekdayOf(today) + 6) % 7; // Monday = 0
  const start = addDays(today, -offset);
  return { start, end: addDays(start, 6) };
}

function localDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type TargetProgress = {
  key: keyof WeeklyTargets;
  label: string;
  current: number;
  target: number;
  unit: string;
  percent: number;
  met: boolean;
};

export function weeklyTargetProgress(input: {
  targets: WeeklyTargets;
  tasks: PlannedTask[];
  answers: AnswerAttempt[];
  events: TimelineEvent[];
  today?: string;
}): TargetProgress[] {
  const { start, end } = currentWeek(input.today);
  const inWeek = (iso: string | null) => {
    if (!iso) return false;
    const day = localDate(iso);
    return day >= start && day <= end;
  };
  const completed = input.tasks.filter(
    (task) => task.status === "completed" && inWeek(task.completedAt),
  );
  const actual: Record<keyof WeeklyTargets, number> = {
    studyHours:
      Math.round(
        (completed.reduce((sum, task) => sum + task.minutes, 0) / 60) * 10,
      ) / 10,
    sessions: completed.length,
    answers: input.answers.filter((answer) => inWeek(answer.createdAt)).length,
    flashcardReviews: input.events.filter(
      (event) => event.type === "flashcard-reviewed" && inWeek(event.at),
    ).length,
  };

  return (Object.keys(WEEKLY_TARGET_META) as (keyof WeeklyTargets)[])
    .filter((key) => {
      const target = input.targets[key];
      return typeof target === "number" && target > 0;
    })
    .map((key) => {
      const target = input.targets[key] as number;
      const current = actual[key];
      return {
        key,
        label: WEEKLY_TARGET_META[key].label,
        current,
        target,
        unit: WEEKLY_TARGET_META[key].unit,
        percent: Math.min(100, Math.round((current / target) * 100)),
        met: current >= target,
      };
    });
}

export type DeadlineStatus = {
  paperId: string;
  deadline: string;
  total: number;
  done: number;
  remaining: number;
  daysLeft: number;
  /** Topics per week needed from today to make the deadline. */
  requiredPerWeek: number;
  /** First readings touched per week over the last four weeks. */
  recentPerWeek: number;
  status: "done" | "on-track" | "behind" | "overdue";
};

/** How a paper is tracking against its personal first-reading deadline. */
export function paperDeadlineStatus(
  topics: TopicStateMap,
  paperId: string,
  deadline: string,
  today: string = todayStr(),
): DeadlineStatus {
  const leaves = getLeafIds(paperId).filter(
    (id) => getTopicState(topics, id).planState !== "excluded",
  );
  const doneIds = leaves.filter((id) =>
    stageAtLeast(getTopicState(topics, id).stage, "first-reading"),
  );
  const remaining = leaves.length - doneIds.length;
  const daysLeft = diffDays(today, deadline);
  const windowStart = addDays(today, -27);
  const recent = doneIds.filter((id) => {
    const last = getTopicState(topics, id).lastStudiedAt;
    return last !== null && last >= windowStart && last <= today;
  }).length;
  const recentPerWeek = Math.round((recent / 4) * 10) / 10;
  const requiredPerWeek =
    remaining === 0
      ? 0
      : daysLeft <= 0
        ? remaining
        : Math.round(((remaining / daysLeft) * 7) * 10) / 10;

  const status: DeadlineStatus["status"] =
    remaining === 0
      ? "done"
      : daysLeft < 0
        ? "overdue"
        : recentPerWeek >= requiredPerWeek
          ? "on-track"
          : "behind";

  return {
    paperId,
    deadline,
    total: leaves.length,
    done: doneIds.length,
    remaining,
    daysLeft,
    requiredPerWeek,
    recentPerWeek,
    status,
  };
}
