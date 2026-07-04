import { getLeafIds } from "@/lib/syllabus";
import type { TopicStatus } from "@/lib/status";

export type ProgressMap = Record<string, TopicStatus>;

export type ProgressSummary = {
  total: number;
  inProgress: number;
  completed: number;
  revised: number;
  /** completed + revised */
  done: number;
  /** done as a 0–100 percentage of total */
  percent: number;
};

/** Roll up leaf statuses for the subtree rooted at `nodeId`. */
export function summarizeProgress(
  progress: ProgressMap,
  nodeId: string,
): ProgressSummary {
  const leafIds = getLeafIds(nodeId);
  let inProgress = 0;
  let completed = 0;
  let revised = 0;

  for (const id of leafIds) {
    const status = progress[id];
    if (status === "in-progress") inProgress += 1;
    else if (status === "completed") completed += 1;
    else if (status === "revised") revised += 1;
  }

  const done = completed + revised;
  const total = leafIds.length;
  return {
    total,
    inProgress,
    completed,
    revised,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Combined summary across several subtrees (e.g. the whole syllabus). */
export function summarizeMany(
  progress: ProgressMap,
  nodeIds: string[],
): ProgressSummary {
  const parts = nodeIds.map((id) => summarizeProgress(progress, id));
  const sum = parts.reduce(
    (acc, p) => ({
      total: acc.total + p.total,
      inProgress: acc.inProgress + p.inProgress,
      completed: acc.completed + p.completed,
      revised: acc.revised + p.revised,
      done: acc.done + p.done,
      percent: 0,
    }),
    { total: 0, inProgress: 0, completed: 0, revised: 0, done: 0, percent: 0 },
  );
  sum.percent = sum.total === 0 ? 0 : Math.round((sum.done / sum.total) * 100);
  return sum;
}
