# UPSC OS

**An intelligent operating system for UPSC aspirants** — plan, study, revise, practice, and get AI-powered mentorship across the entire Prelims → Mains → Interview journey.

> v0.7 — local-first: all your data, and your AI API keys, stay in your browser. No account needed.

## What it does today

- **A Notion-style workspace** — a page-tree sidebar (expandable syllabus and PSIR trees), breadcrumb top bar, emoji page icons, property blocks on topic pages, toggles and database-style tables; light & dark
- **PSIR optional, complete** — Paper I & II as 105 trackable topics with curated priorities; a PSIR command centre (progress, next topics, exam pattern, answer framework, strategy, PSIR↔GS synergy map); a **Thinkers vault** of 48 one-page sheets (works, ideas, quotes, critiques, where to use them); a tiered **booklist** with reading status; and a PSIR toolkit on every PSIR topic page
- **Answer Writing** — 187 UPSC-style PSIR practice questions or your own; a timer sized to the marks, live word target, autosaved drafts, a 7-point self-evaluation rubric with a realistic marks estimate, history & streaks, and an optional examiner-style AI review
- **Your week, your way** — per-weekday study hours and **subject focus days** (e.g. PSIR on Mon/Wed/Fri), custom block timings, per-paper emphasis, personal weekly **targets** and paper **deadlines**, optional-subject choice and a customisable dashboard
- **Focus timer** — one tap from any session or topic; follows you across pages, shows in the browser tab, and completes the planner session when you're done

- **Chanakya — your AI mentor** — a dedicated command centre that *sees your entire preparation* (syllabus, planner, analytics, notes, revisions, PYQs) with no pasting, explains its reasoning, and — with your confirmation — acts: rebuild the schedule, adjust priorities, plan topics, create flashcards, bookmark, set vacations. Streams replies, remembers past conversations and your accepted/rejected suggestions. Works with Claude, OpenAI or Gemini (your key, switchable in Settings); the app never couples to one vendor. AI is optional — everything degrades gracefully without a key.
- **Future-proof model choice** — no hardcoded model list: type any model id (or hit **Refresh models** to fetch the provider's current list) and it's used as-is. New models from Anthropic, OpenAI or Google work the day they launch, with no app update.
- **AI woven through the app** — summarize/explain/improve/simplify notes, generate flashcards & quizzes and mnemonics on any topic; a daily briefing on the dashboard; "Ask Chanakya" on the planner; plain-language explanations of burnout, forecast and readiness in Analytics
- **Topic workspaces** — every syllabus topic is a complete knowledge base: rich markdown notes (tables, checklists, callouts, code), quick notes & mnemonics, flashcards with review mode, keywords, book references, resources, previous-year questions, current-affairs links, bookmarks, and a full study timeline
- **Knowledge search** — Ctrl+K fuzzy-searches everything you've ever written or saved, with type filters
- **Study scope control** — include, pause or exclude any paper, unit or topic; focus the planner on a collection (Weak Topics, Prelims Revision…); manually plan any topic for today, tomorrow or this week

- **Adaptive planning engine** — priorities evolve with your behaviour: avoided topics rise, overdue revisions surge, weak-confidence material resurfaces, started readings finish first, and missed work redistributes automatically without overloading any day
- **Explainable planning** — ask any session "Why this?" and get the actual reasons (exam importance, confidence, urgency, balancing); nothing in the plan is mysterious
- **Automatic spaced revisions** — finish a topic and Revision 1/2/3 appear 3, 10 and 30 days later (intervals customizable); missed revisions reschedule, never vanish
- **Confidence that evolves** — revisions build it, idle time and postponements erode it, and the planner acts on the result
- **Forecast with probabilities** — expected completion date ± confidence interval, probability of finishing before Prelims and Mains, observed pace vs planned, early warnings with concrete fixes
- **Recommendations that explain why** — add N minutes/day, backlog growing, burnout risk, strong week, ahead of schedule
- **Study health score** — one honest preparation index from consistency, completion, revision, sustainability, confidence, pace and stability
- **Deep planner customization** — revision intervals, max hard sessions/day, morning preference, weekend strategy, vacations, aggressiveness, burnout sensitivity
- **Today's Mission** — daily workspace with progress ring, expected finish time, priority/revision counts and the plan's rationale
- **Task management** — complete, skip, split, merge, move or drag sessions between days; moved tasks are pinned and survive replanning
- **Complete UPSC syllabus browser** — Prelims (GS + CSAT) and Mains (Essay, GS1–GS4, PSIR I–II, qualifying papers) as 340 trackable topics, each with priority/difficulty/time controls and previous/next navigation
- **Seven-stage study lifecycle** — Not started → First reading → Notes made → Revision 1–3 → Exam ready, with honest weighted preparation percentages
- **Analytics** — streak, weekly/monthly completion, consistency, hours chart, subject & difficulty distribution, revision ratio, forecast, burnout
- **Dashboard** — Prelims & Mains countdowns, today's plan with one-tap completion, recent activity, per-paper progress
- **Global search** — press `Ctrl+K` (or `⌘K`) anywhere to jump to any topic
- **Responsive** — phone (bottom tabs + More sheet), tablet and desktop, light & dark mode
- **Your data is yours** — stored in your browser; export/import a JSON backup anytime from Settings

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand (persisted to localStorage, six stores) · Radix UI primitives · Vitest

## Getting started (development)

```bash
npm install
npm run dev          # start the app at http://localhost:3000
npm test             # run the test suite
npm run build:check  # production build in an isolated folder (safe while dev server runs)
npm run build        # production build (used by Vercel)
npm run lint         # code style checks
```

## Project documentation

| File | Purpose |
|---|---|
| [docs/MASTER_CONTEXT.md](./docs/MASTER_CONTEXT.md) | **Developers/AI start here** — complete continuation context |
| [docs/](./docs) | Full developer docs: architecture, data model, structure, AI-phase specs, storage evolution, contributing, status |
| [ROADMAP.md](./ROADMAP.md) | Full product roadmap |
| [PROJECT_STATE.md](./PROJECT_STATE.md) | Current milestone, gotchas, next step (session handoff) |
| [CHANGELOG.md](./CHANGELOG.md) | What changed in each version |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Open bugs and limitations |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How the app is deployed to Vercel (founder click-by-click) |

## License

Private project. All rights reserved.
