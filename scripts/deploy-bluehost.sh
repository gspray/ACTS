#!/usr/bin/env bash
# Deploy committed site/ to Bluehost staging via rsync over SSH.
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
  die "Missing ${ENV_FILE}. Copy .deploy-bluehost.env.example and fill in BLUEHOST_USER + BLUEHOST_REMOTE_DIR."
fi

BLUEHOST_SSH="${BLUEHOST_SSH:-actskids-bluehost}"
BLUEHOST_HOST="${BLUEHOST_HOST:-lid.ydn.mybluehost.me}"
BLUEHOST_USER="${BLUEHOST_USER:-}"
BLUEHOST_REMOTE_DIR="${BLUEHOST_REMOTE_DIR:-}"
SSH_KEY="${BLUEHOST_SSH_KEY:-$HOME/.ssh/actskids_bluehost}"
STAGING_URL="${BLUEHOST_STAGING_URL:-https://staging.actskids.org}"
TEMP_URL="${BLUEHOST_TEMP_URL:-https://lid.ydn.mybluehost.me/website_6599f264}"

SKIP_PREFLIGHT=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --skip-preflight) SKIP_PREFLIGHT=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      cat <<EOF
Usage: bash scripts/deploy-bluehost.sh [--dry-run] [--skip-preflight]

Rsync site/ to Bluehost staging over SSH after GitHub preflight.

  --dry-run          Show rsync plan without transferring
  --skip-preflight   Skip clean/pushed checks (not for normal deploys)

Config: .deploy-bluehost.env (see .deploy-bluehost.env.example)
EOF
      exit 0
      ;;
  esac
done

[ -n "${BLUEHOST_USER}" ] && [ "${BLUEHOST_USER}" != "your_cpanel_username" ] \
  || die "Set BLUEHOST_USER in .deploy-bluehost.env (cPanel SSH username)."
[ -n "${BLUEHOST_REMOTE_DIR}" ] \
  || die "Set BLUEHOST_REMOTE_DIR in .deploy-bluehost.env (staging document root)."
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

info "Target: ${SSH_TARGET}:${BLUEHOST_REMOTE_DIR}"
info "Staging URL: ${STAGING_URL}"
info "Temp URL: ${TEMP_URL}"

# Ensure remote directory exists
${RSYNC_SSH} "${SSH_TARGET}" "mkdir -p '${BLUEHOST_REMOTE_DIR}'"

RSYNC_FLAGS=(-avz --delete --exclude '.git' --exclude '.DS_Store')
if $DRY_RUN; then
  RSYNC_FLAGS+=(--dry-run)
  warn "DRY RUN — no files will be written."
fi

info "Rsyncing site/ → ${SSH_TARGET}:${BLUEHOST_REMOTE_DIR}/"
rsync "${RSYNC_FLAGS[@]}" -e "${RSYNC_SSH}" \
  "${ROOT}/site/" \
  "${SSH_TARGET}:${BLUEHOST_REMOTE_DIR}/"

info "Done."
if ! $DRY_RUN; then
  info "Verify:"
  info "  curl -sI ${TEMP_URL}/ | head -5"
  info "  curl -sI ${STAGING_URL}/ | head -5"
fi
