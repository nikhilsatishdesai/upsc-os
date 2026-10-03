# Deployment Guide

> **Status:** Code is deployment-ready. Waiting on founder to create free GitHub and Vercel accounts (steps below).

## GitHub Pages (free, automatic) — https://nikhilsatishdesai.github.io/upsc-os/

The workflow `.github/workflows/deploy-pages.yml` builds the app as a static
site (`npm run build:pages` → `out/`) and publishes it on every push to
`main`, after running the test suite.

**One-time switch (founder, 30 seconds):**
1. Open **github.com/nikhilsatishdesai/upsc-os** → **Settings** → **Pages** (left menu).
2. Under **Build and deployment → Source**, choose **GitHub Actions**. That's it — no other settings.
3. Every update merged into `main` then appears at the address above within ~3 minutes
   (watch progress in the **Actions** tab; a green tick means it's live).
   To republish without a code change: **Actions → Deploy to GitHub Pages → Run workflow**.

Notes:
- Your study data lives in the browser *per website address*. Data entered on the
  Vercel address won't appear on the GitHub Pages address (and vice versa) — use
  **Settings → Your data → Export backup** on one and **Import backup** on the other.
- Technical: the Pages build sets `basePath` from the repository name and
  `trailingSlash: true`; `scripts/pages-postbuild.mjs` mirrors page data for the
  dotted syllabus ids so in-app navigation stays instant. Local dev and Vercel
  builds are unchanged.

## How hosting works (plain English)

- **GitHub** stores the code safely online (like Google Drive for code, with full history).
- **Vercel** takes the code from GitHub and puts it on the internet at a real URL.
- After one-time setup, every future improvement deploys **automatically** — no manual work.
- V1 needs **no environment variables and no secrets**: the app is fully static.

## One-time setup (founder, ~20 minutes)

### Step 1 — Create a GitHub account
1. Go to **github.com** and click **Sign up**.
2. Use your email, pick a username and password, verify your email.

### Step 2 — Create the repository
1. Once logged in, go to **github.com/new**.
2. Repository name: **upsc-os**
3. Choose **Private**.
4. Do **not** tick any of the "Initialize this repository" checkboxes (no README, no .gitignore, no license — our project already has these).
5. Click **Create repository** and leave the page open.

### Step 3 — Push the code (tell Claude "the repo is created")
Claude will run the two commands below for you and a browser window will pop up
asking you to authorize Git — click **Sign in with your browser** and approve.

```bash
git remote add origin https://github.com/<YOUR-USERNAME>/upsc-os.git
git push -u origin main
```

### Step 4 — Create a Vercel account and deploy
1. Go to **vercel.com** and click **Sign Up**.
2. Choose **Continue with GitHub** (this connects the two services automatically).
3. Select the **Hobby** (free) plan.
4. On the Vercel dashboard click **Add New… → Project**.
5. You'll see **upsc-os** in the list — click **Import**.
6. Change nothing on the settings screen. Click **Deploy**.
7. Wait ~2 minutes. Vercel shows confetti and a URL like `upsc-os-xxxx.vercel.app` — that's your live app. Open it on your phone too.

## Release checklist (run before every deploy)

1. `npm run lint` — must report no problems
2. `npm test` — all tests pass
3. `npm run build` — completes successfully
4. Push to GitHub → Vercel deploys automatically
5. Run the manual test checklist below on the live URL

## Founder manual test checklist (~10 minutes)

1. Open the live URL → landing page loads, looks right in light **and** dark mode (toggle top-right).
2. Click **Open app** → dashboard appears.
3. Go to **Settings** → type your name, set a target exam date → back to **Dashboard** → greeting shows your name, countdown shows days remaining.
4. Go to **Syllabus** → open *Paper I — General Studies → History → Ancient India* → set two topics to **Completed**.
5. Check the section progress bar moved, then go to **Dashboard** → *Paper I* shows 2 done.
6. Press **Ctrl+K** (or tap **Search** on mobile) → type "mauryan" → a topic appears → selecting it opens the right page.
7. **Settings → Export backup** → a JSON file downloads.
8. Refresh the page → everything you set is still there.
9. On your phone: bottom navigation shows Dashboard / Syllabus / Search / Settings and everything above works.

If anything fails, tell Claude what step number failed and what you saw.
