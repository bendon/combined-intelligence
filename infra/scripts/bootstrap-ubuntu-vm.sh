#!/usr/bin/env bash
# =============================================================================
# Full bootstrap wrapper — runs phase 1, then phase 2 if backend/.env exists.
#
# Recommended workflow (two manual steps between phases):
#   sudo bash infra/scripts/bootstrap-ubuntu-phase1-packages.sh
#   # create backend/.env + infra/.env from examples
#   sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-phase2-app.sh
#
# Or run this wrapper (phase 2 runs only when ${REPO_DIR}/backend/.env already exists):
#   sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-vm.sh
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=bootstrap-ubuntu-common.sh
source "${SCRIPT_DIR}/bootstrap-ubuntu-common.sh"

require_root

PRIMARY_HOST="${PRIMARY_HOST:-}"

bash "${SCRIPT_DIR}/bootstrap-ubuntu-phase1-packages.sh"

ENV_FILE="${REPO_DIR}/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  echo "Phase 1 done. Phase 2 skipped: ${ENV_FILE} not found."
  echo "Create backend/.env (and infra/.env), then run:"
  if [[ -n "$PRIMARY_HOST" ]]; then
    echo "  sudo env PRIMARY_HOST=${PRIMARY_HOST} bash ${SCRIPT_DIR}/bootstrap-ubuntu-phase2-app.sh"
  else
    echo "  sudo env PRIMARY_HOST=<your-vm-ip> bash ${SCRIPT_DIR}/bootstrap-ubuntu-phase2-app.sh"
  fi
  exit 0
fi

if [[ -z "$PRIMARY_HOST" ]]; then
  die "backend/.env exists but PRIMARY_HOST is unset — required for phase 2 nginx."
fi

bash "${SCRIPT_DIR}/bootstrap-ubuntu-phase2-app.sh"
