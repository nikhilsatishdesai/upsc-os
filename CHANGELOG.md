# Changelog

All notable changes to UPSC OS are documented here.

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
