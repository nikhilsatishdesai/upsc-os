# PROJECT_STATUS.md

> Honest state of UPSC OS as of 2026-07-05. Numbers measured from the repo,
> not estimated.

## Maturity: **Beta (local-first single-user)**

Feature-rich, tested, verified in-browser, never deployed, no real-user
mileage. "Beta" because: 119 automated tests + live verification per
milestone, but zero production exposure and known accepted debt below.

## Measured metrics

| Metric | Value |
|---|---|
| Source files (TS/TSX) | 118 (incl. 12 test files) |
| Lines of code | ~16,500 (components 7,290 · lib 5,272 · store 2,604 · data 874 · app 438 · hooks 18) |
| Tests | 202 passing, 23 suites (119 prior + 83 AI) |
| Git commits (milestones) | 30 |
| Persisted stores | 3 (`upsc-os-store` v4, `upsc-os-knowledge` v1, `upsc-os-ai` v1) + backup format v6 |
| Routes/pages | 6 routes → 303 statically generated pages |
| Reusable UI primitives | 14 (`components/ui`) |
| Feature components | 49 |
| Pure service modules | 19 (14 planner incl. types/config · 5 knowledge) + 5 shared libs |
| Syllabus dataset | 296 nodes / 235 trackable leaf topics |
| Dependencies (runtime) | 16 npm packages |

## Completed systems (percent of the LOCAL-FIRST product vision)

Syllabus & progress ✅ · Planner + adaptive scheduler ✅ · Revision engine
(planner-side) ✅ · Priority/confidence/intel engines ✅ · Forecast +
probabilities ✅ · Burnout/fatigue ✅ · Recommendations ✅ · Health score ✅ ·
Explainability ✅ · Analytics + trends ✅ · Study scope + focus + manual
planning ✅ · Knowledge workspace (9 sections) ✅ · Knowledge search ✅ ·
Bookmarks/collections ✅ · Timeline/history ✅ · Dashboard (9 cards) ✅ ·
Settings + backup v5 ✅ · Design system, dark mode, responsive, a11y basics ✅

**Overall completion: ~55–60% of the full product vision** (which includes AI
mentor, PYQ intelligence at scale, current-affairs feeds, revision OS for
flashcards, mocks/essay/interview, cloud sync). Of the *local-first core*
scoped so far: ~95% (deployment is the missing 5%).

## Pending systems (in suggested priority order)

1. **DEPLOYMENT** — highest priority, ~1 hour of work, blocked ONLY on the
   founder creating GitHub + Vercel accounts. Everything is ready. (Phase C
   AI needs no server env vars — keys are per-device in Settings → AI.)
2. ~~Phase C: AI~~ — **SHIPPED (0.6.0)**: unified AI layer, Chanakya
   workspace, embedded AI, provider abstraction, context/prompt/action
   layers, streaming, caching, cost manager. Essay/Interview builders exist
   in the service; only their UI surfaces remain.
3. PYQ Intelligence (bulk bank + weightage analytics) — builds on `pyqs`;
   AI PYQ analysis already wired in the service.
4. Revision OS — SRS for flashcards (metadata present; AI revision coach ready).
5. Current Affairs OS — feeds/digests on `currentAffairs`; AI CA explainer wired.
6. Bridge — IndexedDB, then Supabase auth + sync (DATABASE_EVOLUTION.md).
7. Mocks / answer & essay evaluation / interview UI (Phase-C service exists).

## Technical debt (accepted, documented)

| Item | Severity | Notes |
|---|---|---|
| No component/DOM tests | Medium | Engine/store coverage is strong; UI verified manually per milestone. Add Playwright at the Bridge phase (auth flows) per roadmap. |
| localStorage ~5 MB ceiling | Medium | Usage meter shipped; IndexedDB adapter is the designed fix (DATABASE_EVOLUTION §1). |
| `package.json` version drift (0.1.0 vs product 0.5.1) | Low | Sync at first deploy. |
| Node 25 local vs Node 22 LTS on CI/Vercel | Low | Add version matrix in CI (DEPLOYMENT_GUIDE §8). |
| `npm audit` postcss false-positive | Low | Documented in /KNOWN_ISSUES.md; disappears with future Next upgrade. |
| Knowledge palette results navigate to topic pages (not deep-linked to the specific entity/section) | Low | Acceptable UX; section deep-links are a small future polish. |
| No error boundary / crash telemetry | Low | Local-first app; add error boundary pre-deploy if desired. |

## Estimated remaining work (relative to the ~30 milestones shipped)

| Block | Rough size |
|---|---|
| Deployment + CI | 1–2 milestones |
| PYQ Intelligence | 3–5 milestones |
| AI abstraction layer + first 3 Phase-C features | 5–7 milestones |
| Remaining Phase-C features | 8–12 milestones |
| Revision OS (flashcard SRS) | 2–3 milestones |
| IndexedDB step | 1–2 milestones |
| Bridge (auth + sync) | 6–10 milestones |

## The one thing to do next

**Deploy.** Six releases of working software exist only on one Windows machine
protected by nothing but the founder's browser profile. `/DEPLOYMENT.md` has
his 20-minute click-by-click path; `docs/DEPLOYMENT_GUIDE.md` has the
developer detail.
