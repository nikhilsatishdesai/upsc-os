# UPSC OS — Product Roadmap (V1 → V10)

> **Status:** APPROVED by founder on 2026-07-04 (revision 1.1 — local-first V1)
> **Last updated:** 2026-07-04
> **Owner:** CTO (Claude)

---

## Product Vision

UPSC OS is an intelligent operating system for UPSC aspirants: one place to plan,
study, revise, practice, and get AI-powered mentorship across the entire
Prelims → Mains → Interview journey.

## Guiding Principles

1. **Ship working software every phase.** Each version is deployed, tested, and usable on its own.
2. **The syllabus is the spine.** Every feature attaches to the official UPSC syllabus tree, so everything interconnects.
3. **Local-first, cloud later.** V1–V4 store all data in the user's browser — zero accounts, zero servers, total privacy. V5 adds accounts and cloud sync without breaking local mode.
4. **AI only where it genuinely helps.** No AI gimmicks. AI arrives in V6.
5. **Free-tier friendly.** Vercel Free for hosting; Supabase Free from V5; pay-as-you-go AI key from V6 with built-in cost caps.
6. **A non-programmer can operate it.** All services have web dashboards; no server administration ever.

---

## Technology Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript + React 19** | Industry standard, built by Vercel so deployment is one click |
| Styling / UI | **Tailwind CSS v4 + shadcn-style components (Radix primitives)** | Premium look, excellent accessibility, consistent without a designer |
| Local data (V1–V4) | **Browser localStorage via Zustand (persisted state)** | Instant, private, works offline, no accounts needed |
| State management | **Zustand** | Simple, reliable, tiny |
| Cloud (from V5) | **Supabase (Postgres + Auth + Storage, free tier)** | Friendly dashboard, generous free tier |
| AI (from V6) | **Anthropic Claude API** | Best-in-class reasoning for mentorship and evaluation |
| Hosting | **Vercel (free tier)** | Zero-maintenance, automatic deploys from GitHub |
| Code hosting | **GitHub (private repo)** | Version history, backup, powers Vercel deploys |
| Testing | **Vitest (logic + data integrity); Playwright added in V5** | Automated safety net before every deploy |

---

## Phase Overview

| Version | Codename | Theme | Complexity | Depends on |
|---|---|---|---|---|
| V1 | Foundation | Local-first app: premium UI, syllabus browser, dashboard, search, dark mode, progress in browser storage, deployed | Medium | — |
| V2 | Compass | Study planner, calendar, goals, streaks (local) | Medium | V1 |
| V3 | Memory | Notes, flashcards, spaced-repetition revision engine (local) | Medium-High | V1, V2 |
| V4 | Archive | PYQ bank + topic weightage analysis (data ships with app) | Medium | V1 |
| V5 | Bridge | Accounts, Supabase, cloud sync, multi-device; migrates local data into the account | High | V1–V4 |
| V6 | Mentor | AI Mentor chat, explanations, AI flashcards, recommendations + shared AI infra/cost caps | High | V5 |
| V7 | Examiner | Answer-writing evaluation, essay assistant | High | V6 |
| V8 | Radar | Current-affairs intelligence, daily digest, syllabus auto-tagging | High | V6 |
| V9 | Arena | Mock tests, deep analytics, performance prediction | High | V4, V5 |
| V10 | Summit | Knowledge graph, mind maps, smart search, interview prep, ethics module, optionals, final polish | Very High | All |

---

## V1 — Foundation (local-first) — CURRENT PHASE

**Objectives:** A deployed, beautiful, genuinely useful single-user app. No accounts, no cloud — all data lives safely in the user's browser.

**Features**
- Premium design system: typography, color palette, light/dark mode, responsive on phone/tablet/desktop
- Landing page
- App shell: sidebar navigation (desktop), bottom navigation (mobile)
- Complete official UPSC syllabus as a browsable, expandable tree (Prelims GS + CSAT, Mains Essay + GS1–GS4 + qualifying papers)
- Per-topic progress tracking (Not started / In progress / Completed / Revised) stored in the browser
- Dashboard: exam countdown, overall + per-paper progress, recently viewed topics
- Global search (Ctrl+K command palette) across every syllabus topic
- Settings: name, target exam date, theme, and data export/import (JSON backup)
- Clean architecture ready for V2+ features
- GitHub repository with milestone commits + Vercel deployment

**Explicitly OUT of V1 (moved to V5):** authentication, login, password reset, Supabase, cloud sync.

**Testing:** Vitest unit tests (progress math, search, storage) + syllabus data-integrity suite + founder manual test checklist.
**Deployment readiness:** Fully deployed on Vercel at end of phase.

---

## V2 — Compass (Planner & Progress)

**Objectives:** Plan preparation and track it against the syllabus — still fully local.

**Features:** weekly plan generator (from exam date, hours/day, priorities), daily study log with streaks, calendar view (plan vs. actual), goal tracking, dashboard upgrades (study-hours chart).
**Complexity:** Medium. **Dependencies:** V1.
**Testing:** unit tests for plan-generation logic; log/streak edge cases (timezones, midnight).
**Deployment readiness:** immediate; no new services.

## V3 — Memory (Notes, Flashcards, Revision Engine)

**Objectives:** Capture knowledge and never forget it.

**Features:** rich-text notes on any syllabus topic, manual flashcards, FSRS spaced-repetition scheduler, daily revision queue, retention heatmap. All local; storage-size meter and backup reminders included.
**Complexity:** Medium-High. **Dependencies:** V1, V2.
**Testing:** heavy unit tests on the scheduler; editor round-trip tests.

## V4 — Archive (PYQ Bank & Analysis)

**Objectives:** Make 30+ years of previous-year questions a strategic weapon.

**Features:** PYQ database shipped with the app, tagged to syllabus topics; weightage/trend analysis; "PYQs for this topic" everywhere; Prelims practice mode with self-scoring.
**Complexity:** Medium (hard part is data quality). **Dependencies:** V1.
**Testing:** data-integrity validation suite; filter/search tests.

## V5 — Bridge (Accounts & Cloud Sync)

**Objectives:** Introduce accounts and sync — the gateway to AI features and multi-device use.

**Features:** Supabase auth (email/password + reset), one-click migration of all local data into the account, continuous sync, conflict handling, Playwright end-to-end test suite added.
**Complexity:** High. **Dependencies:** V1–V4. **New accounts needed:** Supabase.
**Testing:** migration round-trip tests; sync conflict tests; full Playwright auth flows.

## V6 — Mentor (AI Core)

**Objectives:** AI where it changes outcomes; also builds shared AI infrastructure (streaming, rate limits, cost caps) for V7–V10.

**Features:** context-aware AI Mentor chat, "explain this topic" at three depths, AI flashcard generation from notes, smart dashboard recommendations, transparent AI budget controls.
**Complexity:** High. **Dependencies:** V5. **New requirement:** Anthropic API key (pay-as-you-go).
**Testing:** prompt regression suite; cost-cap tests; graceful degradation when API unavailable.

## V7 — Examiner (Answer Writing & Essay)

**Objectives:** Honest, structured evaluation of Mains answers.

**Features:** daily answer practice with timer, handwriting photo upload + OCR, rubric-based AI evaluation with model-answer comparison, essay brainstorming/outline/full evaluation, score trends.
**Complexity:** High. **Dependencies:** V6.
**Testing:** rubric consistency tests (same answer → stable score band); OCR accuracy checks.

## V8 — Radar (Current Affairs Intelligence)

**Objectives:** Turn the daily news firehose into syllabus-linked, revisable knowledge.

**Features:** daily digest from reliable public sources, AI tagging to syllabus topics with "why this matters", one-click save to note/flashcard, monthly compilations, Vercel Cron background jobs. Summaries + links only — no article republishing.
**Complexity:** High. **Dependencies:** V6.
**Testing:** pipeline reliability tests; tagging accuracy sampling.

## V9 — Arena (Mock Tests & Analytics)

**Objectives:** Exam-condition practice with analytics that change behavior.

**Features:** timed full-length/sectional Prelims mocks with negative marking, custom test generator from topic mix, accuracy/time/guess analytics, weakness map, score prediction bands; wrong answers feed the revision engine.
**Complexity:** High. **Dependencies:** V4, V5.
**Testing:** scoring-engine edge cases; timer integrity tests.

## V10 — Summit (Connect Everything & Complete the Journey)

**Objectives:** The "OS" layer plus the full exam lifecycle — the public 1.0.

**Features:** knowledge graph of topics/notes/PYQs/current affairs, interactive mind maps, semantic smart search (pgvector embeddings), interview preparation (DAF-based AI mock interview), ethics (GS4) case-study practice, optional subject support, resource library, productivity polish, onboarding, WCAG AA accessibility audit, data export.
**Complexity:** Very High. **Dependencies:** everything prior. May split into V10a/V10b if scope demands.
**Testing:** full regression suite; search relevance benchmarks; accessibility + load audits.

---

## Cross-Cutting Commitments (every phase)

- **Data safety:** local data gets export/import backup from V1; row-level security in Supabase from V5; no secrets in code, ever.
- **Docs kept current:** README.md, ROADMAP.md, PROJECT_STATE.md, CHANGELOG.md, KNOWN_ISSUES.md, DEPLOYMENT.md.
- **Quality gates:** TypeScript strict mode; lint + tests must pass before any deploy.
- **Git discipline:** a commit at every completed milestone so any working state can be restored.
- **Mobile-first responsive design** on every screen.

## Change Log of This Roadmap

- **2026-07-04 (rev 1.1):** Founder-approved revision — V1 is now local-first (no auth/Supabase); accounts & cloud sync became new phase V5 "Bridge"; former Atlas features merged into V10 Summit.
- **2026-07-04 (rev 1.0):** Initial draft.
