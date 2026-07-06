# AI_ARCHITECTURE.md — the Chanakya intelligence layer (as built)

> The AI subsystem shipped in Phase C (0.6.0) and made provider-/model-
> agnostic in Phase C.1 (0.6.1). This documents what exists in code, not a
> plan. Companion design doc: `API_ABSTRACTION.md` (the blueprint it was
> built against). Everything lives under `src/lib/ai/*` behind
> `AiClient`/`AiService`; **no vendor SDK is imported anywhere** (raw
> `fetch` only, inside `providers/*`).

## 1. Layering (UI never touches a provider)

```
UI surfaces (Chanakya, topic tools, dashboard, planner menu, analytics, settings)
        │  useAiService()  ← binds the pure service to the 3 stores
AiService  (feature layer: summarize · quiz · flashcards · chat · briefing · advice · listModels …)
        │
   ┌────┴─────────────────────────────┐
ContextBuilder   PromptBuilders (versioned)   Action layer (validate → confirm → existing store actions)
        │
AiClient  (routing · retry · fallback · cache · rate-limit · budget · usage · streaming · listModels)
        │
Provider adapters:  AnthropicProvider │ OpenAiProvider │ GeminiProvider   (raw fetch, one file each)
        │
Claude / OpenAI / Gemini HTTP APIs        Existing Planner + Knowledge + Analytics engines (read-only for context)
```

Strict rules: providers are only imported inside `src/lib/ai/providers/*`;
the LLM never mutates state (it proposes typed actions the action layer
executes through existing store actions); AI never feeds its own output
back as engine input.

## 2. Provider abstraction

One neutral `AiProviderAdapter` (`complete`, `stream`, optional
`listModels`) implemented per vendor. Each adapter absorbs vendor quirks
(Anthropic: system top-level, no sampling params, browser header, refusal →
typed error; OpenAI: `response_format`, system-as-first-message; Gemini:
`assistant→model`, `system_instruction`, safety blocks). The
vendor-independent `AiClient` owns routing, retry+backoff, the fallback
chain, the response cache, client-side rate limiting, the daily budget
guard, usage tracking and unified SSE streaming. **Adding a provider is one
adapter file + one registry line + one config entry** — nothing else
changes.

## 3. Provider-agnostic model management (Phase C.1)

The app keeps **no hardcoded list of model names** — no dropdown, no
whitelist. This means UPSC OS never needs a code change or redeploy when
Anthropic, OpenAI or Google ship a new model.

- **Storage** — each provider stores `{ apiKey, selectedModel,
  lastRefresh?, availableModels? }`. `selectedModel` is a free-form string;
  whatever the user types is sent verbatim.
- **Manual entry always wins** — the Settings "Model ID" text box is the
  single source of truth. The only validation is non-empty. If the provider
  rejects the id, the provider's own error is surfaced (the app never
  second-guesses it).
- **Refresh models** — each provider's list-models endpoint
  (`GET /v1/models` for Anthropic/OpenAI, `…/v1beta/models` for Gemini) is
  fetched on demand via `AiClient.listModels(provider)`. On success a
  searchable picker appears (the selected model pinned with a ✓, the rest
  below); picking one just fills the text box. On failure the UI falls back
  to manual entry with a calm note — **no error, no crash**.
- **Seed default** — `AI_PROVIDERS[id].fallbackModel` is a single,
  overridable model id used only when a provider has a key but no chosen
  model (and to pre-fill the input for a fresh provider). It is not a list
  and never blocks or validates a user's id.
- **Cost estimates** — coarse per-provider pricing
  (`providerPricing(provider)`) drives the usage/cost manager. Per-model
  pricing is deliberately not tracked, so new models need no code change;
  the figure is clearly labelled an estimate.
- **Routing** — capability routing (chat/summary/generation/reasoning/
  vision) still maps a capability to a provider order; the model used is
  that provider's `selectedModel`. Nothing about routing changed.

### Backward compatibility

- **Store migration v1 → v2** (`migrateAiV1ToV2`): the old provider field
  `model` (already a plain string) becomes `selectedModel`; the obsolete key
  is dropped; the value is preserved. Fully automatic, no user action.
- **Backups**: `sanitizeAiExport` reads `selectedModel`, falling back to the
  legacy `model` key, so pre-C.1 backup files import unchanged. API keys are
  never exported (backup format stays v6). Any model id is accepted verbatim
  — the sanitizer keeps no whitelist.

## 4. Context, prompts, actions, memory (unchanged from Phase C)

- **ContextBuilder** assembles the student's own material (topic notes,
  quick notes, keywords, book refs, flashcards, PYQs, current affairs,
  confidence, difficulty, priority, planner state, forecast, health,
  burnout, revisions, study history) within a token budget from the
  EXISTING engines — the user never pastes context.
- **PromptBuilders** are versioned pure functions (mentor, summary, explain,
  flashcard, quiz, mnemonics, improve/simplify, planner, revision,
  analytics, current-affairs, PYQ; essay/interview architected). Prompt
  versions feed cache keys.
- **Action layer**: `parseAiActions` → `validateAiAction` (real syllabus
  leaf ids only) → user confirms → `executeAiAction` through the existing
  store actions. Decisions are remembered.
- **Memory**: per-conversation rolling window + running summary, plus
  long-term mentor memory (preferences, accepted/rejected suggestions).

## 5. State & performance

Three persisted stores; `upsc-os-ai` (v2) keeps AI state separate from
planner state. The Chanakya workspace is lazy-loaded (`next/dynamic`,
`ssr:false`), so the AI bundle ships only on `/chanakya` (route First Load
≈ 1.6 kB). Snapshots are read lazily at call time (no re-render storms).
Responses are cached content-addressed (provider + model + prompt version +
request) with LRU + TTL eviction.

## 6. Extension points

New providers, new capabilities, new features register through the same
layer. Essay evaluation and interview practice prompt builders already
exist in the service; the `vision` capability and Gemini routing are wired
for future image/PDF work. A future AI Usage Dashboard can read the existing
usage log (`summarizeUsage`) with no new plumbing.
