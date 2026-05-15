#!/usr/bin/env bash
# Run ON THE AZURE VM after copying backend.env / infra.env into the repo.
# Fills __MONGO_APP_PASSWORD__, __REDIS_PASSWORD__, __JWT_SECRET__, __FLOWER_PASSWORD__
# from /root/combined-intelligence-secrets.txt (written by phase 1).
#
# Usage (sudo preserves SUDO_USER for repo discovery):
#   sudo bash ~/combined-intelligence/deploy/azure-vm/apply-vm-secrets.sh
#   sudo env REPO_DIR=/home/bendon/combined-intelligence bash .../apply-vm-secrets.sh
set -euo pipefail

_resolve_repo_dir() {
  if [[ -n "${REPO_DIR:-}" ]]; then
    echo "$REPO_DIR"
    return
  fi
  local script_dir repo_from_script
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  repo_from_script="$(cd "${script_dir}/../.." && pwd)"
  if [[ -f "${repo_from_script}/infra/scripts/bootstrap-ubuntu-common.sh" ]]; then
    echo "$repo_from_script"
    return
  fi
  local home_dir
  home_dir="$(getent passwd "${SUDO_USER:-${USER:-root}}" 2>/dev/null | cut -d: -f6 || echo "${HOME}")"
  for _d in "${home_dir}/combined-intelligence" "/srv/combined-intelligence"; do
    if [[ -d "${_d}/.git" ]] || [[ -f "${_d}/infra/scripts/bootstrap-ubuntu-common.sh" ]]; then
      echo "$_d"
      return
    fi
  done
  echo "${home_dir}/combined-intelligence"
}

REPO_DIR="$(_resolve_repo_dir)"
SECRETS_FILE="${SECRETS_FILE:-/root/combined-intelligence-secrets.txt}"
BACKEND_SRC="${1:-$REPO_DIR/deploy/azure-vm/backend.env}"
INFRA_SRC="${2:-$REPO_DIR/deploy/azure-vm/infra.env}"
DEPLOY_USER="${DEPLOY_USER:-ci}"

[[ -f "$SECRETS_FILE" ]] || { echo "Missing $SECRETS_FILE - run phase 1 first." >&2; exit 1; }
# shellcheck disable=SC1090
source "$SECRETS_FILE"

substitute() {
  local file="$1" dest="$2"
  [[ -f "$file" ]] || { echo "Missing $file" >&2; exit 1; }
  sed \
    -e "s|__MONGO_APP_PASSWORD__|${MONGO_APP_PASSWORD}|g" \
    -e "s|__REDIS_PASSWORD__|${REDIS_PASSWORD}|g" \
    -e "s|__JWT_SECRET__|${JWT_SECRET}|g" \
    -e "s|__FLOWER_PASSWORD__|${FLOWER_PASSWORD}|g" \
    "$file" > "$dest"
  chmod 600 "$dest"
  if id -u "$DEPLOY_USER" &>/dev/null; then
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "$dest"
  elif [[ -n "${SUDO_USER:-}" ]]; then
    chown "${SUDO_USER}:${SUDO_USER}" "$dest"
  fi
  echo "Wrote $dest"
}

echo "Using REPO_DIR=${REPO_DIR}"
mkdir -p "$REPO_DIR/backend" "$REPO_DIR/infra"
substitute "$BACKEND_SRC" "$REPO_DIR/backend/.env"
substitute "$INFRA_SRC" "$REPO_DIR/infra/.env"
