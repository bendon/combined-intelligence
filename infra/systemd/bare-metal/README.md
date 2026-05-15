# Bare-metal systemd (Azure VM)

These units run the **FastAPI API**, **Celery workers**, **Celery beat**, and
optionally **Flower** on a single Linux VM **without Docker**. They match
what `infra/docker-compose.yml` used to express, but as native systemd
services.

Typical layout: **Azure Linux VM** (Ubuntu LTS is a common choice) with a
**Standard** public IP so the address stays stable for DNS, TLS, and for
GCP’s TPU firewall rule (`UBUNTU_STATIC_IP` in `infra/.env`).

## Repo layout on the VM

Suggested clone path (edit all `.service` files if you use something else):

```text
/srv/combined-intelligence/
  backend/.venv/          # python -m venv .venv && pip install -r requirements.txt
  backend/.env          # secrets + MONGO_URL, REDIS_URL, QDRANT_URL, …
  frontend/dist/        # npm ci && npm run build → copy or rsync to nginx root
  infra/.env            # TPU + GCP_PROJECT + UBUNTU_STATIC_IP (this VM’s public IP)
  infra/gcp/service-account.json
```

## Automated first install

From a fresh Ubuntu 22.04/24.04 VM (run as **root**):

```bash
git clone https://github.com/bendon/combined-intelligence.git /tmp/ci-bootstrap
sudo env PRIMARY_HOST=20.157.90.21 \
  BOOTSTRAP_GCP_PROJECT=edgetech-bdf \
  bash /tmp/ci-bootstrap/infra/scripts/bootstrap-ubuntu-vm.sh
```

Or after the repo is already on the server:

```bash
sudo env PRIMARY_HOST="$(curl -fsS ifconfig.me)" bash infra/scripts/bootstrap-ubuntu-vm.sh
```

Full options: [`../../scripts/README.md`](../../scripts/README.md).

## One-time VM prep (Azure)

1. **OS:** Ubuntu 22.04/24.04 LTS (or another distro — adjust package names).
2. **Public IP:** Associate a **Standard** SKU public IP with the NIC so it
   does not change on stop/start (Basic IPs can be reassigned). Put that IPv4
   in `infra/.env` as `UBUNTU_STATIC_IP` for `infra/gcp/firewall-tpu-setup.sh`.
3. **NSG (Network Security Group):** Allow inbound **22** (SSH, restrict to
   your office IP), **80** and **443** (HTTP/HTTPS to nginx). Do **not** expose
   **8000** publicly — the API binds to `127.0.0.1:8000` and nginx proxies
   `/api/`. Optional: **5555** only if you tunnel Flower; prefer nginx + auth
   as in `infra/nginx/combinedintelligence.us.conf`.
4. **Runtime deps on the VM:** `redis-server` (or Azure Cache for Redis with
   `REDIS_URL` pointing there), **MongoDB** (local `mongod` or **Azure Cosmos DB
   for MongoDB** / Atlas — set `MONGO_URL` in `backend/.env`), **Qdrant** if you
   use vectors (local binary/container or a separate host — set `QDRANT_URL`).
5. **Deploy user:** Create a non-root user (e.g. `ci`) that owns `/srv/combined-intelligence`
   and matches `User=` / `Group=` in the unit files.

## Install units

```bash
cd /srv/combined-intelligence
sudo cp infra/systemd/bare-metal/ci-api.service              /etc/systemd/system/
sudo cp infra/systemd/bare-metal/ci-celery-synthesis.service /etc/systemd/system/
sudo cp infra/systemd/bare-metal/ci-celery-push.service    /etc/systemd/system/
sudo cp infra/systemd/bare-metal/ci-celery-beat.service      /etc/systemd/system/
# Optional:
# sudo cp infra/systemd/bare-metal/ci-flower.service /etc/systemd/system/
# sudo mkdir -p /etc/combined-intelligence
# sudo cp infra/systemd/bare-metal/flower.env.example /etc/combined-intelligence/flower.env
# sudo chmod 600 /etc/combined-intelligence/flower.env   # edit password

# Edit paths and User= in each file if not using /srv/combined-intelligence + ci
sudo systemctl daemon-reload
sudo systemctl enable --now ci-api.service ci-celery-synthesis.service \
  ci-celery-push.service ci-celery-beat.service
```

Uncomment `After=redis-server.service` (and `mongod` if local) in the unit
files if those services run on the same VM.

## GitHub → VM workflow

1. **Develop / verify** locally (tests, `uvicorn`, `celery worker` smoke runs).
2. **Commit** (no secrets — `backend/.env`, `infra/.env`, `service-account.json`
   stay gitignored).
3. **Push** to GitHub.
4. **On the Azure VM:** `git pull`, rebuild frontend if needed, restart services:

```bash
cd /srv/combined-intelligence
git pull
source backend/.venv/bin/activate && pip install -r backend/requirements.txt
cd frontend && npm ci && npm run build
sudo rsync -a --delete dist/ /var/www/combinedintelligence.us/   # or your nginx root
sudo systemctl restart ci-api.service ci-celery-synthesis.service \
  ci-celery-push.service ci-celery-beat.service
```

5. **TPU watchdog** (still GCP): copy `infra/systemd/ci-tpu-watchdog.*` as in
   [`../README.md`](../README.md).

## Logs

```bash
journalctl -u ci-api.service -f
journalctl -u ci-celery-synthesis.service -f
```

## GCP TPU firewall (unchanged)

The app host being **Azure** does not change GCP: Spot TPUs still live in
Google’s VPC. `UBUNTU_STATIC_IP` must be this VM’s **public** IPv4 so
`firewall-tpu-setup.sh` allows only that address to reach JetStream on the TPU.
