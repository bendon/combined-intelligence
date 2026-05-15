#!/usr/bin/env bash
set -euo pipefail

# Installs the preemption watcher on a TPU VM as a systemd service.
# Usage:
#   ./tpu-spot-install-preemption-handler.sh
#   PREEMPT_CHECKPOINT_HOOK='python /srv/train.py --checkpoint-only' ./tpu-spot-install-preemption-handler.sh

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
PREEMPT_CHECKPOINT_HOOK="${PREEMPT_CHECKPOINT_HOOK:-echo 'No checkpoint hook configured.'}"

if [[ -z "$TPU_PROJECT" ]]; then
  echo "ERROR: Set TPU_PROJECT or GCP_PROJECT in infra/.env (or export it)." >&2
  exit 1
fi

gcloud config set project "$TPU_PROJECT" >/dev/null

echo "Copying watcher script to TPU VM..."
gcloud compute tpus tpu-vm scp "$SCRIPT_DIR/tpu-preemption-watch.sh" \
  "$TPU_NAME:~/tpu-preemption-watch.sh" \
  --zone="$TPU_ZONE"

echo "Installing systemd service on TPU VM..."
gcloud compute tpus tpu-vm ssh "$TPU_NAME" \
  --zone="$TPU_ZONE" \
  --command "chmod +x ~/tpu-preemption-watch.sh && sudo mv ~/tpu-preemption-watch.sh /usr/local/bin/tpu-preemption-watch.sh"

ESCAPED_HOOK="$(printf '%q' "$PREEMPT_CHECKPOINT_HOOK")"

TMP_SERVICE_FILE="$(mktemp)"
cat > "$TMP_SERVICE_FILE" <<EOF
[Unit]
Description=TPU Spot preemption watcher
After=network-online.target

[Service]
Type=simple
Environment=PREEMPT_CHECK_INTERVAL_SEC=2
Environment=PREEMPT_CHECKPOINT_HOOK=$ESCAPED_HOOK
ExecStart=/usr/local/bin/tpu-preemption-watch.sh
Restart=always
RestartSec=1

[Install]
WantedBy=multi-user.target
EOF

gcloud compute tpus tpu-vm scp "$TMP_SERVICE_FILE" \
  "$TPU_NAME:~/tpu-preemption-watch.service" \
  --zone="$TPU_ZONE"

rm -f "$TMP_SERVICE_FILE"

gcloud compute tpus tpu-vm ssh "$TPU_NAME" \
  --zone="$TPU_ZONE" \
  --command "sudo mv ~/tpu-preemption-watch.service /etc/systemd/system/tpu-preemption-watch.service && sudo systemctl daemon-reload && sudo systemctl enable --now tpu-preemption-watch.service && sudo systemctl status tpu-preemption-watch.service --no-pager"

echo
echo "Preemption watcher installed."
echo "To inspect logs:"
echo "  gcloud compute tpus tpu-vm ssh $TPU_NAME --zone=$TPU_ZONE --command 'sudo journalctl -u tpu-preemption-watch -f'"
