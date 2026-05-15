#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# Runs ON the TPU VM. Polls the GCE Spot preemption signal and executes
# a checkpoint hook when GCP says we're about to be reclaimed.
#
# Wired in by infra/gcp/tpu-vm/systemd/ci-preempt-watch.service.
# (Identical behaviour to the legacy infra/gcp/tpu-preemption-watch.sh,
# moved here so all TPU-side files sit in one directory.)
#
# Env:
#   PREEMPT_CHECK_INTERVAL_SEC   (default: 2)
#   PREEMPT_CHECKPOINT_HOOK      (default: just log; the systemd unit sets
#                                 this to "systemctl stop ci-jetstream.service")
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/preempted"
METADATA_HEADER="Metadata-Flavor: Google"
CHECK_INTERVAL="${PREEMPT_CHECK_INTERVAL_SEC:-2}"
HOOK_CMD="${PREEMPT_CHECKPOINT_HOOK:-echo 'Preempted: configure PREEMPT_CHECKPOINT_HOOK to drain your workload'}"

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

log "preempt-watch: starting (interval=${CHECK_INTERVAL}s, hook='${HOOK_CMD}')"

while true; do
  status="$(curl -fsS -H "$METADATA_HEADER" "$METADATA_URL" 2>/dev/null || true)"
  if [[ "$status" == "TRUE" ]]; then
    log "preempt-watch: PREEMPTION signal received. Running hook."
    # shellcheck disable=SC2086
    bash -lc "$HOOK_CMD" || log "preempt-watch: hook failed (continuing to exit)."
    log "preempt-watch: hook complete. Exiting watcher."
    exit 0
  fi
  sleep "$CHECK_INTERVAL"
done
