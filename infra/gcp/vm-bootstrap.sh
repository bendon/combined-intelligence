#!/usr/bin/env bash
# GCP startup script for the ci-ollama-inference instance.
# Paste this as the VM's "Startup script" in Compute Engine > Edit VM.
set -euo pipefail

# ── Install Ollama if not already present ─────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

# ── Configure Ollama to listen on all interfaces ──────────────────────────────
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
# Cache models on the persistent disk mounted at /mnt/disks/models
Environment="OLLAMA_MODELS=/mnt/disks/models"
EOF

systemctl daemon-reload
systemctl enable ollama
systemctl restart ollama

# ── Wait for Ollama to start ──────────────────────────────────────────────────
for i in $(seq 1 12); do
  if curl -sf http://localhost:11434/api/tags &>/dev/null; then
    break
  fi
  sleep 5
done

# ── Pull required model (skipped if already cached on the persistent disk) ────
ollama pull deepseek-r1:8b
ollama pull nomic-embed-text   # used for embeddings

echo "Ollama ready: $(ollama list)"
