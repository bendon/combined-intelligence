#!/usr/bin/env bash
# =============================================================================
# Phase 1 — Install system packages and data services only (no app deploy).
#
# Installs: apt deps, Node 20, MongoDB 7, Redis, Qdrant, nginx, deploy user `ci`.
# Writes DB passwords to /root/combined-intelligence-secrets.txt (first run).
#
# Does NOT: clone repo, create backend/.env, start Combined Intelligence API.
#
# Usage (from your clone — do NOT curl into /tmp):
#   cd ~/combined-intelligence && sudo bash infra/scripts/bootstrap-ubuntu-phase1-packages.sh
#
# Then create backend/.env + infra/.env (see printed instructions), then run
# bootstrap-ubuntu-phase2-app.sh
# =============================================================================
set -euo pipefail

_bootstrap_entry="${BASH_SOURCE[0]}"
# shellcheck source=bootstrap-ubuntu-init.sh
source "$(dirname "$_bootstrap_entry")/bootstrap-ubuntu-init.sh"
SCRIPT_DIR="${BOOTSTRAP_SCRIPT_DIR}"

require_root
export DEBIAN_FRONTEND=noninteractive
mkdir -p "$STATE_DIR"

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

# MongoDB's apt repo does not publish every Ubuntu LTS immediately (e.g. noble/24.04
# returns 404 as of 2026). Use the jammy (22.04) suite — packages install fine on noble.
mongodb_apt_suite() {
  local codename
  codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
  [[ -n "$codename" ]] || die "Could not read VERSION_CODENAME"
  case "$codename" in
    jammy|focal) echo "$codename" ;;
    *)
      echo "jammy"
      ;;
  esac
}

install_mongodb_repo() {
  local suite="$1"
  curl -fsSL "https://www.mongodb.org/static/pgp/server-7.0.asc" \
    | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu ${suite}/mongodb-org/7.0 multiverse" \
    > /etc/apt/sources.list.d/mongodb-org-7.0.list
}

install_mongodb() {
  # Clean up a broken noble repo from an earlier failed run (apt update would fail).
  if [[ -f /etc/apt/sources.list.d/mongodb-org-7.0.list ]] && \
     grep -q '/ubuntu noble/' /etc/apt/sources.list.d/mongodb-org-7.0.list 2>/dev/null; then
    log "MongoDB: removing invalid noble apt source from a previous attempt"
    rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
    apt-get update -y
  fi

  if dpkg -s mongodb-org >/dev/null 2>&1; then
    log "mongodb-org already installed"
  else
    local os_codename suite
    os_codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
    suite="$(mongodb_apt_suite)"
    if [[ "$suite" != "$os_codename" ]]; then
      log "Installing MongoDB 7.0 — Ubuntu ${os_codename} has no MongoDB apt suite; using ${suite}"
    else
      log "Installing MongoDB 7.0 (mongodb-org) for Ubuntu ${suite}"
    fi
    install_mongodb_repo "$suite"
    apt-get update -y
    apt-get install -y mongodb-org
  fi

  systemctl enable mongod
  systemctl start mongod
  sleep 2

  if [[ ! -f "$STATE_DIR/mongo-auth-enabled" ]]; then
    log "MongoDB: creating ci_admin + ci_app users (first run)"
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
    if ! grep -qE '^[[:space:]]*authorization:[[:space:]]*enabled' /etc/mongod.conf; then
      printf '\nsecurity:\n  authorization: enabled\n' >> /etc/mongod.conf
    fi
    systemctl restart mongod
    touch "$STATE_DIR/mongo-auth-enabled"
    sleep 2
  else
    log "MongoDB: auth already configured"
  fi
}

install_redis() {
  apt-get install -y redis-server
  load_or_gen_secrets
  mkdir -p /etc/redis/conf.d
  cat > /etc/redis/conf.d/99-ci-combined-intelligence.conf <<REDIS
bind 127.0.0.1 -::1
supervised systemd
requirepass ${REDIS_PASSWORD}
REDIS
  if ! grep -qE '^[[:space:]]*include[[:space:]]+/etc/redis/conf\.d/\*\.conf' /etc/redis/redis.conf; then
    echo 'include /etc/redis/conf.d/*.conf' >> /etc/redis/redis.conf
  fi
  systemctl enable redis-server
  systemctl restart redis-server
}

install_qdrant() {
  local qbin="/usr/local/bin/qdrant"
  if [[ ! -x "$qbin" ]]; then
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
}

setup_deploy_user() {
  if ! id -u "$DEPLOY_USER" &>/dev/null; then
    log "Creating user ${DEPLOY_USER}"
    useradd --create-home --shell /bin/bash "$DEPLOY_USER"
  fi
  mkdir -p "$(dirname "$REPO_DIR")"
}

print_phase1_next_steps() {
  load_or_gen_secrets
  log "Phase 1 complete."
  cat <<EOF

Services running (localhost only):
  MongoDB   127.0.0.1:27017   user ci_app   password in ${SECRETS_FILE}
  Redis     127.0.0.1:6379    password in ${SECRETS_FILE}
  Qdrant    127.0.0.1:6333
  nginx     installed (site configured in phase 2)

Secrets file (root only):
  ${SECRETS_FILE}

─── Phase 2 prerequisites (you do this before phase 2) ───

1. Clone or pull the repo to ${REPO_DIR} (phase 2 can clone for you).

2. Create ${REPO_DIR}/backend/.env  — REQUIRED for API/Celery.
   The app reads ONLY this file (not infra/.env). Use 127.0.0.1 hosts:

   MONGO_URL=mongodb://ci_app:<MONGO_APP_PASSWORD>@127.0.0.1:27017/${MONGO_DB}?authSource=${MONGO_DB}
   REDIS_URL=redis://:<REDIS_PASSWORD>@127.0.0.1:6379/0
   QDRANT_URL=http://127.0.0.1:6333
   JWT_SECRET=<from secrets file>

   Copy fields from infra/.env.example for Google, S3, VAPID, etc.
   (Use bare-metal URLs — not mongo/redis/qdrant Docker hostnames.)

3. Create ${REPO_DIR}/infra/.env  — for TPU CLI + firewall scripts.
   Copy from infra/.env.example (TPU_*, GCP_PROJECT, UBUNTU_STATIC_IP).

4. Optional: ${REPO_DIR}/infra/gcp/service-account.json

─── Then run phase 2 ───

  sudo env PRIMARY_HOST=20.157.90.21 bash ${SCRIPT_DIR}/bootstrap-ubuntu-phase2-app.sh

EOF
}

install_base_packages
install_node
install_mongodb
install_redis
install_qdrant
setup_deploy_user
print_phase1_next_steps
