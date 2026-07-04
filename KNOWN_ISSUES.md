# Known Issues

> Open bugs and accepted limitations. Updated whenever something is found or fixed.

## Open bugs

*None currently.* (All issues found during V1 verification were fixed before release.)

## Accepted limitations (by design in V1)

- **Single-device data:** all data lives in this browser. Clearing browser data erases progress — use Settings → Export backup regularly. Cloud sync arrives in V5 "Bridge".
- **No accounts:** anyone with access to the device can open the app. Auth arrives in V5.
- **End-to-end (browser automation) tests deferred to V5** when auth flows arrive; V1 ships with 23 unit/data-integrity tests plus a founder manual test checklist (see DEPLOYMENT.md).
- **Prelims topic breakdown:** UPSC publishes Prelims GS as broad headings; the app expands them into the standard study breakdown. Mains papers follow the official syllabus text exactly.

## Non-issues (documented so they aren't re-investigated)

- **`npm audit` reports 2 moderate findings** in a CSS-processing component bundled inside Next.js. It only matters for apps that process *untrusted* CSS, which UPSC OS never does. The suggested "fix" would downgrade Next.js to a 2020 version and break the app. Safe to ignore; will disappear with a future Next.js update.
