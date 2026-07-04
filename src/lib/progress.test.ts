import { describe, expect, it } from "vitest";

import { summarizeMany, summarizeProgress, type ProgressMap } from "@/lib/progress";
import { getLeafIds, getRoots } from "@/lib/syllabus";

describe("progress summaries", () => {
  it("is all zeros with no tracked topics", () => {
    const summary = summarizeProgress({}, "prelims");
    expect(summary.done).toBe(0);
    expect(summary.inProgress).toBe(0);
    expect(summary.percent).toBe(0);
    expect(summary.total).toBeGreaterThan(0);
  });

  it("counts completed and revised topics as done", () => {
    const leaves = getLeafIds("prelims.csat");
    const progress: ProgressMap = {
      [leaves[0]]: "completed",
      [leaves[1]]: "revised",
      [leaves[2]]: "in-progress",
    };
    const summary = summarizeProgress(progress, "prelims.csat");
    expect(summary.completed).toBe(1);
    expect(summary.revised).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.done).toBe(2);
    expect(summary.total).toBe(leaves.length);
    expect(summary.percent).toBe(Math.round((2 / leaves.length) * 100));
  });

  it("reaches exactly 100% when every leaf is done", () => {
    const leaves = getLeafIds("mains.essay");
    const progress: ProgressMap = {};
    for (const id of leaves) progress[id] = "completed";
    expect(summarizeProgress(progress, "mains.essay").percent).toBe(100);
  });

  it("ignores statuses of topics outside the subtree", () => {
    const progress: ProgressMap = { "mains.gs4.probity.corruption": "completed" };
    expect(summarizeProgress(progress, "prelims").done).toBe(0);
  });

  it("summarizeMany aggregates across stages to the full syllabus", () => {
    const rootIds = getRoots().map((root) => root.id);
    const all = summarizeMany({}, rootIds);
    const parts = rootIds.map((id) => summarizeProgress({}, id));
    expect(all.total).toBe(parts.reduce((sum, p) => sum + p.total, 0));
  });

  it("child progress rolls up into the parent", () => {
    const leaves = getLeafIds("prelims.gs.polity.constitution");
    const progress: ProgressMap = { [leaves[0]]: "completed" };
    expect(summarizeProgress(progress, "prelims.gs.polity").done).toBe(1);
    expect(summarizeProgress(progress, "prelims.gs").done).toBe(1);
    expect(summarizeProgress(progress, "prelims").done).toBe(1);
  });
});
