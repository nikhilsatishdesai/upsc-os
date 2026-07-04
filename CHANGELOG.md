# Changelog

All notable changes to UPSC OS are documented here.

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
