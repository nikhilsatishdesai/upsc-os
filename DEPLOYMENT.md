# Deployment Guide

> **Status:** Not deployed yet — deployment happens at V1 Milestone 8.

## Target setup

- **Code:** GitHub private repository (founder's account)
- **Hosting:** Vercel Free Tier, connected to the GitHub repo
- **Pipeline:** every push to `main` automatically builds and deploys
- **Environment variables:** none needed in V1 (no backend, no secrets)

## Deploy checklist (used at Milestone 8)

1. `npm run lint` — passes
2. `npm test` — passes
3. `npm run build` — passes
4. Push to GitHub → Vercel builds automatically
5. Verify the live URL on phone + desktop

Click-by-click founder instructions will be added here when we deploy.
