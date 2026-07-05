# DEPLOYMENT_GUIDE.md

> Developer-grade deployment reference. The founder-facing click-by-click
> version lives at `/DEPLOYMENT.md` (repo root). **Current status: the app has
> never been deployed** — blocked only on the founder creating GitHub + Vercel
> accounts.

## 1. Targets

- **Code**: GitHub, private repo `upsc-os`, default branch `main`.
- **Hosting**: Vercel Hobby (free). The build is fully static (303 SSG pages,
  no server code, no API routes), so any static host works, but Vercel is the
  chosen path (auto-deploy on push).

## 2. Environment variables

**None.** The app is local-first: no secrets, no `.env` (a `.env*` ignore rule
exists defensively). Phase C introduces AI keys — those are USER-entered at
runtime and stored client-side (see API_ABSTRACTION.md), still not build-time
env vars. First build-time env vars arrive with the Bridge phase
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`); document them
here when real. Local quirk: `NEXT_DIST_DIR` switches the build output dir —
used only by `npm run build:check`, never set on Vercel.

## 3. First deployment (one-time)

```bash
git remote add origin https://github.com/<owner>/upsc-os.git
git push -u origin main
```
Then Vercel → Add New → Project → Import `upsc-os` → framework auto-detected
(Next.js) → no settings changes → Deploy. Verify: landing page, dashboard,
one `/syllabus/[id]` page, Ctrl+K, dark mode, and a full manual pass using the
checklist in `/DEPLOYMENT.md`.

## 4. Release checklist (every deploy)

```bash
npm run lint        # 0 problems
npm test            # all green (119)
npm run build:check # isolated prod build (safe next to dev server)
```
Then push. Never `npm run build` while `next dev` runs (corrupts `.next`).
Gate scripts on real exit codes, not grep/tail pipes.

## 5. Versioning & changelog

- Semver-ish product versions in `/CHANGELOG.md` (0.1.0 … 0.5.1 so far),
  bumped per phase/major feature; `package.json` version should be kept in
  sync at release time (currently 0.1.0 — known drift, fix at first deploy).
- Tag releases once remote exists: `git tag v0.5.1 && git push --tags`.
- Docs updated in the same commit as the feature (established practice).

## 6. Branch & release strategy

- **Today (solo dev)**: trunk-based. Every milestone = one green commit on
  `main`; every commit is deployable; Vercel deploys `main` to production.
- **After first deploy**: feature branches + PRs become worthwhile because
  Vercel gives preview deployments per PR. Recommended: `feat/<area>-<slug>`,
  squash-merge to `main`, milestone semantics preserved in the squash message.
- **Rollback**: `git revert` (never force-push `main`) or Vercel's "promote
  previous deployment".

## 7. Backups (user data — reminder)

Deployments carry NO user data; everything lives in each visitor's browser.
The in-app Settings → Export backup (JSON v5) is the user's responsibility —
the deployment story must never assume server-side data until Bridge.

## 8. Future CI/CD (when the repo is on GitHub)

GitHub Actions workflow (add as `.github/workflows/ci.yml` at first deploy):
on PR + push to main → `npm ci`, `npm run lint`, `npm test`,
`NEXT_DIST_DIR=.next-check npm run build` (build parity), Node 22 LTS matrix
entry alongside current local Node 25. Vercel handles deploys; CI is the
merge gate. Later additions: bundle-size budget check, Lighthouse CI on the
preview URL, and `npm audit --omit=dev` as a non-blocking report (a known
false-positive on Next's bundled postcss is documented in /KNOWN_ISSUES.md).
