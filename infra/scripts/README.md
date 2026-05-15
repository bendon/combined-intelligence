# VM bootstrap scripts

## `bootstrap-ubuntu-vm.sh`

One-shot first install (or mostly idempotent re-run) on **Ubuntu 22.04 / 24.04**
(including **Azure** Linux VMs): MongoDB 7, Redis (password + loopback),
Qdrant, nginx, Node.js 20, Python venv, frontend build, systemd units for API
and Celery.

**Run as root** (or `sudo bash`):

```bash
curl -fsSL https://raw.githubusercontent.com/bendon/combined-intelligence/main/infra/scripts/bootstrap-ubuntu-vm.sh | sudo bash -s --
```

Or after cloning:

```bash
cd /path/to/combined-intelligence
sudo env PRIMARY_HOST=20.157.90.21 bash infra/scripts/bootstrap-ubuntu-vm.sh
```

### Environment variables (optional)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PRIMARY_HOST` | _(required)_ | VM public IP or hostname for nginx `server_name` |
| `REPO_DIR` | `/srv/combined-intelligence` | Install path |
| `CLONE_URL` | `https://github.com/bendon/combined-intelligence.git` | Git remote |
| `DEPLOY_USER` | `ci` | Linux user owning the app |
| `WEB_ROOT` | `/var/www/combinedintelligence` | nginx static root |
| `BOOTSTRAP_GCP_PROJECT` | `changeme-gcp-project` | Written to `backend/.env` |
| `BOOTSTRAP_GOOGLE_CLIENT_ID` | placeholder | Real values strongly recommended |
| `BOOTSTRAP_GOOGLE_CLIENT_SECRET` | placeholder | |
| `BOOTSTRAP_S3_ACCESS_KEY` / `BOOTSTRAP_S3_SECRET_KEY` | placeholder | Scaleway (or other S3) |

Secrets for Mongo / Redis / JWT are generated on first run and stored in
`/root/combined-intelligence-secrets.txt` (mode `600`). Re-runs reuse that file.

### After bootstrap

1. Edit `backend/.env` and `infra/.env` with real Google, S3, GCP, and TPU values.
2. Place `infra/gcp/service-account.json` on the server (never commit).
3. `sudo systemctl restart ci-api.service ci-celery-*` and `nginx -t && systemctl reload nginx`.
4. When you have a domain + DNS, switch nginx to `infra/nginx/combinedintelligence.us.conf` and run **certbot**.

See also [`../systemd/bare-metal/README.md`](../systemd/bare-metal/README.md).
