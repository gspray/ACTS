#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[deploy]${NC} $*"; }
die()  { echo -e "${RED}[deploy] ERROR:${NC} $*" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${DEPLOY_BRANCH:-main}"

info "Preflight checks on branch ${BRANCH}..."

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not a git repository."

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "Working tree is not clean. Commit or stash changes before deploying."
fi

if [ -n "$(git status --porcelain)" ]; then
  die "Untracked files present. Commit or remove them before deploying."
fi

git fetch origin "${BRANCH}"

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/${BRANCH}")"

if [ "${LOCAL_SHA}" != "${REMOTE_SHA}" ]; then
  die "Local ${BRANCH} (${LOCAL_SHA:0:7}) is not pushed. Run: git push origin ${BRANCH}"
fi

if [ ! -f site/index.html ]; then
  die "site/index.html is missing. Run npm run crawl or restore site content first."
fi

info "Preflight OK — ${LOCAL_SHA:0:7} is committed, clean, and pushed to origin/${BRANCH}."
