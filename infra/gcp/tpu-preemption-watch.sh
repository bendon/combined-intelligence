#!/usr/bin/env bash
set -euo pipefail

# Run this on the TPU VM.
# Polls metadata for Spot/preemption signal and executes a checkpoint hook.
#
# Env:
#   PREEMPT_CHECK_INTERVAL_SEC   (default: 2)
#   PREEMPT_CHECKPOINT_HOOK      (default: echo only)

METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/preempted"
METADATA_HEADER="Metadata-Flavor: Google"
CHECK_INTERVAL="${PREEMPT_CHECK_INTERVAL_SEC:-2}"
HOOK_CMD="${PREEMPT_CHECKPOINT_HOOK:-echo 'Preempted: configure PREEMPT_CHECKPOINT_HOOK to checkpoint your job'}"

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

log "Starting preemption watcher (interval=${CHECK_INTERVAL}s)"

while true; do
  status="$(curl -fsS -H "$METADATA_HEADER" "$METADATA_URL" 2>/dev/null || true)"
  if [[ "$status" == "TRUE" ]]; then
    log "Preemption signal detected. Running checkpoint hook."
    # shellcheck disable=SC2086
    bash -lc "$HOOK_CMD" || log "Checkpoint hook failed."
    log "Checkpoint hook finished. Exiting watcher."
    exit 0
  fi
  sleep "$CHECK_INTERVAL"
done
