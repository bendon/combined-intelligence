param(
  [string]$Project = "",
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
$AccessToken = Get-TpuGoogleAccessToken -AccessToken $AccessToken

$url = "https://tpu.googleapis.com/v2/projects/$Project/locations?pageSize=500"
$headers = @{ "Authorization" = "Bearer $AccessToken" }

Write-Host "Cloud TPU locations allowed for project: $Project" -ForegroundColor Cyan
$r = Invoke-TpuRestWithErrorBody -Method Get -Uri $url -Headers $headers

if ($r.locations -and $r.locations.Count -gt 0) {
  foreach ($loc in $r.locations) {
    $id = $loc.locationId
    if (-not $id -and $loc.name) {
      if ($loc.name -match '/locations/([^/]+)$') { $id = $Matches[1] }
    }
    Write-Host ("  " + $id + "  " + $loc.displayName)
  }
}
$r | ConvertTo-Json -Depth 6
