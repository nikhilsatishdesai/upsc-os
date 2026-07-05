# CONTRIBUTING.md

> How to work on UPSC OS without degrading it. Read
> `docs/MASTER_CONTEXT.md` §12 (hard rules) before your first change.

## Setup

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest, node env
npm run lint         # eslint flat config, zero-warning standard
npm run build:check  # prod build in .next-check (safe while dev runs)
```

## Architecture rules (enforced in review)

1. **Business logic lives in `src/lib`**, pure and store-free. Components
   render and call store actions; heavy derivations go through lib services in
   `useMemo`. If a component grows an algorithm, extract it.
2. **Stores are the only mutation path.** Immutable updates. app-store may
   read knowledge-store; never the reverse. Engine modules import neither.
3. **Config over constants** — tunables belong in `lib/planner/config.ts` /
   `lib/knowledge/config.ts`.
4. **Derived over stored** — if it can be computed from topics/tasks/events,
   compute it. New persisted fields need: type + default (TopicState-style
   auto-backfill) or a migration step + backup sanitizer coverage.
5. **Explainability**: anything that influences scheduling must expose
   human-readable reasons (see `priority.ts` pattern).
6. **Never violate the hard rules** (MASTER_CONTEXT §12): stable
   `getTopicState` references; no planner-output→planner-input feedback;
   migrations/sanitizers only grow; no `<div>`-rendering components inside
   `<p>`; permanent topic ids; `build:check` not `build` beside a dev server.

## Coding standards

- TypeScript strict; no `any` (use `unknown` + narrowing; sanitizers show the
  pattern). Exported functions get JSDoc explaining the WHY.
- Files kebab-case; components PascalCase; hooks `use*`; one component
  concern per file. Follow existing naming: `*Card` (dashboard), `*View`
  (planner tabs), `*Section` (workspace).
- Dates: `YYYY-MM-DD` local strings via `lib/planner/dates.ts`; never
  `new Date(dateString)` on bare dates (timezone bugs).
- UI: Tailwind + existing `components/ui` primitives; design tokens only (no
  hex colors); every interactive element keyboard-accessible with an
  aria-label; client components reading persisted state gate on
  `useMounted()`.
- Microcopy: calm, honest, mentor-tone; en-IN dates; no gamification language.

## Testing requirements

- New engine/service logic: unit tests in a co-located `*.test.ts` (node env).
- New store actions: tests using the in-memory `localStorage` stub imported
  BEFORE the store (see `app-store.test.ts` top).
- Behavioural guarantees (capacity limits, scope, ladder timing) are tested as
  invariants, not snapshots.
- Bug fixes ship with a regression test (see `stages.test.ts` for the model).
- UI changes: verify live in the browser before committing (screenshots or
  DOM checks); no DOM test harness exists yet.
- Gate: `npm test && npm run lint && npm run build:check` all green — check
  real exit codes.

## Commit format

```
<type>: <imperative summary ≤ 72 chars>

- bullet: what and why (not how)
```
Types: `feat` `fix` `docs` `test` `chore` `refactor`. One commit per completed
milestone — every commit on `main` must leave the app runnable and green.
Update the founder-facing docs (`/PROJECT_STATE.md`, `/CHANGELOG.md`,
`/KNOWN_ISSUES.md` when relevant) in the same commit.

## Review checklist

- [ ] Hard rules untouched (MASTER_CONTEXT §12)
- [ ] Logic in lib, not components; config not constants
- [ ] Types strict; ids/dates conventions followed
- [ ] Tests added & meaningful; full gate green (real exit codes)
- [ ] Backward compatibility: old localStorage + old backup files still load
- [ ] Mounted-gating for persisted reads; no invalid HTML nesting
- [ ] Docs updated (PROJECT_STATE at minimum)
- [ ] Verified in the browser (both themes if UI changed)
