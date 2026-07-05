import { getTopicState, type TopicStateMap } from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { effectiveConfidence } from "./confidence";
import { diffDays, formatDateLong, todayStr } from "./dates";
import { resolveTopicIntel } from "./intel";
import { priorityScore } from "./priority";
import { effectiveEstimate } from "./workload";
import type { PlannedTask, PlannerSettings } from "./types";

/**
 * Planner explanation engine: reconstructs WHY a session was scheduled from
 * the same deterministic scoring the scheduler used — the planner stays
 * transparent without storing prose on every task.
 */
export function explainTask(
  task: PlannedTask,
  topics: TopicStateMap,
  settings: PlannerSettings,
  examDate: string,
  today: string = todayStr(),
): string[] {
  const state = getTopicState(topics, task.topicId);
  const intel = resolveTopicIntel(task.topicId, state);
  const reasons: string[] = [];

  if (task.kind === "revision") {
    const round = Math.min(
      state.revisionCount + (task.status === "completed" ? 0 : 1),
      settings.revisionIntervals.length,
    );
    reasons.push(
      `Spaced revision ${round} of ${settings.revisionIntervals.length} — memory fades without returns at growing intervals (${settings.revisionIntervals.join("/")} days).`,
    );
    if (state.nextRevisionAt) {
      const overdue = diffDays(state.nextRevisionAt, today);
      reasons.push(
        overdue > 0
          ? `It was due ${formatDateLong(state.nextRevisionAt)} — ${overdue} day${overdue === 1 ? "" : "s"} overdue, so it outranks fresh study.`
          : `Due ${formatDateLong(state.nextRevisionAt)}; revisions are placed before new material.`,
      );
    }
    const confidence = effectiveConfidence(task.topicId, state, today);
    if (confidence.reasons.length > 0) {
      reasons.push(
        `Effective confidence ${confidence.value.toFixed(1)}/5: ${confidence.reasons.join("; ")}.`,
      );
    }
    reasons.push(
      `Revisions take at most ${Math.round(PLANNER_CONFIG.revisionShareCap * 100)}% of a day, so fresh study always continues.`,
    );
    return reasons;
  }

  // Study session: the dynamic priority score IS the explanation.
  const score = priorityScore(task.topicId, state, { today, examDate });
  reasons.push(...score.reasons.map((reason) => `${reason}.`));

  if (state.studiedMinutes > 0 && state.stage === "not-started") {
    reasons.push(
      `Continuing a reading already in progress (${state.studiedMinutes} of ~${effectiveEstimate(task.topicId, state)} min done) — started topics finish before new ones begin.`,
    );
  } else {
    reasons.push(
      `${task.minutes} min session towards the ~${effectiveEstimate(task.topicId, state)} min first reading.`,
    );
  }

  reasons.push(
    intel.difficulty === "hard"
      ? `Hard material — capped at ${settings.maxHardPerDay}/day and never back-to-back with other hard sessions.`
      : `Placed by the subject rotation (papers stay balanced) with hard topics spaced around it.`,
  );

  return reasons;
}

/** One-line reasoning summary for the Today's Mission header. */
export function missionReasoning(
  todayTasks: PlannedTask[],
  topics: TopicStateMap,
  settings: PlannerSettings,
  capacityMinutes: number,
): string {
  const active = todayTasks.filter((t) => t.status !== "skipped");
  if (active.length === 0) return "";
  const subjects = new Set<string>();
  let hard = 0;
  let revisions = 0;
  let minutes = 0;
  for (const task of active) {
    subjects.add(task.topicId.split(".").slice(0, 3).join("."));
    minutes += task.minutes;
    if (task.kind === "revision") revisions += 1;
    const intel = resolveTopicIntel(
      task.topicId,
      getTopicState(topics, task.topicId),
    );
    if (intel.difficulty === "hard") hard += 1;
  }
  const parts = [
    `${subjects.size} subject${subjects.size === 1 ? "" : "s"} mixed`,
    `${hard}/${settings.maxHardPerDay} hard slots used`,
  ];
  if (revisions > 0)
    parts.push(`${revisions} revision${revisions === 1 ? "" : "s"} first`);
  if (capacityMinutes > 0)
    parts.push(`${Math.round((minutes / capacityMinutes) * 100)}% of capacity`);
  return `Why this plan: ${parts.join(" · ")}.`;
}
