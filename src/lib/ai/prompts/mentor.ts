import { AI_CONFIG } from "../config";
import { ACTION_PROTOCOL } from "../actions";
import type { ContextBundle } from "../context";
import type { AiChatTurn } from "../types";
import { composeSystem, type BuiltPrompt } from "./types";
import { CHANAKYA_PERSONA } from "./persona";

export const MENTOR_CHAT_VERSION = "mentor-chat@1";

/** The Chanakya chat prompt: persona + study/topic context + memory +
 * the action protocol, with the rolling conversation window as turns. */
export function buildMentorChatPrompt(input: {
  context: ContextBundle;
  memory: string;
  window: AiChatTurn[];
  userMessage: string;
}): BuiltPrompt {
  const instructions = [
    "Mentor the student in conversation. Understand their syllabus, planner, analytics, revisions, notes, PYQs and current affairs from the data above.",
    input.memory.trim() !== ""
      ? `# What you remember\n\n${input.memory.trim()}`
      : "",
    ACTION_PROTOCOL,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    version: MENTOR_CHAT_VERSION,
    request: {
      system: composeSystem(CHANAKYA_PERSONA, input.context, instructions),
      messages: [
        ...input.window,
        { role: "user", content: input.userMessage },
      ],
      maxTokens: AI_CONFIG.outputTokens.chat,
      temperature: 0.7,
    },
  };
}

export const DAILY_BRIEFING_VERSION = "daily-briefing@1";

/** One-paragraph morning briefing for the dashboard (cached per day). */
export function buildDailyBriefingPrompt(input: {
  context: ContextBundle;
  today: string;
}): BuiltPrompt {
  return {
    version: DAILY_BRIEFING_VERSION,
    request: {
      system: composeSystem(
        CHANAKYA_PERSONA,
        input.context,
        `Write today's briefing (${input.today}) for the dashboard:
- ONE short paragraph (max 120 words), plain text, no headings or lists.
- Name today's mission (what the plan says), why it matters right now, and
  one specific nudge drawn from the analytics (streak, backlog, weak area).
- If nothing is planned today, say what the single most valuable session
  would be and why.`,
      ),
      messages: [{ role: "user", content: "My briefing for today, please." }],
      maxTokens: AI_CONFIG.outputTokens.briefing,
      temperature: 0.7,
    },
  };
}

export const CONVERSATION_SUMMARY_VERSION = "conversation-summary@1";

/** Fold older turns into the running conversation summary. */
export function buildConversationSummaryPrompt(input: {
  existingSummary: string;
  turns: AiChatTurn[];
}): BuiltPrompt {
  const transcript = input.turns
    .map((turn) => `${turn.role === "user" ? "Student" : "Chanakya"}: ${turn.content}`)
    .join("\n");
  return {
    version: CONVERSATION_SUMMARY_VERSION,
    request: {
      system:
        "Summarize mentoring conversations for long-term memory. Keep decisions, preferences, plans agreed or rejected, and open questions. Max 150 words. Plain text.",
      messages: [
        {
          role: "user",
          content: `${
            input.existingSummary.trim() !== ""
              ? `Existing summary:\n${input.existingSummary}\n\n`
              : ""
          }New turns to fold in:\n${transcript}\n\nWrite the updated summary.`,
        },
      ],
      maxTokens: 300,
      temperature: 0.2,
    },
  };
}
