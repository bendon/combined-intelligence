#!/usr/bin/env bash
set -euo pipefail

# Creates a Cloud TPU VM as Spot capacity.
# Usage:
#   ./tpu-spot-create.sh
#   TPU_NAME=ci-tpu TPU_ZONE=asia-southeast1-b ./tpu-spot-create.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/infra/.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

TPU_NAME="${TPU_NAME:-ci-tpu-spot}"
TPU_ZONE="${TPU_ZONE:-${GCP_ZONE:-asia-southeast1-b}}"
TPU_ACCELERATOR_TYPE="${TPU_ACCELERATOR_TYPE:-v6e-1}"
TPU_RUNTIME_VERSION="${TPU_RUNTIME_VERSION:-v2-alpha-tpuv6e}"
TPU_PROJECT="${TPU_PROJECT:-${GCP_PROJECT:-}}"
TPU_DESCRIPTION="${TPU_DESCRIPTION:-Combined Intelligence TPU Spot VM}"
TPU_SPOT_RECOVERY_MODE="${TPU_SPOT_RECOVERY_MODE:-manual-recreate}"

if [[ -z "$TPU_PROJECT" ]]; then
  echo "ERROR: Set TPU_PROJECT or GCP_PROJECT in infra/.env (or export it)." >&2
  exit 1
fi

echo "Ensuring required APIs are enabled for project: $TPU_PROJECT"
gcloud services enable tpu.googleapis.com compute.googleapis.com --project "$TPU_PROJECT" >/dev/null

echo "Setting gcloud project: $TPU_PROJECT"
gcloud config set project "$TPU_PROJECT" >/dev/null

echo "Creating TPU Spot VM:"
echo "  name:               $TPU_NAME"
echo "  zone:               $TPU_ZONE"
echo "  accelerator-type:   $TPU_ACCELERATOR_TYPE"
echo "  runtime-version:    $TPU_RUNTIME_VERSION"
echo "  recovery-mode:      $TPU_SPOT_RECOVERY_MODE"

GCLOUD_EXTRA=()
# gcloud defaults to external IPs unless --internal-ips. REST create script defaults to private unless TPU_ENABLE_EXTERNAL_IPS.
if [[ "${TPU_INTERNAL_IPS_ONLY:-}" == "1" || "${TPU_INTERNAL_IPS_ONLY,,}" == "true" ]]; then
  GCLOUD_EXTRA+=(--internal-ips)
  echo "  networking:         internal IPs only (use Cloud NAT for internet egress)"
fi

gcloud compute tpus tpu-vm create "$TPU_NAME" \
  --zone="$TPU_ZONE" \
  --accelerator-type="$TPU_ACCELERATOR_TYPE" \
  --version="$TPU_RUNTIME_VERSION" \
  --spot \
  --description="$TPU_DESCRIPTION" \
  "${GCLOUD_EXTRA[@]}"

echo
echo "TPU Spot VM created."
echo "Connect with:"
echo "  gcloud compute tpus tpu-vm ssh $TPU_NAME --zone=$TPU_ZONE"
echo
echo "Next recommended step (install preemption watcher):"
echo "  ./tpu-spot-install-preemption-handler.sh"
