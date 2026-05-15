param(
  [string]$Project = "",
  [string]$Zone = "",
  [string]$NodeId = "",
  [string]$AcceleratorType = "",
  [string]$RuntimeVersion = "",
  [string]$AccessToken = "",
  [switch]$Wait
)

$ErrorActionPreference = "Stop"

$__tpuScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $__tpuScriptDir "tpu-rest-auth.ps1")
Invoke-RequirePwsh -ScriptPath $PSCommandPath -BoundParams $PSBoundParameters

function Wait-Operation {
  param([string]$OperationName, [hashtable]$Headers)
  while ($true) {
    Start-Sleep -Seconds 3
    $opUrl = "https://tpu.googleapis.com/v2/$OperationName"
    $op = Invoke-TpuRestWithErrorBody -Method Get -Uri $opUrl -Headers $Headers
    if ($op.done -eq $true) {
      if ($op.error) {
        throw ("Operation failed: " + ($op.error | ConvertTo-Json -Depth 10))
      }
      return $op
    }
  }
}

$rootDir = Resolve-Path (Join-Path $__tpuScriptDir "../..")
# -Force: infra/.env wins over stale $env:GCP_PROJECT from the shell or IDE
Import-DotEnv (Join-Path $rootDir "infra/.env") -Force
Import-DotEnv (Join-Path $rootDir "backend/.env")

$Project = Resolve-TpuGcpProject -ParamProject $Project
Assert-TpuGcpProject -Project $Project
$Zone = if ($Zone) { $Zone } else { [Environment]::GetEnvironmentVariable("TPU_ZONE", "Process") }
if (-not $Zone) { $Zone = [Environment]::GetEnvironmentVariable("GCP_ZONE", "Process") }
if (-not $Zone) { $Zone = "asia-southeast1-b" }

$NodeId = if ($NodeId) { $NodeId } else { [Environment]::GetEnvironmentVariable("TPU_NAME", "Process") }
if (-not $NodeId) { $NodeId = "ci-tpu-spot" }

$AcceleratorType = if ($AcceleratorType) { $AcceleratorType } else { [Environment]::GetEnvironmentVariable("TPU_ACCELERATOR_TYPE", "Process") }
if (-not $AcceleratorType) { $AcceleratorType = "v6e-1" }

$RuntimeVersion = if ($RuntimeVersion) { $RuntimeVersion } else { [Environment]::GetEnvironmentVariable("TPU_RUNTIME_VERSION", "Process") }
if (-not $RuntimeVersion) { $RuntimeVersion = "v2-alpha-tpuv6e" }
$AccessToken = Get-TpuGoogleAccessToken -AccessToken $AccessToken

$parent = "projects/$Project/locations/$Zone"
$url = "https://tpu.googleapis.com/v2/$parent/nodes?nodeId=$NodeId"

$headers = @{
  "Authorization" = "Bearer $AccessToken"
  "Content-Type"  = "application/json"
}

$body = @{
  description      = "On-demand Spot TPU for report generation"
  acceleratorType  = $AcceleratorType
  runtimeVersion   = $RuntimeVersion
  schedulingConfig = @{
    spot = $true
  }
}

# Outbound internet for apt/curl/pip without Cloud NAT: assign external IPs to workers.
# Values: 1, true, yes (case-insensitive). Prefer VPC Cloud NAT in production instead.
$extRaw = [Environment]::GetEnvironmentVariable("TPU_ENABLE_EXTERNAL_IPS", "Process")
if ($extRaw -and $extRaw.Trim() -match '^(1|true|yes)$') {
  $body.networkConfig = @{ enableExternalIps = $true }
  Write-Host "networkConfig.enableExternalIps=true (public egress/inbound possible - tighten firewall)" -ForegroundColor Yellow
}

Write-Host "Creating TPU node '$NodeId' in $Zone (project: $Project) via REST..."
$op = Invoke-TpuRestWithErrorBody -Method Post -Uri $url -Headers $headers -Body ($body | ConvertTo-Json -Depth 10)
Write-Host ("Operation started: " + $op.name)

if ($Wait) {
  Write-Host "Waiting for operation completion..."
  $done = Wait-Operation -OperationName $op.name -Headers $headers
  Write-Host "Operation done."
  $done | ConvertTo-Json -Depth 10
} else {
  $op | ConvertTo-Json -Depth 10
}
