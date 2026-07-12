#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/bitnami/apps/acts"
REPO_URL="https://github.com/gspray/ACTS.git"
BRANCH="${DEPLOY_BRANCH:-main}"
VHOST_FILE="/opt/bitnami/apache/conf/vhosts/msm-vhost.conf"
APACHE_SNIPPET="${APP_DIR}/deploy/apache-acts.conf"
MARKER="# ACTS static site (GitHub-deployed from gspray/ACTS)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[setup-server]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup-server]${NC} $*"; }
die()   { echo -e "${RED}[setup-server] ERROR:${NC} $*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is not installed."
command -v sudo >/dev/null 2>&1 || die "sudo is not available."

if [ ! -d "${APP_DIR}/.git" ]; then
  info "Cloning ${REPO_URL} into ${APP_DIR}..."
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  info "Repo already exists at ${APP_DIR}."
fi

cd "${APP_DIR}"

if [ ! -f "${APACHE_SNIPPET}" ]; then
  die "Missing Apache snippet at ${APACHE_SNIPPET}. Push deploy/ to GitHub and re-run setup."
fi

if grep -qF "${MARKER}" "${VHOST_FILE}" 2>/dev/null; then
  warn "Apache ACTS block already present in ${VHOST_FILE}."
else
  info "Installing Apache /acts block into ${VHOST_FILE}..."
  sudo cp "${VHOST_FILE}" "${VHOST_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  sudo tee -a "${VHOST_FILE}" >/dev/null <<EOF

${MARKER}
$(cat "${APACHE_SNIPPET}")
EOF
fi

bash scripts/deploy-server.sh

info "Restarting Apache..."
sudo /opt/bitnami/ctlscript.sh restart apache

info "Setup complete."
info "Site URL: https://www.mysuperstitionmountain.com/acts/"
