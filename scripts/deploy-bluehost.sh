#!/usr/bin/env bash
# Deploy committed site/ to Bluehost staging or prod via rsync over SSH.
# Requires: .deploy-bluehost.env (see .deploy-bluehost.env.example)
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[deploy-bluehost]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy-bluehost]${NC} $*"; }
die()  { echo -e "${RED}[deploy-bluehost] ERROR:${NC} $*" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

ENV_FILE="${ROOT}/.deploy-bluehost.env"
if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1091
  source "${ENV_FILE}"
  set +a
else
  die "Missing ${ENV_FILE}. Copy .deploy-bluehost.env.example and fill in BLUEHOST_USER + remote dirs."
fi

BLUEHOST_SSH="${BLUEHOST_SSH:-actskids-bluehost}"
BLUEHOST_HOST="${BLUEHOST_HOST:-lid.ydn.mybluehost.me}"
BLUEHOST_USER="${BLUEHOST_USER:-}"
SSH_KEY="${BLUEHOST_SSH_KEY:-$HOME/.ssh/actskids_bluehost}"

# Prefer explicit staging/prod dirs; fall back to legacy BLUEHOST_REMOTE_DIR for staging
BLUEHOST_STAGING_DIR="${BLUEHOST_STAGING_DIR:-${BLUEHOST_REMOTE_DIR:-/home4/actskids/public_html/staging}}"
# Live actskids.org document root is public_html (static site cutover).
BLUEHOST_PROD_DIR="${BLUEHOST_PROD_DIR:-/home4/actskids/public_html}"
STAGING_URL="${BLUEHOST_STAGING_URL:-https://staging.actskids.org}"
PROD_URL="${BLUEHOST_PROD_URL:-https://actskids.org}"
TEMP_URL="${BLUEHOST_TEMP_URL:-https://lid.ydn.mybluehost.me/website_6599f264}"

TARGET="staging"
SKIP_PREFLIGHT=false
DRY_RUN=false

usage() {
  cat <<EOF
Usage: bash scripts/deploy-bluehost.sh [staging|prod] [--dry-run] [--skip-preflight]

Rsync site/ to Bluehost over SSH after GitHub preflight.

  staging   Deploy to BLUEHOST_STAGING_DIR (default)
  prod      Deploy to BLUEHOST_PROD_DIR (live actskids.org when docroot is public_html)

  --dry-run          Show rsync plan without transferring
  --skip-preflight   Skip clean/pushed checks (not for normal deploys)

Config: .deploy-bluehost.env (see .deploy-bluehost.env.example)
EOF
}

for arg in "$@"; do
  case "$arg" in
    staging|prod) TARGET="$arg" ;;
    --skip-preflight) SKIP_PREFLIGHT=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h) usage; exit 0 ;;
    *)
      die "Unknown argument: ${arg} (use staging|prod, --dry-run, --skip-preflight)"
      ;;
  esac
done

case "${TARGET}" in
  staging)
    REMOTE_DIR="${BLUEHOST_STAGING_DIR}"
    PUBLIC_URL="${STAGING_URL}"
    ;;
  prod)
    REMOTE_DIR="${BLUEHOST_PROD_DIR}"
    PUBLIC_URL="${PROD_URL}"
    ;;
  *)
    die "TARGET must be staging or prod (got: ${TARGET})"
    ;;
esac

[ -n "${BLUEHOST_USER}" ] && [ "${BLUEHOST_USER}" != "your_cpanel_username" ] \
  || die "Set BLUEHOST_USER in .deploy-bluehost.env (cPanel SSH username)."
[ -n "${REMOTE_DIR}" ] || die "Remote dir for ${TARGET} is empty."
[ -f "${SSH_KEY}" ] || die "SSH key not found: ${SSH_KEY}"
[ -f site/index.html ] || die "site/index.html missing."

# Keep ~/.ssh/config User in sync so `ssh actskids-bluehost` works interactively
if [ -f "${HOME}/.ssh/config" ]; then
  python3 - "${HOME}/.ssh/config" "${BLUEHOST_USER}" "${BLUEHOST_HOST}" "${SSH_KEY}" <<'PY'
import pathlib, re, sys
cfg, user, host, key = sys.argv[1:5]
p = pathlib.Path(cfg)
text = p.read_text()
text = re.sub(r"\nHost actskids-bluehost\n(?:  .*\n)*", "\n", text)
block = f"""
Host actskids-bluehost
  HostName {host}
  User {user}
  IdentityFile {key}
  IdentitiesOnly yes
"""
p.write_text(text.rstrip() + "\n" + block + "\n")
PY
fi

if ! $SKIP_PREFLIGHT; then
  bash scripts/deploy-preflight.sh
else
  warn "Skipping preflight (--skip-preflight)."
fi

SSH_TARGET="${BLUEHOST_USER}@${BLUEHOST_HOST}"
RSYNC_SSH="ssh -i ${SSH_KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

info "Environment: ${TARGET}"
info "Target: ${SSH_TARGET}:${REMOTE_DIR}"
info "Public URL: ${PUBLIC_URL}"
if [ "${TARGET}" = "prod" ]; then
  warn "Prod deploy updates ${REMOTE_DIR} (live site when that is the domain document root)."
fi

# Ensure remote directory exists
${RSYNC_SSH} "${SSH_TARGET}" "mkdir -p '${REMOTE_DIR}'"

RSYNC_FLAGS=(-avz --delete --exclude '.git' --exclude '.DS_Store')
# When deploying into public_html root, preserve staging/prod/temp hosts and SSL/.htaccess
if [ "${TARGET}" = "prod" ]; then
  RSYNC_FLAGS+=(
    --exclude 'staging/'
    --exclude 'prod/'
    --exclude 'website_*/'
    --exclude '.well-known/'
    --exclude 'cgi-bin/'
    --exclude '.htaccess'
    --exclude '.ftpquota'
    --exclude 'error_log'
  )
fi
if $DRY_RUN; then
  RSYNC_FLAGS+=(--dry-run)
  warn "DRY RUN — no files will be written."
fi

info "Rsyncing site/ → ${SSH_TARGET}:${REMOTE_DIR}/"
rsync "${RSYNC_FLAGS[@]}" -e "${RSYNC_SSH}" \
  "${ROOT}/site/" \
  "${SSH_TARGET}:${REMOTE_DIR}/"

# Ensure static DirectoryIndex + no stale / cache for live public_html
if [ "${TARGET}" = "prod" ] && ! $DRY_RUN; then
  ${RSYNC_SSH} "${SSH_TARGET}" "cat > '${REMOTE_DIR}/.htaccess' <<'HTACCESS'
DirectoryIndex index.html
Options -Indexes

RewriteEngine On
RewriteRule ^\$ /index.html [L]

<IfModule mod_headers.c>
  Header set Cache-Control \"no-cache, no-store, must-revalidate\"
  Header set Pragma \"no-cache\"
  Header set Expires \"0\"
</IfModule>
HTACCESS"
fi

info "Done."
if ! $DRY_RUN; then
  info "Verify:"
  if [ "${TARGET}" = "staging" ]; then
    info "  curl -sI ${STAGING_URL}/ | head -5"
    info "  curl -sI ${TEMP_URL}/ | head -5"
  else
    info "  curl -sI ${PROD_URL}/ | head -5"
    info "  curl -sI ${PROD_URL}/news/ | head -5"
  fi
fi