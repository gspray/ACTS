#!/usr/bin/env bash
# bootstrap.sh — Provision an Ubuntu/Debian VPS for ACTS (Nginx + Node + PM2 + SSL)
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
#   SKIP_FIREWALL=1     # do not enable ufw

set -euo pipefail

DOMAIN="${1:-}"
CONTACT_EMAIL="${2:-}"
APP_DIR="${APP_DIR:-/var/www/acts}"
APP_PORT="${APP_PORT:-3000}"
REPO_URL="${REPO_URL:-https://github.com/gspray/ACTS.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR="${NODE_MAJOR:-20}"
APP_USER="${APP_USER:-www-data}"
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

[[ -n "$DOMAIN" ]] || { usage; exit 1; }
[[ "$EUID" -eq 0 ]] || die "Run as root: sudo bash bootstrap.sh ${DOMAIN} ${CONTACT_EMAIL}"

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------------------
# 1. Update the OS
# ---------------------------------------------------------------------------
info "Updating OS packages..."
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw git nginx

# ---------------------------------------------------------------------------
# 2. Install Node (NodeSource) + PM2
# ---------------------------------------------------------------------------
info "Installing Node.js ${NODE_MAJOR}.x from NodeSource..."
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

info "Node $(node -v) / npm $(npm -v)"
info "Installing PM2 globally..."
npm install -g pm2

# ---------------------------------------------------------------------------
# 3. Configure the firewall
# ---------------------------------------------------------------------------
if [[ "${SKIP_FIREWALL:-0}" != "1" ]]; then
  info "Configuring UFW (OpenSSH + Nginx Full)..."
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  # Enable non-interactively; ignore if already enabled
  ufw --force enable >/dev/null 2>&1 || true
  ufw status || true
else
  warn "SKIP_FIREWALL=1 — leaving UFW unchanged."
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

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# ---------------------------------------------------------------------------
# 5. Configure Nginx (HTTP reverse proxy → Node on 127.0.0.1:PORT)
# ---------------------------------------------------------------------------
info "Writing Nginx site config for ${DOMAIN}..."
NGINX_SITE="/etc/nginx/sites-available/acts"
cat >"${NGINX_SITE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Allow certbot HTTP-01 challenges
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

ln -sfn "${NGINX_SITE}" /etc/nginx/sites-enabled/acts
# Disable default site if present so DOMAIN takes over
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

# ---------------------------------------------------------------------------
# 6. Start the app with PM2
# ---------------------------------------------------------------------------
info "Starting ACTS with PM2 on port ${APP_PORT}..."
# Run PM2 as root but start the process as APP_USER via ecosystem-style env.
# Persist under /root/.pm2 for a simple single-server bootstrap.
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
# pm2 startup prints a command; for systemd on Debian/Ubuntu this is enough:
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
  warn "No email provided — skipping SSL. Re-run with an email, or:"
  warn "  apt-get install -y certbot python3-certbot-nginx"
  warn "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m you@example.com --redirect"
else
  info "Installing certbot and requesting certificate for ${DOMAIN}..."
  apt-get install -y certbot python3-certbot-nginx

  # DNS must already point at this server for HTTP-01 to succeed.
  if certbot --nginx \
      -d "${DOMAIN}" \
      -d "www.${DOMAIN}" \
      --non-interactive \
      --agree-tos \
      -m "${CONTACT_EMAIL}" \
      --redirect; then
    info "TLS installed. Renewals are handled by certbot's systemd timer."
    systemctl enable --now certbot.timer >/dev/null 2>&1 || true
  else
    warn "certbot failed (usually DNS not pointing here yet)."
    warn "After DNS propagates, run:"
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
