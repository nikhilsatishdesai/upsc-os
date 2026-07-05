# CHANGELOG.md — complete milestone history (developer view)

> Product-version changelog: `/CHANGELOG.md` (repo root). This is the full
> commit-level milestone record, 30 commits, 2026-07-04 → 2026-07-05.

## V1 "Foundation" — 0.1.0

| Commit | Milestone |
|---|---|
| `81cad48` | Approved V1–V10 roadmap (local-first V1) + maintained doc set |
| `af8c8be` | Next.js 15 scaffold: TS strict, Tailwind v4 oklch tokens, ESLint, Vitest, Geist |
| `4ceea75` | Design-system primitives + responsive shell (sidebar / mobile nav) + theme toggle + palette skeleton |
| `944d3a7` | Complete UPSC syllabus dataset (235 leaf topics), SSG topic pages, localStorage progress tracking |
| `1d514a3` | Dashboard: countdown, progress ring, per-paper progress, recent topics |
| `0e59fbd` | Ctrl+K search across all topics (ranked, recents) |
| `38fac87` | Landing page + settings (profile, exam date, theme, backup export/import/reset) |
| `4c93186` | 23-test suite; lint fixes; ring-label fix; V1 docs finalized |

## V2 "Compass" — 0.2.0

| Commit | Milestone |
|---|---|
| `20e013c` | Study lifecycle v2 (7 stages, weighted %), revision-ready topic model, scheduling engine v1, store v2 + v1 migration |
| `2cd1419` | Planner page: setup wizard, Today/Week views, drag & drop, task actions (complete/skip/move/split/merge), analytics tab |
| `774d124` | Dashboard integration: dual countdown, today panel + streak, recent activity |
| `6d4b9d8` | `build:check` isolation (dev-server corruption fix); V2 docs |

## V3 "Intelligence Engine" — 0.3.0

| Commit | Milestone |
|---|---|
| `2eb4397` | Curated exam intel + cascading resolution; priority-aware scheduling; automatic spaced revisions (3/10/30d, capped 60%/day); difficulty spacing; recovery days; capacity fix; store v3 |
| `5f0d879` | Capacity engine, completion forecast v1, burnout indicator, expanded analytics |
| `b08b8de` | Smart task cards, Today's Mission, weekly intelligence labels, shared ProgressRing |
| `8736804` | fix: WeakMap-stable `getTopicState` (render-loop regression + tests); setup capacity-mismatch hint |
| `7396f78` | V3 docs |

## Phase A "Intelligence Core" — 0.4.0

| Commit | Milestone |
|---|---|
| `ae39779` | Dynamic priority scoring (with reasons), confidence decay model, behaviour counters, continuity scheduling, scheduler v3 (maxHard/day, easy-first mornings, weekend strategies, vacations, aggressiveness, fatigue damping), settings expansion, store v4, snapshots |
| `1179aff` | Forecast v2 (observed pace blend, Prelims/Mains finish probabilities, CI), recommendation engine (mandatory WHY), study health score (7 components) |
| `ea7a845` | Explainability: "Why this session?" dialog, mission reasoning, dashboard Insights card, predictive analytics (trends, efficiency, probabilities) |
| `bdee72e` | fix: burnout recommendation keys off real fatigue (self-feedback prevention); Phase A docs |

## Phase B "Knowledge OS" — 0.5.0

| Commit | Milestone |
|---|---|
| `271381b` | Knowledge data layer: entity types, second persisted store, backup format v5, storage meter, full import sanitization |
| `a58a87d` | Rich notes editor (markdown/GFM/callouts/highlighting, auto-save, counts, versions) + quick notes + collapsible workspace shell |
| `812a4f0` | Flashcards with review mode (due logic, streaks), keywords, book references, resource library |
| `1f6fa73` | PYQs, current affairs (multi-topic linking), bookmarks + collections, study history & merged timeline, disabled-AI placeholder card |
| `f627b52` | Knowledge search engine (fuzzy tiers, 9 entity types, filter chips in Ctrl+K) + dashboard Knowledge card |
| `cacc16f` | fix (live-verification): callout paragraph normalization; Badge-in-`<p>` hydration |
| `b1126eb` | Phase B docs |

## Study Scope Management — 0.5.1

| Commit | Milestone |
|---|---|
| `6097c49` | planState include/pause/exclude (engines scope-aware, forecast semantics, progress preserved), Planner Scope tab (bulk tri-state), focus collections, manual planning (Plan menu, pinned sessions), 119 tests |
| `17c076a` | 0.5.1 docs |

## Documentation phase — this folder

Everything in `/docs` (MASTER_CONTEXT, SYSTEM_ARCHITECTURE, DATA_MODEL,
PROJECT_STRUCTURE, API_ABSTRACTION, PHASE_C_SPEC, DATABASE_EVOLUTION,
DEPLOYMENT_GUIDE, CONTRIBUTING, CHANGELOG, PROJECT_STATUS) — no code changes.
