#!/usr/bin/env bash
# Run ON THE AZURE VM after copying backend.env / infra.env into the repo.
# Fills __MONGO_APP_PASSWORD__, __REDIS_PASSWORD__, __JWT_SECRET__, __FLOWER_PASSWORD__
# from /root/combined-intelligence-secrets.txt (written by phase 1).
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/combined-intelligence}"
SECRETS_FILE="${SECRETS_FILE:-/root/combined-intelligence-secrets.txt}"
BACKEND_SRC="${1:-$REPO_DIR/deploy/azure-vm/backend.env}"
INFRA_SRC="${2:-$REPO_DIR/deploy/azure-vm/infra.env}"

[[ -f "$SECRETS_FILE" ]] || { echo "Missing $SECRETS_FILE — run phase 1 first." >&2; exit 1; }
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
  echo "Wrote $dest"
}

mkdir -p "$REPO_DIR/backend" "$REPO_DIR/infra"
substitute "$BACKEND_SRC" "$REPO_DIR/backend/.env"
substitute "$INFRA_SRC" "$REPO_DIR/infra/.env"
