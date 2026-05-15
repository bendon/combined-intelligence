# VM bootstrap scripts (Ubuntu / Azure, bare metal)

Two-phase install so you can **install packages first**, then **configure `.env` files**, then **deploy the app**.

## Why two phases?

| File | Read by |
|------|---------|
| `backend/.env` | FastAPI, Celery, Flower (pydantic `Settings`) |
| `infra/.env` | TPU CLI, `firewall-tpu-setup.sh` |

Terminal `export` / `sudo env BOOTSTRAP_*=...` does **not** configure the running app. Only these files on disk do.

`infra/.env.example` is a template — copy and split into the two real files with **127.0.0.1** hosts (not Docker names `mongo` / `redis` / `qdrant`).

---

## Phase 1 — packages only

Installs: apt deps, Node 20, MongoDB 7, Redis, Qdrant, nginx, user `ci`.

On **Ubuntu 24.04 (noble)** the script uses MongoDB's **jammy** apt suite (official repo has no `noble` release yet). This is normal and works on Azure noble VMs.  
Writes passwords to `/root/combined-intelligence-secrets.txt`.

```bash
cd ~/combined-intelligence    # or /srv/combined-intelligence
git pull
sudo bash infra/scripts/bootstrap-ubuntu-phase1-packages.sh
```

Do **not** `curl` a single script into `/tmp` — `bootstrap-ubuntu-common.sh` must sit beside it in `infra/scripts/`.

**Does not** clone the repo or create `backend/.env`.

---

## Between phases — you configure secrets

1. Clone the repo (or let phase 2 clone it):

   ```bash
   sudo git clone https://github.com/bendon/combined-intelligence.git /srv/combined-intelligence
   sudo chown -R ci:ci /srv/combined-intelligence
   ```

2. Create **`/srv/combined-intelligence/backend/.env`** (required).  
   Use passwords from `/root/combined-intelligence-secrets.txt`:

   ```env
   MONGO_URL=mongodb://ci_app:<MONGO_APP_PASSWORD>@127.0.0.1:27017/combined_intelligence?authSource=combined_intelligence
   REDIS_URL=redis://:<REDIS_PASSWORD>@127.0.0.1:6379/0
   QDRANT_URL=http://127.0.0.1:6333
   JWT_SECRET=<from secrets file>
   ```

   Add Google OAuth, S3, VAPID, `BASE_URL`, `ALLOWED_ORIGINS`, etc. from `infra/.env.example`.

3. Create **`/srv/combined-intelligence/infra/.env`** for TPU + GCP (`UBUNTU_STATIC_IP`, `TPU_ZONE`, …).

4. Optional: `infra/gcp/service-account.json`

---

## Phase 2 — deploy app

Requires **`backend/.env`** to exist. Will not overwrite it.

```bash
sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-phase2-app.sh
```

Installs: `pip`, `npm run build`, nginx site, systemd (`ci-api`, Celery workers).

---

## One-shot wrapper (optional)

Runs phase 1 always; phase 2 only if `backend/.env` already exists:

```bash
sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-vm.sh
```

---

## Variables

| Variable | Default | Used in |
|----------|---------|---------|
| `REPO_DIR` | `/srv/combined-intelligence` | both phases |
| `DEPLOY_USER` | `ci` | both |
| `PRIMARY_HOST` | _(required phase 2)_ | nginx `server_name` |
| `WEB_ROOT` | `/var/www/combinedintelligence` | phase 2 |
| `SECRETS_FILE` | `/root/combined-intelligence-secrets.txt` | phase 1 |

No `BOOTSTRAP_*` variables — configure the app via `.env` files.

---

## After deploy

```bash
journalctl -u ci-api.service -f
systemctl status ci-celery-synthesis
curl -s http://127.0.0.1:8000/docs
```

See [`../systemd/bare-metal/README.md`](../systemd/bare-metal/README.md).
