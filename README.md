# ttc-tools — Total Tree Care internal tools

One **public** GitHub repo that hosts all of Joseph's **internal** dashboards as web pages, so each internal tool does NOT need its own repo. Kept separate from customer/crew apps so a change to one never affects another.

## What's here (layout per `_ai-os/APP-PLATFORM-PLAN.md` in the main repo)
- `index.html` — the hub. Office tiles, then Crew, then Customers (public).
- Office: `chip-drop-qa/`, `phc-calendar/` (`data.js` rewritten daily by phc-scan), `bid-staging/` (retired 2026-06-29).
- Crew: `crew/leaderboard/`, `crew/reviews-bonus/`, `crew/post-job-walkthrough/`.
- Customers (public): `tree-watering/` (+ `ttc-logo.png`), `chip-drop-calculator/`, `door-hanger/`.
- Not here on purpose: the Chip Drop App (installed PWA with its own Apps Script backend — moving it would orphan installed copies), Rate Analysis and the Debtor Map (need a login-gated home first).
- `.nojekyll` — tells GitHub Pages to serve files as-is.

Migrated in 2026-09-11 (plan step 6). The old one-repo-per-app addresses stay live until Joseph archives those repos; each app's source of truth remains in the main repo under `domains/`.

## Live address (once Pages is on)
- Landing: `https://myersmail9-afk.github.io/ttc-tools/`
- Chip Drop QA: `https://myersmail9-afk.github.io/ttc-tools/chip-drop-qa/`

## How to publish / update
1. GitHub Desktop: commit changes → **Push**.
2. GitHub Pages must be **On**, source = `main` / `root` (Settings → Pages). One-time.
3. Pages redeploys within ~1 minute of each push.

## Privacy note
GitHub Pages addresses are public-by-URL (not login-protected). These pages are not advertised anywhere and the data is already link-shared via the underlying sheets. Do not post these links publicly.

## Roadmap
Migrate other internal links into this repo over time (one page per tool), e.g. debtor map, rate analysis. Source-of-truth copies live in the private `Total Tree Care Claude` repo under each tool's domain folder.

Source/reference copy of the chip-drop QA dashboard: `Total Tree Care Claude/domains/chip-drop/automations/url-automation/final/qa-dashboard/chip-drop-qa-LIVE.html`
