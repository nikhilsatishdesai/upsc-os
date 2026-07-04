import { describe, expect, it } from "vitest";

import { countAtLeast, summarizeMany, summarizeProgress } from "@/lib/progress";
import { DEFAULT_TOPIC_STATE, type TopicStateMap } from "@/lib/stages";
import { getLeafIds, getRoots } from "@/lib/syllabus";

function at(stage: TopicStateMap[string]["stage"]): TopicStateMap[string] {
  return { ...DEFAULT_TOPIC_STATE, stage };
}

describe("weighted progress summaries", () => {
  it("is all zeros with no tracked topics", () => {
    const summary = summarizeProgress({}, "prelims");
    expect(summary.percent).toBe(0);
    expect(summary.covered).toBe(0);
    expect(summary.total).toBeGreaterThan(0);
  });

  it("weights stages so exam-ready is the only 100%", () => {
    const leaves = getLeafIds("mains.essay");
    const allReady: TopicStateMap = {};
    const allRead: TopicStateMap = {};
    for (const id of leaves) {
      allReady[id] = at("exam-ready");
      allRead[id] = at("first-reading");
    }
    expect(summarizeProgress(allReady, "mains.essay").percent).toBe(100);
    expect(summarizeProgress(allRead, "mains.essay").percent).toBe(40);
  });

  it("counts covered topics and stage breakdown", () => {
    const leaves = getLeafIds("prelims.csat");
    const topics: TopicStateMap = {
      [leaves[0]]: at("first-reading"),
      [leaves[1]]: at("notes-made"),
      [leaves[2]]: at("revision-2"),
      [leaves[3]]: at("exam-ready"),
    };
    const summary = summarizeProgress(topics, "prelims.csat");
    expect(summary.covered).toBe(4);
    expect(summary.byStage["revision-2"]).toBe(1);
    expect(summary.examReady).toBe(1);
    expect(countAtLeast(summary, "notes-made")).toBe(3);
  });

  it("rolls child progress up into every ancestor", () => {
    const leaves = getLeafIds("prelims.gs.polity.constitution");
    const topics: TopicStateMap = { [leaves[0]]: at("exam-ready") };
    expect(summarizeProgress(topics, "prelims.gs.polity").covered).toBe(1);
    expect(summarizeProgress(topics, "prelims").covered).toBe(1);
  });

  it("summarizeMany equals the sum of its parts", () => {
    const rootIds = getRoots().map((root) => root.id);
    const all = summarizeMany({}, rootIds);
    const parts = rootIds.map((id) => summarizeProgress({}, id));
    expect(all.total).toBe(parts.reduce((sum, p) => sum + p.total, 0));
  });
});
