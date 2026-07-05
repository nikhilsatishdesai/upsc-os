# PROJECT_STRUCTURE.md

> How to navigate the codebase. Counts verified 2026-07-05:
> 118 TS/TSX files, ~16,500 LOC (components 7.3k · lib 5.3k · store 2.6k ·
> data 0.9k · app 0.4k), 12 test files / 119 tests.

## Root

| Path | Purpose |
|---|---|
| `README.md` | User-facing overview + dev commands |
| `PROJECT_STATE.md` | **Session handoff** — current milestone, gotchas, next step. Update after every working session. |
| `CHANGELOG.md` / `KNOWN_ISSUES.md` / `ROADMAP.md` / `DEPLOYMENT.md` | Founder-facing docs, kept current every milestone |
| `docs/` | Developer/AI documentation (this folder) |
| `next.config.ts` | `distDir` honours `NEXT_DIST_DIR` → enables `build:check` |
| `eslint.config.mjs` | eslint-config-next ≥16 native flat config (no FlatCompat) |
| `vitest.config.ts` | node env, `src/**/*.test.ts`, `@` alias |
| `src/types/css.d.ts` | `declare module "*.css"` (TS 6 needs it for side-effect CSS imports) |
| `.claude/launch.json` | Preview dev-server config (port 3000) |

Scripts: `dev` · `build` (Vercel) · `build:check` (isolated `.next-check`; the
ONLY safe build while `dev` runs) · `test` · `lint`.

## `src/app` — routes (438 LOC)

Next.js App Router. `/` is the marketing landing (server component). The
`(app)` group wraps product pages in the shell (`(app)/layout.tsx`: Sidebar,
MobileHeader, MobileNav, SearchProvider). Pages are thin: they compose
components and contain no logic. `syllabus/[id]` uses `generateStaticParams`
over every syllabus node (296 pages) with `dynamicParams = false`.

## `src/data` — authored content (874 LOC)

- `syllabus/` — the official UPSC syllabus as nested `SyllabusNodeDef` trees,
  one file per paper. **This is the source of truth for topic ids.** Editing
  titles is safe; editing `id` slugs is not (hard rule).
- `topic-intel.ts` — curated exam intelligence (priority/difficulty/minutes/
  revisionWeight) at topic/sub-unit/unit/paper level. Tune scheduling behaviour
  here, not in code.

## `src/lib` — all business logic (5,272 LOC)

Pure modules; no React, no store imports. Independently testable.

- `syllabus.ts` — builds the indexed tree once at module load; exports
  `getNode/getChildren/getLeafIds/getBreadcrumbs/getStages/getAllNodes`.
- `stages.ts` — study lifecycle (7 stages + weights), `TopicState` +
  `DEFAULT_TOPIC_STATE`, priorities, plan states, and the **WeakMap-cached
  `getTopicState`** (referential stability — do not "simplify" this).
- `progress.ts` — weighted subtree roll-ups.
- `planner/` — the engine, one concern per file:
  `types` → `config` (every tunable + `withPlannerDefaults`) → `dates` →
  `capacity` → `intel` → `confidence` → `priority` → `workload` → `scheduler`
  → `forecast` → `analytics` → `recommendations` → `health` → `explain`.
  Import direction follows that order (later files import earlier ones).
- `knowledge/` — `types` → `config` → `notes` (counts/snippets) → `insights`
  (due cards, history, timeline, stats) → `search` (fuzzy engine).
- `id.ts` (`makeId`), `utils.ts` (`cn`).

## `src/store` — persistence (2,604 LOC)

- `app-store.ts` — planner/progress store (`upsc-os-store`, persist v4).
  Contains: state + ~20 actions, the `regenerate` replan orchestration,
  migration chain v1→v4, backup export/parse (format v5) with full
  sanitization. Reads knowledge-store (backup + focus collections); never the
  reverse.
- `knowledge-store.ts` — knowledge entities (`upsc-os-knowledge`, persist v1):
  CRUD actions, flashcard review logic, timeline event log (capped), built-in
  collections, `sanitizeKnowledgeExport`.

Store rules: immutable updates only; actions are the ONLY mutation path;
components never compute business results (they call lib services in
`useMemo`).

## `src/components` — presentation (7,290 LOC, 63 files)

| Folder | Files | Notes |
|---|---|---|
| `ui/` | 14 | Design-system primitives (button, card, dialog, dropdown, command, input, label, badge, progress, progress-ring, separator, skeleton, native-select). Generic only — nothing domain-specific. |
| `layout/` | 4 | Shell. `nav-items.ts` is the single nav source (sidebar + mobile + palette). |
| `dashboard/` | 9 | One card per file; all mounted-gated; derive via lib services. |
| `planner/` | 10 | `planner-view` (tabs) → today/week/scope/analytics views, task-card (actions + Why dialog), setup form/wizard, settings dialog, plan-topic-menu. |
| `syllabus/` | 5 | Browser rows, stage select, subtree progress, topic meta, recent tracker. |
| `knowledge/` | 14 | `topic-workspace` assembles collapsible sections; editor + markdown preview; per-entity sections; bookmark-menu; topic-picker. |
| `search/` | 2 | Palette provider (Ctrl+K, filters) + triggers. |
| `settings/` | 3 | Profile, appearance, data (backup/import/reset/usage). |
| root | 3 | logo, theme-provider, theme-toggle. |

## `src/hooks`

`use-mounted.ts` — `useSyncExternalStore`-based hydration gate. Required by any
component reading persisted state (SSR renders defaults).

## Tests (12 files, co-located `*.test.ts`)

`lib/`: syllabus integrity, progress, stages stability; `lib/planner/`:
scheduler invariants, intel resolution, adaptive behaviour, forecast/health/
recommendations, scope; `store/`: app-store actions+migrations+backups,
knowledge-store CRUD+sanitization; `lib/knowledge/`: notes/search/insights.
Pattern for store tests: stub `localStorage` in-memory **before**
`await import` of the store.

## How to navigate as a newcomer

1. Read `docs/MASTER_CONTEXT.md`, then `/PROJECT_STATE.md` (current state).
2. Trace one flow end-to-end: `planner-view.tsx` → `app-store.regeneratePlan`
   → `scheduler.ts` → `workload.ts` → `priority.ts`. That's 80% of the mental
   model.
3. Trace one knowledge flow: `topic-workspace.tsx` → `flashcards-section.tsx`
   → `knowledge-store.reviewFlashcard` → `insights.ts` due logic.
4. Run `npm test` and read the test names — they document every guarantee.
5. Before changing scheduling behaviour, check `config.ts` first; the change
   probably belongs there.
