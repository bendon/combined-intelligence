# `infra/gcp/tpu-vm/` — what gets deployed **onto** the Spot TPU VM

Everything in this directory runs **inside the TPU VM**, not on your Ubuntu
backend. Think of it as the equivalent of `vm-bootstrap.sh` (which sets up
Ollama on the Compute VM) but for the TPU.

## How it fits together

```
┌──────────────────────────── Ubuntu server ──────────────────────────────┐
│  FastAPI + Celery + Redis + nginx                                        │
│                                                                          │
│  backend/app/tpu/         ← control plane (creates/deletes TPUs)         │
│  backend/app/synthesis/   ← consumers (sends prompts to TPU JetStream)   │
│  infra/systemd/           ← ci-tpu-watchdog timer (daily 5h lease)       │
└──────────────────────────────────────────────────────────────────────────┘
                                  │ 1. create_node + startup-script metadata
                                  ▼
┌────────────────────────── GCP Cloud TPU (Spot) ──────────────────────────┐
│                                                                          │
│  bootstrap.sh                      ← runs once via google-startup-scripts │
│    ├─ install JAX[tpu], MaxText, JetStream                              │
│    ├─ gsutil cp checkpoint from $MODEL_GCS                              │
│    ├─ write /opt/ci-jetstream/env                                       │
│    └─ enable systemd units below                                        │
│                                                                          │
│  systemd/ci-jetstream.service       ← keeps the inference server alive   │
│  systemd/ci-preempt-watch.service   ← drains JetStream on Spot preempt   │
│  preempt-watch.sh                                                        │
└──────────────────────────────────────────────────────────────────────────┘
                                  ▲ 2. HTTP requests to :9000
                                  │
                          firewall rule `ci-tpu-jetstream`
                          allows source = Ubuntu server external IP
```

## What each file does

| File | Where it ends up | Triggered by |
|------|------------------|--------------|
| `bootstrap.sh` | `/opt/ci-jetstream/bootstrap.sh` (effectively — runs from metadata) | `google-startup-scripts.service` (auto, once per VM boot) |
| `systemd/ci-jetstream.service` | `/etc/systemd/system/ci-jetstream.service` | bootstrap.sh enables it; `multi-user.target` |
| `systemd/ci-preempt-watch.service` | `/etc/systemd/system/ci-preempt-watch.service` | bootstrap.sh enables it |
| `preempt-watch.sh` | `/usr/local/bin/ci-preempt-watch.sh` | the systemd unit above |

The Python control plane (`backend/app/tpu/manager.py`) reads `bootstrap.sh`
off your local filesystem and **embeds it** in the TPU node's metadata when
calling `nodes.create`. You don't manually scp anything — recreating the
node always pushes the current version of this script.

## Configuring the workload

Set these in **`infra/.env`** on the Ubuntu server (NOT inside the TPU VM):

```bash
# Required - tells bootstrap.sh where to fetch model weights from.
TPU_WORKLOAD_METADATA="MODEL_NAME=gemma2-9b;MODEL_GCS=gs://your-bucket/maxtext-gemma2-9b"

# Optional - which Service Account the TPU VM itself impersonates.
# Needs roles/storage.objectViewer on the bucket above.
TPU_WORKLOAD_SERVICE_ACCOUNT=ci-tpu-workload@<project>.iam.gserviceaccount.com

# Optional - JetStream listen port (default 9000). Backend uses this same
# value as $JETSTREAM_PORT to construct the URL it calls.
JETSTREAM_PORT=9000

# Optional - GCE network tag(s) for the firewall rule below. Default: ci-tpu.
TPU_NETWORK_TAGS=ci-tpu
```

## One-time GCP setup (before first `python -m app.tpu create`)

### 1. Get a MaxText-format checkpoint into a GCS bucket

JetStream + MaxText doesn't load Hugging Face files directly — it needs
checkpoints in the MaxText layout. For Gemma 2 the official recipe is:

```bash
# On your laptop or a small Compute VM with Python:
git clone https://github.com/AI-Hypercomputer/maxtext
cd maxtext
pip install -r requirements.txt
# Follow https://github.com/AI-Hypercomputer/maxtext/blob/main/getting_started/Run_Gemma.md
# to convert HF Gemma 2 weights into a MaxText checkpoint, then:
gsutil -m cp -r ./gemma2-9b-checkpoint gs://your-bucket/maxtext-gemma2-9b/
```

For quick experimentation, Google publishes pre-converted checkpoints in
some public GCS buckets — see the MaxText README for current pointers.

### 2. Create the firewall rule that lets your Ubuntu server reach the TPU

```bash
# Replace 1.2.3.4 with the Ubuntu server's external IP.
gcloud compute firewall-rules create ci-tpu-jetstream \
  --project="$GCP_PROJECT" \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:9000 \
  --source-ranges=1.2.3.4/32 \
  --target-tags=ci-tpu \
  --description="Allow Ubuntu backend to call JetStream on Spot TPUs"
```

If your Ubuntu server has a rotating IP, either use a static IP for it
or widen `--source-ranges` to your VPC + a Cloud NAT egress IP.

### 3. Create a workload Service Account (optional but recommended)

```bash
gcloud iam service-accounts create ci-tpu-workload \
  --display-name="CI TPU workload identity" \
  --project="$GCP_PROJECT"

gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
  --member="serviceAccount:ci-tpu-workload@$GCP_PROJECT.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Then set TPU_WORKLOAD_SERVICE_ACCOUNT in infra/.env to that email.
```

If you skip this, the TPU VM uses the project's default Compute SA, which
has broad permissions — fine for first-run, tighten before production.

## Verifying after creation

From the Ubuntu server:

```bash
# 1. Bring the TPU up
python -m app.tpu create

# 2. Wait ~5-15min for bootstrap to install JetStream + load checkpoint
# Watch the journal from your control machine via gcloud:
gcloud compute tpus tpu-vm ssh ci-tpu-spot \
  --zone="$TPU_ZONE" --command="journalctl -u google-startup-scripts -f"

# 3. Once JetStream is up, the IP is reachable. Get it via the CLI:
python -m app.tpu get-endpoint   # (new helper — see CLI docs)

# 4. From the Ubuntu box:
curl -sf "$ENDPOINT/health"
```

## Customising for a different workload

This directory is opinionated for JetStream+MaxText+Gemma. If you want
something else (vLLM, your own training script, etc.):

1. Replace `bootstrap.sh`'s install + checkpoint sections with your own.
2. Replace `ci-jetstream.service` (rename it too) with whatever your server
   binds to `$JETSTREAM_PORT` — the contract with the backend is just
   "HTTP on the configured port, `/health` returns 200 when ready".
3. Update `backend/app/synthesis/tpu_jetstream.py` to speak your wire format.

The control plane (`backend/app/tpu/`) doesn't care what runs on the TPU;
it only cares about getting the VM up, getting its IP, and tearing it down.
