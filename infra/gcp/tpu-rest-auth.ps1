# Shared auth for tpu-rest-*.ps1
#
# Token sources in order of preference (long-lived first, so unattended runs work):
#   1. -AccessToken argument                                  (caller-provided)
#   2. Service-account JSON key (PKCS#8) — long-lived         ← recommended
#      Path is taken from $env:GCP_SERVICE_ACCOUNT_KEY_FILE or
#      infra/gcp/service-account.json (already in .gitignore).
#   3. GCE/TPU VM metadata server                             (only on GCP VMs)
#   4. gcloud auth print-access-token                         (laptop, with SDK)
#   5. GOOGLE_OAUTH_ACCESS_TOKEN env var                       (cached, ≤1h)

function Import-DotEnv {
  param([string]$Path, [switch]$Force)
  if (!(Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { return }
    $key = $parts[0].Trim()
    if (-not $Force) {
      $existing = [Environment]::GetEnvironmentVariable($key, "Process")
      if ($existing) { return }
    }
    [Environment]::SetEnvironmentVariable($key, $parts[1].Trim(), "Process")
  }
}

# Re-exec the calling script under PowerShell 7 (pwsh) if we were launched from
# Windows PowerShell 5.1 (Desktop edition). Windows PS 5.1 / .NET Framework 4.x
# lacks RSA.ImportPkcs8PrivateKey, which we need to sign service-account JWTs.
# Without this, the scripts would silently fall back to an expired cached OAuth
# token and produce confusing 401 errors.
#
# Callers (entry-point scripts) should invoke this at the very top of their body,
# right after dot-sourcing this auth helper:
#
#   . (Join-Path $__tpuScriptDir "tpu-rest-auth.ps1")
#   Invoke-RequirePwsh -ScriptPath $PSCommandPath -BoundParams $PSBoundParameters
function Invoke-RequirePwsh {
  param(
    [Parameter(Mandatory)] [string]$ScriptPath,
    [Parameter(Mandatory)] [hashtable]$BoundParams
  )
  if ($PSVersionTable.PSEdition -ne 'Desktop') { return }  # already pwsh
  $pwsh = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
  if (-not $pwsh) {
    Write-Host ""
    Write-Host "These TPU scripts require PowerShell 7 (pwsh) for service-account" -ForegroundColor Red
    Write-Host "JWT signing (Windows PowerShell 5.1 lacks RSA.ImportPkcs8PrivateKey)." -ForegroundColor Red
    Write-Host "Install with:" -ForegroundColor Yellow
    Write-Host "  winget install --id Microsoft.PowerShell" -ForegroundColor Yellow
    Write-Host ""
    exit 1
  }
  Write-Host "Detected Windows PowerShell 5.1 - re-launching '$([IO.Path]::GetFileName($ScriptPath))' under pwsh (PS7)..." -ForegroundColor Cyan
  $forwardArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $ScriptPath)
  foreach ($k in $BoundParams.Keys) {
    $v = $BoundParams[$k]
    if ($v -is [switch]) {
      if ($v.IsPresent) { $forwardArgs += "-$k" }
    } elseif ($v -is [array]) {
      $forwardArgs += "-$k"
      foreach ($e in $v) { $forwardArgs += [string]$e }
    } elseif ($null -ne $v) {
      $forwardArgs += "-$k"
      $forwardArgs += [string]$v
    }
  }
  & $pwsh @forwardArgs
  exit $LASTEXITCODE
}

function ConvertTo-TpuBase64Url {
  param([byte[]]$Bytes)
  return ([Convert]::ToBase64String($Bytes)).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Resolve-TpuServiceAccountKeyFile {
  param([string]$KeyFile = "")
  if ($KeyFile) { return $KeyFile }
  $envFile = [Environment]::GetEnvironmentVariable("GCP_SERVICE_ACCOUNT_KEY_FILE", "Process")
  if ($envFile) { return $envFile }
  # Conventional location next to the scripts (path is git-ignored already).
  $scriptDir = Split-Path -Parent $PSCommandPath
  if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
  $candidate = Join-Path $scriptDir "service-account.json"
  if (Test-Path $candidate) { return $candidate }
  return $null
}

function Get-TpuGoogleAccessTokenFromServiceAccount {
  <#
    .SYNOPSIS
      Mint a fresh access token from a long-lived service-account JSON key.

    .DESCRIPTION
      Reads a Google service-account key file (the JSON downloaded from IAM →
      Service Accounts → Keys), builds an RFC 7523 JWT, signs it with RS256
      using the SA's PKCS#8 private key, and exchanges it at
      https://oauth2.googleapis.com/token for a 1h access token.

      The JSON key itself does not expire (until you rotate it in the console),
      so this function gives you de-facto long-lived auth: every call yields a
      fresh access token.

      Requires PowerShell 7+ (relies on RSA.ImportPkcs8PrivateKey, .NET 5+).
  #>
  param([string]$KeyFile = "")

  $KeyFile = Resolve-TpuServiceAccountKeyFile -KeyFile $KeyFile
  if (-not $KeyFile) { throw "No service-account key file configured." }
  if (-not (Test-Path $KeyFile)) { throw "Service-account key file not found: $KeyFile" }

  $sa = Get-Content -Raw $KeyFile | ConvertFrom-Json
  if (-not $sa.private_key -or -not $sa.client_email) {
    throw "Invalid service-account key file (missing private_key/client_email): $KeyFile"
  }

  $now = [int][Math]::Floor(((Get-Date).ToUniversalTime() - [DateTime]'1970-01-01').TotalSeconds)
  $headerJson = '{"alg":"RS256","typ":"JWT"}'
  $claimJson = (@{
    iss   = $sa.client_email
    scope = "https://www.googleapis.com/auth/cloud-platform"
    aud   = "https://oauth2.googleapis.com/token"
    iat   = $now
    exp   = $now + 3600
  } | ConvertTo-Json -Compress)

  $headerB64 = ConvertTo-TpuBase64Url ([Text.Encoding]::UTF8.GetBytes($headerJson))
  $claimB64  = ConvertTo-TpuBase64Url ([Text.Encoding]::UTF8.GetBytes($claimJson))
  $signingInput = "$headerB64.$claimB64"

  # Strip the PEM envelope and base64-decode the PKCS#8 body.
  $pem = $sa.private_key
  $pem = $pem -replace "-----BEGIN PRIVATE KEY-----", ""
  $pem = $pem -replace "-----END PRIVATE KEY-----", ""
  $pem = $pem -replace "\s", ""
  $keyBytes = [Convert]::FromBase64String($pem)

  $rsa = [System.Security.Cryptography.RSA]::Create()
  if (-not ($rsa | Get-Member -Name ImportPkcs8PrivateKey -MemberType Method)) {
    throw "Service-account auth requires PowerShell 7 (RSA.ImportPkcs8PrivateKey not available). Install from https://aka.ms/powershell, or use gcloud."
  }
  try {
    $bytesRead = 0
    $rsa.ImportPkcs8PrivateKey([byte[]]$keyBytes, [ref]$bytesRead)
  } catch {
    throw "Failed to import service-account private key: $($_.Exception.Message)"
  }

  $signature = $rsa.SignData(
    [Text.Encoding]::UTF8.GetBytes($signingInput),
    [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
  )
  $jwt = "$signingInput." + (ConvertTo-TpuBase64Url $signature)

  $body = @{
    grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer"
    assertion  = $jwt
  }
  $resp = Invoke-RestMethod -Method Post `
    -Uri "https://oauth2.googleapis.com/token" `
    -Body $body `
    -ContentType "application/x-www-form-urlencoded" `
    -ErrorAction Stop
  if (-not $resp.access_token) {
    throw "Token endpoint returned no access_token: $($resp | ConvertTo-Json -Compress)"
  }
  return $resp.access_token
}

function Get-TpuGoogleAccessTokenFresh {
  # Long-running scripts: prefer auto-refreshing sources (service account,
  # metadata, gcloud) over the cached GOOGLE_OAUTH_ACCESS_TOKEN env var
  # (which expires after ~1h). The env var stays as a last-ditch fallback.

  # 1) Service-account key — recommended for unattended runs.
  $saFile = Resolve-TpuServiceAccountKeyFile
  if ($saFile) {
    try { return (Get-TpuGoogleAccessTokenFromServiceAccount -KeyFile $saFile) }
    catch { Write-Host ("Service-account auth failed: " + $_.Exception.Message) -ForegroundColor Yellow }
  }

  # 2) GCE / TPU VM metadata.
  $scopes = "https://www.googleapis.com/auth/cloud-platform"
  $uri = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=" + [System.Uri]::EscapeDataString($scopes)
  try {
    $resp = Invoke-RestMethod -Uri $uri -Headers @{ "Metadata-Flavor" = "Google" } -TimeoutSec 3 -ErrorAction Stop
    if ($resp.access_token) { return $resp.access_token }
  } catch { }

  # 3) gcloud CLI.
  $gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if ($gcloudCmd) {
    try {
      $gcOut = & gcloud auth print-access-token 2>$null
      if ($LASTEXITCODE -eq 0 -and $gcOut) {
        $t = ($gcOut | Select-Object -First 1).ToString().Trim()
        if ($t.Length -gt 20) { return $t }
      }
    } catch { }
  }

  # 4) Cached env token (may be stale).
  $fromEnv = [Environment]::GetEnvironmentVariable("GOOGLE_OAUTH_ACCESS_TOKEN", "Process")
  if ($fromEnv) { return $fromEnv }

  throw "No fresh OAuth source available. Configure a service-account key (recommended), install Google Cloud SDK, or set GOOGLE_OAUTH_ACCESS_TOKEN."
}

function Get-TpuGoogleAccessToken {
  param([string]$AccessToken = "")

  if ($AccessToken) { return $AccessToken }

  # Prefer the service-account key (long-lived, refreshes per call) over the
  # cached GOOGLE_OAUTH_ACCESS_TOKEN env var (which expires after ~1h).
  $saFile = Resolve-TpuServiceAccountKeyFile
  if ($saFile) {
    try {
      $t = Get-TpuGoogleAccessTokenFromServiceAccount -KeyFile $saFile
      Write-Host "Using access token minted from service-account key: $saFile"
      return $t
    } catch {
      Write-Host ("Service-account auth failed, falling back: " + $_.Exception.Message) -ForegroundColor Yellow
    }
  }

  $scopes = "https://www.googleapis.com/auth/cloud-platform"
  $uri = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=" + [System.Uri]::EscapeDataString($scopes)
  try {
    $resp = Invoke-RestMethod -Uri $uri -Headers @{ "Metadata-Flavor" = "Google" } -TimeoutSec 5 -ErrorAction Stop
    if ($resp.access_token) {
      Write-Host "Using access token from instance metadata (service account default)."
      return $resp.access_token
    }
  }
  catch {
    # Not on GCE or metadata unreachable
  }

  $gcloudCmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if ($gcloudCmd) {
    try {
      $gcOut = & gcloud auth print-access-token 2>$null
      if ($LASTEXITCODE -eq 0 -and $gcOut) {
        $t = ($gcOut | Select-Object -First 1).ToString().Trim()
        if ($t.Length -gt 20) {
          Write-Host "Using access token from: gcloud auth print-access-token"
          return $t
        }
      }
    }
    catch {
      # gcloud not logged in or failed
    }
  }

  $fromEnv = [Environment]::GetEnvironmentVariable("GOOGLE_OAUTH_ACCESS_TOKEN", "Process")
  if ($fromEnv) {
    Write-Host "Using cached GOOGLE_OAUTH_ACCESS_TOKEN env var (will expire ~1h after issuance)."
    return $fromEnv
  }

  throw @"
No OAuth access token available.

  Recommended — long-lived service-account auth:
    1. GCP IAM -> Service Accounts -> create 'ci-tpu-controller'
    2. Grant role 'TPU Admin' (or a custom role with tpu.nodes.* permissions)
    3. Keys tab -> Add Key -> JSON -> save as: infra/gcp/service-account.json
       (already in .gitignore) -- or set GCP_SERVICE_ACCOUNT_KEY_FILE
    4. Re-run; the script will mint a fresh access token from the key.

  Other options:
    - Install Google Cloud SDK and: gcloud auth login
    - Or set GOOGLE_OAUTH_ACCESS_TOKEN in infra/.env (expires every ~1h)
    - Or pass -AccessToken to the script

  On a Compute Engine / TPU VM: attach a service account with TPU permissions
  and ensure access scopes include cloud-platform.
"@
}

function Resolve-TpuGcpProject {
  param([string]$ParamProject = "")
  if ($ParamProject) { return $ParamProject.Trim() }
  $tpu = [Environment]::GetEnvironmentVariable("TPU_PROJECT", "Process")
  $gcp = [Environment]::GetEnvironmentVariable("GCP_PROJECT", "Process")
  foreach ($candidate in @($tpu, $gcp)) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $t = $candidate.Trim()
    if ($t -ne "your-gcp-project-id") { return $t }
  }
  if (-not [string]::IsNullOrWhiteSpace($tpu)) { return $tpu.Trim() }
  if (-not [string]::IsNullOrWhiteSpace($gcp)) { return $gcp.Trim() }
  throw "Missing TPU_PROJECT or GCP_PROJECT in infra/.env or backend/.env (or pass -Project)."
}

function Assert-TpuGcpProject {
  param([string]$Project)
  $p = if ($Project) { $Project.Trim() } else { "" }
  if ([string]::IsNullOrWhiteSpace($p) -or $p -eq "your-gcp-project-id") {
    throw @"
Invalid GCP project ID: '$Project'

Set GCP_PROJECT or TPU_PROJECT in infra/.env (or backend/.env) to your real project ID.
"@
  }
}

function Invoke-TpuRestWithErrorBody {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers,
    [string]$Body = $null
  )
  try {
    if ($null -ne $Body -and $Body -ne "") {
      return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }
  catch {
    $err = $_
    try {
      $resp = $err.Exception.Response
      if ($null -ne $resp) {
        $stream = $resp.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $txt = $reader.ReadToEnd()
          $reader.Close()
          if ($txt) {
            Write-Host "Cloud TPU API response ($($resp.StatusCode)):" -ForegroundColor Yellow
            Write-Host $txt
          }
        }
      }
    }
    catch { }
    throw $err
  }
}
