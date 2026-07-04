# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Last updated:** 2026-07-04

## Current Milestone

**V1 "Foundation" — Milestone 8 of 8: COMPLETE (code + tests). Awaiting deployment (founder must create GitHub + Vercel accounts).**

V1 milestones (each is one git commit, restorable):
1. ✅ Docs + Git repository initialized
2. ✅ Next.js 15 scaffold + tooling (TypeScript strict, Tailwind v4, ESLint flat config, Vitest)
3. ✅ Design system + responsive app shell (desktop sidebar, mobile bottom-nav, dark mode)
4. ✅ Complete UPSC syllabus dataset (235 leaf topics) + browser + progress tracking
5. ✅ Dashboard (countdown, progress ring, per-paper progress, recent topics)
6. ✅ Global Ctrl+K search across all topics (ranked, with recents)
7. ✅ Landing page + settings (profile, exam date, theme, backup export/import/reset)
8. ✅ Test suite (23 tests, all passing) + docs + live browser verification

## Completed Work

- Full local-first V1 app, verified live in a browser: status changes persist to
  localStorage, progress rolls up from topic → section → paper → dashboard,
  search returns ranked results, mobile + desktop layouts both render.
- Quality gate all green: `npm run lint` (0 problems), `npm test` (23/23),
  `npm run build` (302 static pages).

## Current Architecture

- **Local-first single-user app.** No backend, no auth, no database in V1–V4. Cloud (Supabase) arrives in V5 "Bridge" — do not add server state before then.
- Next.js 15 App Router (React 19, TypeScript strict). All pages statically generated, including one page per syllabus node (`/syllabus/[id]`, dotted IDs like `prelims.gs.polity`).
- **Syllabus data** is authored in `src/data/syllabus/*.ts` (one file per paper) as nested trees; `src/lib/syllabus.ts` indexes them at module load (full IDs, parents, leaf counts, breadcrumbs).
- **User state** in one Zustand store (`src/store/app-store.ts`) persisted to localStorage key `upsc-os-store` (version 1): topic statuses, display name, exam date, recent topics. Backup = JSON export/import with validation.
- **Progress model:** only leaf topics have a status (`in-progress` / `completed` / `revised`; `not-started` is implicit and never stored). Roll-ups computed by `src/lib/progress.ts` (done = completed + revised).
- **Hydration rule:** any component reading the store gates on `useMounted()` (`src/hooks/use-mounted.ts`, useSyncExternalStore pattern) to avoid SSR mismatches.
- UI kit: hand-written shadcn-style components in `src/components/ui/` (Radix primitives + cmdk). Design tokens (oklch, light+dark) in `src/app/globals.css`.

## Key Files

- `src/app/page.tsx` — landing; `src/app/(app)/…` — dashboard, syllabus, syllabus/[id], settings
- `src/components/layout/…` — sidebar, mobile nav/header, nav-items (single nav source of truth)
- `src/components/search/search-provider.tsx` — Ctrl+K palette + ranking
- `src/components/syllabus/…` — status-select, topic-list, subtree-progress, recent-tracker
- `src/components/dashboard/…`, `src/components/settings/…` — page widgets
- Tests: `src/lib/*.test.ts`, `src/store/app-store.test.ts`
- `.claude/launch.json` — preview server config (`npm run dev`, port 3000)

## Remaining Tasks (V1)

- Founder creates GitHub + Vercel accounts and follows DEPLOYMENT.md (click-by-click already written).
- After deploy: founder runs the manual test checklist (in DEPLOYMENT.md), then V1 is released and V2 "Compass" planning begins.

## Known Bugs

- None open. See KNOWN_ISSUES.md for accepted limitations (npm audit false-positive documented there).

## Commands Required

- `npm run dev` — local development server (http://localhost:3000)
- `npm test` / `npm run lint` / `npm run build` — quality gate (all must pass before deploy)

## Deployment Status

- **Not yet deployed.** Code is 100% Vercel-ready (static output, no env vars needed). Blocked only on founder's GitHub/Vercel accounts.

## Environment Facts

- Founder is a **non-programmer** — plain English, click-by-click steps, make all technical decisions for him.
- Machine: Windows 11, Git 2.55, Node v25.1, npm 11.6. Project dir: `D:\UPSC OS`. TypeScript 6.0 (strict about CSS imports — `src/types/css.d.ts` handles it). eslint-config-next now ships native flat config (no FlatCompat).

## Next Recommended Step

Walk the founder through DEPLOYMENT.md (GitHub repo creation + push + Vercel import). Then verify the live URL, update this file + CHANGELOG to "V1 released", and start V2 "Compass" planning.
