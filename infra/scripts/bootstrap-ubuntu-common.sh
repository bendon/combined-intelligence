# shellcheck shell=bash
# Shared config + helpers for bootstrap-ubuntu-phase1 / phase2 scripts.
# Sourced by those scripts — do not run directly.

# Default repo path: honour REPO_DIR, else discover ~/combined-intelligence or /srv/...
if [[ -z "${REPO_DIR:-}" ]]; then
  _ci_home="$(getent passwd "${SUDO_USER:-${USER:-root}}" 2>/dev/null | cut -d: -f6 || echo "${HOME}")"
  for _d in "${_ci_home}/combined-intelligence" "/srv/combined-intelligence"; do
    if [[ -d "${_d}/.git" ]] || [[ -f "${_d}/infra/scripts/bootstrap-ubuntu-common.sh" ]]; then
      REPO_DIR="$_d"
      break
    fi
  done
fi
REPO_DIR="${REPO_DIR:-/srv/combined-intelligence}"
CLONE_URL="${CLONE_URL:-https://github.com/bendon/combined-intelligence.git}"
DEPLOY_USER="${DEPLOY_USER:-ci}"
WEB_ROOT="${WEB_ROOT:-/var/www/combinedintelligence}"
MONGO_DB="${MONGO_DB:-combined_intelligence}"
QDRANT_VERSION="${QDRANT_VERSION:-1.9.2}"
STATE_DIR="${STATE_DIR:-/var/lib/combined-intelligence-bootstrap}"
SECRETS_FILE="${SECRETS_FILE:-/root/combined-intelligence-secrets.txt}"

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

require_root() {
  [[ "${EUID:-0}" -eq 0 ]] || die "Run as root: sudo bash $0"
}

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
