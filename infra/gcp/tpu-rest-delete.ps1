param(
  [string]$Project = "",
  [string]$Zone = "",
  [string]$NodeId = "",
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
Import-DotEnv (Join-Path $rootDir "infra/.env") -Force
Import-DotEnv (Join-Path $rootDir "backend/.env")

$Project = Resolve-TpuGcpProject -ParamProject $Project
Assert-TpuGcpProject -Project $Project
$Zone = if ($Zone) { $Zone } else { [Environment]::GetEnvironmentVariable("TPU_ZONE", "Process") }
if (-not $Zone) { $Zone = [Environment]::GetEnvironmentVariable("GCP_ZONE", "Process") }
if (-not $Zone) { $Zone = "asia-southeast1-b" }

$NodeId = if ($NodeId) { $NodeId } else { [Environment]::GetEnvironmentVariable("TPU_NAME", "Process") }
if (-not $NodeId) { $NodeId = "ci-tpu-spot" }
$AccessToken = Get-TpuGoogleAccessToken -AccessToken $AccessToken

$name = "projects/$Project/locations/$Zone/nodes/$NodeId"
$url = "https://tpu.googleapis.com/v2/$name"
$headers = @{ "Authorization" = "Bearer $AccessToken" }

Write-Host "Deleting TPU node '$NodeId' in $Zone (project: $Project) via REST..."
$op = Invoke-TpuRestWithErrorBody -Method Delete -Uri $url -Headers $headers
Write-Host ("Operation started: " + $op.name)

if ($Wait) {
  Write-Host "Waiting for operation completion..."
  $done = Wait-Operation -OperationName $op.name -Headers $headers
  Write-Host "Operation done."
  $done | ConvertTo-Json -Depth 10
} else {
  $op | ConvertTo-Json -Depth 10
}
