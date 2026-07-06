import { describe, expect, it } from "vitest";

import {
  buildDailyBriefingPrompt,
  buildFlashcardsPrompt,
  buildMentorChatPrompt,
  buildPlannerAdvicePrompt,
  buildQuizPrompt,
  buildTopicSummaryPrompt,
  MENTOR_CHAT_VERSION,
} from "./prompts";
import type { ContextBundle } from "./context";

const bundle: ContextBundle = {
  sections: [
    { label: "Topic", text: "Fundamental Rights", tokens: 4 },
    { label: "Notes (the student's own)", text: "Article 14 note", tokens: 4 },
  ],
  totalTokens: 8,
  sources: ["your notes"],
};

describe("mentor chat prompt", () => {
  it("is versioned, embeds context + memory + action protocol, and adds the user turn", () => {
    const built = buildMentorChatPrompt({
      context: bundle,
      memory: "Prefers evening revisions.",
      window: [{ role: "assistant", content: "Hello" }],
      userMessage: "What next?",
    });
    expect(built.version).toBe(MENTOR_CHAT_VERSION);
    expect(built.request.system).toContain("Chanakya");
    expect(built.request.system).toContain("Fundamental Rights");
    expect(built.request.system).toContain("Prefers evening revisions");
    expect(built.request.system).toContain('"actions"');
    expect(built.request.messages.at(-1)).toEqual({
      role: "user",
      content: "What next?",
    });
    // window turns precede the new user message
    expect(built.request.messages[0]).toEqual({
      role: "assistant",
      content: "Hello",
    });
  });
});

describe("generation prompts request JSON mode", () => {
  it("flashcards and quiz set json=true", () => {
    expect(
      buildFlashcardsPrompt({ topicTitle: "T", context: bundle, count: 5 })
        .request.json,
    ).toBe(true);
    expect(
      buildQuizPrompt({
        topicTitle: "T",
        context: bundle,
        count: 5,
        difficulty: "medium",
      }).request.json,
    ).toBe(true);
  });
});

describe("summary + briefing prompts", () => {
  it("summary is low-temperature and grounded in the bundle", () => {
    const built = buildTopicSummaryPrompt({ topicTitle: "T", context: bundle });
    expect(built.request.temperature).toBeLessThan(0.5);
    expect(built.request.system).toContain("Article 14 note");
  });

  it("briefing caps output tokens tightly", () => {
    const built = buildDailyBriefingPrompt({ context: bundle, today: "2026-07-06" });
    expect(built.request.maxTokens).toBeLessThanOrEqual(500);
  });
});

describe("planner advice prompt", () => {
  it("includes the action protocol so it can propose changes", () => {
    const built = buildPlannerAdvicePrompt({
      context: bundle,
      question: "Reduce my load",
    });
    expect(built.request.system).toContain('"actions"');
    expect(built.request.system).toContain("deterministic");
  });
});
