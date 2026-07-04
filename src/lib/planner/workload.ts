import { getAllNodes, isLeaf, type SyllabusNode } from "@/lib/syllabus";
import {
  getTopicState,
  type TopicState,
  type TopicStateMap,
} from "@/lib/stages";
import { PLANNER_CONFIG } from "./config";

/** Minutes a full first reading of this topic takes, given its difficulty. */
export function effectiveEstimate(state: TopicState): number {
  const base = state.estimatedMinutes ?? PLANNER_CONFIG.defaultTopicMinutes;
  return Math.round(base * PLANNER_CONFIG.difficultyMultiplier[state.difficulty]);
}

/** Study minutes still needed to finish this topic's first reading. */
export function remainingStudyMinutes(state: TopicState): number {
  if (state.stage !== "not-started") return 0;
  return Math.max(0, effectiveEstimate(state) - state.studiedMinutes);
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
};

function bucketOf(node: SyllabusNode): {
  stageId: string;
  paperId: string;
  unitId: string;
} {
  const segments = node.id.split(".");
  return {
    stageId: segments[0],
    paperId: segments.slice(0, 2).join("."),
    unitId: segments.slice(0, Math.min(3, segments.length)).join("."),
  };
}

/**
 * Every leaf topic that still needs study time, in syllabus order.
 * `alreadyPlanned` subtracts minutes covered by pinned pending tasks so a
 * replan never double-books a topic.
 */
export function buildWorkPool(
  topics: TopicStateMap,
  alreadyPlanned: Map<string, number> = new Map(),
): WorkItem[] {
  const pool: WorkItem[] = [];
  for (const node of getAllNodes()) {
    if (!isLeaf(node)) continue;
    const remaining =
      remainingStudyMinutes(getTopicState(topics, node.id)) -
      (alreadyPlanned.get(node.id) ?? 0);
    if (remaining > 0) {
      pool.push({ topicId: node.id, remaining, ...bucketOf(node) });
    }
  }
  return pool;
}

/** Total unscheduled study minutes across the syllabus. */
export function totalRemainingMinutes(topics: TopicStateMap): number {
  return buildWorkPool(topics).reduce((sum, item) => sum + item.remaining, 0);
}
