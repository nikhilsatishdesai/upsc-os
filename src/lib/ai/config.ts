import type {
  AiCapability,
  AiFeature,
  AiProviderId,
} from "./types";

/**
 * Central AI tuning — no magic numbers anywhere else in the AI layer
 * (same rule as PLANNER_CONFIG / KNOWLEDGE_CONFIG).
 */

/**
 * Provider metadata — deliberately model-AGNOSTIC. There is NO hardcoded
 * list of model names anywhere: the user types (or refreshes) a model id
 * and it is sent as-is, so any future model works without a code change.
 *
 * `fallbackModel` is a single, overridable seed used only when a provider
 * has a key but no model chosen yet (and to pre-fill the input for a fresh
 * provider). It is NOT a whitelist and is never used to validate or block
 * a user's model id.
 *
 * `pricing` is a coarse per-provider estimate for the cost manager only —
 * real invoices come from the vendor; it never gates functionality.
 */
export type AiProviderInfo = {
  id: AiProviderId;
  label: string;
  /** Single overridable seed model id (fresh-provider default only). */
  fallbackModel: string;
  /** Coarse USD per million input / output tokens (estimate only). */
  pricing: { inputUsdPerMTok: number; outputUsdPerMTok: number };
  /** Whether this provider exposes a list-models endpoint (drives the
   * "Refresh models" button; false ⇒ manual entry only, no error). */
  listModelsSupported: boolean;
  /** Correction factor on the chars/4 token heuristic. */
  tokenFactor: number;
  /** Client-side request budget per minute (polite rate limiting). */
  requestsPerMinute: number;
};

export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Claude (Anthropic)",
    fallbackModel: "claude-sonnet-5",
    pricing: { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
    listModelsSupported: true,
    tokenFactor: 1,
    requestsPerMinute: 30,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    fallbackModel: "gpt-4.1-mini",
    pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 4 },
    listModelsSupported: true,
    tokenFactor: 1,
    requestsPerMinute: 30,
  },
  gemini: {
    id: "gemini",
    label: "Gemini (Google)",
    fallbackModel: "gemini-2.5-flash",
    pricing: { inputUsdPerMTok: 0.5, outputUsdPerMTok: 3 },
    listModelsSupported: true,
    tokenFactor: 1,
    requestsPerMinute: 30,
  },
};

/** Coarse cost estimate for a provider (the cost manager is approximate;
 * per-model pricing is deliberately not tracked so new models need no
 * code change). */
export function providerPricing(provider: AiProviderId): {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
} {
  return AI_PROVIDERS[provider].pricing;
}

/** The seed model to use when a provider has a key but no chosen model. */
export function fallbackModel(provider: AiProviderId): string {
  return AI_PROVIDERS[provider].fallbackModel;
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
