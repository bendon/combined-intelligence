# Azure VM env transfer (`20.157.90.21`)

Pre-filled **`backend.env`** and **`infra.env`** for bare-metal deploy.  
These files contain secrets — they are **gitignored**. Do not commit them.

## What still needs VM-only values

Phase 1 wrote passwords to `/root/combined-intelligence-secrets.txt`.  
`backend.env` / `infra.env` use placeholders:

| Placeholder | Filled from secrets file |
|-------------|--------------------------|
| `__MONGO_APP_PASSWORD__` | `MONGO_APP_PASSWORD` |
| `__REDIS_PASSWORD__` | `REDIS_PASSWORD` |
| `__JWT_SECRET__` | `JWT_SECRET` |
| `__FLOWER_PASSWORD__` | `FLOWER_PASSWORD` |

## Transfer (Windows → VM)

From repo root:

```powershell
.\deploy\azure-vm\transfer.ps1
```

Or manually:

```powershell
scp deploy/azure-vm/backend.env deploy/azure-vm/infra.env deploy/azure-vm/apply-vm-secrets.sh bendon@20.157.90.21:~/combined-intelligence/deploy/azure-vm/
scp infra/gcp/service-account.json bendon@20.157.90.21:~/combined-intelligence/infra/gcp/
```

## On the VM

```bash
chmod +x ~/combined-intelligence/deploy/azure-vm/apply-vm-secrets.sh
sudo bash ~/combined-intelligence/deploy/azure-vm/apply-vm-secrets.sh

sudo env PRIMARY_HOST=20.157.90.21 REPO_DIR=/home/bendon/combined-intelligence \
  bash ~/combined-intelligence/infra/scripts/bootstrap-ubuntu-phase2-app.sh
```

## Before go-live

1. **Google OAuth** — add redirect URI: `http://20.157.90.21/api/auth/google/callback`
2. **VAPID** — replace dev placeholders in `backend.env` with real keys
3. **TPU_WORKLOAD_METADATA** — set your real `MODEL_GCS=gs://...` bucket path in `infra.env`
4. **Azure NSG** — allow inbound TCP 80 (and 443 when you add TLS)
