#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# Combined Intelligence  -  TPU VM startup script
#
# Runs ONCE on first boot of a Cloud TPU VM created by our control plane
# (`python -m app.tpu create` or the watchdog). Mirrors the role that
# `vm-bootstrap.sh` plays for the Ollama Compute VM, but for TPU silicon
# the workload is JetStream + MaxText (Google's TPU-native LLM serving
# stack) instead of Ollama.
#
# How it gets there:
#   TpuManager.create() reads this file's contents and passes it as the
#   `startup-script` metadata key on the node. The TPU runtime image
#   includes `google-startup-scripts.service` which auto-executes that key
#   exactly once after boot.
#
# Configuration is sourced from VM metadata (set by TpuManager from the
# workload_metadata dict). Override any of these via TPU_WORKLOAD_METADATA
# in infra/.env, e.g.
#   TPU_WORKLOAD_METADATA="MODEL_NAME=gemma2-2b;MODEL_GCS=gs://your-bucket/gemma2-2b"
#
# Supported metadata keys:
#   MODEL_NAME      Human-readable model id used for log lines.
#                   Default: "gemma2-9b"
#   MODEL_GCS       gs:// URI of a MaxText-compatible checkpoint directory.
#                   If unset, the script logs the error and exits so you
#                   notice immediately (rather than serving an empty server).
#   JETSTREAM_PORT  TCP port for the HTTP server. Default: 9000.
#   TOKENIZER_PATH  Optional GCS path to a tokenizer.model file. If unset,
#                   we look inside MODEL_GCS for tokenizer.model.
#
# Exit codes are unimportant - the startup-script log lives at
# `/var/log/syslog` (`journalctl -u google-startup-scripts.service`). The
# JetStream HTTP server is registered as a systemd unit (ci-jetstream.service)
# so it survives reboots and respawns if it dies.
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

log() { printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"; }

# ── 1. Read VM metadata ─────────────────────────────────────────────────────
md() {
  # Fetch a project/instance metadata value, return "" if missing.
  curl -fsS -H 'Metadata-Flavor: Google' \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" \
    2>/dev/null || true
}

MODEL_NAME="$(md MODEL_NAME)"; MODEL_NAME="${MODEL_NAME:-gemma2-9b}"
MODEL_GCS="$(md MODEL_GCS)"
TOKENIZER_PATH="$(md TOKENIZER_PATH)"
JETSTREAM_PORT="$(md JETSTREAM_PORT)"; JETSTREAM_PORT="${JETSTREAM_PORT:-9000}"

log "bootstrap: MODEL_NAME=$MODEL_NAME MODEL_GCS=$MODEL_GCS PORT=$JETSTREAM_PORT"

if [[ -z "$MODEL_GCS" ]]; then
  log "ERROR: MODEL_GCS metadata is empty - set TPU_WORKLOAD_METADATA in infra/.env"
  log "       e.g. TPU_WORKLOAD_METADATA=\"MODEL_NAME=gemma2-9b;MODEL_GCS=gs://your-bucket/path\""
  log "       Aborting bootstrap. Re-create the node after setting this."
  exit 1
fi

# ── 2. Idempotency guard ────────────────────────────────────────────────────
SENTINEL=/var/lib/ci-tpu-bootstrap.done
if [[ -f "$SENTINEL" ]]; then
  log "bootstrap: $SENTINEL exists - skipping install (already provisioned)."
  systemctl restart ci-jetstream.service || true
  exit 0
fi

# ── 3. Base OS deps ─────────────────────────────────────────────────────────
log "bootstrap: installing base apt packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  python3-pip python3-venv git curl ca-certificates jq

# ── 4. Python venv for JetStream / MaxText ──────────────────────────────────
WORKLOAD_DIR=/opt/ci-jetstream
mkdir -p "$WORKLOAD_DIR"
python3 -m venv "$WORKLOAD_DIR/venv"
# shellcheck disable=SC1091
source "$WORKLOAD_DIR/venv/bin/activate"
pip install --upgrade pip wheel

# JAX for TPU - the runtime image (`v2-alpha-tpuv6e`) ships libtpu already,
# we just need the matching jax wheel.
log "bootstrap: installing jax[tpu]"
pip install --quiet \
  "jax[tpu]" \
  -f https://storage.googleapis.com/jax-releases/libtpu_releases.html

# MaxText - LLM training+inference reference impl, gives us model definitions
# and the JAX glue JetStream calls into.
if [[ ! -d "$WORKLOAD_DIR/maxtext" ]]; then
  log "bootstrap: cloning MaxText"
  git clone --depth 1 https://github.com/AI-Hypercomputer/maxtext.git "$WORKLOAD_DIR/maxtext"
fi
pip install --quiet -r "$WORKLOAD_DIR/maxtext/requirements.txt"

# JetStream - the HTTP/gRPC serving layer.
if [[ ! -d "$WORKLOAD_DIR/jetstream" ]]; then
  log "bootstrap: cloning JetStream"
  git clone --depth 1 https://github.com/google/JetStream.git "$WORKLOAD_DIR/jetstream"
fi
pip install --quiet -e "$WORKLOAD_DIR/jetstream"

# ── 5. Pull the model checkpoint ────────────────────────────────────────────
CKPT_DIR="$WORKLOAD_DIR/checkpoints/$MODEL_NAME"
mkdir -p "$CKPT_DIR"
if ! gsutil ls "$CKPT_DIR/" >/dev/null 2>&1 || \
   [[ -z "$(ls -A "$CKPT_DIR" 2>/dev/null)" ]]; then
  log "bootstrap: copying $MODEL_GCS -> $CKPT_DIR (this can take several minutes)"
  gsutil -m cp -r "${MODEL_GCS%/}/*" "$CKPT_DIR/"
else
  log "bootstrap: checkpoint dir non-empty, skipping copy"
fi

# Tokenizer - look inside ckpt dir by default, allow override.
if [[ -z "$TOKENIZER_PATH" ]]; then
  TOKENIZER_LOCAL="$CKPT_DIR/tokenizer.model"
else
  TOKENIZER_LOCAL="$WORKLOAD_DIR/tokenizer.model"
  if [[ ! -f "$TOKENIZER_LOCAL" ]]; then
    log "bootstrap: copying tokenizer $TOKENIZER_PATH -> $TOKENIZER_LOCAL"
    gsutil cp "$TOKENIZER_PATH" "$TOKENIZER_LOCAL"
  fi
fi

# ── 6. Write workload config consumed by ci-jetstream.service ───────────────
cat > "$WORKLOAD_DIR/env" <<EOF
# Auto-generated by bootstrap.sh - DO NOT EDIT (re-run bootstrap to regenerate).
MODEL_NAME=$MODEL_NAME
CKPT_DIR=$CKPT_DIR
TOKENIZER_LOCAL=$TOKENIZER_LOCAL
JETSTREAM_PORT=$JETSTREAM_PORT
VENV=$WORKLOAD_DIR/venv
MAXTEXT_DIR=$WORKLOAD_DIR/maxtext
EOF
log "bootstrap: wrote $WORKLOAD_DIR/env"

# ── 7. Open firewall for the JetStream port on the VM itself ────────────────
# (The PROJECT-level firewall rule is handled separately in tpu-vm/README.md;
# this is a defense-in-depth open at the host level via iptables-allow-default
# - on a fresh TPU runtime image there is no host firewall blocking by default.
# We leave this as a no-op for now; if you adopt nftables, add allow rules here.)

# ── 8. Install systemd units (copied here by Tpu deploy or fetched from repo) ─
# We expect /opt/ci-jetstream/systemd/ to exist post-deploy. If you're using
# the canonical CI flow, the watchdog will sync them via SSH after first boot.
# Fallback: pull straight from the repo at HEAD.
if [[ ! -f /etc/systemd/system/ci-jetstream.service ]]; then
  REPO_RAW="${CI_REPO_RAW:-https://raw.githubusercontent.com/your-org/combined-intelligence/main}"
  log "bootstrap: fetching systemd units from $REPO_RAW"
  curl -fsSL "$REPO_RAW/infra/gcp/tpu-vm/systemd/ci-jetstream.service" \
    -o /etc/systemd/system/ci-jetstream.service || \
    log "WARN: could not fetch ci-jetstream.service - install it manually."
  curl -fsSL "$REPO_RAW/infra/gcp/tpu-vm/systemd/ci-preempt-watch.service" \
    -o /etc/systemd/system/ci-preempt-watch.service || true
  curl -fsSL "$REPO_RAW/infra/gcp/tpu-vm/preempt-watch.sh" \
    -o /usr/local/bin/ci-preempt-watch.sh && chmod +x /usr/local/bin/ci-preempt-watch.sh || true
fi

systemctl daemon-reload
systemctl enable --now ci-jetstream.service || log "WARN: ci-jetstream.service failed to start - see journalctl -u ci-jetstream"
systemctl enable --now ci-preempt-watch.service 2>/dev/null || true

# ── 9. Wait until JetStream responds on the configured port ────────────────
log "bootstrap: waiting for JetStream on :$JETSTREAM_PORT"
for i in $(seq 1 36); do
  if curl -sf "http://localhost:$JETSTREAM_PORT/health" >/dev/null 2>&1 || \
     curl -sf "http://localhost:$JETSTREAM_PORT/" >/dev/null 2>&1; then
    log "bootstrap: JetStream is up."
    break
  fi
  sleep 10
done

touch "$SENTINEL"
log "bootstrap: done. Endpoint = http://<external-ip>:$JETSTREAM_PORT"
