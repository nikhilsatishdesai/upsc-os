import { describe, expect, it } from "vitest";

import { AI_CONFIG } from "./config";
import {
  appendMessage,
  applySummary,
  conversationWindow,
  createConversation,
  EMPTY_MENTOR_MEMORY,
  needsSummary,
  overflowMessages,
  rememberDecision,
  rememberPreference,
  renderMemory,
  type AiChatMessage,
  type AiConversation,
} from "./memory";

const msg = (role: "user" | "assistant", content: string): AiChatMessage => ({
  id: Math.random().toString(36),
  role,
  content,
  at: new Date().toISOString(),
});

function withMessages(count: number): AiConversation {
  let conversation = createConversation("c1", "Chat", null, "2026-07-06T00:00:00Z");
  for (let i = 0; i < count; i++) {
    conversation = appendMessage(
      conversation,
      msg(i % 2 === 0 ? "user" : "assistant", `turn ${i}`),
    );
  }
  return conversation;
}

describe("conversation memory", () => {
  it("appends immutably and caps per-conversation messages", () => {
    const conversation = withMessages(
      AI_CONFIG.memory.messagesPerConversationCap + 10,
    );
    expect(conversation.messages.length).toBe(
      AI_CONFIG.memory.messagesPerConversationCap,
    );
    // Oldest turns were dropped (the summary preserves their meaning).
    expect(conversation.messages[0].content).not.toBe("turn 0");
  });

  it("returns only the recent window as turns", () => {
    const window = conversationWindow(withMessages(50));
    expect(window.length).toBe(AI_CONFIG.memory.windowTurns);
  });

  it("flags when overflow should be summarized and exposes it", () => {
    const small = withMessages(AI_CONFIG.memory.windowTurns);
    expect(needsSummary(small)).toBe(false);

    const big = withMessages(
      AI_CONFIG.memory.windowTurns + AI_CONFIG.memory.summaryTriggerTurns + 1,
    );
    expect(needsSummary(big)).toBe(true);
    expect(overflowMessages(big).length).toBeGreaterThan(0);

    const summarized = applySummary(big, "we discussed polity", 5);
    expect(summarized.summary).toBe("we discussed polity");
    expect(summarized.summarizedCount).toBe(5);
  });
});

describe("mentor memory", () => {
  it("remembers preferences and decisions without duplicates", () => {
    let memory = rememberPreference(EMPTY_MENTOR_MEMORY, "evening revisions");
    memory = rememberPreference(memory, "evening revisions");
    expect(memory.preferences).toEqual(["evening revisions"]);

    memory = rememberDecision(memory, "Rebuild the plan", true, "2026-07-06");
    memory = rememberDecision(memory, "Exclude economics", false, "2026-07-06");
    expect(memory.acceptedActions[0]).toContain("Rebuild the plan");
    expect(memory.rejectedActions[0]).toContain("Exclude economics");
  });

  it("renders memory and highlights rejected suggestions", () => {
    let memory = rememberPreference(EMPTY_MENTOR_MEMORY, "morning polity");
    memory = rememberDecision(memory, "Pause history", false, "2026-07-06");
    const rendered = renderMemory(memory, "earlier we set the Prelims date");
    expect(rendered).toContain("morning polity");
    expect(rendered).toContain("REJECTED");
    expect(rendered).toContain("earlier we set the Prelims date");
  });
});
