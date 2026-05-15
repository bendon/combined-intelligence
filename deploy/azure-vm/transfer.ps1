# Copy env files + GCP service account to the Azure VM.
# Run from repo root in PowerShell:
#   .\deploy\azure-vm\transfer.ps1
param(
  [string]$VmHost = "20.157.90.21",
  [string]$User = "bendon",
  [string]$RemoteRepo = "/home/bendon/combined-intelligence"
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\deploy\azure-vm\backend.env")) {
  throw "Missing deploy/azure-vm/backend.env - generate it first."
}

ssh "${User}@${VmHost}" "mkdir -p ${RemoteRepo}/deploy/azure-vm ${RemoteRepo}/backend ${RemoteRepo}/infra/gcp"

# Only copy gitignored env files. Scripts (apply-vm-secrets.sh) come from git pull.
scp "$root\deploy\azure-vm\backend.env" "${User}@${VmHost}:${RemoteRepo}/deploy/azure-vm/backend.env"
scp "$root\deploy\azure-vm\infra.env" "${User}@${VmHost}:${RemoteRepo}/deploy/azure-vm/infra.env"

if (Test-Path "$root\infra\gcp\service-account.json") {
  scp "$root\infra\gcp\service-account.json" "${User}@${VmHost}:${RemoteRepo}/infra/gcp/service-account.json"
} else {
  Write-Warning "infra/gcp/service-account.json not found - copy manually."
}

Write-Host @"

Uploaded. On the VM run:

  chmod +x ~/combined-intelligence/deploy/azure-vm/apply-vm-secrets.sh
  sudo bash ~/combined-intelligence/deploy/azure-vm/apply-vm-secrets.sh

Then phase 2:

  sudo env PRIMARY_HOST=$VmHost REPO_DIR=$RemoteRepo \\
    bash $RemoteRepo/infra/scripts/bootstrap-ubuntu-phase2-app.sh

"@
