# UPSC OS

**An intelligent operating system for UPSC aspirants** — plan, study, revise, practice, and (soon) get AI-powered mentorship across the entire Prelims → Mains → Interview journey.

> Version 1 (Foundation) — local-first: all your data stays in your browser. No account needed.

## What it does today (V1)

- **Complete UPSC syllabus browser** — Prelims (GS + CSAT) and Mains (Essay, GS1–GS4, qualifying papers) as an expandable tree
- **Progress tracking** — mark any topic *In progress / Completed / Revised*; progress rolls up per paper and overall
- **Dashboard** — exam countdown, progress overview, recently viewed topics
- **Global search** — press `Ctrl+K` (or `⌘K`) anywhere to jump to any topic
- **Premium UI** — responsive on phone/tablet/desktop, light & dark mode
- **Your data is yours** — stored in your browser; export/import a JSON backup anytime from Settings

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand (persisted to localStorage) · Radix UI primitives · Vitest

## Getting started (development)

```bash
npm install
npm run dev        # start the app at http://localhost:3000
npm test           # run the test suite
npm run build      # production build (must pass before deploying)
npm run lint       # code style checks
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
