# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Last updated:** 2026-07-04

## Current Milestone

**V2 "Compass" (Study Planner) — CODE-COMPLETE.** All V2 milestones committed and verified live in the browser. **Neither V1 nor V2 is deployed yet** — founder still needs to create GitHub + Vercel accounts (DEPLOYMENT.md has click-by-click steps).

V2 milestones (each one git commit, restorable):
1. ✅ Study lifecycle v2 + revision-ready topic model + scheduling engine + store v2 (with V1 data migration)
2. ✅ Planner page: setup wizard, Today/Week views, drag & drop, task actions, analytics tab
3. ✅ Dashboard integration: dual countdown, today panel with streak, recent activity
4. ✅ Build isolation fix (`build:check`), docs, live verification

## Completed Work

- **V1 Foundation** (see git history): local-first app — syllabus browser (235 topics), progress tracking, dashboard, Ctrl+K search, settings with JSON backup, landing page.
- **V2 Compass:** adaptive study planner (details below). 37 tests green, lint clean, `npm run build:check` generates 303 static pages.
- Live-verified user journey: setup wizard → 36 tasks over 12 days (Sundays off, 3×60-min mixed sessions/day, prelims↔mains alternating) → task completion updates topic minutes → dashboard reflects streak/percentages.

## Current Architecture

- **Local-first single-user app.** No backend/auth until V5 "Bridge". Do not add server state before then.
- **Study lifecycle:** 7 stages (`not-started → first-reading → notes-made → revision-1/2/3 → exam-ready`) in `src/lib/stages.ts`, each with a weight; preparation % = mean stage weight (exam-ready = 100%). Topic model carries `studiedMinutes, lastStudiedAt, revisionCount, difficulty, confidence, estimatedMinutes, nextRevisionAt` — the V3 revision engine plugs in with **no schema changes**.
- **Scheduling services** (pure logic, UI-free, in `src/lib/planner/`): `config.ts` (all tunables), `dates.ts`, `capacity.ts` (day minutes/sessions/slots), `workload.ts` (effective estimates × difficulty, remaining-minutes pool), `scheduler.ts` (hierarchical round-robin: exam stage → paper → unit → topic; respects pinned tasks; never exceeds capacity), `analytics.ts` (streak, weekly/monthly %, consistency, workload).
- **Adaptive replan:** on planner open each new day (and via Replan button): overdue pending tasks → status `missed` (kept for history), auto tasks regenerate from remaining workload, user-moved ("pinned") tasks survive untouched. Missed work redistributes across the horizon — never dumped onto tomorrow.
- **Task completion ↔ syllabus sync:** completing sessions accumulates `studiedMinutes`; reaching the topic estimate auto-advances stage to `first-reading`. Manually setting a stage ≥ first-reading removes the topic from the scheduling pool on next replan. Two-way, automatic.
- **Store v2** (`src/store/app-store.ts`, localStorage key `upsc-os-store`, version 2, with `migrate` from v1 and v1-backup import). Actions: setStage, setTopicMeta, configurePlanner, regeneratePlan, completeTask, skipTask, reopenTask, moveTask, splitTask, mergeTasks.
- **Hydration rule:** store-reading components gate on `useMounted()`.
- Prelims date = `examDate` in store (shared with Settings page); Mains date lives in `planner.mainsDate`.

## Key Files (V2 additions)

- `src/app/(app)/planner/page.tsx` → `src/components/planner/*` (planner-view, setup-wizard/form, settings-dialog, today-view, week-view, analytics-view, task-card)
- `src/components/dashboard/today-plan-card.tsx`, `recent-activity-card.tsx`, reworked `countdown-card.tsx`
- `src/components/syllabus/topic-meta.tsx` (difficulty/confidence/time editor on leaf pages)
- Tests: `src/lib/planner/scheduler.test.ts`, `src/lib/progress.test.ts`, `src/store/app-store.test.ts`, `src/lib/syllabus.test.ts`

## Remaining Tasks

- **Deploy V1+V2:** founder creates GitHub + Vercel accounts → push → import (DEPLOYMENT.md).
- Then V3 "Memory": notes, flashcards, FSRS revision engine (fills `nextRevisionAt`, generates `kind: "revision"` tasks — planner already renders them).

## Known Bugs

- None open. See KNOWN_ISSUES.md.

## Commands Required

- `npm run dev` — dev server (http://localhost:3000)
- `npm test` / `npm run lint` — quality gate
- `npm run build:check` — production build in isolated `.next-check` folder (**use this while the dev server runs**; plain `npm run build` corrupts the live dev server's cache)

## Deployment Status

- **Not deployed.** Fully Vercel-ready, no env vars needed.

## Environment Facts

- Founder is a **non-programmer** — plain English, click-by-click steps, make all technical decisions for him.
- Windows 11, Node v25, TS 6 strict, Next 15.5, eslint-config-next 16 (native flat config). Preview server config in `.claude/launch.json`.

## Next Recommended Step

Get V1+V2 deployed (founder accounts), then plan V3 "Memory" (notes + flashcards + FSRS revision engine on the already-prepared topic model).
