#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${DEPLOY_HOST:-mysuperstitionmountain.com}"
REMOTE_USER="${DEPLOY_USER:-bitnami}"
SSH_TARGET="${REMOTE_USER}@${REMOTE_HOST}"
APP_DIR="/home/bitnami/apps/acts"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
die()  { echo -e "${RED}[deploy] ERROR:${NC} $*" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

SETUP=false
for arg in "$@"; do
  case "$arg" in
    --setup) SETUP=true ;;
    --help|-h)
      cat <<EOF
Usage: bash scripts/deploy.sh [--setup]

GitHub-based deploy for ACTS at https://www.mysuperstitionmountain.com/acts/

  --setup   One-time server bootstrap (clone repo + Apache /acts config)

Preflight (local):
  - working tree clean (no uncommitted or untracked files)
  - local main matches origin/main (push first)

Remote:
  - git fetch + reset --hard origin/main in ${APP_DIR}
EOF
      exit 0
      ;;
  esac
done

if ! $SETUP; then
  bash scripts/deploy-preflight.sh
fi

if $SETUP; then
  warn "Running one-time server setup..."
  ssh "${SSH_TARGET}" "bash -s" < scripts/setup-server.sh
else
  info "Deploying ${SSH_TARGET}:${APP_DIR} from GitHub..."
  ssh "${SSH_TARGET}" "cd ${APP_DIR} && bash -s" < scripts/deploy-server.sh
fi

info "Done."
info "https://www.mysuperstitionmountain.com/acts/"
