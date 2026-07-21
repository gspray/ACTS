#!/usr/bin/env bash
# bootstrap.sh — Provision a VPS for ACTS (Nginx + Node + PM2 + SSL)
# Supports: Ubuntu/Debian (apt) and Amazon Linux 2023 (dnf)
#
# Usage (as root):
#   curl -fsSL https://raw.githubusercontent.com/gspray/ACTS/main/bootstrap.sh | bash -s -- example.com you@example.com
#   # or, after cloning:
#   sudo bash bootstrap.sh example.com you@example.com
#
# Optional env overrides:
#   APP_DIR=/var/www/acts
#   APP_PORT=3000
#   REPO_URL=https://github.com/gspray/ACTS.git
#   BRANCH=main
#   NODE_MAJOR=20
#   SKIP_SSL=1          # install packages + Nginx HTTP only; skip certbot
#   SKIP_FIREWALL=1     # do not change host firewall (Lightsail: use console rules)

set -euo pipefail

DOMAIN="${1:-}"
CONTACT_EMAIL="${2:-}"
APP_DIR="${APP_DIR:-/var/www/acts}"
APP_PORT="${APP_PORT:-3000}"
REPO_URL="${REPO_URL:-https://github.com/gspray/ACTS.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PM2_APP_NAME="${PM2_APP_NAME:-acts}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn() { echo -e "${YELLOW}[bootstrap]${NC} $*"; }
die()  { echo -e "${RED}[bootstrap] ERROR:${NC} $*" >&2; exit 1; }

usage() {
  cat <<EOF
Usage: $0 <domain> [letsencrypt-email]

Examples:
  sudo bash bootstrap.sh actskids.org admin@actskids.org
  SKIP_SSL=1 sudo bash bootstrap.sh actskids.org
EOF
}

detect_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_ID="${ID:-}"
    OS_LIKE="${ID_LIKE:-}"
  else
    OS_ID=""
    OS_LIKE=""
  fi

  if [[ "$OS_ID" == "amzn" ]] || [[ "$OS_LIKE" == *"fedora"* && "$OS_ID" == "amzn" ]]; then
    PKG=dnf
  elif [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" || "$OS_LIKE" == *"debian"* ]]; then
    PKG=apt
  elif command -v dnf >/dev/null 2>&1 && grep -qi 'amazon linux' /etc/os-release 2>/dev/null; then
    PKG=dnf
  elif command -v apt-get >/dev/null 2>&1; then
    PKG=apt
  else
    die "Unsupported OS. Need Ubuntu/Debian (apt) or Amazon Linux (dnf)."
  fi

  if [[ "$PKG" == "dnf" ]]; then
    APP_USER="${APP_USER:-nginx}"
  else
    APP_USER="${APP_USER:-www-data}"
  fi

  info "Detected package manager: ${PKG} (user: ${APP_USER})"
}

write_nginx_server_block() {
  # Shared server block body (proxy to Node)
  cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
}

[[ -n "$DOMAIN" ]] || { usage; exit 1; }
[[ "$EUID" -eq 0 ]] || die "Run as root: sudo bash bootstrap.sh ${DOMAIN} ${CONTACT_EMAIL}"

detect_os

# ---------------------------------------------------------------------------
# 1. Update the OS + base packages
# ---------------------------------------------------------------------------
info "Updating OS packages..."
if [[ "$PKG" == "apt" ]]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get upgrade -y
  apt-get install -y ca-certificates curl gnupg ufw git nginx
else
  dnf -y update
  # AL2023 ships curl-minimal + gnupg2-minimal. Installing full curl/gnupg2 conflicts.
  # Only pull packages we actually need beyond the minimal base image.
  dnf -y install git nginx
  command -v curl >/dev/null 2>&1 || die "curl is missing (expected curl-minimal on AL2023)."
  command -v gpg >/dev/null 2>&1 || command -v gpg2 >/dev/null 2>&1 \
    || die "gpg is missing (expected gnupg2-minimal on AL2023)."
  mkdir -p /var/www/html
fi

# ---------------------------------------------------------------------------
# 2. Install Node (NodeSource) + PM2
# ---------------------------------------------------------------------------
info "Installing Node.js ${NODE_MAJOR}.x from NodeSource..."
if [[ "$PKG" == "apt" ]]; then
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/nodesource.gpg ]]; then
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  fi
  cat >/etc/apt/sources.list.d/nodesource.list <<EOF
deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main
EOF
  apt-get update
  apt-get install -y nodejs
else
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  dnf -y install nodejs
fi

info "Node $(node -v) / npm $(npm -v)"
info "Installing PM2 globally..."
npm install -g pm2

# ---------------------------------------------------------------------------
# 3. Configure the firewall
# ---------------------------------------------------------------------------
if [[ "${SKIP_FIREWALL:-0}" == "1" ]]; then
  warn "SKIP_FIREWALL=1 — leaving host firewall unchanged."
elif [[ "$PKG" == "apt" ]]; then
  info "Configuring UFW (OpenSSH + Nginx Full)..."
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  ufw status || true
else
  # Lightsail / AL2023: networking firewall is in the Lightsail console.
  warn "Amazon Linux: open SSH (22), HTTP (80), and HTTPS (443) in Lightsail → Networking."
  warn "Host firewall (firewalld) is left alone so Lightsail rules stay authoritative."
fi

# ---------------------------------------------------------------------------
# 4. Clone the repo
# ---------------------------------------------------------------------------
if [[ -d "${APP_DIR}/.git" ]]; then
  info "Repo already present at ${APP_DIR}; pulling ${BRANCH}..."
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
else
  info "Cloning ${REPO_URL} (${BRANCH}) into ${APP_DIR}..."
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

[[ -f "${APP_DIR}/server.js" ]] || die "server.js missing after clone — check REPO_URL/BRANCH."
[[ -f "${APP_DIR}/site/index.html" ]] || warn "site/index.html missing — app will fall back to project root."

id "${APP_USER}" >/dev/null 2>&1 || die "App user ${APP_USER} does not exist."
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ---------------------------------------------------------------------------
# 5. Configure Nginx (HTTP reverse proxy → Node on 127.0.0.1:PORT)
# ---------------------------------------------------------------------------
info "Writing Nginx site config for ${DOMAIN}..."
if [[ "$PKG" == "apt" ]]; then
  NGINX_SITE="/etc/nginx/sites-available/acts"
  write_nginx_server_block >"${NGINX_SITE}"
  ln -sfn "${NGINX_SITE}" /etc/nginx/sites-enabled/acts
  rm -f /etc/nginx/sites-enabled/default
else
  # AL2023 ships a default server in nginx.conf; drop a dedicated conf.d file.
  write_nginx_server_block >/etc/nginx/conf.d/acts.conf
  # Neutralize the default catch-all so our server_name wins cleanly.
  if [[ -f /etc/nginx/nginx.conf ]] && grep -q 'server_name\s\+_;' /etc/nginx/nginx.conf; then
    sed -i 's/server_name  _;/server_name  localhost;/' /etc/nginx/nginx.conf || true
  fi
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

# ---------------------------------------------------------------------------
# 6. Start the app with PM2
# ---------------------------------------------------------------------------
info "Starting ACTS with PM2 on port ${APP_PORT}..."
cd "${APP_DIR}"
PORT="${APP_PORT}" pm2 delete "${PM2_APP_NAME}" >/dev/null 2>&1 || true
PORT="${APP_PORT}" pm2 start server.js \
  --name "${PM2_APP_NAME}" \
  --cwd "${APP_DIR}" \
  --update-env

# ---------------------------------------------------------------------------
# 7. Enable services on boot (nginx already enabled; PM2 systemd)
# ---------------------------------------------------------------------------
info "Enabling PM2 startup on boot..."
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root >/dev/null
pm2 save

systemctl enable nginx
systemctl is-enabled nginx >/dev/null && info "nginx enabled on boot."
systemctl is-active --quiet nginx && info "nginx is running."
pm2 status

# ---------------------------------------------------------------------------
# 8. Install SSL (Let's Encrypt via certbot + nginx plugin)
# ---------------------------------------------------------------------------
if [[ "${SKIP_SSL:-0}" == "1" ]]; then
  warn "SKIP_SSL=1 — skipping Let's Encrypt. Site is HTTP-only for now."
elif [[ -z "${CONTACT_EMAIL}" ]]; then
  warn "No email provided — skipping SSL. Re-run with an email after DNS points here."
else
  info "Installing certbot and requesting certificate for ${DOMAIN}..."
  if [[ "$PKG" == "apt" ]]; then
    apt-get install -y certbot python3-certbot-nginx
  else
    dnf -y install certbot python3-certbot-nginx || {
      warn "dnf certbot packages unavailable; installing via pip venv..."
      dnf -y install python3 augeas-libs
      python3 -m venv /opt/certbot
      /opt/certbot/bin/pip install --upgrade pip
      /opt/certbot/bin/pip install certbot certbot-nginx
      ln -sfn /opt/certbot/bin/certbot /usr/bin/certbot
    }
  fi

  if certbot --nginx \
      -d "${DOMAIN}" \
      -d "www.${DOMAIN}" \
      --non-interactive \
      --agree-tos \
      -m "${CONTACT_EMAIL}" \
      --redirect; then
    info "TLS installed."
    systemctl enable --now certbot-renew.timer >/dev/null 2>&1 \
      || systemctl enable --now certbot.timer >/dev/null 2>&1 \
      || true
  else
    warn "certbot failed (usually DNS not pointing here yet, or HTTPS 443 closed in Lightsail)."
    warn "After DNS + firewall are ready:"
    warn "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${CONTACT_EMAIL} --redirect"
  fi
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
cat <<EOF

${GREEN}[bootstrap] Complete.${NC}

  App dir:   ${APP_DIR}
  Node port: 127.0.0.1:${APP_PORT} (PM2: ${PM2_APP_NAME})
  Domain:    ${DOMAIN}
  Repo:      ${REPO_URL} @ ${BRANCH}

Useful commands:
  pm2 status
  pm2 logs ${PM2_APP_NAME}
  pm2 restart ${PM2_APP_NAME}
  nginx -t && systemctl reload nginx

Redeploy later:
  cd ${APP_DIR} && git pull && pm2 restart ${PM2_APP_NAME}

EOF
