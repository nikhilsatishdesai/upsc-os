# UPSC OS

**An intelligent operating system for UPSC aspirants** — plan, study, revise, practice, and (soon) get AI-powered mentorship across the entire Prelims → Mains → Interview journey.

> Version 3 (Intelligence Engine) — local-first: all your data stays in your browser. No account needed.

## What it does today (V1 + V2 + V3)

- **Intelligent study planner** — an adaptive engine, not a timetable: it knows which topics UPSC actually asks (Fundamental Rights, Parliament, the monsoon… are Critical), schedules them first, mixes subjects, never stacks two hard sessions back-to-back, and redistributes missed work automatically without overloading any day
- **Automatic spaced revisions** — finish a topic and Revision 1/2/3 appear in your plan 3, 10 and 30 days later, no manual scheduling ever
- **Completion forecast & pace warnings** — remaining workload vs your real capacity, expected completion date, and an explicit warning if your pace won't finish before Prelims
- **Burnout prevention** — automatic recovery days plus a sustainability indicator (load, streak, hard-material share)
- **Today's Mission** — daily workspace with progress ring, expected finish time, and priority/revision session counts
- **Task management** — complete, skip, split, merge, move or drag sessions between days; moved tasks are pinned and survive replanning
- **Complete UPSC syllabus browser** — Prelims (GS + CSAT) and Mains (Essay, GS1–GS4, qualifying papers) as an expandable tree of 235 trackable topics, each with priority/difficulty/time controls
- **Seven-stage study lifecycle** — Not started → First reading → Notes made → Revision 1–3 → Exam ready, with honest weighted preparation percentages
- **Analytics** — streak, weekly/monthly completion, consistency, hours chart, subject & difficulty distribution, revision ratio, forecast, burnout
- **Dashboard** — Prelims & Mains countdowns, today's plan with one-tap completion, recent activity, per-paper progress
- **Global search** — press `Ctrl+K` (or `⌘K`) anywhere to jump to any topic
- **Premium UI** — responsive on phone/tablet/desktop, light & dark mode
- **Your data is yours** — stored in your browser; export/import a JSON backup anytime from Settings

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand (persisted to localStorage) · Radix UI primitives · Vitest

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
| [ROADMAP.md](./ROADMAP.md) | Full V1→V10 product roadmap |
| [PROJECT_STATE.md](./PROJECT_STATE.md) | **Start here** — current milestone, architecture, remaining work |
| [CHANGELOG.md](./CHANGELOG.md) | What changed in each version |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Open bugs and limitations |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How the app is deployed to Vercel |

## License

Private project. All rights reserved.
