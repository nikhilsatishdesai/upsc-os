# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Full developer/AI documentation lives in [`/docs`](./docs) — start with `docs/MASTER_CONTEXT.md` (project-wide context, hard rules), then `docs/PROJECT_STATUS.md` (metrics, debt, priorities).**
> **Last updated:** 2026-07-05

## Current Milestone

**Study Scope Management — CODE-COMPLETE** (on top of Phase B "Knowledge OS"). **Still NOT deployed** — founder must create GitHub + Vercel accounts (DEPLOYMENT.md, click-by-click). This has been the single blocking item since V1; remind the founder every session.

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

V1 foundation → V2 planner → V3 intelligence engine → Phase A adaptive core → **Phase B knowledge workspace**. 110 tests green, lint clean, build = 303 static pages. Live-verified end-to-end: note autosave + preview (callouts/tables/checklists/highlighted code), flashcard review streaks, bookmark collections, multi-entity fuzzy search with filters, dashboard knowledge stats.

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

- **Deploy (V1→Phase B):** founder creates GitHub + Vercel accounts → DEPLOYMENT.md.
- Future phases per founder's naming: PYQ Intelligence (bulk question bank + weightage analytics on top of the pyq entities), Current Affairs OS, AI Mentor (placeholders already wired), Revision OS, Test Analytics.

## Commands Required

- `npm run dev` · `npm test` (119) · `npm run lint` · `npm run build:check` (never plain `build` while dev server runs)

## Deployment Status

- **Not deployed.** Vercel-ready, no env vars.

## Environment Facts

- Founder is a **non-programmer** — plain English, click-by-click steps, all technical decisions made for him.
- Windows 11, Node v25, TS 6 strict, Next 15.5. Preview config in `.claude/launch.json`.

## Next Recommended Step

Deploy, then choose the next module (PYQ Intelligence pairs naturally with the new pyq entities). Tune knowledge behavior in `src/lib/knowledge/config.ts`.
