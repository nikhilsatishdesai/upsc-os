import { addDays, todayStr } from "@/lib/planner/dates";
import type {
  AnswerAttempt,
  AnswerMarks,
  RubricKey,
  RubricScores,
} from "./types";

/**
 * Pure answer-writing logic: word counts, the self-evaluation rubric, the
 * marks estimate and practice statistics. No store or UI imports.
 */

export const RUBRIC: { key: RubricKey; label: string; hint: string }[] = [
  {
    key: "demand",
    label: "Answered the exact demand",
    hint: "Every part of the question and its directive (discuss / critically examine / comment) addressed.",
  },
  {
    key: "intro",
    label: "Sharp introduction",
    hint: "Definition, thinker or contemporary hook — not a generic opening.",
  },
  {
    key: "theory",
    label: "Thinkers & theory",
    hint: "2–3 relevant thinkers, schools or concepts used accurately.",
  },
  {
    key: "perspectives",
    label: "Multiple perspectives",
    hint: "Competing views shown: for/against, liberal/Marxist/feminist, envisaged vs actual.",
  },
  {
    key: "evidence",
    label: "Examples & evidence",
    hint: "Judgments, articles, data, committees or current events anchoring the argument.",
  },
  {
    key: "structure",
    label: "Structure & presentation",
    hint: "Logical flow, short paragraphs, sub-headings or a diagram where useful.",
  },
  {
    key: "conclusion",
    label: "Balanced conclusion",
    hint: "Forward-looking, ties back to the question; within word and time limits.",
  },
];

export const RUBRIC_MAX = RUBRIC.length * 2;

/** Whitespace-separated tokens containing a letter or digit — so bullet
 * dashes and heading marks don't count, hyphenated words count once. */
export function countWords(text: string): number {
  return text
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Share of the rubric achieved (0–100), or null when nothing is scored. */
export function rubricPercent(rubric: RubricScores): number | null {
  const scored = RUBRIC.filter((item) => rubric[item.key] !== undefined);
  if (scored.length === 0) return null;
  const total = RUBRIC.reduce((sum, item) => sum + (rubric[item.key] ?? 0), 0);
  return Math.round((total / RUBRIC_MAX) * 100);
}

/**
 * A realistic marks estimate from the rubric. Optional answers rarely earn
 * above ~65% of the marks even when excellent, and a weak attempt still
 * collects some marks — so the rubric maps onto a 20%–65% band.
 */
export function estimateMarks(
  marks: AnswerMarks,
  rubric: RubricScores,
): number | null {
  const percent = rubricPercent(rubric);
  if (percent === null) return null;
  const share = 0.2 + 0.45 * (percent / 100);
  return Math.round(marks * share * 2) / 2;
}

/** The weakest rubric criteria (scored 0 or 1), worst first. */
export function weakestCriteria(rubric: RubricScores): RubricKey[] {
  return RUBRIC.filter((item) => (rubric[item.key] ?? 2) < 2)
    .sort((a, b) => (rubric[a.key] ?? 0) - (rubric[b.key] ?? 0))
    .map((item) => item.key);
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type PracticeStats = {
  total: number;
  thisWeek: number;
  /** Consecutive days (ending today or yesterday) with ≥1 answer. */
  streak: number;
  /** Average rubric % across self-evaluated answers. */
  averagePercent: number | null;
  /** Share of answers written within their time limit. */
  onTimePercent: number | null;
  /** Rubric criterion with the lowest average — the next thing to fix. */
  focusCriterion: RubricKey | null;
  byPaper: { psir1: number; psir2: number; other: number };
};

function localDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function practiceStats(
  attempts: AnswerAttempt[],
  today: string = todayStr(),
): PracticeStats {
  const weekStart = addDays(today, -6);
  const days = new Set(attempts.map((attempt) => localDate(attempt.createdAt)));

  let streak = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const percents = attempts
    .map((attempt) => rubricPercent(attempt.rubric))
    .filter((value): value is number => value !== null);

  const timed = attempts.filter((attempt) => attempt.secondsSpent > 0);
  const onTime = timed.filter(
    (attempt) => attempt.secondsSpent <= attempt.timeLimitSeconds,
  ).length;

  let focusCriterion: RubricKey | null = null;
  let lowest = Number.POSITIVE_INFINITY;
  for (const item of RUBRIC) {
    const scores = attempts
      .map((attempt) => attempt.rubric[item.key])
      .filter((score): score is 0 | 1 | 2 => score !== undefined);
    if (scores.length === 0) continue;
    const average = scores.reduce<number>((sum, score) => sum + score, 0) / scores.length;
    if (average < lowest && average < 2) {
      lowest = average;
      focusCriterion = item.key;
    }
  }

  const byPaper = { psir1: 0, psir2: 0, other: 0 };
  for (const attempt of attempts) {
    if (attempt.topicId?.startsWith("mains.psir1.")) byPaper.psir1 += 1;
    else if (attempt.topicId?.startsWith("mains.psir2.")) byPaper.psir2 += 1;
    else byPaper.other += 1;
  }

  return {
    total: attempts.length,
    thisWeek: attempts.filter((attempt) => {
      const day = localDate(attempt.createdAt);
      return day >= weekStart && day <= today;
    }).length,
    streak,
    averagePercent:
      percents.length === 0
        ? null
        : Math.round(percents.reduce((a, b) => a + b, 0) / percents.length),
    onTimePercent:
      timed.length === 0 ? null : Math.round((onTime / timed.length) * 100),
    focusCriterion,
    byPaper,
  };
}
