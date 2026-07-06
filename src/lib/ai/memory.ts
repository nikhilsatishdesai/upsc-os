import { AI_CONFIG } from "./config";
import type { AiAction } from "./actions";
import type { AiChatTurn, AiProviderId, AiRole } from "./types";

/**
 * Conversation memory — the AI remembers like a long-term mentor:
 * a rolling window of recent turns travels verbatim, older turns get
 * folded into a running summary, and durable facts (preferences, accepted
 * and rejected plans, past recommendations) live in the mentor memory.
 * All pure logic; persistence is the AI store's job.
 */

export type AiChatMessage = {
  id: string;
  role: AiRole;
  content: string;
  /** ISO timestamp. */
  at: string;
  /** Actions the assistant proposed in this message (display + audit). */
  proposedActions?: AiAction[];
  /** Which provider answered (assistant messages only). */
  provider?: AiProviderId;
};

export type AiConversation = {
  id: string;
  title: string;
  /** Topic-scoped chats pin the topic; null = general mentoring. */
  topicId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
  /** Running summary of everything before the verbatim window. */
  summary: string;
  /** How many leading messages the summary already covers. */
  summarizedCount: number;
};

export type MentorMemory = {
  /** Learned study preferences ("prefers evening revisions"). */
  preferences: string[];
  /** Recently accepted AI actions (what worked). */
  acceptedActions: string[];
  /** Recently rejected AI actions (what to stop suggesting). */
  rejectedActions: string[];
  /** Recent standing advice given, to avoid repeating itself. */
  pastAdvice: string[];
};

export const EMPTY_MENTOR_MEMORY: MentorMemory = {
  preferences: [],
  acceptedActions: [],
  rejectedActions: [],
  pastAdvice: [],
};

const cfg = AI_CONFIG.memory;

export function createConversation(
  id: string,
  title: string,
  topicId: string | null,
  nowIso: string,
): AiConversation {
  return {
    id,
    title,
    topicId,
    createdAt: nowIso,
    updatedAt: nowIso,
    messages: [],
    summary: "",
    summarizedCount: 0,
  };
}

/** Append a message immutably, enforcing the per-conversation cap (the
 * summary keeps the meaning of anything pruned). */
export function appendMessage(
  conversation: AiConversation,
  message: AiChatMessage,
): AiConversation {
  let messages = [...conversation.messages, message];
  let summarizedCount = conversation.summarizedCount;
  if (messages.length > cfg.messagesPerConversationCap) {
    const drop = messages.length - cfg.messagesPerConversationCap;
    messages = messages.slice(drop);
    summarizedCount = Math.max(0, summarizedCount - drop);
  }
  return {
    ...conversation,
    messages,
    summarizedCount,
    updatedAt: message.at,
  };
}

/** The verbatim turns to send with the next request. */
export function conversationWindow(
  conversation: AiConversation,
): AiChatTurn[] {
  return conversation.messages
    .slice(-cfg.windowTurns)
    .map((message) => ({ role: message.role, content: message.content }));
}

/** True when enough un-summarized overflow exists to fold into memory. */
export function needsSummary(conversation: AiConversation): boolean {
  const overflow =
    conversation.messages.length - cfg.windowTurns - conversation.summarizedCount;
  return overflow >= cfg.summaryTriggerTurns;
}

/** The messages the next summarization pass should fold in. */
export function overflowMessages(
  conversation: AiConversation,
): AiChatMessage[] {
  const end = Math.max(0, conversation.messages.length - cfg.windowTurns);
  return conversation.messages.slice(conversation.summarizedCount, end);
}

/** Record a completed summarization pass. */
export function applySummary(
  conversation: AiConversation,
  summary: string,
  coveredThrough: number,
): AiConversation {
  return {
    ...conversation,
    summary,
    summarizedCount: Math.min(coveredThrough, conversation.messages.length),
  };
}

/** Cap-and-prepend for the mentor memory lists. */
function remember(list: string[], entry: string): string[] {
  const next = [entry, ...list.filter((item) => item !== entry)];
  return next.slice(0, cfg.memoryItemsCap);
}

export function rememberPreference(
  memory: MentorMemory,
  preference: string,
): MentorMemory {
  return { ...memory, preferences: remember(memory.preferences, preference) };
}

export function rememberDecision(
  memory: MentorMemory,
  description: string,
  accepted: boolean,
  dateStr: string,
): MentorMemory {
  const entry = `${dateStr}: ${description}`;
  return accepted
    ? { ...memory, acceptedActions: remember(memory.acceptedActions, entry) }
    : { ...memory, rejectedActions: remember(memory.rejectedActions, entry) };
}

export function rememberAdvice(
  memory: MentorMemory,
  advice: string,
  dateStr: string,
): MentorMemory {
  return {
    ...memory,
    pastAdvice: remember(memory.pastAdvice, `${dateStr}: ${advice}`),
  };
}

/** Render memory + conversation summary as a system-prompt section. */
export function renderMemory(
  memory: MentorMemory,
  conversationSummary: string,
): string {
  const parts: string[] = [];
  if (conversationSummary.trim() !== "") {
    parts.push(`Earlier in this conversation:\n${conversationSummary.trim()}`);
  }
  if (memory.preferences.length > 0) {
    parts.push(
      `Known study preferences:\n${memory.preferences.map((p) => `- ${p}`).join("\n")}`,
    );
  }
  if (memory.acceptedActions.length > 0) {
    parts.push(
      `Recently accepted suggestions:\n${memory.acceptedActions
        .slice(0, 8)
        .map((a) => `- ${a}`)
        .join("\n")}`,
    );
  }
  if (memory.rejectedActions.length > 0) {
    parts.push(
      `Recently REJECTED suggestions (do not repeat these):\n${memory.rejectedActions
        .slice(0, 8)
        .map((a) => `- ${a}`)
        .join("\n")}`,
    );
  }
  if (memory.pastAdvice.length > 0) {
    parts.push(
      `Advice already given recently:\n${memory.pastAdvice
        .slice(0, 6)
        .map((a) => `- ${a}`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}
