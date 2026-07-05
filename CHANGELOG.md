# Changelog

All notable changes to UPSC OS are documented here.

## [0.5.0] — Phase B "Knowledge OS" — 2026-07-05 (code complete; deployment pending)

### Added
- **Topic workspaces** — every leaf syllabus topic is now a complete learning workspace with collapsible sections: Notes, Quick Notes, Flashcards, Keywords, Book References, Resources, PYQs, Current Affairs, Study History & Timeline, plus a marked (disabled) AI extension point
- **Rich notes** — markdown editor with Write/Preview, an 11-snippet toolbar, GFM tables and checklists, syntax-highlighted code (theme-aware), Obsidian-style callouts (`> [!tip] …`), auto-save with version timestamps, character/word counts and reading time
- **Quick notes** — typed one-liners: mnemonics, revision tricks, memory hooks, definitions, formulae
- **Flashcards** — front/back/tags/difficulty with review counts, correct/incorrect streaks, a due indicator, and a flip-through review mode (due-first queue); metadata ready for a future spaced-repetition engine, independent of the planner's revision engine
- **Keywords** — typed chips (articles, committees, schemes, acts, cases, thinkers…), all searchable
- **Book references** — book/chapter/pages/remarks with completion ticks; **Resource library** — typed links (PDF, YouTube, Drive, website…)
- **PYQs per topic** — year, paper, marks, difficulty, attempted/solved, expected answer, personal notes; AI-explanation slot reserved
- **Current affairs linking** — importance, source, exam relevance; one article links to many topics with unlink-vs-delete semantics
- **Bookmarks** — star menu on topics, PYQs and articles; built-in collections (Must Revise, Weak Areas, Essay Material, Interview Notes) plus custom ones
- **Study history & knowledge timeline** — derived per-topic stats (time invested, sessions, revisions, card reviews, PYQs solved) and a merged learning-history feed of knowledge and planner events
- **Knowledge search** — Ctrl+K now fuzzy-searches topics, notes, quick notes, keywords, flashcards, PYQs, resources, current affairs and books, with type filter chips
- **Knowledge dashboard card** — growth stats, writing/reading statistics, due flashcards, recently edited notes, most-studied subject
- **Storage** — separate `upsc-os-knowledge` store keeps planner writes fast; backup format v5 embeds knowledge (older backups still import); storage-usage meter in Settings

### Fixed (found in live verification)
- Callout boxes merged with their body paragraph; Badge-inside-paragraph hydration warning

## [0.4.0] — Phase A "Intelligence Core" — 2026-07-05 (code complete; deployment pending)

### Added
- **Dynamic priority engine** — every topic's priority score now evolves continuously: curated exam importance + confidence gap + revision urgency + postponement history + exam proximity. Avoided topics rise; completed and revised topics settle naturally. Every component carries a reason
- **Confidence decay model** — effective confidence derives from your rating plus completed revisions, minus idle time, postponements and difficulty; it feeds priority, forecasting, recommendations and analytics
- **Behaviour history** — topics record completed, missed and postponed sessions; skips, later-moves and missed days all feed the engines
- **Continuity scheduling** — partially-read topics finish first instead of waiting for their subject's rotation turn
- **Planner explanation system** — "Why this session?" on every task reconstructs the exact reasons (priority factors, revision due dates, continuity, load balancing); Today's Mission shows a one-line plan rationale
- **Forecast v2** — blends stated capacity with your observed pace (14-day window); probability of finishing before Prelims and Mains (documented logistic model), expected completion date with a confidence interval
- **Recommendation engine** — continuously updated guidance that always explains why: add N min/day, revision backlog growing, burnout risk, strong week, ahead of schedule, paper confidence falling, vacation adjustments
- **Study health score** — 7 weighted components (consistency, completion, revision, sustainability, confidence, pace, stability) with a full breakdown; recorded daily for trends
- **Burnout prevention v2** — capacity damping driven by real fatigue (streaks + hard work actually completed), tunable sensitivity; recovery days; the display indicator remains load-aware
- **Planner settings expansion** — custom revision intervals, max hard sessions/day, easy-first mornings, weekend strategy (light / revision-focused), vacation period, planner aggressiveness, burnout sensitivity — all applied to future planning immediately
- **Dashboard Insights card** — health badge + top recommendations with reasons
- **Predictive analytics** — probabilities, observed vs planned pace, health/burnout trend charts from daily snapshots, workload-cleared metric, average daily output, missed-session history, weekly planner efficiency

### Changed
- Store version 4 (settings gain defaults on read; daily snapshots with 60-day retention). V1–V3 data and backups migrate automatically; old settings keep working untouched

### Fixed
- Burnout damping no longer feeds on the size of the freshly generated plan (self-shrinking feedback loop); recommendations likewise key off real fatigue

## [0.3.0] — V3 "Intelligence Engine" — 2026-07-04 (code complete; deployment pending)

### Added
- **Intelligent priority engine** — every topic carries exam-aware metadata (priority, difficulty, estimated time, revision weight) from a curated intelligence layer built on UPSC asking patterns; Fundamental Rights, Parliament, Basic Structure, Gandhian era, the monsoon etc. are Critical and get scheduled first. Users can override any value per topic ("Auto" restores the curated value)
- **Automatic revision engine** — finishing a topic's first reading schedules Revision 1 after 3 days, then Revision 2 after 10 and Revision 3 after 30; revision sessions appear in the plan automatically (capped at 60% of any day) and completing them climbs the learning ladder
- **Difficulty balancing** — the scheduler never places two hard sessions back-to-back when an alternative exists
- **Burnout prevention** — automatic recovery day after 6 consecutive study days (when no weekly off day is set) and a burnout indicator (load, streak, hard-material share)
- **Study capacity engine & completion forecast** — weekly/monthly capacity, remaining workload including future revisions, days required, expected completion date, and an explicit warning (planner banner + analytics) when the current pace cannot finish before Prelims
- **Today's Mission** — progress ring, planned/remaining hours, expected finish time, priority & revision session counts
- **Smarter task cards** — priority badge, paper, subject, learning stage, difficulty and revision number/due date on every task
- **Weekly intelligence** — Heavy/Light/Revision/Rest day labels, estimated completion date, missed-work redistribution notice
- **Expanded analytics** — subject distribution, difficulty distribution, revision ratio, burnout indicator, completion forecast
- Setup form now warns when session count × duration is less than the stated daily hours

### Changed
- Store version 3: priority added; difficulty/estimate become override-only fields (old default "medium" now means "Auto"); V1/V2 data and backup files migrate automatically

### Fixed
- Render loop when topic state was selected as a whole object (stable-reference cache + regression tests)

## [0.2.0] — V2 "Compass" (Study Planner) — 2026-07-04 (code complete; deployment pending)

### Added
- **Study Planner** — first-time setup (prelims/mains dates, daily hours, wake/start times, weekly off day, sessions per day, session length) generating a complete adaptive plan: subjects mixed within every day, prelims/mains and GS papers balanced by construction, days never overloaded
- **Today view** — morning/afternoon/evening sessions with start times, daily progress, off-day and all-done states
- **Week view** — seven drag-and-drop day columns with capacity meters
- **Task management** — complete, skip, reopen, move to tomorrow, move to any date (pinned against replans), split, merge, drag between days
- **Adaptive rescheduling** — missed work is recorded and automatically redistributed across the rolling 14-day horizon within capacity, never dumped onto tomorrow
- **Improved study lifecycle** — Not started → First reading → Notes made → Revision 1/2/3 → Exam ready; preparation % now stage-weighted (Exam ready is the only 100%)
- **Revision-ready topic model** — every topic stores last-studied date, revision count, difficulty (affects scheduled time), confidence, estimated study time, and a next-revision placeholder for the V3 engine
- **Two-way syllabus sync** — completing planner sessions finishes a topic's first reading automatically; stage changes on the syllabus update the plan on next replan
- **Planner analytics** — weekly/monthly completion, study streak, 30-day consistency, 14-day hours chart, upcoming workload vs weekly capacity, subject-wise preparation
- **Dashboard upgrades** — Prelims + Mains countdowns, today's plan with inline completion and streak, missed-work notice, weekly %, revisions-today line, recent activity feed

### Changed
- Existing V1 saved data migrates automatically (completed → First reading, revised → Revision 1, in-progress → half-studied). Preparation percentages read lower than before by design — the new scale is honest about revision depth.
- Backup files: V2 format; old V1 backup files still import correctly.

### Fixed
- Production test-builds no longer corrupt the running dev server (`build:check` uses an isolated output folder).

## [0.1.0] — V1 "Foundation" — 2026-07-04 (code complete; deployment pending)

### Added
- **Complete UPSC syllabus browser** — official Prelims (GS + CSAT) and Mains (Essay, GS1–GS4, qualifying language papers) syllabus structured into 235 trackable topics with per-section pages, breadcrumbs and instant static loading
- **Progress tracking** — mark any topic In progress / Completed / Revised; progress rolls up through every level to the dashboard; stored privately in the browser (localStorage)
- **Dashboard** — time-aware greeting, exam-date countdown, overall progress ring with status breakdown, per-paper progress bars, recently-viewed topics
- **Global search** — Ctrl+K (⌘K) command palette across every syllabus topic with ranked results and recent topics
- **Settings** — name, target exam date, light/dark/system theme, JSON backup export/import with validation, full data reset with confirmation
- **Landing page** — product overview with live topic count
- **Design system** — oklch design tokens, dark mode, Geist typography, responsive shell (desktop sidebar / mobile bottom navigation), accessible components (Radix primitives)
- **Quality infrastructure** — TypeScript strict, ESLint (0 problems), Vitest suite (23 tests: data integrity, progress math, backup validation), production build generating 302 static pages

### Notes
- V1 is intentionally local-first: no accounts, no cloud. Authentication and sync arrive in V5 "Bridge" per ROADMAP.md.

### 2026-07-04 (earlier)
- Roadmap V1→V10 created and approved (rev 1.1: V1 local-first; auth & cloud moved to V5)
- Repository initialized with maintained documentation set
