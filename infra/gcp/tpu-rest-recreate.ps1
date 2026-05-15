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

$rootDir = Resolve-Path (Join-Path $__tpuScriptDir "../..")
Import-DotEnv (Join-Path $rootDir "infra/.env") -Force
Import-DotEnv (Join-Path $rootDir "backend/.env")

$Project = Resolve-TpuGcpProject -ParamProject $Project
Assert-TpuGcpProject -Project $Project
if (-not $Zone)  { $Zone  = [Environment]::GetEnvironmentVariable("TPU_ZONE", "Process") }
if (-not $Zone)  { $Zone  = "asia-southeast1-b" }
if (-not $NodeId) { $NodeId = [Environment]::GetEnvironmentVariable("TPU_NAME", "Process") }
if (-not $NodeId) { $NodeId = "ci-tpu-spot" }

$AccessToken = Get-TpuGoogleAccessToken -AccessToken $AccessToken

$name = "projects/$Project/locations/$Zone/nodes/$NodeId"
$getUrl = "https://tpu.googleapis.com/v2/$name"
$headers = @{ "Authorization" = "Bearer $AccessToken" }

# Step 1 — does the node already exist?
$exists = $false
try {
  Invoke-RestMethod -Method Get -Uri $getUrl -Headers $headers -ErrorAction Stop | Out-Null
  $exists = $true
} catch {
  $code = 0
  try { $code = [int]$_.Exception.Response.StatusCode } catch { }
  if ($code -ne 0 -and $code -ne 404) {
    Write-Host "Lookup returned HTTP $code — continuing as if not present." -ForegroundColor Yellow
  }
}

if ($exists) {
  Write-Host "Existing node '$NodeId' found — deleting before recreate..." -ForegroundColor Yellow
  & "$__tpuScriptDir\tpu-rest-delete.ps1" -Project $Project -Zone $Zone -NodeId $NodeId -AccessToken $AccessToken -Wait | Out-Null
}

Write-Host "Creating fresh node '$NodeId' in $Zone (project: $Project)..." -ForegroundColor Green
$createArgs = @{
  Project     = $Project
  Zone        = $Zone
  NodeId      = $NodeId
  AccessToken = $AccessToken
}
if ($AcceleratorType) { $createArgs.AcceleratorType = $AcceleratorType }
if ($RuntimeVersion)  { $createArgs.RuntimeVersion  = $RuntimeVersion }
if ($Wait)            { $createArgs.Wait = $true }

& "$__tpuScriptDir\tpu-rest-create.ps1" @createArgs
