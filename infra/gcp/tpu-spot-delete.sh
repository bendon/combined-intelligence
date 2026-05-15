#!/usr/bin/env bash
set -euo pipefail

# Deletes a Cloud TPU VM (intended pair for tpu-spot-create.sh).
# Usage:
#   ./tpu-spot-delete.sh
#   TPU_NAME=ci-tpu TPU_ZONE=asia-southeast1-b ./tpu-spot-delete.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/infra/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

TPU_NAME="${TPU_NAME:-ci-tpu-spot}"
TPU_ZONE="${TPU_ZONE:-${GCP_ZONE:-asia-southeast1-b}}"
TPU_PROJECT="${TPU_PROJECT:-${GCP_PROJECT:-}}"

if [[ -z "$TPU_PROJECT" ]]; then
  echo "ERROR: Set TPU_PROJECT or GCP_PROJECT in infra/.env (or export it)." >&2
  exit 1
fi

gcloud config set project "$TPU_PROJECT" >/dev/null

echo "Deleting TPU VM '$TPU_NAME' in zone '$TPU_ZONE'..."
gcloud compute tpus tpu-vm delete "$TPU_NAME" --zone="$TPU_ZONE" --quiet
echo "Deleted."
