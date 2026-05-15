param(
  # Hard cap on how long this lease runs. Default: 5 hours.
  [int]$MaxRuntimeMinutes = 300,
  # How often to check the node state.
  [int]$PollIntervalSeconds = 60,
  # If $true, watchdog auto-recreates on PREEMPTED / STOPPED / TERMINATED / FAILED.
  # Set to $false for "one life only" (delete + exit on first preemption).
  [bool]$AutoRecover = $true,

  [string]$Project = "",
  [string]$Zone = "",
  [string]$NodeId = "",
  [string]$AcceleratorType = "",
  [string]$RuntimeVersion = "",
  # Multi-zone failover. Semicolon-separated list of "zone|accelerator|runtime"
  # triples. The watchdog tries the primary first, then rotates through this
  # list on preemption or "no capacity" create failures. Defaults to env var
  # TPU_FAILOVERS (loaded from infra/.env).
  [string]$Failovers = "",
  [string]$AccessToken = ""
)

# Daily Spot-TPU lease with multi-zone failover, auto-recover, and budget cap.
#
# Lifecycle:
#   1. Ensures the node exists & READY on the current candidate (creates if missing).
#   2. Polls state every $PollIntervalSeconds.
#   3. On PREEMPTED / STOPPED / TERMINATED / FAILED (and -AutoRecover):
#        - Deletes the dead resource in the current zone.
#        - Advances to the next candidate (zone/accelerator/runtime).
#        - Creates a fresh node there.
#   4. On exit (deadline, Ctrl+C, exception) ALWAYS deletes the node — and
#      checks every visited zone, so no orphan resources survive.
#
# Usage:
#   .\tpu-rest-watchdog.ps1                          # 5h, auto-recover, primary + failovers from .env
#   .\tpu-rest-watchdog.ps1 -MaxRuntimeMinutes 240   # 4h window
#   .\tpu-rest-watchdog.ps1 -AutoRecover $false      # one shot, exit on preempt
#   .\tpu-rest-watchdog.ps1 -Failovers ""            # disable failover, primary only
#
# Token caveat:
#   Requires PowerShell 7 (pwsh) for service-account token minting via
#   tpu-rest-auth.ps1. Tokens are refreshed each loop so multi-hour runs work.

$ErrorActionPreference = "Stop"

$__tpuScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $__tpuScriptDir "tpu-rest-auth.ps1")
Invoke-RequirePwsh -ScriptPath $PSCommandPath -BoundParams $PSBoundParameters

$rootDir = Resolve-Path (Join-Path $__tpuScriptDir "../..")
Import-DotEnv (Join-Path $rootDir "infra/.env") -Force
Import-DotEnv (Join-Path $rootDir "backend/.env")

$Project = Resolve-TpuGcpProject -ParamProject $Project
Assert-TpuGcpProject -Project $Project

if (-not $Zone)            { $Zone            = [Environment]::GetEnvironmentVariable("TPU_ZONE", "Process") }
if (-not $Zone)            { $Zone            = "asia-southeast1-b" }
if (-not $AcceleratorType) { $AcceleratorType = [Environment]::GetEnvironmentVariable("TPU_ACCELERATOR_TYPE", "Process") }
if (-not $AcceleratorType) { $AcceleratorType = "v6e-1" }
if (-not $RuntimeVersion)  { $RuntimeVersion  = [Environment]::GetEnvironmentVariable("TPU_RUNTIME_VERSION", "Process") }
if (-not $RuntimeVersion)  { $RuntimeVersion  = "v2-alpha-tpuv6e" }
if (-not $NodeId)          { $NodeId          = [Environment]::GetEnvironmentVariable("TPU_NAME", "Process") }
if (-not $NodeId)          { $NodeId          = "ci-tpu-spot" }
if (-not $Failovers)       { $Failovers       = [Environment]::GetEnvironmentVariable("TPU_FAILOVERS", "Process") }

# Build the candidate list: primary first, then anything in $Failovers.
$script:candidates = New-Object System.Collections.ArrayList
[void]$script:candidates.Add([PSCustomObject]@{
  Zone = $Zone; AcceleratorType = $AcceleratorType; RuntimeVersion = $RuntimeVersion
})
if ($Failovers) {
  foreach ($entry in ($Failovers -split ';')) {
    $entry = $entry.Trim()
    if (-not $entry) { continue }
    $parts = $entry -split '\|'
    if ($parts.Count -lt 1 -or -not $parts[0].Trim()) { continue }
    $zn = $parts[0].Trim()
    $at = if ($parts.Count -ge 2 -and $parts[1].Trim()) { $parts[1].Trim() } else { $AcceleratorType }
    $rv = if ($parts.Count -ge 3 -and $parts[2].Trim()) { $parts[2].Trim() } else { $RuntimeVersion }
    [void]$script:candidates.Add([PSCustomObject]@{
      Zone = $zn; AcceleratorType = $at; RuntimeVersion = $rv
    })
  }
}

$script:currentIdx = 0
# Track every zone we've ever created a node in so Cleanup can sweep them all.
$script:visitedZones = New-Object System.Collections.Generic.HashSet[string]
[void]$script:visitedZones.Add($script:candidates[0].Zone)

# Lifecycle states meaning "the node is gone / unusable — recreate".
$RECOVER_STATES = @("PREEMPTED", "STOPPED", "TERMINATED", "FAILED", "REPAIRING")

function Get-Current { return $script:candidates[$script:currentIdx] }

function Get-AuthHeaders {
  if ($AccessToken) { return @{ "Authorization" = "Bearer $AccessToken" } }
  $tok = Get-TpuGoogleAccessTokenFresh
  return @{ "Authorization" = "Bearer $tok" }
}

function Get-NodeUrl {
  param([string]$Zn)
  return "https://tpu.googleapis.com/v2/projects/$Project/locations/$Zn/nodes/$NodeId"
}

function Get-NodeState {
  param([string]$Zn)
  $h = Get-AuthHeaders
  try {
    $node = Invoke-RestMethod -Method Get -Uri (Get-NodeUrl $Zn) -Headers $h -ErrorAction Stop
    return $node.state
  } catch {
    $code = 0
    try { $code = [int]$_.Exception.Response.StatusCode } catch { }
    if ($code -eq 404) { return "MISSING" }
    throw
  }
}

function Delete-NodeInZone {
  param([string]$Zn)
  try {
    $tok = Get-AuthHeaders
    & "$__tpuScriptDir\tpu-rest-delete.ps1" `
        -Project $Project -Zone $Zn -NodeId $NodeId `
        -AccessToken ($tok.Authorization -replace "^Bearer ", "") `
        -Wait | Out-Null
  } catch {
    # 404s here are fine — the node may have never been created in this zone.
    if ($_.Exception.Message -notmatch '404|NOT_FOUND') {
      Write-Host ("  delete in $Zn: " + $_.Exception.Message) -ForegroundColor Yellow
    }
  }
}

function Try-Create-Current {
  $c = Get-Current
  $createArgs = @{
    Project = $Project; Zone = $c.Zone; NodeId = $NodeId
    AcceleratorType = $c.AcceleratorType; RuntimeVersion = $c.RuntimeVersion
    Wait = $true
  }
  try {
    & "$__tpuScriptDir\tpu-rest-create.ps1" @createArgs | Out-Null
    [void]$script:visitedZones.Add($c.Zone)
    return $true
  } catch {
    $msg = $_.Exception.Message
    Write-Host ("Create failed in $($c.Zone) / $($c.AcceleratorType): $msg") -ForegroundColor Yellow
    return $false
  }
}

function Advance-Candidate {
  param([string]$Reason)
  if ($script:candidates.Count -le 1) {
    Write-Host "  no failover candidates configured — staying on primary." -ForegroundColor Yellow
    return $false
  }
  $prev = Get-Current
  $script:currentIdx = ($script:currentIdx + 1) % $script:candidates.Count
  $next = Get-Current
  Write-Host ("  failover: $($prev.Zone)/$($prev.AcceleratorType) -> $($next.Zone)/$($next.AcceleratorType) (reason: $Reason)") -ForegroundColor Magenta
  return $true
}

function Ensure-Up {
  $c = Get-Current
  $state = Get-NodeState $c.Zone
  Write-Host "[$(Get-Date -Format HH:mm:ss)] zone=$($c.Zone) accel=$($c.AcceleratorType) state=$state"

  if ($state -eq "READY") { return }
  if ($state -in @("CREATING", "STARTING", "RESTARTING")) { return }

  if ($state -eq "MISSING") {
    # Try current candidate. On capacity / quota failure, rotate and try the
    # next one. Don't loop forever — at most one full revolution per tick so
    # transient errors don't burn the budget.
    $tries = 0
    $maxTries = [Math]::Max(1, $script:candidates.Count)
    while ($tries -lt $maxTries) {
      if (Try-Create-Current) { return }
      $tries++
      if ($tries -ge $maxTries) { break }
      [void](Advance-Candidate -Reason "create failed")
    }
    Write-Host "  exhausted all candidates this tick — will retry next poll." -ForegroundColor Yellow
    return
  }

  if ($RECOVER_STATES -contains $state) {
    if (-not $AutoRecover) {
      Write-Host "state=$state and AutoRecover=false — exiting watchdog." -ForegroundColor Yellow
      throw "TPU left healthy state (state=$state)."
    }
    Write-Host "  state=$state — recovering." -ForegroundColor Yellow
    # Delete the dead resource in the current zone first.
    Delete-NodeInZone $c.Zone
    # Then rotate to a different zone so we don't immediately re-hit the same
    # capacity-constrained zone that just preempted us.
    [void](Advance-Candidate -Reason "state=$state")
    [void](Try-Create-Current)
    return
  }
}

function Cleanup {
  Write-Host "Watchdog cleanup — sweeping all visited zones to stop billing." -ForegroundColor Cyan
  foreach ($zn in $script:visitedZones) {
    Write-Host "  deleting node in $zn (if present)..."
    Delete-NodeInZone $zn
  }
}

$start = Get-Date
$deadline = $start.AddMinutes($MaxRuntimeMinutes)
Write-Host "Watchdog start: project=$Project node=$NodeId" -ForegroundColor Green
Write-Host "Candidates ($($script:candidates.Count)):" -ForegroundColor Green
for ($i = 0; $i -lt $script:candidates.Count; $i++) {
  $c = $script:candidates[$i]
  $marker = if ($i -eq 0) { '*' } else { ' ' }
  Write-Host ("  {0} [{1}] {2,-20}  {3,-14}  {4}" -f $marker, $i, $c.Zone, $c.AcceleratorType, $c.RuntimeVersion)
}
Write-Host "Budget: $MaxRuntimeMinutes min — deadline $($deadline.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Green

try {
  Ensure-Up
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds $PollIntervalSeconds
    try {
      Ensure-Up
    } catch {
      Write-Host ("Tick error: " + $_.Exception.Message) -ForegroundColor Yellow
    }
  }
  Write-Host "Daily budget reached — initiating cleanup." -ForegroundColor Green
} finally {
  Cleanup
  $elapsed = [int]((Get-Date) - $start).TotalMinutes
  Write-Host "Watchdog done after $elapsed minutes." -ForegroundColor Green
}
