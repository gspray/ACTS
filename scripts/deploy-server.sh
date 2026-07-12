#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/bitnami/apps/acts"
REPO_URL="https://github.com/gspray/ACTS.git"
BRANCH="${DEPLOY_BRANCH:-main}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[deploy-server]${NC} $*"; }
die()  { echo -e "${RED}[deploy-server] ERROR:${NC} $*" >&2; exit 1; }

[ -d "${APP_DIR}/.git" ] || die "Repo not found at ${APP_DIR}. Run scripts/setup-server.sh first."

cd "${APP_DIR}"

info "Fetching origin/${BRANCH}..."
git fetch origin "${BRANCH}"

info "Resetting to origin/${BRANCH}..."
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"
git clean -fd

SHA="$(git rev-parse --short HEAD)"
info "Now at ${SHA}"

[ -f site/index.html ] || die "site/index.html missing after sync."

info "Deploy complete — site served from ${APP_DIR}/site at /acts/"
