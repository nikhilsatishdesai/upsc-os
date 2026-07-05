# API_ABSTRACTION.md — Future AI Provider Layer (design only)

> **Status: DESIGN DOCUMENT. Nothing here is implemented.** Phase C must build
> against this design so UPSC OS never couples to one AI vendor. All code
> blocks are illustrative TypeScript signatures, not source.

## 1. Goals

- One interface, many providers: **Anthropic (Claude), OpenAI, Google Gemini**,
  plus a future local/offline option.
- The rest of the app never imports a vendor SDK — only `AiClient`.
- Local-first respected: AI is optional; every feature degrades gracefully to
  the current non-AI behaviour when no key/provider is configured.
- Keys stay on-device (localStorage, same stores pattern) until the Bridge
  phase introduces a proxy; the design must allow either transport.

## 2. Layering

```
UI feature hooks (useTopicSummary, useQuizFor, …)      ← Phase C features
        │
AiService (feature-level: summarize, quiz, evaluate…)  ← prompt+context builders
        │
AiClient (provider-agnostic core)                      ← retry, fallback, cache,
        │                                                rate limit, streaming
AiProvider adapters: AnthropicProvider │ OpenAiProvider │ GeminiProvider
```

## 3. Provider abstraction

```ts
interface AiProvider {
  readonly id: "anthropic" | "openai" | "gemini";
  readonly models: AiModelInfo[];            // id, contextWindow, pricing tier
  complete(req: AiRequest, signal?: AbortSignal): Promise<AiResponse>;
  stream(req: AiRequest, on: StreamHandlers, signal?: AbortSignal): Promise<AiResponse>;
  countTokens?(req: AiRequest): Promise<number>;   // optional; else estimator
}

type AiRequest = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
  temperature?: number;
  json?: boolean;              // request structured output (adapter maps to
                               // vendor JSON/tool mode)
};
type AiResponse = { text: string; usage: { input: number; output: number }; model: string };
```

Adapters translate this neutral shape to each vendor's API (Anthropic
messages, OpenAI chat completions, Gemini generateContent) including their
streaming wire formats. Vendor quirks (system-prompt placement, stop reasons,
safety blocks) are absorbed in the adapter and surfaced as typed
`AiError { kind: "auth" | "rate-limit" | "overloaded" | "content" | "network" | "bad-request" }`.

## 4. AiClient responsibilities (vendor-independent core)

- **Retry**: exponential backoff + jitter on `rate-limit`/`overloaded`/`network`
  (configurable attempts; honour `retry-after`).
- **Fallback provider chain**: ordered list (e.g. anthropic → gemini). On
  non-retryable failure or retry exhaustion, try the next configured provider;
  annotate the response with the provider actually used.
- **Rate limiting**: client-side token bucket per provider (requests/min +
  tokens/min from config) so background features (summaries) can't starve
  interactive ones (mentor chat); two priority lanes: `interactive` > `batch`.
- **Caching**: content-addressed cache `hash(providerId, model, request)` →
  response, persisted (own localStorage key with size cap + LRU). Summaries and
  quizzes for unchanged notes are pure cache hits — this is the main cost
  control for a local-first app.
- **Token estimation**: cheap heuristic (chars/4 with per-provider factors)
  used to (a) trim context to budget before sending, (b) show the user an
  estimate, (c) feed the rate limiter. Providers with real counters override.
- **Budget guard**: daily token/₹ ceiling in settings; hard-stop with a
  friendly message (mirrors the existing burnout-style honesty).
- **Streaming**: unified `StreamHandlers { onDelta(text), onDone(resp), onError }`;
  features render deltas; non-streaming providers emulate with one delta.

## 5. Prompt & context builders (AiService layer)

- **PromptBuilder**: versioned templates per feature
  (`prompts/summary@2.ts`…), typed slots, no string concat in features.
  Prompt versions are recorded next to cached outputs so cache invalidates on
  prompt change.
- **ContextBuilder**: assembles UPSC OS data for a feature within a token
  budget, in priority order, using EXISTING services (never duplicated logic):
  topic node + breadcrumbs (`lib/syllabus`), TopicState + effective confidence
  + priority reasons (`lib/planner`), rich note markdown (truncated by
  budget), quick notes, keywords, PYQs, current affairs, recent timeline,
  forecast/health snapshot for mentor features. Output is a deterministic,
  testable `ContextBundle { sections: {label, text, tokens}[] }`.
- **Conversation memory** (mentor/chat features): rolling window of turns +
  a summarized "long-term" note stored per conversation (own knowledge-store
  namespace in Phase C); trimming strategy: keep system + last N turns +
  summary of older turns.

## 6. Configuration & storage (Phase C)

New `upsc-os-ai` persisted store (pattern identical to existing stores):
`{ providers: { anthropic?: {apiKey, model}, openai?: …, gemini?: … },
   order: ProviderId[], dailyBudgetTokens, cache: {...}, conversations: {...} }`.
Backup format bumps to v6 and embeds it (sanitized, keys optionally excluded
from exports by default for safety).

## 7. Where results land (already reserved in the data model)

`RichNote.ai.{summary,quiz,explanation,difficultyEstimate,cleanup}`,
`Pyq.aiExplanation`, `CurrentAffair.aiSummary`, `Flashcard.ai` — Phase C
writes ONLY into these existing placeholders; UI already shows a disabled AI
section per topic.

## 8. Future plugin system (post-Phase C sketch)

Feature modules register capabilities instead of being hard-wired:
`registerAiFeature({ id, surfaces: ["topic","dashboard","palette"],
contextNeeds, promptTemplate, outputSchema, render })`. The registry powers a
per-topic "AI tools" menu; third-party plugins remain out of scope until the
Bridge phase (needs sandboxing).

## 9. Non-negotiables for the implementer

1. No vendor SDK import outside `lib/ai/providers/*`.
2. Every feature must work with ANY single configured provider.
3. Every feature must no-op gracefully with zero providers configured.
4. All numbers (retries, buckets, budgets, cache size) in an `ai/config.ts`.
5. Pure-logic parts (builders, cache keys, trimming, estimation, retry
   policy) get unit tests like every other engine module.
