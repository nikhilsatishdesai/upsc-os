# Known Issues

> Open bugs and accepted limitations. Updated whenever something is found or fixed.

## Open bugs

*None currently.* (All issues found during V1 verification were fixed before release.)

## Accepted limitations (by design in V1)

- **Single-device data:** all data lives in this browser. Clearing browser data erases progress — use Settings → Export backup regularly. Cloud sync arrives in V5 "Bridge".
- **No accounts:** anyone with access to the device can open the app. Auth arrives in V5.
- **End-to-end (browser automation) tests deferred to V5** when auth flows arrive; V1 ships with 23 unit/data-integrity tests plus a founder manual test checklist (see DEPLOYMENT.md).
- **Prelims topic breakdown:** UPSC publishes Prelims GS as broad headings; the app expands them into the standard study breakdown. Mains papers follow the official syllabus text exactly.

## Accepted limitations (by design in 0.7.0)

- **PSIR practice questions are UPSC-style prompts, not reproduced PYQs.** Add real previous-year questions per topic in its PYQ section.
- **"Typical dates" are an estimate** (last Sunday of May; Mains ~16 weeks later). Replace them when UPSC publishes the calendar.
- **The rubric's marks estimate is a guide** (maps self-assessment onto a 20–65% band); Chanakya's AI review gives a second opinion when a provider is connected.
- **Only PSIR is built in as an optional.** Choosing "another optional" hides PSIR; other optionals' syllabi are not bundled yet.

## Accepted limitations (by design in Phase B)

- **Images in notes are referenced by URL**, not stored locally — storing image data would exhaust the ~5 MB browser-storage budget. A storage-usage meter lives in Settings; larger storage (IndexedDB) arrives with the cloud-sync phase.
- **Flashcards are independent of the planner's revision engine** by design; their spaced-repetition scheduling arrives with the Revision OS phase (metadata already in place).
- **Bookmark collections are managed inline** (star menus); a dedicated collections browser can come with a later phase.

## Accepted limitations (by design in Phase A)

- **The burnout indicator on Analytics includes planned load**, so it reads "elevated" whenever the coming week is fully planned — that is informative pressure, not a malfunction. Automatic capacity damping and the burnout *recommendation* use real fatigue only (streaks + completed hard work).
- **Forecast probabilities are a transparent model, not a guarantee** — a logistic curve over schedule slack, blended with observed pace once ~3 active days of history exist (model documented in `src/lib/planner/forecast.ts`).

## Accepted limitations (by design in V2/V3)

- **The plan is a rolling 14-day window**, regenerated daily — long-range calendar views come later.
- **"Exam ready" is a manual call.** The engine schedules three spaced revisions automatically; declaring a topic exam-ready after them is the user's confidence decision.
- **Notes-making is advanced manually** on topic pages (the Notes module arrives in a later phase).
- **Curated priorities are a first pass.** They encode standard UPSC weightage patterns; per-topic overrides are available on every topic page, and the dataset (`src/data/topic-intel.ts`) will keep improving with the PYQ module.
- **Migration note:** preparation percentages dropped after V2 by design — the old scale treated "completed" as 100%, the new scale reserves 100% for "Exam ready".

## Non-issues (documented so they aren't re-investigated)

- **Never run `npm run build` while the dev server is running** — both write to `.next` and corrupt the server (symptoms: "Could not find the module … in the React Client Manifest", ENOENT routes-manifest errors). Use `npm run build:check` instead (isolated `.next-check` folder). If it happens anyway: stop the server, delete `.next`, restart.

- **`npm audit` reports 2 moderate findings** in a CSS-processing component bundled inside Next.js. It only matters for apps that process *untrusted* CSS, which UPSC OS never does. The suggested "fix" would downgrade Next.js to a 2020 version and break the app. Safe to ignore; will disappear with a future Next.js update.
