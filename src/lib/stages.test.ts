import { describe, expect, it } from "vitest";

import {
  DEFAULT_TOPIC_STATE,
  getTopicState,
  type TopicStateMap,
} from "@/lib/stages";

describe("getTopicState referential stability", () => {
  // React store selectors require stable references: returning a fresh
  // object per call causes "Maximum update depth exceeded" render loops.

  it("returns the same reference for repeated reads of a stored topic", () => {
    const topics: TopicStateMap = {
      "prelims.csat.comprehension": {
        ...DEFAULT_TOPIC_STATE,
        stage: "first-reading",
      },
    };
    const first = getTopicState(topics, "prelims.csat.comprehension");
    const second = getTopicState(topics, "prelims.csat.comprehension");
    expect(first).toBe(second);
  });

  it("returns the shared default for unknown topics", () => {
    expect(getTopicState({}, "prelims.csat.comprehension")).toBe(
      getTopicState({}, "mains.essay.craft"),
    );
  });

  it("backfills fields missing from older stored versions", () => {
    const topics = {
      "prelims.csat.comprehension": {
        stage: "first-reading",
        studiedMinutes: 60,
      } as never,
    };
    const state = getTopicState(topics, "prelims.csat.comprehension");
    expect(state.priority).toBeNull();
    expect(state.confidence).toBe(3);
    expect(state.stage).toBe("first-reading");
  });
});
