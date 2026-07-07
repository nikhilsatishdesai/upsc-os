# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Full developer/AI documentation lives in [`/docs`](./docs) — start with `docs/MASTER_CONTEXT.md` (project-wide context, hard rules), then `docs/PROJECT_STATUS.md` (metrics, debt, priorities).**
> **Last updated:** 2026-07-06

## Current Milestone

**Phase C.1 "Future-proof AI model management" — CODE-COMPLETE** (on top of Phase C "AI Operating System" / Chanakya). **Still NOT deployed** — founder must create GitHub + Vercel accounts (DEPLOYMENT.md, click-by-click). This has been the single blocking item since V1; remind the founder every session.

### Phase C.1 (0.6.1) essentials
- **No hardcoded model names anywhere.** Provider setting is now `{ apiKey, selectedModel (free-form string), lastRefresh?, availableModels? }`. Removed `AI_PROVIDERS[].models`/`defaultModel`/`resolveModelInfo`; added per-provider `fallbackModel` (single overridable seed, NOT a list/whitelist) + coarse `providerPricing()`.
- **Providers** gained `listModels()` (GET `/v1/models` for Claude/OpenAI, `…/v1beta/models` for Gemini). **AiClient/AiService** gained `listModels(provider)`. `resolveChain` uses `selectedModel` (blank → seed).
- **Settings AI card** (`ai-settings.tsx`): Model-ID **text box** + "Current Model ID" readout + **Refresh models** button + searchable `ModelPicker` (selected pinned with ✓; picking fills the box; manual entry always wins; graceful fallback on refresh failure — no crash). Provider indicator shows the exact `selectedModel` string.
- **ai-store v1→v2 migration** (`migrateAiV1ToV2`): renames `model`→`selectedModel`, drops obsolete key, preserves values. Backups: `sanitizeAiExport` reads `selectedModel` w/ legacy `model` fallback, no whitelist (backup format stays v6; keys never exported).
- **Verified live:** pasted `claude-sonnet-6-future` → stored + sent verbatim (indicator "Claude · claude-sonnet-6-future"); v1→v2 migration on reload; Refresh degrades gracefully; routing intact. Docs: new `docs/AI_ARCHITECTURE.md`.
- **Suggested next module (founder's idea):** an AI Usage Dashboard (requests today, tokens by provider, est. cost, avg response time, cache-hit rate, most-used features, export conversation history) — the usage log + `summarizeUsage` already hold this data.

### Phase C (0.6.0) essentials
- **New AI subsystem `src/lib/ai/`** (pure, testable): `types.ts` (neutral shapes, `AiError`), `config.ts` (providers/models/pricing/routing/budgets — all tunables), `tokens.ts`, `cache.ts` (content-addressed LRU+TTL), `retry.ts` (backoff + fallback classification), `providers/*` (anthropic/openai/gemini adapters via raw `fetch` + shared SSE reader — **no vendor SDKs**), `client.ts` (routing → retry → fallback → cache → budget → usage, streaming + non-streaming), `context.ts` (ContextBuilder over existing engines), `prompts/*` (versioned builders), `actions.ts` (typed proposals → validate → execute via existing store actions), `memory.ts` (conversation window/summary + mentor memory), `structured.ts` (flashcard/quiz JSON parsing), `service.ts` (the AI service layer — one object, every feature).
- **Third store `upsc-os-ai`** (`src/store/ai-store.ts`, persist v1) — providers (keys stay local), order, per-capability routing, daily budget, usage log, response cache, conversations, mentor memory, activity feed. Keys are **never** exported.
- **Backup format v6** — app-store embeds `ai` section (models/routing/budget/conversations/memory, **no keys**); accepts v1–v6. `sanitizeAiExport` drops-don't-throws.
- **Service hook** `src/components/ai/use-ai-service.ts` binds the pure service to the three stores (snapshots read lazily → AI state separate from planner state).
- **Chanakya workspace** `/chanakya` (route + sidebar entry Dashboard·Planner·Syllabus·**Chanakya**·Settings) — lazy-loaded (`chanakya-loader.tsx` via `next/dynamic`, `ssr:false`) so the AI bundle ships only there (route First Load ≈1.6 kB). Chat (streaming, action proposals, conversation history) + insights rail (weak topics, burnout, revisions, recommendations, quick actions, recent activity). Deep-link `?ask=` auto-sends.
- **Embedded AI**: topic workspace "Ask Chanakya (AI)" section (`ai-topic-tools.tsx`: summarize/explain/improve/simplify/mnemonics/flashcards/quiz → persisted to `RichNote.ai` via new `knowledge-store.setNoteAi`); dashboard `daily-briefing-card.tsx`; planner `ask-chanakya-menu.tsx` (header dropdown); analytics `ai-analytics-explainers.tsx`; Settings `ai-settings.tsx` (keys/models/routing/budget/usage).
- **Graceful degradation**: with no provider configured, every surface shows a calm "connect in Settings → AI" prompt; deterministic insights still work.

### Phase C gotchas
- **Anthropic browser calls** need the `anthropic-dangerous-direct-browser-access: true` header and send **no** `temperature` (current models reject sampling params) — JSON is enforced via a system instruction.
- **The LLM never writes tasks** — it proposes typed actions; the deterministic engine validates (real leaf ids only) and executes through existing store actions.
- **Don't feed AI output back as engine input** (mirrors the planner hard rule) — context is built from primary data + engine outputs, never from prior AI replies.
- The preview sandbox blocks outbound calls to provider APIs, so live end-to-end shows a friendly network error (pipeline itself is verified: message persist → stream → fallback → error mapping).

### Study Scope (0.5.1) essentials
- `TopicState.planState`: "included" | "paused" | "excluded" (default-merged — no migration). Semantics: paused = out of schedule but IN forecast; excluded = out of everything, progress preserved.
- Engines: `buildWorkPool`/`buildRevisionQueue` only take included topics; pool accepts `onlyTopics` focus set; forecast skips excluded only. Scheduler input `studyTopicFilter`.
- Store: `focusCollectionId` (reads knowledge-store bookmark collections at replan — one-way dependency, no cycle), `setPlanState(ForSubtree)`, `setFocusCollection`, `planTopicNow(today|tomorrow|this-week)` (pinned user task + rebalance; "this week" = freest day). Pinned tasks: excluded topic → dropped; paused → dropped; finished-topic user pins survive (extra practice).
- UI: Planner gains a **Scope** tab (papers→units→topics tri-state with bulk + counts, focus-collection select); topic pages gain a **Plan** menu (manual planning + plan-state radio).

Phase B milestones (each one git commit, restorable):
1. ✅ Knowledge data layer: entity types, separate knowledge store, backup v5, storage meter
2. ✅ Rich notes editor (markdown/GFM/callouts/highlighting/auto-save) + quick notes + workspace shell
3. ✅ Flashcards (review mode) + keywords + book references + resources
4. ✅ PYQs + current affairs (multi-topic) + bookmarks/collections + study history & timeline + AI placeholder section
5. ✅ Knowledge search (fuzzy, filters) + dashboard Knowledge card
6. ✅ Live verification (2 fixes) + docs

## Completed Work (cumulative)

V1 foundation → V2 planner → V3 intelligence engine → Phase A adaptive core → Phase B knowledge workspace → Study Scope → **Phase C AI Operating System (Chanakya)**. 202 tests green (119 prior + 83 AI), lint clean, isolated build = 304 static pages. Live-verified: sidebar Chanakya entry, workspace (both configured/unconfigured states), Settings AI card (providers/routing/budget/usage), topic AI tools (all 7), dashboard Daily Briefing, full request pipeline end-to-end (message persist → streaming → fallback chain → friendly error), no console errors.

## Current Architecture (knowledge layer)

- **Two persisted stores:** `upsc-os-store` (planner, v4) and `upsc-os-knowledge` (v1) — knowledge writes don't re-serialize planner state and vice versa. Backup format v5 = one file containing both (`knowledge` section; pre-v5 files import with knowledge untouched). Reset in Settings clears both.
- **Entities** (`src/lib/knowledge/types.ts`): richNotes (one per topic, `ai` placeholder block), quickNotes, flashcards (`ai` slot for SRS), keywords, bookRefs, resources, pyqs (`aiExplanation`), currentAffairs (multi-`topicIds`, `aiSummary`), bookmarks + collections (4 built-ins, fixed ids), timeline events (capped 1500).
- **Services** (`src/lib/knowledge/`): `config.ts` (tunables), `notes.ts` (word counts, reading time, snippet insertion — pure), `search.ts` (fuzzy tiers: substring > tokens > subsequence; searches syllabus too), `insights.ts` (due cards, review queue, per-topic history, merged timeline, knowledge stats).
- **Derived, never double-stored:** study history & timeline merge knowledge events with planner task history at read time.
- **UI:** `src/components/knowledge/` — topic-workspace assembles collapsible KnowledgeSections on leaf topic pages; markdown-preview renders GFM + callouts (`> [!note|tip|warning|important]`, normalized pre-render) + theme-aware hljs tokens (globals.css); bookmark-menu works for any target type; topic-picker links extra topics.
- Planner engine untouched (Phase B constraint honoured). Flashcards deliberately independent of the revision engine.

## Key gotchas (see also the Phase-A list — still valid)

1. **Badge/Card render `<div>`s — never place them inside `<p>`** (hydration errors).
2. Callout headers need their own paragraph — `normalizeCallouts` handles authoring without blank quote lines.
3. Gate commands with real exit codes (`cmd > log 2>&1; RC=$?`) — piping to grep/tail eats failures.
4. lucide has no brand icons (no `Youtube`) — use generic equivalents.
5. localStorage budget ~5MB total; usage meter in Settings. IndexedDB is the planned escape hatch when sync (V5 "Bridge") arrives — notes are text-only, images by URL.

## Remaining Tasks

- **Deploy (V1→Phase C):** founder creates GitHub + Vercel accounts → DEPLOYMENT.md. (AI needs no server env vars — keys are entered per-device in Settings → AI.)
- Future phases per founder's naming: PYQ Intelligence (bulk question bank + weightage analytics; AI PYQ analysis already wired in the service), Current Affairs OS (AI CA explainer already wired in the service), Revision OS (AI revision coach prompt ready), Test Analytics.
- Phase C future extension points already architected (prompt builders + service exist; UI surfaces are the only remaining work): **Essay Evaluation, Interview Practice**, plus Vision/Image/PDF routing (`vision` capability + Gemini routing in place).

## Commands Required

- `npm run dev` · `npm test` (214) · `npm run lint` · `npm run build:check` (never plain `build` while dev server runs)

## Deployment Status

- **Code is on GitHub:** `https://github.com/nikhilsatishdesai/upsc-os` (private, branch `main`, remote `origin`, local and remote in sync). Push with plain `git push` from now on.
- **Vercel: connected to the GitHub account but the project is NOT yet imported/deployed.** Next session: Vercel → Add New → Project → Import `upsc-os` → Deploy (no settings changes, no env vars). Founder steps in /DEPLOYMENT.md step 4.

## Environment Facts

- Founder is a **non-programmer** — plain English, click-by-click steps, all technical decisions made for him.
- Windows 11, Node v25, TS 6 strict, Next 15.5. Preview config in `.claude/launch.json`.

## Next Recommended Step

Deploy. Then, to use Chanakya: Settings → AI → paste an API key for Claude, OpenAI or Gemini (any one is enough). Tune AI behaviour in `src/lib/ai/config.ts` (routing, budgets, models, cache) and prompts in `src/lib/ai/prompts/*` (versioned). Next module options: PYQ Intelligence or surface the ready-made Essay/Interview AI features.
