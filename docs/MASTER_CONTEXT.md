# MASTER_CONTEXT.md

> **Read this first.** This document lets any developer — human or AI — continue
> UPSC OS without access to prior conversations. It reflects the actual code as
> of 2026-07-05 (30 commits, 119 passing tests, ~16.5k LOC).
> Companion docs: SYSTEM_ARCHITECTURE.md, DATA_MODEL.md, PROJECT_STRUCTURE.md.
> Session-to-session working state lives in `/PROJECT_STATE.md` (repo root).

---

## 1. Project vision

UPSC OS is a **personal operating system for UPSC (Indian civil services) exam
preparation**. Not a syllabus tracker, not a to-do app: an intelligent system
that decides *what to study next*, schedules *spaced revisions automatically*,
*forecasts* whether the aspirant finishes before the exam, *prevents burnout*,
*explains every decision it makes*, and stores *everything the user knows*
(notes, flashcards, PYQs, current affairs) attached to the official syllabus.

The founder (product owner) is a **non-programmer**. All technical decisions
are made by the acting CTO (an AI). Communication with the founder is plain
English with click-by-click instructions.

## 2. Philosophy & design principles

1. **The syllabus is the spine.** Every feature attaches to a syllabus topic id.
   The Study Topic is the central object of the application.
2. **Local-first.** No backend, no auth, no server state. Everything persists in
   the browser's localStorage. Cloud sync is a future phase ("Bridge") that must
   not leak into current code.
3. **The planner decides WHAT; the Knowledge Workspace provides EVERYTHING
   needed to study it.** Two clean halves of the product.
4. **Derived, never double-stored.** Timelines, study history, analytics,
   forecasts, health — all computed at read time from primary data.
5. **Explainable intelligence.** Every scheduling decision can be reconstructed
   and shown to the user ("Why this session?"). No mysterious behaviour.
6. **Configuration-driven.** No magic numbers in logic. All tunables live in
   `src/lib/planner/config.ts` and `src/lib/knowledge/config.ts`.
7. **Never feed planner output back into planner input** (see §12 hard rules).
8. **Honest metrics.** Preparation % is stage-weighted (only "Exam ready" is
   100%); forecasts blend stated capacity with observed pace; pausing a topic
   does not fake an earlier finish date.
9. **Ship green.** Every milestone is one git commit with tests, lint and an
   isolated production build passing. The app is runnable after every commit.

## 3. Technology stack (as implemented)

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 App Router, React 19, TypeScript 6 strict |
| Styling | Tailwind CSS v4, oklch design tokens in `globals.css`, dark mode via `next-themes` (class strategy) |
| UI primitives | Hand-written shadcn-style components over Radix primitives + `cmdk` (13 files in `src/components/ui/`) |
| State | Zustand 5 with `persist` → localStorage (two stores, see §7) |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` (theme-aware token CSS in globals.css) |
| Icons/fonts | lucide-react (no brand icons exist!), Geist Sans/Mono via `geist` package |
| Tests | Vitest, node environment, pure-logic + store tests (no DOM tests yet) |
| Build | `npm run build` (Vercel) and `npm run build:check` (isolated `.next-check` dir — see §12.5) |

## 4. Completed phases (all in `main`, one commit per milestone)

| Phase | Version | Content |
|---|---|---|
| V1 Foundation | 0.1.0 | Scaffold, design system, responsive shell, syllabus dataset (235 leaf topics, 296 nodes), syllabus browser (SSG page per node), dashboard, Ctrl+K search, landing, settings, backup export/import |
| V2 Compass | 0.2.0 | 7-stage study lifecycle, weighted progress, scheduling engine v1 (subject rotation), planner page (wizard/Today/Week/DnD/task actions), dashboard integration |
| V3 Intelligence Engine | 0.3.0 | Curated exam intel + cascading resolution, priority-aware scheduling, automatic spaced revisions (3/10/30d), difficulty balancing, forecast v1, burnout indicator, Today's Mission, smart task cards |
| Phase A Intelligence Core | 0.4.0 | Dynamic priority scoring, confidence decay, behaviour counters, continuity scheduling, scheduler v3 (maxHard/day, weekend strategy, vacations, aggressiveness, damping), forecast v2 (probabilities, observed pace, CI), recommendation engine, study health score, snapshots, explainability |
| Phase B Knowledge OS | 0.5.0 | Second store, topic workspaces (rich notes, quick notes, flashcards + review mode, keywords, books, resources, PYQs, current affairs, bookmarks/collections, history & timeline), knowledge search, knowledge dashboard card, backup v5 |
| Study Scope | 0.5.1 | planState include/pause/exclude, Scope planner tab, focus collections, manual planning (Plan menu) |
| Phase C AI OS (Chanakya) | 0.6.0 | Third store (`upsc-os-ai`); unified AI layer (`src/lib/ai/*`): multi-provider abstraction (Claude/OpenAI/Gemini via raw fetch), capability routing + fallback, retry, content-addressed cache, budget guard + usage tracker, streaming; ContextBuilder, versioned PromptBuilders, safe action layer (proposes → user confirms → existing store actions); conversation + mentor memory; Chanakya workspace (`/chanakya`, lazy-loaded); embedded AI (topic tools, daily briefing, planner Ask-Chanakya, analytics explainers); Settings AI card; backup v6 (keys never exported). Degrades gracefully with no provider. |
| Phase C.1 model mgmt | 0.6.1 | Provider-/model-agnostic config: no hardcoded model lists anywhere; free-form `selectedModel` per provider; Settings Model-ID text box + Refresh-models picker (per-provider `listModels`, graceful manual fallback); coarse per-provider pricing; ai-store v1→v2 migration; any future model id works with no code change. `docs/AI_ARCHITECTURE.md`. |

## 5. Pending phases (agreed with founder, NOT started)

1. **Deployment** — the app has NEVER been deployed. Blocked only on the founder
   creating free GitHub + Vercel accounts (`/DEPLOYMENT.md` has his steps).
   **Remind the founder in every session.**
2. **PYQ Intelligence** — bulk question bank + weightage analytics on top of the
   existing `pyqs` entities.
3. **Current Affairs OS** — feeds/digests on top of `currentAffairs` entities.
4. ~~**Phase C: AI**~~ — **SHIPPED (0.6.0)**; see `docs/PHASE_C_SPEC.md` +
   `docs/API_ABSTRACTION.md` for the design it was built against. The AI
   layer lives in `src/lib/ai/*` behind `AiClient`/`AiService`; only that
   layer writes the data-model AI placeholders.
5. **Revision OS** — SRS for flashcards (metadata ready: streaks, `ai` slot).
6. **Bridge** — accounts, Supabase, cloud sync, IndexedDB migration.
7. **Test analytics / mocks, essay/answer evaluation, interview prep** — later.

## 6. Folder structure (see PROJECT_STRUCTURE.md for detail)

```
src/
  app/                 # Next.js routes: / (landing), (app)/{dashboard,planner,syllabus,syllabus/[id],settings}
  components/
    ui/                # design-system primitives (Radix/cmdk wrappers)
    layout/            # sidebar, mobile nav/header, nav-items (single nav source)
    dashboard/         # dashboard cards
    planner/           # planner views, task card, wizard, scope, plan menu
    syllabus/          # browser rows, stage select, progress bars, topic meta
    knowledge/         # workspace sections, editor, preview, bookmarks, picker
    search/            # Ctrl+K provider + triggers
    settings/          # profile, appearance, data cards
  data/
    syllabus/          # the authored syllabus tree (source of truth for topic ids)
    topic-intel.ts     # curated exam intelligence (priorities/difficulty/time)
  lib/
    syllabus.ts        # indexed syllabus API (built once at module load)
    stages.ts          # study lifecycle, TopicState, priorities, plan states
    progress.ts        # weighted roll-ups
    planner/           # THE ENGINE: 13 pure service modules + types + config
    knowledge/         # knowledge services: notes, search, insights + types + config
    id.ts, utils.ts    # shared utilities
  store/
    app-store.ts       # planner/progress store (persist v4) + backup logic
    knowledge-store.ts # knowledge store (persist v1) + sanitization
  hooks/use-mounted.ts # hydration gate
```

## 7. Storage model (critical)

Three independent zustand-persist stores in localStorage:

| Key | Version | Contents |
|---|---|---|
| `upsc-os-store` | 4 | topics (TopicState map), displayName, examDate (= Prelims date), recentTopics, planner (PlannerSettings), tasks (PlannedTask map), lastPlannedAt, snapshots (daily), focusCollectionId |
| `upsc-os-knowledge` | 1 | richNotes, quickNotes, flashcards, keywords, bookRefs, resources, pyqs, currentAffairs, bookmarks, collections, events (timeline, capped 1500) |
| `upsc-os-ai` | 2 | providers `{apiKey, selectedModel (free-form string), lastRefresh?, availableModels?}` — device-only, NO hardcoded model list; order, per-capability routing, dailyBudgetTokens, usage log, response cache (LRU+TTL), conversations, mentor memory, activity feed. Keeps AI state separate from planner state (perf). Migrate v1→v2 renamed `model`→`selectedModel`. See `docs/AI_ARCHITECTURE.md`. |

- **Migration chain** in `app-store.ts` `migrate`: v1→v2→v3→v4. Never remove old
  steps. New TopicState fields need NO migration: `getTopicState` merges
  `DEFAULT_TOPIC_STATE` over stored objects (WeakMap-cached for referential
  stability — see §12.1).
- **Backups**: one JSON file, format version **6** (`BACKUP_VERSION`), contains
  the app store plus a `knowledge` section and an `ai` section
  (`selectedModel` per provider, routing, budget, conversations, memory —
  **API keys never exported**). `parseExportedState` accepts ALL older
  versions (v1–v6) and sanitizes every field (drop-don't-throw); the AI
  sanitizer reads `selectedModel` and falls back to the legacy `model` key,
  and keeps NO model whitelist. All three stores reset/import together via
  Settings → Data.
- localStorage budget ≈ 5 MB; usage meter in Settings. Images in notes are
  URL-references only. IndexedDB is the planned escape hatch (Bridge phase).

## 8. The planner model (how scheduling actually works)

Primary data: `TopicState` per leaf topic (see DATA_MODEL.md) + `PlannedTask`s.

**Replan (`regenerate` in app-store) runs**: on planner open each new day, on
Replan click, after configurePlanner / scope changes / focus changes / manual
planning. Steps:
1. Overdue pending tasks → status `missed` (kept as history) + topic
   `missedSessions`/`postponeCount` increments.
2. Pending **auto** tasks are deleted (they will be regenerated); pending
   **user** (pinned) tasks survive unless their topic is finished, excluded, or
   paused. Completed tasks are immutable history and never move.
3. Fatigue damping: `fatigueIndicator` (real streak + hard work actually
   completed — NOT planned load) × `burnoutSensitivity` → `loadFactor`.
4. `generateSchedule` (pure, `src/lib/planner/scheduler.ts`) fills a rolling
   14-day horizon; per day: due **revisions** first (≤ 60% of capacity;
   weekends uncapped when `weekendStrategy: "revision-heavy"`), then
   **continuity** (partially-read topics finish first), then **study fill** via
   hierarchical rotation *exam-stage → paper → unit → topic* with unit queues
   sorted by **dynamic priority score**, hard-topic spacing, and a strict
   `maxHardPerDay`. Filtered picks sweep up to `pickSweepLimit` (40) rotation
   candidates. Recovery day: user's weekly off day, else auto every 7th day.
   Vacations produce zero capacity.
5. Daily snapshot written (burnout, health, remainingMinutes, backlog).

**Dynamic priority score** (`priority.ts`): curated base (topic-intel) +
confidence gap (from `confidence.ts` decay model) + revision overdue + postpone
history + exam proximity. Every component carries a human-readable reason;
`explain.ts` rebuilds "Why this session?" from the same functions.

**Revision ladder**: finishing a first reading anchors `nextRevisionAt`
(+intervals[0]); completing a revision task climbs revision-1/2/3 and
re-anchors (+intervals[1], +intervals[2], then null). Intervals are per-user
(`settings.revisionIntervals`, default [3,10,30], supports any length; the
stage ladder caps at revision-3; "exam-ready" is always a manual call).

**Scope** (0.5.1): `TopicState.planState` — `buildWorkPool` and
`buildRevisionQueue` only accept `included` topics; forecast drops `excluded`
but keeps `paused`; `focusCollectionId` (a knowledge bookmark collection)
restricts the fresh-study pool only, never revisions.

**Forecast** (`forecast.ts`): workload = remaining readings + ALL pending
revisions; capacity from settings (aggressiveness/weekend-aware); observed pace
(14-day window, ≥3 active days) blended 50/50; finish probability =
logistic(k·slack) for Prelims and Mains; CI from pace variability.

## 9. The Knowledge Workspace model

Every **leaf** topic page (`/syllabus/[id]`) mounts `TopicWorkspace`:
collapsible sections (Notes, Quick Notes, Flashcards, Keywords, Book
References, Resources, PYQs, Current Affairs, History & Timeline) plus a
disabled AI placeholder card. Non-leaf pages remain pure browsers.

- One rich markdown note per topic; unlimited everything else.
- Flashcards are **deliberately independent** of the planner's revision engine
  (they carry their own review streaks and an `ai` slot for a future SRS).
- Current affairs and PYQs can link to multiple topics.
- Bookmarks target any entity type and live in collections (4 built-ins with
  fixed ids: `col-must-revise`, `col-weak-areas`, `col-essay-material`,
  `col-interview-notes`).
- Timeline events are the ONLY stored history (capped); per-topic Study
  History and the timeline UI merge them with planner task history at read.
- Knowledge search (`knowledge/search.ts`): fuzzy tiers substring(3) >
  all-tokens(2) > subsequence(1), across 9 entity types incl. syllabus topics;
  surfaced in the Ctrl+K palette with filter chips.

## 10. How subsystems connect (dependency direction)

```
data/syllabus ──► lib/syllabus ──► everything (topic ids, tree)
data/topic-intel ──► lib/planner/intel ──► priority, workload, explain, UI labels
lib/stages (TopicState) ──► planner engine, knowledge insights, UI
store/app-store ──► lib/planner/* (engine) + store/knowledge-store (read-only:
                    backup embedding + focus-collection lookup)
store/knowledge-store ──► lib/knowledge/*, lib/syllabus (NEVER imports app-store)
components ──► stores + lib (components contain NO business logic)
```
One-way rule: **knowledge-store must never import app-store** (prevents cycles;
app-store may read knowledge-store). Engine modules never import stores.

## 11. Conventions

- **Naming**: kebab-case files; PascalCase components; camelCase functions;
  `use*` hooks; `*Section` for workspace sections; `*Card` for dashboard cards;
  `*View` for planner tabs; dotted topic ids (`prelims.gs.polity.constitution.fundamental-rights`)
  where segment 1 = exam stage, 1–2 = paper, 1–3 = unit ("subject" for rotation).
- **Dates**: local-timezone `YYYY-MM-DD` strings everywhere in planner logic
  (`lib/planner/dates.ts`); ISO strings for timestamps.
- **Components**: client components gate persisted reads behind `useMounted()`;
  whole-object store selectors rely on `getTopicState`'s cached references.
- **Commits**: conventional prefixes (`feat:`/`fix:`/`docs:`/`test:`/`chore:`),
  body bullets, one commit per completed milestone (restorable points).
- **Copy/tone**: calm, honest, mentor-like microcopy; en-IN date formatting.

## 12. HARD RULES — things that must never be changed casually

1. **`getTopicState` must return referentially stable objects** (WeakMap cache
   over stored objects). Breaking this causes React "Maximum update depth
   exceeded" loops (regression tests in `stages.test.ts`).
2. **Never feed planner output back as planner input.** Burnout *damping* and
   the burnout *recommendation* use `fatigueIndicator` (behaviour only). The
   display indicator may include planned load. Using planned load for damping
   made the plan shrink itself (3→2 sessions/day) — documented failure.
3. **Migration chain and backup sanitizers only grow, never shrink.** Old
   stores and old backup files must import forever.
4. **Config over constants.** New thresholds go in the config files.
5. **`npm run build` must never run while the dev server is running** — both
   write `.next` and corrupt the server. Use `npm run build:check`.
6. **Gate shell checks on real exit codes** (`cmd > log 2>&1; RC=$?`) — piping
   to grep/tail swallows failures (this bit the project twice).
7. **Badge/Card render `<div>`s — never place them inside `<p>`** (hydration).
8. Completed tasks never move or mutate; missed tasks are history, not deletions.
9. Topic ids are permanent identifiers. Never rename syllabus node ids —
   progress and knowledge key off them. Adding topics is fine.
10. AI placeholder fields (`RichNote.ai.*`, `Pyq.aiExplanation`,
    `CurrentAffair.aiSummary`, `Flashcard.ai`) are written ONLY by the AI
    layer (`src/lib/ai/*`), never by UI components or the planner/knowledge
    engines. No vendor SDK is imported outside `src/lib/ai/providers/*`. The
    LLM never mutates state directly — it proposes typed actions that the
    action layer validates and executes through existing store actions.

## 13. Known extension points (designed-in, safe to build on)

- `TopicState`: add fields with defaults — auto-backfilled (no migration).
- `PlannedTask.kind`: `"study" | "revision"` today; new kinds (pyq-practice,
  mock, essay) slot into the scheduler's day-fill pipeline.
- `Flashcard.ai`, `RichNote.ai`, `Pyq.aiExplanation`, `CurrentAffair.aiSummary`:
  Phase C outputs.
- `DailySnapshot`: extend for more trends.
- `searchKnowledge`: add entity types by adding a push-block + filter chip.
- Scheduler `studyTopicFilter`: any future "focus" source can feed it.
- Recommendation engine: independent rules — append new ones freely.

## 14. Testing strategy

Vitest, node env, `src/**/*.test.ts`. 119 tests in 12 files covering: syllabus
data integrity, weighted progress, scheduler invariants (capacity, off days,
mixing, spacing, quotas, vacations), revision ladder, adaptive behaviour
(priority dynamics, confidence decay), forecast/probability/health, store
actions + migrations + backup round-trips (v1–v5), knowledge CRUD/review/
timeline/sanitization, fuzzy search, scope. Stores are tested by stubbing
`localStorage` with an in-memory implementation **before** dynamic import.
No component/DOM tests yet (accepted debt — see PROJECT_STATUS.md). UI changes
are verified live in a browser before each milestone commit.

## 15. Working agreement with the founder

Plain English; explain jargon; click-by-click steps when he must act; make all
technical decisions for him; every milestone: build → fix → commit → tell him
how to test. Keep `/PROJECT_STATE.md`, `/CHANGELOG.md`, `/KNOWN_ISSUES.md`,
`/README.md`, `/DEPLOYMENT.md`, `/ROADMAP.md` current.
