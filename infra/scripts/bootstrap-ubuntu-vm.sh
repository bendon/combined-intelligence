#!/usr/bin/env bash
# =============================================================================
# Combined Intelligence — Ubuntu VM bootstrap (Azure-friendly, bare metal)
#
# Installs: MongoDB 7, Redis (auth + loopback), Qdrant, nginx, Node.js 20,
#           Python venv + backend deps, frontend production build, systemd
#           units for API + Celery + optional TPU watchdog files.
#
# Usage (must be root):
#   sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-vm.sh
#
# Optional env (see infra/scripts/README.md):
#   REPO_DIR CLONE_URL DEPLOY_USER WEB_ROOT BOOTSTRAP_* for Google/S3/GCP
#
# Idempotency: safe to re-run. Will not overwrite backend/.env if it exists.
# Secrets file: /root/combined-intelligence-secrets.txt (chmod 600)
# =============================================================================
set -euo pipefail

[[ "${EUID:-0}" -eq 0 ]] || { echo "Run as root: sudo bash $0" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive

# ── configurable defaults ───────────────────────────────────────────────────
PRIMARY_HOST="${PRIMARY_HOST:-}"
REPO_DIR="${REPO_DIR:-/srv/combined-intelligence}"
CLONE_URL="${CLONE_URL:-https://github.com/bendon/combined-intelligence.git}"
DEPLOY_USER="${DEPLOY_USER:-ci}"
WEB_ROOT="${WEB_ROOT:-/var/www/combinedintelligence}"
MONGO_DB="${MONGO_DB:-combined_intelligence}"
QDRANT_VERSION="${QDRANT_VERSION:-1.9.2}"
STATE_DIR="${STATE_DIR:-/var/lib/combined-intelligence-bootstrap}"
SECRETS_FILE="${SECRETS_FILE:-/root/combined-intelligence-secrets.txt}"

BOOTSTRAP_GCP_PROJECT="${BOOTSTRAP_GCP_PROJECT:-changeme-gcp-project-id}"
BOOTSTRAP_GOOGLE_CLIENT_ID="${BOOTSTRAP_GOOGLE_CLIENT_ID:-000000000000-bootstrap.apps.googleusercontent.com}"
BOOTSTRAP_GOOGLE_CLIENT_SECRET="${BOOTSTRAP_GOOGLE_CLIENT_SECRET:-replace-me-google-client-secret}"
BOOTSTRAP_S3_ACCESS_KEY="${BOOTSTRAP_S3_ACCESS_KEY:-replace-me-s3-access-key}"
BOOTSTRAP_S3_SECRET_KEY="${BOOTSTRAP_S3_SECRET_KEY:-replace-me-s3-secret-key}"

if [[ -z "$PRIMARY_HOST" ]]; then
  echo "ERROR: Set PRIMARY_HOST to this VM's public IP or DNS name, e.g." >&2
  echo "  sudo env PRIMARY_HOST=20.157.90.21 bash $0" >&2
  exit 1
fi

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

# ── base packages ───────────────────────────────────────────────────────────
install_base_packages() {
  log "APT: update + core packages"
  apt-get update -y
  apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg lsb-release apt-transport-https software-properties-common \
    git rsync build-essential pkg-config \
    python3 python3-venv python3-dev python3-pip \
    libxml2-dev libxslt1-dev zlib1g-dev libjpeg-dev \
    nginx acl
}

# ── Node.js 20 (NodeSource) ─────────────────────────────────────────────────
install_node() {
  if command -v node >/dev/null 2>&1 && [[ "$(node -v 2>/dev/null)" == v20* ]]; then
    log "Node 20 already present: $(node -v)"
    return
  fi
  log "Installing Node.js 20.x (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log "node $(node -v) / npm $(npm -v)"
}

# ── MongoDB 7 (official repo) ───────────────────────────────────────────────
install_mongodb() {
  if dpkg -s mongodb-org >/dev/null 2>&1; then
    log "mongodb-org already installed"
  else
    log "Installing MongoDB 7.0 (mongodb-org)"
    local codename
    codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
    [[ -n "$codename" ]] || die "Could not read VERSION_CODENAME from /etc/os-release"
    curl -fsSL "https://www.mongodb.org/static/pgp/server-7.0.asc" \
      | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu ${codename}/mongodb-org/7.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -y
    apt-get install -y mongodb-org || {
      echo "WARN: MongoDB 7.0 repo failed for codename=${codename} — trying jammy repo fallback." >&2
      rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
      curl -fsSL "https://www.mongodb.org/static/pgp/server-7.0.asc" \
        | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
      echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
        > /etc/apt/sources.list.d/mongodb-org-7.0.list
      apt-get update -y
      apt-get install -y mongodb-org
    }
  fi

  mkdir -p "$STATE_DIR"
  systemctl enable mongod
  systemctl start mongod
  sleep 2

  if [[ ! -f "$STATE_DIR/mongo-auth-enabled" ]]; then
    log "MongoDB: creating admin + app users (first run only)"
    load_or_gen_secrets
    mongosh --quiet <<MONGO
try {
  db.getSiblingDB("admin").createUser({
    user: "ci_admin",
    pwd: "${MONGO_ROOT_PASSWORD}",
    roles: [{ role: "root", db: "admin" }]
  });
} catch (e) {
  if (e.code !== 51003 && e.codeName !== "DuplicateKey") { throw e; }
}
try {
  db.getSiblingDB("${MONGO_DB}").createUser({
    user: "ci_app",
    pwd: "${MONGO_APP_PASSWORD}",
    roles: [{ role: "readWrite", db: "${MONGO_DB}" }]
  });
} catch (e) {
  if (e.code !== 51003 && e.codeName !== "DuplicateKey") { throw e; }
}
MONGO
    log "MongoDB: enabling authorization"
    if ! grep -qE '^[[:space:]]*authorization:[[:space:]]*enabled' /etc/mongod.conf; then
      printf '\nsecurity:\n  authorization: enabled\n' >> /etc/mongod.conf
    fi
    systemctl restart mongod
    touch "$STATE_DIR/mongo-auth-enabled"
    sleep 2
  else
    log "MongoDB: auth already configured"
    systemctl start mongod || true
  fi
}

# ── Redis ───────────────────────────────────────────────────────────────────
install_redis() {
  apt-get install -y redis-server
  load_or_gen_secrets
  mkdir -p /etc/redis/conf.d
  cat > /etc/redis/conf.d/99-ci-combined-intelligence.conf <<REDIS
# Managed by bootstrap-ubuntu-vm.sh — do not edit blindly.
bind 127.0.0.1 -::1
supervised systemd
requirepass ${REDIS_PASSWORD}
REDIS
  if ! grep -qE '^[[:space:]]*include[[:space:]]+/etc/redis/conf\.d/\*\.conf' /etc/redis/redis.conf; then
    echo 'include /etc/redis/conf.d/*.conf' >> /etc/redis/redis.conf
  fi
  systemctl enable redis-server
  systemctl restart redis-server
  log "Redis: listening on 127.0.0.1 with requirepass (see ${SECRETS_FILE})"
}

# ── Qdrant (static binary + systemd) ───────────────────────────────────────
install_qdrant() {
  local qbin="/usr/local/bin/qdrant"
  if [[ -x "$qbin" ]]; then
    log "Qdrant binary already present"
  else
    log "Installing Qdrant ${QDRANT_VERSION}"
    local tmp
    tmp="$(mktemp -d)"
    curl -fsSL "https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz" \
      -o "$tmp/qdrant.tgz"
    tar -xzf "$tmp/qdrant.tgz" -C "$tmp"
    install -m 0755 "$tmp/qdrant" "$qbin"
    rm -rf "$tmp"
  fi

  id -u qdrant &>/dev/null || useradd --system --home-dir /var/lib/qdrant --create-home qdrant
  mkdir -p /var/lib/qdrant/storage
  chown -R qdrant:qdrant /var/lib/qdrant

  cat > /etc/systemd/system/qdrant.service <<'UNIT'
[Unit]
Description=Qdrant vector database
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=qdrant
Group=qdrant
WorkingDirectory=/var/lib/qdrant
ExecStart=/usr/local/bin/qdrant --uri http://127.0.0.1:6333
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  systemctl enable qdrant
  systemctl restart qdrant
  log "Qdrant: http://127.0.0.1:6333"
}

# ── secrets ─────────────────────────────────────────────────────────────────
load_or_gen_secrets() {
  if [[ -f "$SECRETS_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$SECRETS_FILE"
    return
  fi
  log "Generating secrets → ${SECRETS_FILE}"
  MONGO_ROOT_PASSWORD="$(openssl rand -hex 24)"
  MONGO_APP_PASSWORD="$(openssl rand -hex 24)"
  REDIS_PASSWORD="$(openssl rand -hex 24)"
  FLOWER_USER="${FLOWER_USER:-admin}"
  FLOWER_PASSWORD="$(openssl rand -hex 16)"
  JWT_SECRET="$(openssl rand -hex 32)"
  cat > "$SECRETS_FILE" <<EOF
export MONGO_ROOT_PASSWORD='${MONGO_ROOT_PASSWORD}'
export MONGO_APP_PASSWORD='${MONGO_APP_PASSWORD}'
export REDIS_PASSWORD='${REDIS_PASSWORD}'
export FLOWER_USER='${FLOWER_USER}'
export FLOWER_PASSWORD='${FLOWER_PASSWORD}'
export JWT_SECRET='${JWT_SECRET}'
EOF
  chmod 600 "$SECRETS_FILE"
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
}

# ── deploy user + repo ─────────────────────────────────────────────────────
setup_user_and_repo() {
  if ! id -u "$DEPLOY_USER" &>/dev/null; then
    log "Creating user ${DEPLOY_USER}"
    useradd --system --create-home --shell /bin/bash "$DEPLOY_USER" || true
  fi
  mkdir -p "$(dirname "$REPO_DIR")"
  if [[ -d "$REPO_DIR/.git" ]]; then
    log "Repo exists at ${REPO_DIR} — pulling latest"
    git -C "$REPO_DIR" pull --ff-only || log "WARN: git pull failed — resolve manually"
  elif [[ -d "$REPO_DIR" ]]; then
    die "Directory ${REPO_DIR} exists but is not a git repo — remove/rename it or set REPO_DIR to an empty path"
  else
    log "Cloning ${CLONE_URL} → ${REPO_DIR}"
    git clone "$CLONE_URL" "$REPO_DIR"
  fi
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$REPO_DIR"
}

# ── Python venv + backend deps ───────────────────────────────────────────────
setup_backend_venv() {
  log "Python venv + pip install (as ${DEPLOY_USER})"
  sudo -u "$DEPLOY_USER" bash <<EOSU
set -euo pipefail
cd "${REPO_DIR}/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
EOSU
}

# ── backend/.env (only if missing); VAPID PEM escaped via json.dumps ─────────
write_backend_env_if_missing() {
  local envf="${REPO_DIR}/backend/.env"
  if [[ -f "$envf" ]]; then
    log "backend/.env already exists — not overwriting"
    return
  fi
  log "Writing ${envf} (placeholders for Google/S3 — edit before production)"
  load_or_gen_secrets
  export PRIMARY_HOST MONGO_DB MONGO_APP_PASSWORD REDIS_PASSWORD JWT_SECRET
  export BOOTSTRAP_GOOGLE_CLIENT_ID BOOTSTRAP_GOOGLE_CLIENT_SECRET
  export BOOTSTRAP_S3_ACCESS_KEY BOOTSTRAP_S3_SECRET_KEY BOOTSTRAP_GCP_PROJECT
  export REPO_DIR
  sudo -E -u "$DEPLOY_USER" "${REPO_DIR}/backend/.venv/bin/python" <<'PY'
import json
import os
from pathlib import Path
from urllib.parse import quote_plus

from py_vapid import Vapid

repo = Path(os.environ["REPO_DIR"])
out = repo / "backend" / ".env"
host = os.environ["PRIMARY_HOST"]
mdb = os.environ["MONGO_DB"]
m_pass = os.environ["MONGO_APP_PASSWORD"]
r_pass = os.environ["REDIS_PASSWORD"]

mongo_url = (
    f"mongodb://ci_app:{quote_plus(m_pass)}@127.0.0.1:27017/{mdb}"
    f"?authSource={mdb}"
)
redis_url = f"redis://:{quote_plus(r_pass)}@127.0.0.1:6379/0"

v = Vapid()
v.generate_keys()
vapid_priv = json.dumps(v.private_key.decode())
vapid_pub = json.dumps(v.public_key.decode())
ao = json.dumps([f"http://{host}", f"https://{host}"])

body = f"""# Generated by infra/scripts/bootstrap-ubuntu-vm.sh — review and edit.
ENVIRONMENT=production
BASE_URL=http://{host}
API_PREFIX=/api
ALLOWED_ORIGINS={ao}

JWT_SECRET={os.environ["JWT_SECRET"]}
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

COOKIE_DOMAIN={host}
COOKIE_SECURE=false

GOOGLE_CLIENT_ID={os.environ["BOOTSTRAP_GOOGLE_CLIENT_ID"]}
GOOGLE_CLIENT_SECRET={os.environ["BOOTSTRAP_GOOGLE_CLIENT_SECRET"]}
GOOGLE_REDIRECT_URI=http://{host}/api/auth/google/callback

MONGO_URL={mongo_url}
MONGO_DB={mdb}

REDIS_URL={redis_url}

QDRANT_URL=http://127.0.0.1:6333

S3_ENDPOINT_URL=https://s3.fr-par.scw.cloud
S3_REGION=fr-par
S3_ACCESS_KEY={os.environ["BOOTSTRAP_S3_ACCESS_KEY"]}
S3_SECRET_KEY={os.environ["BOOTSTRAP_S3_SECRET_KEY"]}
S3_BUCKET=bm-ai
S3_PREFIX=combinedintelligence

GCP_PROJECT={os.environ["BOOTSTRAP_GCP_PROJECT"]}
GCP_ZONE=us-central1-a
GCP_VM_INSTANCE=ci-ollama-inference

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=deepseek-r1:8b

SYNTHESIS_BACKEND=ollama_vm

VAPID_PRIVATE_KEY={vapid_priv}
VAPID_PUBLIC_KEY={vapid_pub}
VAPID_CLAIMS_SUB=mailto:desk@combinedintelligence.us

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
"""
out.write_text(body, encoding="utf-8")
PY
  chmod 600 "$envf"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "$envf"
}

# ── infra/.env minimal for TPU CLI (only if missing) ───────────────────────
write_infra_env_if_missing() {
  local envf="${REPO_DIR}/infra/.env"
  if [[ -f "$envf" ]]; then
    log "infra/.env already exists — not overwriting"
    return
  fi
  log "Writing minimal ${envf} — add TPU + GCP_SERVICE_ACCOUNT_KEY_FILE"
  cat > "$envf" <<EOF
GCP_PROJECT=${BOOTSTRAP_GCP_PROJECT}
TPU_ZONE=asia-southeast1-b
TPU_NAME=ci-tpu-spot
TPU_ACCELERATOR_TYPE=v6e-1
TPU_RUNTIME_VERSION=v2-alpha-tpuv6e
TPU_ENABLE_EXTERNAL_IPS=true
UBUNTU_STATIC_IP=${PRIMARY_HOST}
TPU_NETWORK_TAGS=ci-tpu
JETSTREAM_PORT=9000
EOF
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "$envf"
  chmod 600 "$envf"
}

# ── Flower credentials file for systemd ────────────────────────────────────
write_flower_env() {
  load_or_gen_secrets
  mkdir -p /etc/combined-intelligence
  cat > /etc/combined-intelligence/flower.env <<EOF
FLOWER_USER=${FLOWER_USER}
FLOWER_PASSWORD=${FLOWER_PASSWORD}
EOF
  chmod 600 /etc/combined-intelligence/flower.env
}

# ── frontend build + static root ────────────────────────────────────────────
setup_frontend() {
  log "npm ci + build (as ${DEPLOY_USER})"
  sudo -u "$DEPLOY_USER" bash <<EOSU
set -euo pipefail
cd "${REPO_DIR}/frontend"
npm ci
npm run build
EOSU
  mkdir -p "$WEB_ROOT"
  rsync -a --delete "${REPO_DIR}/frontend/dist/" "${WEB_ROOT}/"
  chown -R www-data:www-data "$WEB_ROOT"
  log "Static site → ${WEB_ROOT}"
}

# ── nginx site (HTTP — add TLS later with certbot) ───────────────────────────
setup_nginx() {
  log "nginx: site for ${PRIMARY_HOST}"
  local avail="/etc/nginx/sites-available/combined-intelligence.conf"
  cat > "$avail" <<NGINX
# Managed by bootstrap-ubuntu-vm.sh — add SSL when DNS is ready.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${PRIMARY_HOST};

    root ${WEB_ROOT};
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

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
        allow ${PRIMARY_HOST};
        deny  all;
        proxy_pass http://127.0.0.1:5555/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
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

# ── systemd app units (path substitution) ────────────────────────────────────
install_app_systemd() {
  log "Installing systemd units for API + Celery"
  local d="${REPO_DIR}/infra/systemd/bare-metal"
  for unit in ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service ci-flower.service; do
    sed "s|/srv/combined-intelligence|${REPO_DIR}|g; s/^User=ci\$/User=${DEPLOY_USER}/; s/^Group=ci\$/Group=${DEPLOY_USER}/" \
      "${d}/${unit}" > "/etc/systemd/system/${unit}"
  done
  # TPU watchdog (optional — same path sed)
  if [[ -f "${REPO_DIR}/infra/systemd/ci-tpu-watchdog.service" ]]; then
    sed "s|/srv/combined-intelligence|${REPO_DIR}|g; s/^User=ci\$/User=${DEPLOY_USER}/; s/^Group=ci\$/Group=${DEPLOY_USER}/" \
      "${REPO_DIR}/infra/systemd/ci-tpu-watchdog.service" > /etc/systemd/system/ci-tpu-watchdog.service
    cp "${REPO_DIR}/infra/systemd/ci-tpu-watchdog.timer" /etc/systemd/system/
  fi
  systemctl daemon-reload
  systemctl enable ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service
  systemctl restart ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service || true
  log "Optional: sudo systemctl enable --now ci-tpu-watchdog.timer"
  log "Optional: sudo systemctl enable --now ci-flower.service (after /etc/combined-intelligence/flower.env exists)"
}

# ── main ────────────────────────────────────────────────────────────────────
mkdir -p "$STATE_DIR"

install_base_packages
install_node
install_mongodb
install_redis
install_qdrant
setup_user_and_repo
load_or_gen_secrets
setup_backend_venv
write_backend_env_if_missing
write_infra_env_if_missing
write_flower_env
setup_frontend
setup_nginx
install_app_systemd

log "Bootstrap finished."
echo ""
echo "  Secrets:     ${SECRETS_FILE}"
echo "  Repo:        ${REPO_DIR}"
echo "  Site:        http://${PRIMARY_HOST}/"
echo "  API proxy:   http://${PRIMARY_HOST}/api/"
echo ""
echo "Next steps:"
echo "  1. Edit ${REPO_DIR}/backend/.env — real GOOGLE_*, S3 keys, GCP_PROJECT, OLLAMA_BASE_URL if used."
echo "  2. Copy infra/gcp/service-account.json for TPU; run infra/gcp/firewall-tpu-setup.sh from a gcloud machine."
echo "  3. sudo systemctl restart ci-api.service ci-celery-synthesis.service ci-celery-push.service ci-celery-beat.service"
echo "  4. journalctl -u ci-api.service -f"
echo ""
