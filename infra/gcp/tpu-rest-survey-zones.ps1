param(
  [string]$Project = "",
  [string[]]$Zones = @(),
  [string]$ZonePattern = "",
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
$headers = @{ "Authorization" = "Bearer $AccessToken" }

# Resolve zone list: explicit -Zones wins; else fetch all locations and (optionally) filter.
if (-not $Zones -or $Zones.Count -eq 0) {
  $locUrl = "https://tpu.googleapis.com/v2/projects/$Project/locations?pageSize=500"
  $locResp = Invoke-RestMethod -Method Get -Uri $locUrl -Headers $headers
  $Zones = @($locResp.locations | ForEach-Object { $_.locationId })
}
if ($ZonePattern) {
  $Zones = @($Zones | Where-Object { $_ -like $ZonePattern })
}
$Zones = $Zones | Sort-Object

Write-Host ("Surveying {0} zones for project {1}..." -f $Zones.Count, $Project) -ForegroundColor Cyan
Write-Host ""

$results = New-Object System.Collections.ArrayList
foreach ($z in $Zones) {
  $url = "https://tpu.googleapis.com/v2/projects/$Project/locations/$z/acceleratorTypes?pageSize=500"
  $types = @()
  try {
    $r = Invoke-RestMethod -Method Get -Uri $url -Headers $headers -TimeoutSec 30
    if ($r.acceleratorTypes) {
      $types = @($r.acceleratorTypes | ForEach-Object {
        $n = $_.name
        if ($n -match '/acceleratorTypes/([^/]+)$') { $Matches[1] } else { $n }
      })
    }
  } catch {
    $types = @("<error: " + $_.Exception.Message + ">")
  }
  $families = @()
  foreach ($t in $types) {
    if ($t -like 'v5litepod-*') { $families += 'v5e' }
    elseif ($t -like 'v5p-*')   { $families += 'v5p' }
    elseif ($t -like 'v6e-*')   { $families += 'v6e' }
    elseif ($t -like 'v4-*')    { $families += 'v4' }
    elseif ($t -like 'v3-*')    { $families += 'v3' }
    elseif ($t -like 'v2-*')    { $families += 'v2' }
  }
  $families = $families | Sort-Object -Unique
  $obj = [PSCustomObject]@{
    Zone     = $z
    Count    = $types.Count
    Families = ($families -join ',')
    Types    = ($types -join ', ')
  }
  [void]$results.Add($obj)
  $summary = if ($types.Count -eq 0) { "(empty)" } else { "$($types.Count) type(s): $($families -join ', ')" }
  Write-Host ("  {0,-30} {1}" -f $z, $summary)
}

Write-Host ""
Write-Host "Zones with available accelerators:" -ForegroundColor Green
$results | Where-Object { $_.Count -gt 0 } | Format-Table -AutoSize Zone, Families, Types
