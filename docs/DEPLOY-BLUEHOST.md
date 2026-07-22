# Deploy ACTS to Bluehost staging

Staging URL: **https://staging.actskids.org** (SSL may take a few minutes after subdomain creation — use SSL/TLS Status → Run AutoSSL in cPanel if needed)  
Working temp URL: **https://website-6599f264.lid.ydn.mybluehost.me/**  
(Also: `https://lid.ydn.mybluehost.me/website_6599f264/` may redirect; prefer the `website-6599f264.…` host.)

Deploys rsync the committed `site/` directory over SSH after the same clean/pushed preflight as the MSM deploy. Live WordPress at `actskids.org` is not modified.

Document roots:

| URL | Path |
|-----|------|
| `staging.actskids.org` | `/home4/actskids/public_html/staging` |
| temp website host | `/home4/actskids/public_html/website_6599f264` |

Default deploy target in `.deploy-bluehost.env` is the **staging** folder.

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
| `BLUEHOST_HOST` | hostname from SSH Access (default `lid.ydn.mybluehost.me`) |
| `BLUEHOST_REMOTE_DIR` | Absolute path to staging document root |

Discover the remote path after SSH works:

```bash
ssh actskids-bluehost "pwd; ls -la; ls -la ~/public_html 2>/dev/null; ls -la ~ | head -40"
```

Typical document roots:

- `~/public_html/website_6599f264` (temp site folder)
- `~/public_html/staging`
- path shown when you create the `staging.actskids.org` subdomain in cPanel

### 4. Point staging.actskids.org

In Bluehost → **Domains** / **Subdomains**:

1. Create `staging` under `actskids.org` if missing
2. Set document root to the same folder as `BLUEHOST_REMOTE_DIR`
3. Do **not** point it at the live WordPress `public_html` root

## Deploy

```bash
# Commit + push first (preflight requires it)
git push origin main

npm run deploy:staging
```

Dry run:

```bash
bash scripts/deploy-bluehost.sh --dry-run
```

## Verify

```bash
curl -sI https://website-6599f264.lid.ydn.mybluehost.me/ | head -8
curl -sI https://website-6599f264.lid.ydn.mybluehost.me/news/ | head -8
curl -sI https://staging.actskids.org/ | head -8
```

Expect static HTML (no WordPress `x-redirect-by: WordPress` header). If `staging.actskids.org` fails TLS (`certificate subject name does not match`), open Bluehost **SSL/TLS Status**, select `staging.actskids.org`, and **Run AutoSSL**. Until then use the `website-6599f264…` temp host.

## Files

| File | Purpose |
|------|---------|
| `scripts/deploy-bluehost.sh` | Preflight + rsync over SSH |
| `.deploy-bluehost.env.example` | Template for local secrets/paths |
| `.deploy-bluehost.env` | Local config (gitignored) |

## Troubleshooting

**Permission denied (publickey)** — key not authorized in cPanel, or wrong `BLUEHOST_USER`.

**Missing .deploy-bluehost.env** — copy the example and fill in user + remote dir.

**Preflight: working tree not clean** — commit or stash before deploying.

**staging.actskids.org still shows WordPress** — subdomain document root still points at the live WP tree; fix in cPanel Domains.
