import { getLeafIds } from "@/lib/syllabus";
import {
  getTopicState,
  STAGE_META,
  STAGE_ORDER,
  stageAtLeast,
  type StudyStage,
  type TopicStateMap,
} from "@/lib/stages";

export type ProgressSummary = {
  total: number;
  /** Weighted preparation percentage (0–100). 100 = every topic exam-ready. */
  percent: number;
  /** Topics with at least a first reading done. */
  covered: number;
  examReady: number;
  byStage: Record<StudyStage, number>;
};

function emptyByStage(): Record<StudyStage, number> {
  return Object.fromEntries(STAGE_ORDER.map((stage) => [stage, 0])) as Record<
    StudyStage,
    number
  >;
}

/** Roll up topic stages for the subtree rooted at `nodeId`. */
export function summarizeProgress(
  topics: TopicStateMap,
  nodeId: string,
): ProgressSummary {
  const leafIds = getLeafIds(nodeId);
  const byStage = emptyByStage();
  let weightSum = 0;

  for (const id of leafIds) {
    const stage = getTopicState(topics, id).stage;
    byStage[stage] += 1;
    weightSum += STAGE_META[stage].weight;
  }

  const total = leafIds.length;
  const covered = total - byStage["not-started"];
  return {
    total,
    percent: total === 0 ? 0 : Math.round((weightSum / total) * 100),
    covered,
    examReady: byStage["exam-ready"],
    byStage,
  };
}

/** Combined summary across several subtrees (e.g. the whole syllabus). */
export function summarizeMany(
  topics: TopicStateMap,
  nodeIds: string[],
): ProgressSummary {
  const byStage = emptyByStage();
  let total = 0;
  let weightSum = 0;

  for (const nodeId of nodeIds) {
    for (const id of getLeafIds(nodeId)) {
      const stage = getTopicState(topics, id).stage;
      byStage[stage] += 1;
      weightSum += STAGE_META[stage].weight;
      total += 1;
    }
  }

  return {
    total,
    percent: total === 0 ? 0 : Math.round((weightSum / total) * 100),
    covered: total - byStage["not-started"],
    examReady: byStage["exam-ready"],
    byStage,
  };
}

/** Count of topics at or beyond a stage — convenience for widgets. */
export function countAtLeast(
  summary: ProgressSummary,
  min: StudyStage,
): number {
  return STAGE_ORDER.filter((stage) => stageAtLeast(stage, min)).reduce(
    (sum, stage) => sum + summary.byStage[stage],
    0,
  );
}
