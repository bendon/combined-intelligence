param(
  [string]$Project = "",
  [string]$Zone = "",
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
$AccessToken = Get-TpuGoogleAccessToken -AccessToken $AccessToken

$parent = "projects/$Project/locations/$Zone"
$url = "https://tpu.googleapis.com/v2/$parent/runtimeVersions?pageSize=500"
$headers = @{ "Authorization" = "Bearer $AccessToken" }

Write-Host "Runtime versions in location: $Zone (project: $Project)" -ForegroundColor Cyan
$r = Invoke-TpuRestWithErrorBody -Method Get -Uri $url -Headers $headers

if ($r.runtimeVersions -and $r.runtimeVersions.Count -gt 0) {
  foreach ($v in $r.runtimeVersions) {
    $id = $v.version
    if (-not $id -and $v.name) {
      if ($v.name -match '/runtimeVersions/([^/]+)$') { $id = $Matches[1] }
    }
    Write-Host ("  " + $id)
  }
}
$r | ConvertTo-Json -Depth 6
