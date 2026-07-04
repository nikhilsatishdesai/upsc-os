# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Last updated:** 2026-07-04

## Current Milestone

**V3 "Intelligence Engine" — CODE-COMPLETE.** All milestones committed and live-verified. **Still NOT deployed** — founder must create GitHub + Vercel accounts (DEPLOYMENT.md has click-by-click steps). This remains the single blocking item from V1.

V3 milestones (each one git commit, restorable):
1. ✅ Intelligence engine core: priority engine + curated exam intel + automatic revisions + difficulty balancing + store v3
2. ✅ Study capacity engine, completion forecast, burnout indicator, expanded analytics
3. ✅ Intelligent UI: smart task cards, Today's Mission, weekly intelligence
4. ✅ Render-loop fix (stable selector references) + setup capacity hint + docs

## Completed Work

- **V1 Foundation:** syllabus browser (235 topics), progress tracking, dashboard, Ctrl+K search, settings/backup, landing page.
- **V2 Compass:** adaptive study planner — setup wizard, Today/Week views, drag & drop, task actions, analytics, dashboard integration.
- **V3 Intelligence Engine:** see architecture below. 64 tests green, lint clean, `build:check` = 303 static pages. Live-verified: priority-first scheduling (Gandhian era/Fundamental Rights/monsoon open their subjects), auto revision generation + ladder completion (R1→+10d verified in browser), V2→V3 migration, forecast "On track / 31 Mar 2027", burnout indicator.

## Current Architecture

- **Local-first single-user app.** No backend/auth until V5 "Bridge". Do not add server state before then.
- **Topic model** (`src/lib/stages.ts`): 7-stage lifecycle + per-topic `priority/difficulty/estimatedMinutes` as **user overrides (null = auto)** resolved against the curated intelligence layer; plus `studiedMinutes, lastStudiedAt, revisionCount, confidence, nextRevisionAt`. `getTopicState` merges defaults with a WeakMap cache — **selector references must stay stable** (see stages.test.ts regression tests).
- **Intelligence layer:** `src/data/topic-intel.ts` (curated priorities/difficulty/time/revision weights by topic/sub-unit/unit/paper) + `src/lib/planner/intel.ts` (cascading resolution: user → topic → ancestors → config; paper short names, subject names).
- **Scheduler** (`src/lib/planner/scheduler.ts`): per day → (1) due spaced revisions first, capped at 60% capacity, (2) study fill via hierarchical rotation (exam stage → paper → unit → topic) with **priority-sorted unit queues** and **hard-topic spacing** (lookahead 4). Recovery day auto-inserted every 7th day when no weekly off day. Pinned tasks + today's completed minutes reserve capacity.
- **Revision engine:** finishing a first reading (or any manual stage change) anchors `nextRevisionAt` (+3d); due topics become `kind:"revision"` tasks; completing one climbs revision-1/2/3 and re-anchors (+10d, +30d, then done). Exam-ready stays a manual confidence call.
- **Forecast** (`forecast.ts`): remaining workload = readings + all pending revisions vs weekly capacity → days required, expected completion date, pace status (on-track/tight/behind + required daily minutes). **Burnout** (`analytics.ts`): load ratio + consecutive days + hard share → sustainable/elevated/high. All thresholds in `config.ts` — nothing hardcoded.
- **Store v3** (`upsc-os-store`, migrate chain v1→v2→v3; v2 "medium" difficulty → null/auto). Backups: V1/V2/V3 files all import.
- **Hydration rule:** store-reading components gate on `useMounted()`; whole-object selectors rely on the getTopicState cache.

## Key Files (V3 additions)

- `src/data/topic-intel.ts` — curated exam intelligence (edit here to tune priorities)
- `src/lib/planner/intel.ts`, `forecast.ts` — resolution + capacity/forecast engines
- `src/lib/planner/config.ts` — every tunable (revision intervals, caps, burnout weights, day-label thresholds)
- `src/components/ui/progress-ring.tsx` — shared ring (dashboard + mission)
- Tests: `intel.test.ts`, `forecast.test.ts`, `stages.test.ts` + expanded `scheduler.test.ts`, `app-store.test.ts`

## Remaining Tasks

- **Deploy V1–V3:** founder creates GitHub + Vercel accounts → DEPLOYMENT.md steps.
- Then V4 planning (per ROADMAP: "Archive" PYQ bank — topic model already has the hooks; roadmap phases may be re-sequenced vs the founder's phase names).

## Known Bugs

- None open. See KNOWN_ISSUES.md (notably: never run `npm run build` while dev server runs — use `npm run build:check`).

## Commands Required

- `npm run dev` — dev server · `npm test` / `npm run lint` — quality gate
- `npm run build:check` — production build in isolated `.next-check` (safe alongside dev server)

## Deployment Status

- **Not deployed.** Fully Vercel-ready, no env vars.

## Environment Facts

- Founder is a **non-programmer** — plain English, click-by-click steps, all technical decisions made for him.
- Windows 11, Node v25, TS 6 strict, Next 15.5, eslint flat config. Preview config in `.claude/launch.json`.

## Next Recommended Step

Deploy (founder accounts), then plan V4. When tuning scheduling behavior, change `src/lib/planner/config.ts` and `src/data/topic-intel.ts` — never inline constants.
