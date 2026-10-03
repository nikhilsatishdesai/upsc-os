/**
 * The neutral AI type system — every layer above the provider adapters
 * speaks ONLY these shapes. No vendor SDK types may leak past
 * `src/lib/ai/providers/*` (hard rule from docs/API_ABSTRACTION.md).
 */

export type AiProviderId = "anthropic" | "openai" | "gemini";

export const AI_PROVIDER_IDS: AiProviderId[] = [
  "anthropic",
  "openai",
  "gemini",
];

export function isAiProviderId(value: unknown): value is AiProviderId {
  return (
    typeof value === "string" &&
    AI_PROVIDER_IDS.includes(value as AiProviderId)
  );
}

/**
 * Routing capability: WHAT KIND of work a request is. Providers are chosen
 * per capability (configurable), so e.g. flashcards can prefer one vendor
 * while long-form mentoring prefers another.
 */
export type AiCapability =
  | "chat" // conversational mentoring (Chanakya)
  | "summary" // condensing the user's own material
  | "generation" // structured artefacts: flashcards, quizzes, mnemonics
  | "reasoning" // planning advice, replanning, analytics explanations
  | "vision"; // image understanding (future phase; routed now, unused)

export const AI_CAPABILITIES: AiCapability[] = [
  "chat",
  "summary",
  "generation",
  "reasoning",
  "vision",
];

export function isAiCapability(value: unknown): value is AiCapability {
  return (
    typeof value === "string" &&
    AI_CAPABILITIES.includes(value as AiCapability)
  );
}

/** Feature ids — used for usage tracking, cache keys and activity logs. */
export type AiFeature =
  | "mentor-chat"
  | "daily-briefing"
  | "topic-summary"
  | "topic-explanation"
  | "flashcard-generation"
  | "quiz-generation"
  | "mnemonics"
  | "note-improvement"
  | "note-simplification"
  | "planner-advice"
  | "analytics-explanation"
  | "current-affairs-analysis"
  | "pyq-analysis"
  | "revision-coach"
  | "answer-evaluation"
  | "essay-feedback" // extension point (architecture only)
  | "interview-practice"; // extension point (architecture only)

export type AiRole = "user" | "assistant";

export type AiChatTurn = {
  role: AiRole;
  content: string;
};

/** The provider-neutral request. Adapters translate this to vendor wire
 * formats; nothing above the adapter knows which vendor runs it. */
export type AiRequest = {
  system: string;
  messages: AiChatTurn[];
  maxTokens: number;
  /** 0–1. Adapters may ignore it where a vendor rejects sampling params
   * (e.g. current Anthropic models) — prompt wording carries tone there. */
  temperature?: number;
  /** Ask for machine-readable JSON output. Adapters map this to the
   * vendor's JSON mode where one exists, otherwise instruct via prompt. */
  json?: boolean;
};

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AiResponse = {
  text: string;
  usage: AiUsage;
  model: string;
  /** The provider that actually answered (fallback chains may differ from
   * the first choice). */
  provider: AiProviderId;
  /** True when served from the local response cache (no network call). */
  cached: boolean;
};

export type AiStreamHandlers = {
  onDelta: (text: string) => void;
  onDone?: (response: AiResponse) => void;
  onError?: (error: AiError) => void;
};

export type AiErrorKind =
  | "auth" // bad/missing key → not retryable, fall to next provider
  | "rate-limit" // 429 → retryable with backoff
  | "overloaded" // 5xx/529 → retryable with backoff
  | "network" // fetch failure → retryable
  | "bad-request" // 4xx we caused → not retryable
  | "content" // provider refused/blocked the content
  | "not-configured" // no provider has a key
  | "budget" // daily token budget exhausted
  | "aborted"; // caller cancelled

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly provider: AiProviderId | null;
  readonly status: number | null;
  /** Server-suggested wait before retrying (from Retry-After). */
  readonly retryAfterMs: number | null;

  constructor(
    kind: AiErrorKind,
    message: string,
    options: {
      provider?: AiProviderId | null;
      status?: number | null;
      retryAfterMs?: number | null;
    } = {},
  ) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
    this.provider = options.provider ?? null;
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
  }
}

export function isAiError(value: unknown): value is AiError {
  return value instanceof AiError;
}

/**
 * Per-provider connection settings (persisted in the AI store).
 *
 * `selectedModel` is a FREE-FORM string — whatever model id the user typed
 * (or picked from a refreshed list). The app never keeps a whitelist of
 * model names, so any future model (e.g. "claude-sonnet-6", "gpt-6",
 * "gemini-4-pro") works with no code change. Empty string = fall back to
 * the provider's seed default (see ai/config.ts `fallbackModel`).
 */
export type AiProviderSettings = {
  apiKey: string;
  selectedModel: string;
  /** ISO timestamp of the last successful "Refresh models" fetch. */
  lastRefresh?: string;
  /** Optional cache of ids returned by the provider's list-models
   * endpoint. Purely a convenience for the picker — stale or missing
   * cache never affects functionality; a typed model id always works. */
  availableModels?: string[];
};

/** One model id + label from a provider's list-models endpoint. */
export type AiModelListItem = {
  id: string;
  label: string;
};

export type AiProvidersConfig = Partial<
  Record<AiProviderId, AiProviderSettings>
>;

/** Everything the client needs to route and execute one request. */
export type AiClientConfig = {
  providers: AiProvidersConfig;
  /** Global provider preference order (first configured wins). */
  order: AiProviderId[];
  /** Per-capability overrides of the order; missing = config default. */
  routing: Partial<Record<AiCapability, AiProviderId[]>>;
  /** Daily token ceiling across all providers (input+output estimate). */
  dailyBudgetTokens: number;
};

/** One usage-tracker entry (the AI cost manager's raw data). */
export type AiUsageRecord = {
  /** ISO timestamp. */
  at: string;
  provider: AiProviderId;
  model: string;
  feature: AiFeature;
  inputTokens: number;
  outputTokens: number;
  /** Estimated cost in USD (pricing table lives in ai/config.ts). */
  estimatedCostUsd: number;
  /** Wall-clock duration of the successful attempt. */
  durationMs: number;
  ok: boolean;
  cached: boolean;
  /** Error kind when ok=false. */
  error: AiErrorKind | null;
};

/** The adapter contract every vendor module implements. */
export type AiProviderAdapter = {
  readonly id: AiProviderId;
  complete(
    settings: { apiKey: string; model: string },
    request: AiRequest,
    fetchImpl: typeof fetch,
    signal?: AbortSignal,
  ): Promise<AiResponse>;
  stream(
    settings: { apiKey: string; model: string },
    request: AiRequest,
    onDelta: (text: string) => void,
    fetchImpl: typeof fetch,
    signal?: AbortSignal,
  ): Promise<AiResponse>;
  /** List the models the provider currently exposes for this key. Optional
   * — providers without a list endpoint omit it and the UI falls back to
   * manual entry. Never throws for "no such endpoint"; real failures throw
   * a typed AiError the caller can surface. */
  listModels?(
    settings: { apiKey: string },
    fetchImpl: typeof fetch,
    signal?: AbortSignal,
  ): Promise<AiModelListItem[]>;
};
