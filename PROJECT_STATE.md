# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Last updated:** 2026-07-05

## Current Milestone

**Phase A "Intelligence Core" — CODE-COMPLETE.** All milestones committed and live-verified. **Still NOT deployed** — founder must create GitHub + Vercel accounts (DEPLOYMENT.md has click-by-click steps). This remains the single blocking item since V1.

Phase A milestones (each one git commit, restorable):
1. ✅ Adaptive core: dynamic priority, confidence decay, behaviour history, settings expansion, scheduler v3, store v4
2. ✅ Forecast v2 (probabilities, observed pace, CI), recommendation engine, study health score, daily snapshots
3. ✅ Explainability (+Why-this-session), dashboard insights, predictive analytics, mission reasoning
4. ✅ Live verification, burnout-recommendation fix, docs

## Completed Work (cumulative)

- **V1 Foundation:** syllabus browser (235 topics), stages, dashboard, search, settings/backup, landing.
- **V2 Compass:** adaptive planner (wizard, Today/Week, DnD, task actions), dashboard integration.
- **V3 Intelligence Engine:** curated exam intel, priority-aware scheduling, spaced revisions (3/10/30), difficulty balancing, forecast v1, burnout indicator, Today's Mission.
- **Phase A Intelligence Core:** see CHANGELOG 0.4.0. 92 tests green, lint clean, build = 303 pages. Live-verified: advanced setup saves, Why-dialog explains real reasons, insights card (health badge + reasoned recommendations), forecast probabilities (78%/98% shown), v3→v4 migration incl. overdue revision rescheduled after the off day.

## Current Architecture (intelligence layer)

Independent, individually-tested services in `src/lib/planner/` — business logic never lives in components:
- `config.ts` — EVERY tunable (weights, intervals, thresholds, damping) + `withPlannerDefaults` (old stored settings gain new fields on read; never migrate UI-side).
- `intel.ts` + `src/data/topic-intel.ts` — curated exam importance, cascading resolution (user → topic → ancestors → config).
- `priority.ts` — dynamic score with reasons: base + confidence gap + revision urgency + postponements + exam proximity.
- `confidence.ts` — effective confidence (derived; stored user rating never mutated).
- `workload.ts` — pools/queues (score-ordered; `started` items get continuity), estimates, revision minutes.
- `capacity.ts` — day/weekly capacity incl. aggressiveness, weekend strategy, vacations, damping factor.
- `scheduler.ts` — per day: due revisions (≤60% cap; weekends uncapped if revision-heavy) → continuity (finish started readings) → score-ordered rotation (stage→paper→unit→topic) with hard-spacing, maxHardPerDay (strict), easy-first mornings, pick-sweep (see gotcha below).
- `forecast.ts` — workload vs capacity blended with observed pace; logistic finish probabilities; CI from pace variability.
- `analytics.ts` — descriptive stats + `burnoutIndicator` (display, load-aware) + `fatigueIndicator` (behaviour-only — DRIVES damping & the burnout recommendation; see gotcha).
- `recommendations.ts` — rule set, every item has `why`.
- `health.ts` — 7-component weighted score.
- `explain.ts` — reconstructs per-task reasons from the same scoring (no stored prose) + mission reasoning line.
- Store v4 (`app-store.ts`): behaviour counters on skip/move-later/miss/complete; custom revision intervals honoured; daily snapshots (60d); regenerate = missed→history+counters, pinned survive, completed-today reserves capacity, fatigue damping.

## CRITICAL design gotchas (cost real debugging — do not relearn)

1. **Never feed planner output back into planner input.** A fresh plan always sits at ~100% of capacity; using planned-load burnout to damp capacity made the plan shrink itself (3→2 sessions/day). Damping and the burnout recommendation use `fatigueIndicator` (real streaks + completed hard work). The display indicator may include planned load.
2. **Filtered rotation picks need a wide sweep** (`pickSweepLimit` 40 > unit count): with a small lookahead, hard-over-quota candidates exhausted the pick loop and days ended half-empty.
3. **Continuity beats rotation for started topics** — without it a 150-min topic waits ~10 days for its unit's next turn.
4. `getTopicState` returns cached stable references (WeakMap) — required by zustand selectors; new TopicState fields = add default, done (auto-backfill).
5. Never `npm run build` while dev server runs → use `npm run build:check`.

## Remaining Tasks

- **Deploy (V1→Phase A):** founder creates GitHub + Vercel accounts → DEPLOYMENT.md. Remind every session.
- Next feature phases (founder's naming): Knowledge Workspace (notes), PYQ Intelligence, Current Affairs, AI Mentor, Revision OS, Test Analytics. Topic model extends by adding defaulted fields — no refactor needed.

## Known Bugs

- None open. KNOWN_ISSUES.md documents accepted limitations + the build:check rule.

## Commands Required

- `npm run dev` · `npm test` (92) · `npm run lint` · `npm run build:check`

## Deployment Status

- **Not deployed.** Vercel-ready, no env vars.

## Environment Facts

- Founder is a **non-programmer** — plain English, click-by-click, make all technical decisions.
- Windows 11, Node v25, TS 6 strict, Next 15.5. Preview config in `.claude/launch.json`.

## Next Recommended Step

Deploy, then pick the next module. Tune behavior only via `config.ts` / `topic-intel.ts`.
