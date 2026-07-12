# Deploy ACTS to mysuperstitionmountain.com

Production URL: **https://www.mysuperstitionmountain.com/acts/**

Deploys pull from GitHub (`gspray/ACTS` on `main`). The server does **not** receive files copied from your laptop — it runs `git fetch` + `git reset --hard origin/main` in `/home/bitnami/apps/acts`.

Apache serves the static `site/` directory directly (no Node process in production).

## Prerequisites

- SSH access: `ssh mysuperstitionmountain` (see `~/.ssh/config`)
- GitHub repo pushed: https://github.com/gspray/ACTS
- Local changes committed and pushed before deploy

## One-time server setup

Run once from your machine:

```bash
cd ~/Projects/ACTS
bash scripts/deploy.sh --setup
```

This will:

1. Clone the repo to `/home/bitnami/apps/acts` on the server
2. Sync to latest `origin/main`
3. Append the `/acts` Apache `Alias` block to `msm-vhost.conf`
4. Restart Apache

## Normal deploy

1. Commit and push your changes:

```bash
git add …
git commit -m "Describe the change"
git push origin main
```

2. Deploy from GitHub:

```bash
npm run deploy
# or: bash scripts/deploy.sh
```

Preflight checks fail if:

- There are uncommitted or untracked files
- Local `main` is not pushed to `origin/main`

## What runs on the server

`scripts/deploy-server.sh`:

```bash
cd /home/bitnami/apps/acts
git fetch origin main
git checkout main
git reset --hard origin/main
git clean -fd
```

## Files

| File | Purpose |
|------|---------|
| `scripts/deploy.sh` | Local orchestrator (preflight + SSH) |
| `scripts/deploy-preflight.sh` | Ensures clean, committed, pushed git state |
| `scripts/deploy-server.sh` | Server-side git sync |
| `scripts/setup-server.sh` | One-time clone + Apache config |
| `deploy/apache-acts.conf` | Apache snippet for `/acts` |

## Verify

```bash
curl -sI https://www.mysuperstitionmountain.com/acts/ | head -5
curl -sI https://www.mysuperstitionmountain.com/acts/about-acts/ | head -5
```

## Troubleshooting

**Preflight: working tree not clean** — commit or stash local changes.

**Preflight: not pushed** — run `git push origin main`.

**404 on /acts/** — re-run `bash scripts/deploy.sh --setup` or confirm the ACTS block exists in `/opt/bitnami/apache/conf/vhosts/msm-vhost.conf`.

**Repo missing on server** — run `bash scripts/deploy.sh --setup`.
