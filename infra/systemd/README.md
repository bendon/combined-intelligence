# Systemd units (Linux VM deployment — e.g. Azure Ubuntu)

This folder documents systemd for **Combined Intelligence** on a **bare-metal
Linux VM** (typical: **Azure VM** running Ubuntu). It includes the daily GCP
TPU watchdog and, under `bare-metal/`, API + Celery units that replace Docker
Compose.

## Layout

| Path | Purpose |
|------|---------|
| This `README.md` | TPU watchdog timer + install steps (below) |
| [`bare-metal/`](bare-metal/) | FastAPI + Celery + optional Flower (no Docker) |
| [`ci-tpu-watchdog.service`](ci-tpu-watchdog.service) | Daily Spot TPU lease (GCP) |
| [`ci-tpu-watchdog.timer`](ci-tpu-watchdog.timer) | Schedules the watchdog |

The VM can live in **Azure** while TPUs stay in **GCP** — set the Azure VM’s
public IP in `infra/.env` as `UBUNTU_STATIC_IP` before running
`infra/gcp/firewall-tpu-setup.sh`.

## Prerequisites

1. **Repo deployed** at e.g. `/srv/combined-intelligence/` (paths in the unit files
   are marked `# EDIT ME` — change them if you put it somewhere else).
2. **Backend venv** with `httpx` and `google-auth` installed (already covered
   by `backend/requirements.txt`). Path expected:
   `/srv/combined-intelligence/backend/.venv/`.
3. **Service-account JSON** placed at `infra/gcp/service-account.json`
   (gitignored) — or set `GCP_SERVICE_ACCOUNT_KEY_FILE` in `infra/.env`.
4. **`infra/.env`** populated with `GCP_PROJECT`, `TPU_ZONE`,
   `TPU_ACCELERATOR_TYPE`, `TPU_RUNTIME_VERSION`, optionally `TPU_FAILOVERS`.

## Install

```bash
# 1. Drop both files into systemd's load path.
sudo cp infra/systemd/ci-tpu-watchdog.service /etc/systemd/system/
sudo cp infra/systemd/ci-tpu-watchdog.timer   /etc/systemd/system/

# 2. Reload, enable the timer (which schedules the service), start it now.
sudo systemctl daemon-reload
sudo systemctl enable --now ci-tpu-watchdog.timer

# 3. Verify the timer is armed.
systemctl list-timers ci-tpu-watchdog.timer
```

## Day-to-day operations

```bash
# Run the lease manually right now (won't break the daily schedule):
sudo systemctl start ci-tpu-watchdog.service

# Watch the live log:
journalctl -u ci-tpu-watchdog.service -f

# Cleanly stop a running lease (SIGTERM → watchdog deletes the node):
sudo systemctl stop ci-tpu-watchdog.service

# Skip a day:
sudo systemctl stop ci-tpu-watchdog.timer       # one-off (until next boot)
sudo systemctl disable ci-tpu-watchdog.timer    # permanently
```

## Tweaking

- **Different budget** → edit `--max-minutes 300` in the `.service` ExecStart.
- **Different schedule** → edit `OnCalendar=` in the `.timer`. Examples in the
  unit file comments. Use `systemd-analyze calendar '<expression>'` to dry-run.
- **Two windows per day** → change `OnCalendar` to e.g.
  `*-*-* 09,21:00:00` (09:00 AND 21:00, each capped at 5h).
- **Different user / repo path** → search-and-replace the three `# EDIT ME`
  lines in the `.service`.

## How safe is "Spot with no human watching"?

The watchdog guarantees, in order of precedence:

1. **Budget cap.** After `--max-minutes` real-time minutes, it stops itself,
   deletes the node, and exits 0. systemd's `TimeoutStopSec=300` further
   bounds shutdown time.
2. **Multi-zone failover.** On preemption the watchdog deletes the dead
   resource and creates a fresh one in the next candidate zone from
   `TPU_FAILOVERS`. Up to one full revolution per poll tick to avoid runaway
   spend on capacity-constrained zones.
3. **Graceful systemd-stop.** SIGTERM triggers the same cleanup path as
   reaching the deadline — every visited zone gets a delete sweep before
   the process exits.
4. **Crash safety.** Any uncaught exception still runs the cleanup `finally`
   block. The only way to leak a node is `kill -9` of the watchdog process,
   which systemd never does (it uses SIGTERM then SIGKILL only after
   `TimeoutStopSec` elapses).
