# PROJECT_STATE.md

> **Purpose:** If a new Claude session opens, reading this file should allow work to continue immediately.
> **Last updated:** 2026-07-04

## Current Milestone

**V1 "Foundation" — Milestone 1 of 8: Documentation & repository setup** (in progress)

V1 milestones:
1. ✅ Docs + Git repository initialized
2. ⬜ Next.js scaffold + tooling (TypeScript strict, Tailwind v4, ESLint, Vitest)
3. ⬜ Design system + responsive app shell (sidebar/bottom-nav, dark mode)
4. ⬜ Complete UPSC syllabus dataset + syllabus browser
5. ⬜ Progress tracking (localStorage) + dashboard
6. ⬜ Global search command palette (Ctrl+K)
7. ⬜ Landing page + settings (export/import backup)
8. ⬜ Tests, docs finalization, Vercel deployment

## Completed Work

- V1→V10 roadmap approved by founder (rev 1.1, local-first V1 — see ROADMAP.md)
- Maintained documentation files created

## Current Architecture

- **Local-first single-user app.** No backend, no auth, no database in V1.
- Next.js 15 App Router, all interactive state in Zustand persisted to browser localStorage (key: `upsc-os-store`).
- Syllabus is static data shipped with the app (`src/data/syllabus/`), progress keyed by stable node IDs.
- Cloud (Supabase) arrives in V5 "Bridge" — do not add server-side state before then.

## Files Created So Far

- `README.md`, `ROADMAP.md`, `PROJECT_STATE.md`, `CHANGELOG.md`, `KNOWN_ISSUES.md`, `DEPLOYMENT.md`

## Remaining Tasks (V1)

- Milestones 2–8 above.

## Known Bugs

- None yet (no code yet). See KNOWN_ISSUES.md.

## Commands Required

- `npm install` — install dependencies
- `npm run dev` — local development server
- `npm test` — run tests
- `npm run build` — production build
- `npm run lint` — lint

## Deployment Status

- **Not deployed yet.** GitHub repo and Vercel connection happen at Milestone 8 (founder will create free GitHub + Vercel accounts with click-by-click guidance).

## Environment Facts

- Founder is a **non-programmer** — explain in plain English, give click-by-click steps, make all technical decisions for him.
- Machine: Windows 11, Git 2.55, Node v25.1, npm 11.6. Project dir: `D:\UPSC OS`.

## Next Recommended Step

Complete Milestone 2: scaffold the Next.js application with pinned dependencies, verify `npm run build` passes, commit.
