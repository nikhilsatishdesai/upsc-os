import type {
  AiCapability,
  AiFeature,
  AiProviderId,
} from "./types";

/**
 * Central AI tuning — no magic numbers anywhere else in the AI layer
 * (same rule as PLANNER_CONFIG / KNOWLEDGE_CONFIG).
 */

export type AiModelInfo = {
  id: string;
  label: string;
  /** Approximate context window in tokens (informational). */
  contextWindow: number;
  /** Estimated USD per million input / output tokens (cost manager only —
   * real invoices come from the vendor; keep these roughly current). */
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
};

export type AiProviderInfo = {
  id: AiProviderId;
  label: string;
  defaultModel: string;
  models: AiModelInfo[];
  /** Correction factor on the chars/4 token heuristic. */
  tokenFactor: number;
  /** Client-side request budget per minute (polite rate limiting). */
  requestsPerMinute: number;
};

export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Claude (Anthropic)",
    defaultModel: "claude-opus-4-8",
    models: [
      {
        id: "claude-opus-4-8",
        label: "Claude Opus 4.8",
        contextWindow: 1_000_000,
        inputUsdPerMTok: 5,
        outputUsdPerMTok: 25,
      },
      {
        id: "claude-sonnet-5",
        label: "Claude Sonnet 5",
        contextWindow: 1_000_000,
        inputUsdPerMTok: 3,
        outputUsdPerMTok: 15,
      },
      {
        id: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        contextWindow: 200_000,
        inputUsdPerMTok: 1,
        outputUsdPerMTok: 5,
      },
    ],
    tokenFactor: 1,
    requestsPerMinute: 30,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4.1-mini",
    models: [
      {
        id: "gpt-4.1",
        label: "GPT-4.1",
        contextWindow: 1_000_000,
        inputUsdPerMTok: 2,
        outputUsdPerMTok: 8,
      },
      {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 mini",
        contextWindow: 1_000_000,
        inputUsdPerMTok: 0.4,
        outputUsdPerMTok: 1.6,
      },
    ],
    tokenFactor: 1,
    requestsPerMinute: 30,
  },
  gemini: {
    id: "gemini",
    label: "Gemini (Google)",
    defaultModel: "gemini-2.5-flash",
    models: [
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        contextWindow: 1_000_000,
        inputUsdPerMTok: 1.25,
        outputUsdPerMTok: 10,
      },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        contextWindow: 1_000_000,
        inputUsdPerMTok: 0.3,
        outputUsdPerMTok: 2.5,
      },
    ],
    tokenFactor: 1,
    requestsPerMinute: 30,
  },
};

/** Resolve the model info (falls back to a provider's default model). */
export function resolveModelInfo(
  provider: AiProviderId,
  modelId: string,
): AiModelInfo {
  const info = AI_PROVIDERS[provider];
  return (
    info.models.find((model) => model.id === modelId) ??
    info.models.find((model) => model.id === info.defaultModel) ??
    info.models[0]
  );
}

export const AI_CONFIG = {
  /** Retry policy for rate-limit / overloaded / network failures. */
  retry: {
    attempts: 3,
    baseDelayMs: 800,
    maxDelayMs: 8_000,
  },

  /** chars-per-token heuristic used by the estimator. */
  charsPerToken: 4,

  /** Response cache (content-addressed, LRU, persisted in the AI store). */
  cache: {
    maxEntries: 60,
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },

  /** Default daily token ceiling (input + output, estimated). */
  defaultDailyBudgetTokens: 250_000,

  /** Usage records kept for the cost manager (oldest pruned first). */
  usageLogCap: 400,
  /** Recent-AI-activity entries kept for the Chanakya workspace. */
  activityLogCap: 80,

  /** Conversation memory. */
  memory: {
    /** Conversations kept (oldest deleted first). */
    conversationCap: 20,
    /** Messages persisted per conversation. */
    messagesPerConversationCap: 80,
    /** Recent turns sent verbatim; older turns live in the summary. */
    windowTurns: 12,
    /** Summarize once this many turns exist beyond the window. */
    summaryTriggerTurns: 6,
    /** Mentor memory lists (preferences, plan decisions…) cap. */
    memoryItemsCap: 30,
  },

  /** Context builder token budgets per feature family. */
  contextBudget: {
    topic: 5_000,
    mentor: 3_500,
    briefing: 2_500,
    planner: 3_000,
    analytics: 2_500,
  },

  /** Output budgets (maxTokens) per feature family. */
  outputTokens: {
    chat: 1_200,
    summary: 900,
    generation: 1_600,
    reasoning: 1_100,
    briefing: 400,
  },

  /** Default provider order — first configured provider wins. */
  defaultOrder: ["anthropic", "openai", "gemini"] as AiProviderId[],

  /**
   * Default capability routing. The user can override per capability in
   * Settings; unlisted capabilities use the global order.
   */
  defaultRouting: {
    chat: ["anthropic", "openai", "gemini"],
    summary: ["anthropic", "gemini", "openai"],
    generation: ["openai", "anthropic", "gemini"],
    reasoning: ["anthropic", "openai", "gemini"],
    vision: ["gemini", "anthropic", "openai"],
  } as Record<AiCapability, AiProviderId[]>,

  /** Feature → capability lane (drives routing + budgets). */
  featureCapability: {
    "mentor-chat": "chat",
    "daily-briefing": "chat",
    "topic-summary": "summary",
    "topic-explanation": "summary",
    "flashcard-generation": "generation",
    "quiz-generation": "generation",
    mnemonics: "generation",
    "note-improvement": "generation",
    "note-simplification": "summary",
    "planner-advice": "reasoning",
    "analytics-explanation": "reasoning",
    "current-affairs-analysis": "reasoning",
    "pyq-analysis": "reasoning",
    "revision-coach": "chat",
    "essay-feedback": "reasoning",
    "interview-practice": "chat",
  } as Record<AiFeature, AiCapability>,
} as const;
