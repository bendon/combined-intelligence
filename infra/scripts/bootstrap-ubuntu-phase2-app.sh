#!/usr/bin/env bash
# =============================================================================
# Phase 2 — Deploy Combined Intelligence (after phase 1 + .env files exist).
#
# Requires:
#   - Phase 1 completed (MongoDB, Redis, Qdrant, nginx, Node, Python apt deps)
#   - ${REPO_DIR}/backend/.env  (app config — pydantic reads this ONLY)
#   - PRIMARY_HOST set (VM public IP or domain for nginx)
#
# Optional but recommended:
#   - ${REPO_DIR}/infra/.env  (TPU CLI, firewall scripts)
#   - ${REPO_DIR}/infra/gcp/service-account.json
#
# Does NOT create or overwrite backend/.env or infra/.env.
#
# Usage:
#   cd ~/combined-intelligence
#   sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-phase2-app.sh
# =============================================================================
set -euo pipefail

_bootstrap_entry="${BASH_SOURCE[0]}"
# shellcheck source=bootstrap-ubuntu-init.sh
source "$(dirname "$_bootstrap_entry")/bootstrap-ubuntu-init.sh"
SCRIPT_DIR="${BOOTSTRAP_SCRIPT_DIR}"

require_root
export DEBIAN_FRONTEND=noninteractive

PRIMARY_HOST="${PRIMARY_HOST:-}"
if [[ -z "$PRIMARY_HOST" ]]; then
  die "Set PRIMARY_HOST (VM public IP or domain), e.g. sudo env PRIMARY_HOST=20.157.90.21 bash $0"
fi

require_backend_env() {
  local envf="${REPO_DIR}/backend/.env"
  if [[ ! -f "$envf" ]]; then
    cat >&2 <<EOF
ERROR: ${envf} does not exist.

The FastAPI app and Celery read backend/.env only (not infra/.env).
Run phase 1 first, then create backend/.env using passwords from:
  ${SECRETS_FILE}

See: infra/scripts/README.md
EOF
    exit 1
  fi
  if ! grep -qE '^JWT_SECRET=.+' "$envf" 2>/dev/null; then
    echo "WARN: JWT_SECRET missing or empty in ${envf}" >&2
  fi
  if ! grep -qE '^MONGO_URL=.+' "$envf" 2>/dev/null; then
    echo "WARN: MONGO_URL missing in ${envf}" >&2
  fi
  if ! grep -qE '^REDIS_URL=.+' "$envf" 2>/dev/null; then
    echo "WARN: REDIS_URL missing in ${envf}" >&2
  fi
  log "Found ${envf}"
}

warn_infra_env() {
  if [[ ! -f "${REPO_DIR}/infra/.env" ]]; then
    echo "WARN: ${REPO_DIR}/infra/.env not found — TPU CLI and firewall scripts will need it later." >&2
  fi
}

setup_user_and_repo() {
  if ! id -u "$DEPLOY_USER" &>/dev/null; then
    die "Deploy user ${DEPLOY_USER} missing — run phase 1 first."
  fi
  if [[ -d "$REPO_DIR/.git" ]]; then
    log "Repo exists — git pull"
    git -C "$REPO_DIR" pull --ff-only || log "WARN: git pull failed"
  elif [[ -d "$REPO_DIR" ]]; then
    die "${REPO_DIR} exists but is not a git repo"
  else
    log "Cloning ${CLONE_URL} → ${REPO_DIR}"
    git clone "$CLONE_URL" "$REPO_DIR"
  fi
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$REPO_DIR"
  require_backend_env
  warn_infra_env
}

setup_backend_venv() {
  log "Python venv + pip (as ${DEPLOY_USER})"
  sudo -u "$DEPLOY_USER" bash <<EOSU
set -euo pipefail
cd "${REPO_DIR}/backend"
[[ -f .env ]] || { echo "backend/.env required"; exit 1; }
if [[ ! -d .venv ]]; then python3 -m venv .venv; fi
source .venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
EOSU
}

write_flower_env() {
  if [[ -f "$SECRETS_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$SECRETS_FILE"
  elif grep -qE '^FLOWER_USER=' "${REPO_DIR}/backend/.env" 2>/dev/null; then
    FLOWER_USER="$(grep -E '^FLOWER_USER=' "${REPO_DIR}/backend/.env" | cut -d= -f2- | tr -d "'\"")"
    FLOWER_PASSWORD="$(grep -E '^FLOWER_PASSWORD=' "${REPO_DIR}/backend/.env" | cut -d= -f2- | tr -d "'\"")"
  else
    FLOWER_USER=admin
    FLOWER_PASSWORD="$(openssl rand -hex 16)"
  fi
  mkdir -p /etc/combined-intelligence
  cat > /etc/combined-intelligence/flower.env <<EOF
FLOWER_USER=${FLOWER_USER}
FLOWER_PASSWORD=${FLOWER_PASSWORD}
EOF
  chmod 600 /etc/combined-intelligence/flower.env
}

setup_frontend() {
  log "npm ci + build"
  sudo -u "$DEPLOY_USER" bash <<EOSU
set -euo pipefail
cd "${REPO_DIR}/frontend"
npm ci
npm run build
EOSU
  mkdir -p "$WEB_ROOT"
  rsync -a --delete "${REPO_DIR}/frontend/dist/" "${WEB_ROOT}/"
  chown -R www-data:www-data "$WEB_ROOT"
}

setup_nginx() {
  log "nginx site for ${PRIMARY_HOST}"
  local avail="/etc/nginx/sites-available/combined-intelligence.conf"
  cat > "$avail" <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${PRIMARY_HOST};

    root ${WEB_ROOT};
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_buffering    off;
        proxy_read_timeout 600s;
    }

    location /flower/ {
        allow 127.0.0.1;
        deny  all;
        proxy_pass http://127.0.0.1:5555/;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|webmanifest)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
  ln -sf "$avail" /etc/nginx/sites-enabled/combined-intelligence.conf
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  nginx -t
  systemctl reload nginx
}

install_app_systemd() {
  log "systemd: API + Celery"
  local d="${REPO_DIR}/infra/systemd/bare-metal"
  for unit in ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service ci-flower.service; do
    sed "s|/srv/combined-intelligence|${REPO_DIR}|g; s/^User=ci\$/User=${DEPLOY_USER}/; s/^Group=ci\$/Group=${DEPLOY_USER}/" \
      "${d}/${unit}" > "/etc/systemd/system/${unit}"
  done
  if [[ -f "${REPO_DIR}/infra/systemd/ci-tpu-watchdog.service" ]]; then
    sed "s|/srv/combined-intelligence|${REPO_DIR}|g; s/^User=ci\$/User=${DEPLOY_USER}/; s/^Group=ci\$/Group=${DEPLOY_USER}/" \
      "${REPO_DIR}/infra/systemd/ci-tpu-watchdog.service" > /etc/systemd/system/ci-tpu-watchdog.service
    cp "${REPO_DIR}/infra/systemd/ci-tpu-watchdog.timer" /etc/systemd/system/
  fi
  systemctl daemon-reload
  systemctl enable ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service
  systemctl restart ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service
}

verify_app() {
  log "Smoke checks"
  sleep 3
  if curl -sf "http://127.0.0.1:8000/api/health" >/dev/null 2>&1 || \
     curl -sf "http://127.0.0.1:8000/docs" >/dev/null 2>&1; then
    log "API responds on 127.0.0.1:8000"
  else
    echo "WARN: API not responding yet — check: journalctl -u ci-api.service -n 50" >&2
  fi
}

setup_user_and_repo
setup_backend_venv
write_flower_env
setup_frontend
setup_nginx
install_app_systemd
verify_app

log "Phase 2 complete."
echo ""
echo "  Site:  http://${PRIMARY_HOST}/"
echo "  API:   http://${PRIMARY_HOST}/api/"
echo "  Logs:  journalctl -u ci-api.service -f"
echo ""
echo "  TPU (optional): infra/.env + service-account.json, then:"
echo "    cd ${REPO_DIR}/infra/gcp && ./firewall-tpu-setup.sh"
echo "    sudo systemctl enable --now ci-tpu-watchdog.timer"
echo ""
