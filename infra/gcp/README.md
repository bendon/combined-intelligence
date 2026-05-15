# GCP TPU Spot Workflow

This folder includes everything needed for managing **Cloud TPU Spot VMs**
and for the workload that runs inside them.

> **Production (Ubuntu) deployments: use the Python CLI** at `backend/app/tpu/` —
> `python -m app.tpu watchdog` — and the systemd unit files in
> [`../systemd/`](../systemd/README.md). The PowerShell scripts below are kept
> as a Windows-dev convenience; both code paths share the same `infra/.env`
> config (`TPU_ZONE`, `TPU_FAILOVERS`, `GCP_SERVICE_ACCOUNT_KEY_FILE`, …) so
> you can hop between them.

## What lives where

Two distinct concerns share this folder. Confusion between them was the
question that led to this README rewrite:

| Subfolder / file                 | Runs **where**?                  | Purpose |
|----------------------------------|----------------------------------|---------|
| `tpu-rest-*.ps1`, `tpu-spot-*.sh` | Ubuntu / Windows control machine | **Control plane:** create/delete/list TPUs by calling the Cloud TPU API. (Python equivalents at `backend/app/tpu/`.) |
| `service-account.json`           | Ubuntu / Windows control machine | Long-lived credential the control plane uses to call GCP. |
| `firewall-tpu-setup.sh` / `firewall-tpu-verify.sh` | Ubuntu / Windows control machine | Idempotent VPC firewall management for the JetStream port. |
| `vm-bootstrap.sh`                | Ollama Compute VM (on GCP)       | Sets up Ollama on a regular Compute VM (existing inference path). |
| **`tpu-vm/`**                    | **Spot TPU VM (on GCP)**         | **Workload:** what gets installed and run on the TPU itself (JetStream + MaxText). See `tpu-vm/README.md`. |
| `tpu-preemption-watch.sh`        | Spot TPU VM                      | Legacy preempt-watcher (newer copy lives in `tpu-vm/preempt-watch.sh`). |

**How the workload reaches the TPU:** when the control plane calls
`create_node`, it reads `tpu-vm/bootstrap.sh` off the local filesystem and
embeds its contents in the node's `metadata.startup-script`. The TPU runtime
image executes that key on first boot, which installs JetStream, downloads
the model checkpoint from GCS, and brings up `ci-jetstream.service`. The
backend (`backend/app/synthesis/llm_backend.py`) then talks HTTP to that
service over the firewall rule documented in `tpu-vm/README.md`.

**How the backend consumes the TPU:** set `SYNTHESIS_BACKEND=tpu_jetstream`
in `backend/.env`. Celery tasks now route through `select_backend()` which,
for the TPU path, calls `app.synthesis.tpu_jetstream.ensure_tpu_up()` (bring
the node up on demand), `jetstream_generate()` (HTTP POST `/generate`), and
`release_tpu_if_we_started_it()` in `finally`. The flow mirrors the existing
Ollama-VM pattern exactly — same `ensure_up / generate / release` shape.

## First-time firewall setup (one command)

The Ubuntu backend reaches JetStream on `tcp:<JETSTREAM_PORT>` of the TPU's
public IP. GCP firewalls are default-deny ingress, so you need one rule.
Both the rule and the source-IP allowlist are driven from `infra/.env`:

```bash
# In infra/.env, set UBUNTU_STATIC_IP to your **Azure VM’s** public IPv4
# (Standard SKU recommended so it does not change on stop/start).
UBUNTU_STATIC_IP=20.157.90.21
TPU_NETWORK_TAGS=ci-tpu
JETSTREAM_PORT=9000
# Optional: open SSH from your laptop too
TPU_SSH_ALLOWED_IPS=

# Then, once:
cd infra/gcp
./firewall-tpu-setup.sh            # idempotent  - safe to re-run
./firewall-tpu-verify.sh           # exits 0 if everything is in shape
```

The setup script is idempotent: re-running it after rotating
`UBUNTU_STATIC_IP` just updates `--source-ranges`, no manual delete needed.
The verify script also checks that the live TPU (if up) carries the
`ci-tpu` tag the rule targets, so you catch tag-drift before it bites.

Any other source IP that hits the TPU's external IP on `:9000` gets dropped
silently at the GCP edge, indistinguishable from a closed port to a scanner.

## Python CLI (Ubuntu / Linux / macOS — canonical)

```bash
# All commands read defaults from infra/.env. Override with --zone, --node-id, etc.
python -m app.tpu get                                          # show state
python -m app.tpu describe                                     # resolved config (workload, candidates, …)
python -m app.tpu create                                       # Spot create on primary + workload bootstrap
python -m app.tpu get-endpoint                                 # URL the backend will hit (or empty if down)
python -m app.tpu delete                                       # delete (idempotent)
python -m app.tpu recreate                                     # delete + create
python -m app.tpu watchdog --max-minutes 300                   # 5h lease, auto-failover, cleanup on exit
python -m app.tpu locations                                    # zones enabled for project
python -m app.tpu list-accelerators --for-zone us-central1-a   # what's there?
python -m app.tpu list-runtimes     --for-zone us-central1-a
python -m app.tpu survey --zone-pattern "asia-*"               # one-shot region scan
```

For the daily 5h Spot lease as a managed service, see [`../systemd/README.md`](../systemd/README.md).

## PowerShell scripts (Windows dev convenience)

When invoked from `powershell.exe` 5.1, each script auto-relaunches under
`pwsh` (PowerShell 7) so service-account JWT signing works. From a Linux box
you can either install `pwsh` and run them directly, or just use the Python
CLI above.

### Files

- `tpu-spot-create.sh`: create a TPU VM with Spot capacity.
- `tpu-spot-delete.sh`: delete the TPU VM.
- `tpu-rest-auth.ps1`: resolves OAuth token (env var or GCE metadata); dot-sourced by the REST scripts.
- `tpu-rest-create.ps1`: create TPU node through Cloud TPU REST API (`v2`).
- `tpu-rest-get.ps1`: get TPU node state through REST.
- `tpu-rest-delete.ps1`: delete TPU node through REST.
- `tpu-rest-recreate.ps1`: delete (if exists) + create — preferred recovery after Spot preemption.
- `tpu-rest-watchdog.ps1`: daily lease — keeps the node up for `-MaxRuntimeMinutes` (default 300), auto-recreates on preemption, and **always deletes on exit** so spend stays capped.
- `tpu-rest-list-locations.ps1`: list Cloud TPU **locations** your project is allowed to use (helps pick `TPU_ZONE` when org policy blocks a region).
- `tpu-rest-list-accelerator-types.ps1`: list **accelerator types** available in a chosen location.
- `tpu-rest-list-runtime-versions.ps1`: list **`TPU_RUNTIME_VERSION`** strings valid in that location (pair with an accelerator type from the previous script).
- `tpu-spot-install-preemption-handler.sh`: installs a systemd preemption watcher on the TPU VM.
- `tpu-preemption-watch.sh`: watcher script copied to the TPU VM.
- `vm-bootstrap.sh`: existing Ollama VM bootstrap script.

## Required setup

1. Install and authenticate `gcloud`.
2. Configure **`infra/.env`** and/or **`backend/.env`**. The REST scripts apply **`infra/.env` with `-Force`** (so it overrides any stale **`$env:GCP_PROJECT`** already set in your PowerShell session), then merge **`backend/.env`** for keys not yet set. Put TPU target project in **`infra/.env`** as **`GCP_PROJECT`** (or **`TPU_PROJECT`** if you use a different app project in `backend/.env`).
3. Fill at least:
   - `GCP_PROJECT` (or `TPU_PROJECT`)
   - `TPU_ZONE`
   - `TPU_ACCELERATOR_TYPE`
   - `TPU_RUNTIME_VERSION`
   - `TPU_NAME`
   - `GOOGLE_OAUTH_ACCESS_TOKEN` (optional on GCE: scripts use the [metadata token endpoint](https://cloud.google.com/compute/docs/access/authenticate-workloads#applications) automatically)
   - `PREEMPT_CHECKPOINT_HOOK` (optional, but recommended)

## Create TPU via REST API (no gcloud required)

PowerShell scripts call `https://tpu.googleapis.com/v2/...` directly.

**Authentication**

1. **On your laptop**: install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install), run `gcloud auth login`, then re-run the script — it will use `gcloud auth print-access-token`.  
   Alternatively set `GOOGLE_OAUTH_ACCESS_TOKEN` in `infra/.env` or pass `-AccessToken`.
2. **On a Compute Engine VM** (recommended for controllers): leave the env unset. The scripts call the metadata server  
   `http://metadata.google.internal/.../service-accounts/default/token?scopes=...`  
   and use the VM’s attached service account (needs IAM for TPU + `cloud-platform` scope or equivalent).

Equivalent token fetch on Linux (for your own `curl` scripts):

```bash
curl -sS "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/cloud-platform" \
  -H "Metadata-Flavor: Google" | jq -r '.access_token'
```

```powershell
cd infra/gcp
.\tpu-rest-create.ps1 -Wait
```

Check state:

```powershell
.\tpu-rest-get.ps1
```

Delete:

```powershell
.\tpu-rest-delete.ps1 -Wait
```

List TPU locations (if a zone does not appear, your org cannot use that region — pick one from this list, e.g. **`asia-southeast1-b`**):

```powershell
.\tpu-rest-list-locations.ps1
```

Then list accelerator types and runtime versions for that zone and set **`TPU_ACCELERATOR_TYPE`** / **`TPU_RUNTIME_VERSION`** in `infra/.env` to a supported pair:

```powershell
.\tpu-rest-list-accelerator-types.ps1 -Zone asia-southeast1-b
.\tpu-rest-list-runtime-versions.ps1   -Zone asia-southeast1-b
```

To survey every zone in a region pattern in one call (uses the same SA auth):

```powershell
.\tpu-rest-survey-zones.ps1 -ZonePattern "asia-*"
.\tpu-rest-survey-zones.ps1 -ZonePattern "africa-*"
```

**Default in this repo:** **`asia-southeast1-b`** (Singapore) with **`v6e-1`** (single-chip Trillium) and **`v2-alpha-tpuv6e`** (PyTorch/JAX runtime per [TPU software versions](https://cloud.google.com/tpu/docs/runtimes)). Chosen for the best Spot v6e rate of the Asia zones allocated to this project; this zone also exposes **v5e (`v5litepod-*`)** in case you ever want to swap the chip without changing the zone. If you want even tighter latency to East African users, **`asia-south1-b`** (Mumbai) has v6e (no v5e). For broadest hardware menu, **`asia-east1-c`** (Taiwan) exposes v2 + v5e + v6e in one zone.

**Future Johannesburg switch:** once Google's TPU capacity team allocates v5e to `africa-south1-*` for this project (verify with `.\tpu-rest-list-accelerator-types.ps1 -Zone africa-south1-a` — should return a non-empty list), flip the defaults to **`africa-south1-a`** + **`v5litepod-1`** + **`v2-alpha-tpuv5-lite`** in both `infra/.env` and the script default fallbacks.

## Create a Spot TPU VM

```bash
cd infra/gcp
./tpu-spot-create.sh
```

## SSH into TPU VM

```bash
gcloud compute tpus tpu-vm ssh "$TPU_NAME" --zone="$TPU_ZONE"
```

## Install preemption handling (recommended)

Spot capacity can be reclaimed at any time. Install the watcher so your TPU VM
can run checkpoint logic as soon as preemption is signaled.

```bash
cd infra/gcp
PREEMPT_CHECKPOINT_HOOK='python /srv/train.py --checkpoint-only' ./tpu-spot-install-preemption-handler.sh
```

## Delete TPU VM

```bash
cd infra/gcp
./tpu-spot-delete.sh
```

## Internet access (apt, `curl`, pip, Ollama install)

You do **not** strictly need a **public IP** for outbound internet: attach **Cloud NAT** to the VPC/subnet so **private** TPU VMs can reach the public internet. That is the usual production pattern.

- **`tpu-rest-create.ps1`** (Cloud TPU REST API) creates nodes **without** external IPs unless you set **`TPU_ENABLE_EXTERNAL_IPS=true`** in `infra/.env`. With `false`, use **Cloud NAT** or recreate the node with external IPs enabled.
- **`tpu-spot-create.sh`** (`gcloud`) follows **gcloud defaults** (typically **with** external IPs unless you pass internal-only). Set **`TPU_INTERNAL_IPS_ONLY=true`** to force **`--internal-ips`**; then you **must** have **NAT** (or other egress) for installs.

Changing IP mode usually means **delete + create** a new node (or use org-standard NAT and keep private nodes).

## Daily 5h Spot lease (auto-recover + budget cap)

Spot TPU capacity can disappear on ~30s notice. The **Start** button in the
Cloud console only succeeds when capacity is available again in that zone; the
reliable recovery is **delete + create**.

Use `tpu-rest-watchdog.ps1` to enforce a daily window (default 5h) with
auto-recreation on preemption, **multi-zone failover**, and guaranteed cleanup
on exit:

```powershell
cd infra/gcp
.\tpu-rest-watchdog.ps1                          # 5h, auto-recover, failover from TPU_FAILOVERS
.\tpu-rest-watchdog.ps1 -MaxRuntimeMinutes 240   # 4h window
.\tpu-rest-watchdog.ps1 -AutoRecover $false      # one shot — exit on preempt
.\tpu-rest-watchdog.ps1 -Failovers ""            # primary zone only, no rotation
```

### Multi-zone failover

Configure alternate zones with `TPU_FAILOVERS` in `infra/.env` (semicolon-separated `zone|accelerator|runtime` triples). On Spot preemption or "no capacity" create failure, the watchdog rotates to the next candidate, recreates there, and continues. On exit it sweeps every visited zone to make sure no node survives.

```env
# infra/.env — primary then failovers
TPU_ZONE=asia-southeast1-b
TPU_ACCELERATOR_TYPE=v6e-1
TPU_RUNTIME_VERSION=v2-alpha-tpuv6e
TPU_FAILOVERS=us-central1-a|v5litepod-1|v2-alpha-tpuv5-lite;us-east5-c|v6e-1|v2-alpha-tpuv6e;asia-south1-b|v6e-1|v2-alpha-tpuv6e
```

Use `.\tpu-rest-survey-zones.ps1 -ZonePattern "<region>-*"` to discover what's actually exposed to your project in each zone before adding it to the failover list.

Schedule it daily on Windows so you never pay for more than 5h/day:

```powershell
$exe     = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$script  = "D:\Projects\EdgeTech\combined-intelligence\infra\gcp\tpu-rest-watchdog.ps1"
$action  = New-ScheduledTaskAction -Execute $exe `
           -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -MaxRuntimeMinutes 300"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "CI TPU Daily Lease" `
  -Action $action -Trigger $trigger -RunLevel Highest
```

**Long-lived auth — recommended:** use a service-account key instead of the
1-hour `GOOGLE_OAUTH_ACCESS_TOKEN`. The key file lives on disk until you rotate
it, and the scripts exchange it for a fresh access token on every call.

1. **GCP Console → IAM → Service Accounts → Create** (e.g. `ci-tpu-controller`).
2. **Grant role** *TPU Admin* (`roles/tpu.admin`) — or a custom role with
   `tpu.nodes.create`, `tpu.nodes.delete`, `tpu.nodes.get`, `tpu.nodes.list`,
   `tpu.operations.get`.
3. **Keys tab → Add Key → Create new key → JSON** → save the file as
   `infra/gcp/service-account.json` (this path is in `.gitignore`).  
   Or place it anywhere and set `GCP_SERVICE_ACCOUNT_KEY_FILE` in `infra/.env`.
4. The scripts pick it up automatically and prefer it over
   `GOOGLE_OAUTH_ACCESS_TOKEN`. No manual token rotation any more.

Requires **PowerShell 7+** (uses `RSA.ImportPkcs8PrivateKey`, .NET 5+). If
you're stuck on Windows PowerShell 5.1, install PowerShell 7 from
<https://aka.ms/powershell> — both can coexist.

Fallback chain (in order): `-AccessToken` → service-account JSON →
GCE/TPU metadata server → `gcloud auth print-access-token` →
`GOOGLE_OAUTH_ACCESS_TOKEN` env var (last resort, expires hourly).

If you don't need the auto-recover loop and just want a one-button recovery
after preemption:

```powershell
.\tpu-rest-recreate.ps1 -Wait
```

## Notes

- Spot capacity is preemptible by design; treat TPU jobs as checkpointed/resumable.
- Spot TPU preemption is expected behavior; design your training loop for restart-from-checkpoint.
- Supported `TPU_ACCELERATOR_TYPE`/`TPU_RUNTIME_VERSION` values vary by zone.
- To list valid TPU types in a zone:

```bash
gcloud compute tpus accelerator-types list --zone="$TPU_ZONE"
```

- The Compute Engine Spot VM semantics you quoted are the right mental model (cheap but reclaimable),
  but provisioning TPU VMs uses the Cloud TPU surface (`gcloud compute tpus tpu-vm ...`).
- For direct API integration in backend services, use `POST /v2/projects/{project}/locations/{zone}/nodes?nodeId=...`
  with `schedulingConfig.spot=true`, then poll the returned long-running operation.

### Troubleshooting `403 Forbidden`

- Ensure **`GCP_PROJECT` or `TPU_PROJECT`** in `infra/.env` / `backend/.env` resolves to your real project ID.  
  A leftover **`TPU_PROJECT=your-gcp-project-id`** (including in the same PowerShell session: `$env:TPU_PROJECT`) no longer wins over a valid **`GCP_PROJECT`** — the scripts skip that placeholder.
- **`CONSUMER_INVALID`** or *Permission denied on resource project …* naming the **wrong** project: your shell may have had **`$env:GCP_PROJECT`** set (e.g. `combined-intelligence-dev` from the app) before the script ran. **`infra/.env` is loaded with overwrite** so **`GCP_PROJECT=edgetech-bdf`** there applies; you can also pass **`-Project edgetech-bdf`**.
- **`LOCATION_POLICY_VIOLATED`** or **`LOCATION_NOT_FOUND`**: the zone is not allowed or has no TPU capacity for your project. Run **`tpu-rest-list-locations.ps1`**, pick a listed zone, then **`tpu-rest-list-accelerator-types.ps1 -Zone …`** — accelerator names differ by region (e.g. **`v5litepod-*`** for v5e vs **`v6e-*`** for Trillium). You may need a Cloud admin to allowlist additional regions.
- The REST scripts print the **JSON error body** from `tpu.googleapis.com` when a call fails (IAM, API disabled, quota, etc.).
- Your account needs roles that allow creating TPU nodes (e.g. TPU Admin or appropriate custom role) and the **Cloud TPU API** must be enabled for the project.
