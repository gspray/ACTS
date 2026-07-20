# Agent Instructions — ACTS

Instructions for AI coding agents working in this repository.

## Project overview

ACTS is a local mirror of [actskids.org](https://actskids.org/) — a static HTML site crawled from the live WordPress site, served locally with a plain Node.js HTTP server (no framework — uses the built-in `http` module).

| Item | Value |
|------|-------|
| Stack | Node.js (CommonJS), `node:http`, static HTML/CSS/JS |
| Default port | 3000 (`PORT` env) |
| Entry point | `server.js` |
| Frontend | Static site in `site/` (mirrored WordPress + Charitas WPL theme) |
| Remote | https://github.com/gspray/ACTS |

## Agent execution guardrails

- Avoid analysis-only loops. After a brief diagnosis, take a concrete action (read, search, edit, or run) in the same turn.
- Keep planning short unless the user explicitly asks for a plan.
- If the request is actionable, execute at least one meaningful tool step before sending a long explanatory response.
- If blocked, state the blocker in one sentence and propose one immediate workaround.
- Prefer fixing over narrating. Use concise progress updates and move to implementation quickly.
- **Definition of done:** Before declaring work complete, start the server, load the affected page(s) in the browser or via `curl`, and confirm the server starts cleanly with no errors.

## Git workflow

- Commit only when the user explicitly asks.
- Stage only files you intentionally changed; never commit secrets or generated artifacts.
- Use concise, imperative commit messages.
- Do not create a new branch unless the user asks.
- Never force-push. If push is rejected, report the error and stop.

```bash
git add path/to/changed-file
git commit -m "Short description of what changed"
git push origin HEAD
```

Never commit: `.env`, credentials, `node_modules/`, `*.log`, `.cursor/`.

## Development server

```bash
npm run dev      # node --watch server.js
npm start        # node server.js
npm run crawl    # node scripts/crawl.js — re-crawl actskids.org into site/
```

Restart (or rely on `--watch`) after changing `server.js`.

Logs: stdout only.

Quick smoke test:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/news/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/about-acts/
```

After a full re-crawl, refresh the homepage with local links:

```bash
node scripts/fetch-homepage.js
```

## Repository layout

```
ACTS/
├── server.js           # HTTP static file server — serves site/
├── site/               # Mirrored website (generated + hand-edited)
│   ├── index.html      # Homepage
│   ├── css/            # Project-added stylesheets (site.css, home.css)
│   ├── news/           # News archive (renamed from blog/)
│   └── wp-content/     # Theme assets, uploads, plugins (from crawl)
├── scripts/
│   ├── crawl.js        # Deep crawl + asset download from actskids.org
│   ├── fetch-homepage.js
│   ├── add-news-post.js
│   ├── add-site-css.js
│   ├── rename-blog-to-news.js
│   ├── update-footer.js
│   └── …               # Other one-off HTML maintenance scripts
├── docs/
│   ├── UI-MODEL.md     # Site IA, templates, components, visual system
│   └── GITHUB-SETUP.md
├── css/                # Legacy/alternate styles (root-level)
├── js/                 # Legacy/alternate scripts (root-level)
├── pages/              # Alternate page sources (not served directly)
└── assets/             # Project assets (not part of site/ mirror)
```

Do not commit: `.env*`, `node_modules/`, `*.log`, `.cursor/`.

## Code style

- CommonJS modules (`require` / `module.exports`). This project does not use ESM.
- Prefer `const` / `let`; avoid `var`.
- Prefer `async/await` over raw Promise chains in scripts.
- Keep `server.js` minimal — it only serves static files from `site/`.
- Site content changes belong in `site/` HTML or in `scripts/` maintenance scripts, not in `server.js`.
- Do not add runtime dependencies without confirming with the user.
- Do not let source files exceed 2,500 lines without a documented exception — split by responsibility, not arbitrary line counts.

## Static site conventions

- **Served root:** `site/` (falls back to project root only if `site/` is missing).
- **URL paths:** Mirror the live site structure (trailing slashes on directory routes).
- **Custom CSS:** Project styles live in `site/css/` (`site.css`, `home.css`) and are linked from HTML via maintenance scripts.
- **News posts:** Live under `site/YYYY/MM/DD/slug/index.html` and appear in `site/news/`.
- **Fallback routing:** Unknown paths fall back to `site/index.html` (SPA-style catch-all).

When editing HTML across many pages, prefer writing or extending a script in `scripts/` over hand-editing dozens of files — unless the change is truly one-off.

## Error handling

- Never swallow errors silently. Every `catch` must either fully handle the error (with a short reason) or log it with useful context.
- Crawl and maintenance scripts should exit with a non-zero code on fatal failure.
- `server.js` logs port-in-use and startup errors to stderr and exits.

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | HTTP listen port | `3000` |

No `.env` file is required. The server binds to `127.0.0.1` only.

## Before non-trivial work

- `docs/UI-MODEL.md` — information architecture, page templates, components, and visual system.
- `docs/GITHUB-SETUP.md` — GitHub remote setup and push workflow.
- This file — workflow and repo-specific rules.

**Contract rule:** Do not change primary navigation labels, routes, or page structure without updating `docs/UI-MODEL.md`.

## Re-crawling the live site

Use `npm run crawl` to refresh `site/` from actskids.org. This overwrites crawled content — coordinate with the user before re-crawling if there are local-only edits they want to keep.

After a crawl:

1. Run `node scripts/fetch-homepage.js` to fix homepage links.
2. Re-apply any local customizations (CSS links, footer updates, news renames) via the appropriate `scripts/` tools.
3. Smoke-test key routes with the dev server.

## Deployment

Never run deploy scripts automatically. Deployment is always the user's decision.

Only deploy when the user explicitly asks (e.g. "deploy", "push to production").

Production (MSM preview): https://www.mysuperstitionmountain.com/acts/  
Staging (Bluehost): https://staging.actskids.org  
Temp (Bluehost): https://website-6599f264.lid.ydn.mybluehost.me/  

MSM deploy pulls from GitHub on the server — do not rsync from the laptop for MSM. See `docs/DEPLOY.md`.

Bluehost staging rsyncs committed `site/` over SSH after the same preflight. See `docs/DEPLOY-BLUEHOST.md`.

```bash
# After commit + push — MSM preview:
npm run deploy

# One-time MSM bootstrap:
npm run deploy:setup

# After commit + push — Bluehost staging:
npm run deploy:staging
```

Preflight requires a clean working tree and `main` pushed to `origin/main`.

## Small change requests

If the request is limited to copy, links, images, or minor HTML/CSS tweaks:

- Make the smallest possible diff.
- Avoid refactoring or architecture changes.
- Avoid file reorganization.
- For a single page, edit the HTML directly. For site-wide patterns, use or extend a `scripts/` tool.

## Things to avoid

- Do not commit secrets, `.env`, credentials, or logs.
- Do not change the port or static root behavior without confirming with the user.
- Do not add a web framework, bundler, or CMS without explicit approval — this is a plain static mirror by design.
- Do not run `npm run crawl` without warning the user — it can overwrite local edits in `site/`.
- Do not create summary documentation files unless the user asks.
