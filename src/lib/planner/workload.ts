import { getAllNodes, isLeaf } from "@/lib/syllabus";
import {
  getTopicState,
  stageAtLeast,
  type Difficulty,
  type TopicState,
  type TopicStateMap,
} from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";
import { todayStr } from "./dates";
import { resolveTopicIntel, unitIdOf, paperIdOf } from "./intel";
import { priorityScore, type PriorityContext } from "./priority";

/** Minutes a full first reading of this topic takes, given its resolved
 * difficulty and estimate (user override → curated → default). */
export function effectiveEstimate(topicId: string, state: TopicState): number {
  const intel = resolveTopicIntel(topicId, state);
  return Math.round(
    intel.estimatedMinutes *
      PLANNER_CONFIG.difficultyMultiplier[intel.difficulty],
  );
}

/** Study minutes still needed to finish this topic's first reading. */
export function remainingStudyMinutes(
  topicId: string,
  state: TopicState,
): number {
  if (state.stage !== "not-started") return 0;
  return Math.max(0, effectiveEstimate(topicId, state) - state.studiedMinutes);
}

/** Minutes one spaced-revision session of this topic takes. */
export function revisionMinutes(topicId: string, state: TopicState): number {
  const intel = resolveTopicIntel(topicId, state);
  const minutes =
    Math.round(
      (intel.estimatedMinutes *
        PLANNER_CONFIG.difficultyMultiplier[intel.difficulty] *
        intel.revisionWeight) /
        5,
    ) * 5;
  return Math.max(PLANNER_CONFIG.minTaskMinutes, minutes);
}

/** True when the topic still has spaced revisions ahead of it.
 * `totalRevisions` supports custom interval schedules of any length. */
export function needsRevisions(
  state: TopicState,
  totalRevisions: number = PLANNER_CONFIG.revisionIntervals.length,
): boolean {
  return (
    stageAtLeast(state.stage, "first-reading") &&
    !stageAtLeast(state.stage, "exam-ready") &&
    state.revisionCount < totalRevisions
  );
}

export type WorkItem = {
  topicId: string;
  /** Minutes still to schedule (mutated by the scheduler as it plans). */
  remaining: number;
  /** Exam stage ("prelims"/"mains") — top level of the rotation. */
  stageId: string;
  /** Paper node id — second level of the rotation. */
  paperId: string;
  /** Unit node id — third level of the rotation ("subject" bucket). */
  unitId: string;
  /** Dynamic priority score — higher schedules earlier within a unit. */
  score: number;
  difficulty: Difficulty;
  /** Reading already begun — gets continuity treatment (finish first). */
  started: boolean;
};

/** A topic whose spaced revision is due on or before a given date. */
export type RevisionDue = {
  topicId: string;
  dueDate: string;
  minutes: number;
  score: number;
  difficulty: Difficulty;
};

const defaultContext = (): PriorityContext => ({
  today: todayStr(),
  examDate: "",
});

/**
 * Every leaf topic that still needs first-reading time, in syllabus order,
 * scored by the dynamic priority engine. `alreadyPlanned` subtracts minutes
 * covered by pinned pending tasks so a replan never double-books a topic.
 */
export function buildWorkPool(
  topics: TopicStateMap,
  alreadyPlanned: Map<string, number> = new Map(),
  ctx: PriorityContext = defaultContext(),
): WorkItem[] {
  const pool: WorkItem[] = [];
  for (const node of getAllNodes()) {
    if (!isLeaf(node)) continue;
    const state = getTopicState(topics, node.id);
    const remaining =
      remainingStudyMinutes(node.id, state) -
      (alreadyPlanned.get(node.id) ?? 0);
    if (remaining > 0) {
      const intel = resolveTopicIntel(node.id, state);
      pool.push({
        topicId: node.id,
        remaining,
        stageId: node.id.split(".")[0],
        paperId: paperIdOf(node.id),
        unitId: unitIdOf(node.id),
        score: priorityScore(node.id, state, ctx).total,
        difficulty: intel.difficulty,
        started: state.studiedMinutes > 0,
      });
    }
  }
  return pool;
}

/**
 * Topics with a spaced revision due on or before `byDate`, most urgent
 * first (earlier due date, then higher dynamic score). `excludeTopics`
 * skips topics already covered by pinned revision tasks.
 */
export function buildRevisionQueue(
  topics: TopicStateMap,
  byDate: string,
  excludeTopics: Set<string> = new Set(),
  totalRevisions: number = PLANNER_CONFIG.revisionIntervals.length,
  ctx: PriorityContext = defaultContext(),
): RevisionDue[] {
  const due: RevisionDue[] = [];
  for (const topicId of Object.keys(topics)) {
    if (excludeTopics.has(topicId)) continue;
    const state = getTopicState(topics, topicId);
    if (!needsRevisions(state, totalRevisions)) continue;
    if (!state.nextRevisionAt || state.nextRevisionAt > byDate) continue;
    const intel = resolveTopicIntel(topicId, state);
    due.push({
      topicId,
      dueDate: state.nextRevisionAt,
      minutes: revisionMinutes(topicId, state),
      score: priorityScore(topicId, state, ctx).total,
      difficulty: intel.difficulty,
    });
  }
  due.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      b.score - a.score ||
      a.topicId.localeCompare(b.topicId),
  );
  return due;
}

/** Total unscheduled first-reading minutes across the syllabus. */
export function totalRemainingMinutes(topics: TopicStateMap): number {
  return buildWorkPool(topics).reduce((sum, item) => sum + item.remaining, 0);
}
