import { describe, expect, it } from "vitest";

import {
  ANSWER_EVALUATION_VERSION,
  buildAnswerEvaluationPrompt,
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

describe("answer evaluation prompt", () => {
  const base = {
    question: "Critically examine Rawls' theory of justice.",
    marks: 15,
    wordTarget: 250,
    timeLimitMinutes: 11,
    minutesSpent: 12,
    answerText: "Rawls proposes justice as fairness.",
    paperLabel: "the PSIR optional",
    suggestedThinkers: ["John Rawls", "Communitarians"],
  };

  it("is versioned, demands realistic marking and grounds in notes", () => {
    const built = buildAnswerEvaluationPrompt({ ...base, context: bundle });
    expect(built.version).toBe(ANSWER_EVALUATION_VERSION);
    expect(built.request.system).toContain("Score: X / 15");
    expect(built.request.system).toContain("never inflate");
    expect(built.request.system).toContain("John Rawls, Communitarians");
    expect(built.request.system).toContain("they wrote 5 words in 12 minutes");
    expect(built.request.system).toContain("Article 14 note");
    expect(built.request.messages).toHaveLength(1);
    expect(built.request.messages[0].content).toContain("My answer:");
  });

  it("handles a blank answer and no topic context", () => {
    const built = buildAnswerEvaluationPrompt({
      ...base,
      answerText: "   ",
      suggestedThinkers: [],
      context: null,
    });
    expect(built.request.messages[0].content).toContain("(blank)");
    expect(built.request.system).not.toContain("Thinkers/schools typically");
    expect(built.request.system).not.toContain("ground truth");
  });
});
