# Changelog

All notable changes to UPSC OS are documented here.

## [0.6.0] — Phase C "AI Operating System" (Chanakya) — 2026-07-06 (code complete; deployment pending)

### Added — the intelligence layer
- **Chanakya** — a new sidebar section and the command centre of UPSC OS: a mentor chat that *acts*, alongside a live rail of study insights, weak topics, burnout alerts, upcoming revisions, planner recommendations, quick actions and recent AI activity. Not a chatbot — another subsystem of the OS.
- **Unified AI architecture** — one path for every AI feature: UI → AI service layer → provider manager (routing, retry, fallback, caching, rate limiting, budget, usage) → prompt builders → context builder → action layer → Claude / OpenAI / Gemini. UI never touches a provider.
- **Multi-provider abstraction** — Claude (Anthropic), OpenAI and Gemini behind one neutral interface (raw `fetch`, no vendor SDKs). Switching or adding a provider is a config/one-file change; the UI never knows which vendor answered.
- **Capability routing** — per-capability provider preference (chat, summary, generation, reasoning, vision) with automatic fallback to the next configured provider on failure or rate-limit; all configurable in Settings.
- **Context builder** — automatically assembles the student's own material (topic notes, quick notes, keywords, book references, flashcards, PYQs, current affairs, confidence, difficulty, priority, planner state, revision history, study history, forecast, health, burnout) within a token budget. The user never pastes context.
- **Versioned prompt system** — dedicated, independently tested builders (Mentor, Summary, Explain, Flashcard, Quiz, Mnemonics, Improve/Simplify Notes, Planner, Revision, Analytics, Current Affairs, PYQ; Essay & Interview architected). Prompt versions feed cache keys.
- **Safe action layer** — the AI proposes typed actions (rebuild plan, plan a topic, move a session, adjust priority/confidence, plan-state, create flashcards/quick notes, bookmark, vacation/weekend/hours); the user confirms; execution goes through the **existing store actions** — no business logic is bypassed. Every decision is remembered.
- **Conversation memory** — rolling window + running summary per conversation, plus long-term mentor memory (preferences, accepted and rejected suggestions, past advice) so Chanakya feels like a long-term mentor.
- **Streaming** — responses render token-by-token via a unified SSE reader across all three providers.
- **Intelligent caching** — content-addressed cache keyed on provider + model + prompt version + request; repeated summaries/quizzes for unchanged material are free; LRU + TTL eviction.
- **AI cost manager** — tracks provider, requests, estimated tokens, estimated cost, response time, failures and cache hits, with a configurable daily token budget guard.
- **Embedded AI everywhere** — Knowledge workspace (Summarize, Explain, Improve, Simplify, Mnemonics, Flashcards, Quiz on every topic, saved into the note's AI slots); Dashboard (Daily Briefing); Planner (Ask Chanakya: rebuild schedule, reduce workload, recover a missed week, vacation mode); Analytics (Explain burnout / forecast / readiness).
- **Third store** — `upsc-os-ai` keeps AI state fully separate from planner state; backup format **v6** embeds the AI section (models, routing, budget, conversations, memory) — **API keys are never exported**.

### Compatibility
- Fully backward compatible: Phase A/B systems (planner, knowledge, analytics, dashboard, search, settings, backup/import/export, migrations) are untouched. Older backups (v1–v5) import unchanged; v6 adds the AI section. AI degrades gracefully to the existing non-AI behaviour when no provider is configured.
- 202 tests pass (119 prior + 83 new AI tests); lint clean; isolated production build green (304 static pages); live browser verification completed.

## [0.5.1] — Study Scope Management — 2026-07-05 (code complete; deployment pending)

### Added
- **Planning states per topic** — Included (default), Paused (out of the schedule, workload still forecast), Excluded (invisible to planning; recorded progress preserved)
- **Scope tab in the Planner** — include/pause/exclude whole papers, units or individual topics with live counts; everything replans instantly
- **Focus collections** — point fresh study at any bookmark collection (Weak Topics, Prelims Revision, Mains Priority…); revisions always protect the whole included scope
- **Manual planning** — a Plan menu on every topic page: study today, tomorrow, or on the freest day this week (pinned sessions that survive replans); planning state also editable right there
- Dashboard, forecast, workload and analytics all follow scope changes automatically

### Compatibility
- Fully backward compatible: existing data gains `planState: "included"` transparently; backup files round-trip the new fields

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
