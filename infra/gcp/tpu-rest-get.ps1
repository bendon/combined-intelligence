param(
  [string]$Project = "",
  [string]$Zone = "",
  [string]$NodeId = "",
  [string]$AccessToken = ""
)

$ErrorActionPreference = "Stop"

$__tpuScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $__tpuScriptDir "tpu-rest-auth.ps1")
Invoke-RequirePwsh -ScriptPath $PSCommandPath -BoundParams $PSBoundParameters

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

Invoke-TpuRestWithErrorBody -Method Get -Uri $url -Headers $headers | ConvertTo-Json -Depth 10
