# ttc-tools — Total Tree Care internal tools

One **public** GitHub repo that hosts all of Joseph's **internal** dashboards as web pages, so each internal tool does NOT need its own repo. Kept separate from customer/crew apps so a change to one never affects another.

## What's here
- `index.html` — landing page that lists the internal tools.
- `chip-drop-qa/index.html` — the Chip Drop visual QA dashboard (reads the live v2 chip-drops Google Sheet; shows non-active rows to eyeball before activating). Linked from column V of the chip-drops sheet.
- `.nojekyll` — tells GitHub Pages to serve files as-is.

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
