# Deploy ACTS to Bluehost (staging + prod)

Two static document roots on the same Bluehost account. Live WordPress at `actskids.org` stays in `public_html` until you intentionally change the domain document root.

| URL | Path | Role |
|-----|------|------|
| https://staging.actskids.org | `/home4/actskids/public_html/staging` | Preview / test |
| https://prod.actskids.org | `/home4/actskids/public_html/prod` | Prod static preview (subdomain; not live domain) |
| https://actskids.org (future) | `/home4/actskids/public_html/prod` | Production static after domain cutover |
| Temp host | `/home4/actskids/public_html/website_6599f264` | Optional Bluehost temp URL |

Working temp URL: **https://website-6599f264.lid.ydn.mybluehost.me/**  
(Also: `https://lid.ydn.mybluehost.me/website_6599f264/` may redirect; prefer the `website-6599f264.…` host.)

Deploys rsync the committed `site/` directory over SSH after the same clean/pushed preflight as the MSM deploy.

```bash
npm run deploy:staging   # → public_html/staging
npm run deploy:prod      # → public_html/prod (files only; does not change DNS)
```

## One-time SSH setup

### 1. Public key (already generated on this Mac)

```bash
cat ~/.ssh/actskids_bluehost.pub
```

Current public key:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEtiOAchWt1IE+mUk7xrU7xo5BgACsY5KiAaX+CwYPzN acts-bluehost-deploy
```

### 2. Authorize in Bluehost cPanel

Account details (from SSH Access page):

| Field | Value |
|-------|--------|
| Username | `actskids` |
| IP | `74.220.192.137` |
| Connect | `ssh actskids-bluehost` (preferred) or `ssh -i ~/.ssh/actskids_bluehost -o IdentitiesOnly=yes actskids@74.220.192.137` |

Do **not** run bare `ssh actskids@74.220.192.137` if you have many SSH keys loaded — you will get `Too many authentication failures`. Use the alias or `-o IdentitiesOnly=yes` with the Bluehost key.

1. Log in to Bluehost → **Advanced** → **cPanel** (or **Security** → **SSH Access**)
2. Ensure **Shell Access** is **Enabled**
3. **Add SSH Key** with the public key above (name: `acts_bluehost_deploy`)
4. Open the key’s ⋮ menu and **Authorize** it if that option appears (adding alone is not always enough)
5. If port 22 is refused, wait a few minutes after enabling Shell Access

### 3. Local config

```bash
cd ~/Projects/ACTS
cp .deploy-bluehost.env.example .deploy-bluehost.env
```

Edit `.deploy-bluehost.env`:

| Variable | Value |
|----------|--------|
| `BLUEHOST_USER` | cPanel SSH username |
| `BLUEHOST_HOST` | hostname or IP from SSH Access |
| `BLUEHOST_STAGING_DIR` | Absolute path to staging document root |
| `BLUEHOST_PROD_DIR` | Absolute path to prod document root |

### 4. Point staging.actskids.org

In Bluehost → **Domains** / **Subdomains**:

1. Create `staging` under `actskids.org` if missing
2. Set document root to `BLUEHOST_STAGING_DIR` (`.../public_html/staging`)
3. Do **not** point it at the live WordPress `public_html` root

### 5. Bootstrap prod folder + preview subdomain

Copy the current staging tree once so prod exists before the first `deploy:prod`:

```bash
ssh actskids-bluehost 'rsync -a --delete ~/public_html/staging/ ~/public_html/prod/'
```

Or rely on `npm run deploy:prod` after this repo’s paths are configured.

A folder alone does **not** appear as a website in Bluehost. Create a subdomain like staging:

1. Bluehost → **Domains** / **Subdomains** → create `prod` under `actskids.org`
2. Document root → `/home4/actskids/public_html/prod`
3. **SSL/TLS Status** → select `prod.actskids.org` → **Run AutoSSL**

Until AutoSSL finishes, `https://prod.actskids.org` may fall through to live WordPress (wrong cert / redirect). Same fix as staging SSL issues below.

**Do not** change the `actskids.org` document root until you are ready to go live.

## Deploy

```bash
# Commit + push first (preflight requires it)
git push origin main

npm run deploy:staging
npm run deploy:prod
```

Dry run:

```bash
bash scripts/deploy-bluehost.sh staging --dry-run
bash scripts/deploy-bluehost.sh prod --dry-run
```

## Go live later (domain cutover)

When ready to serve the static site on `actskids.org` (WordPress kept as files, not deleted):

1. Deploy latest to prod: `npm run deploy:prod`
2. Bluehost → **Domains** → `actskids.org` → document root → `/home4/actskids/public_html/prod`
3. Same for `www` if it has a separate entry
4. **SSL/TLS Status** → Run AutoSSL if needed
5. Verify: `curl -sI https://actskids.org/` should look like static HTML (no WordPress `wp-json` link header)

Optional: point `old.actskids.org` at the WordPress tree in `public_html` for admin access.

## Verify

```bash
curl -sI https://staging.actskids.org/ | head -8
curl -sI https://prod.actskids.org/ | head -8
curl -sI https://website-6599f264.lid.ydn.mybluehost.me/ | head -8
# After cutover only:
curl -sI https://actskids.org/ | head -8
```

Expect static HTML (no WordPress `x-redirect-by: WordPress` header). If `staging.actskids.org` or `prod.actskids.org` fails TLS or redirects to live WordPress, open Bluehost **SSL/TLS Status**, select that subdomain, and **Run AutoSSL**. Until then use the `website-6599f264…` temp host.

## Files

| File | Purpose |
|------|---------|
| `scripts/deploy-bluehost.sh` | Preflight + rsync (`staging` or `prod`) |
| `.deploy-bluehost.env.example` | Template for local secrets/paths |
| `.deploy-bluehost.env` | Local config (gitignored) |

## Troubleshooting

**Permission denied (publickey)** — key not authorized in cPanel, or wrong `BLUEHOST_USER`.

**Missing .deploy-bluehost.env** — copy the example and fill in user + remote dirs.

**Preflight: working tree not clean** — commit or stash before deploying.

**staging.actskids.org still shows WordPress** — subdomain document root still points at the live WP tree; fix in cPanel Domains.

**actskids.org still shows WordPress after deploy:prod** — expected until you change the domain document root to `.../public_html/prod`.
