param()
. (Join-Path $PSScriptRoot 'common.ps1')

$node = Get-Node
if (-not $node) { Fail 'Node.js 22 or later is required: https://nodejs.org' }

if ($args.Count -gt 0) { Fail 'start.bat takes no arguments. Replace the active files in themes/ to change materials.' }
# Validate active material before starting TRAE or replacing a watcher.
& $node (Join-Path $Root 'skin.mjs') list | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Invalid material in themes/; see the messages above.' }

$exe = Get-TraeExe
if (-not $exe) { Fail 'TRAE CN installation not found. Make sure TRAE CN (China edition) is installed.' }
$running = @(Get-TraeMain $exe)
if ($running.Count -gt 0) {
  if (-not (Test-DebugPort)) {
    Fail 'TRAE CN is running but was not started by start.bat, so it cannot be skinned. Save your work, fully quit TRAE CN (including the tray icon), then run start.bat again.'
  }
  Write-Host 'Connected to the running TRAE CN.'
} else {
  if (Test-DebugPort) { Fail "Port $Port is used by another program. Close it and try again." }
  Write-Host "Starting TRAE CN: $exe"
  # Keep TRAE's long-lived stdout/stderr separate from the startup console.
  $null = New-Item -ItemType Directory -Path $StateDir -Force
  $stdoutLog = Join-Path $StateDir 'trae.stdout.log'
  $stderrLog = Join-Path $StateDir 'trae.stderr.log'
  Start-Process -FilePath $exe -ArgumentList '--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$Port" -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
}

# Wait for an Agent or IDE window rather than just the port; TRAE opens one a few seconds after launch.
$deadline = (Get-Date).AddSeconds(40)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $pages = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2
    if ($pages | Where-Object { $_.type -eq 'page' -and ($_.url -like '*solo/solo-lite.html*' -or $_.url -like '*workbench/workbench.html*') }) { $ready = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 700
}
if (-not $ready) { Fail 'Timed out waiting for a TRAE CN Agent or IDE window. Open one in TRAE CN, then run start.bat again.' }
Start-Sleep -Seconds 1

# Inject in the foreground so errors show here, then hand over to a hidden watcher and exit.
if ((Invoke-Skin $node $exe @('apply')) -ne 0) { Fail 'Injection failed; see the messages above.' }

$null = Stop-Watcher
$env:TRAE_CN_EXE = $exe
$watchArgs = @("`"$(Join-Path $Root 'skin.mjs')`"", 'watch')
Start-Process -FilePath $node -ArgumentList $watchArgs -WindowStyle Hidden -WorkingDirectory $Root
Write-Host 'Background watcher started: it follows TRAE light/dark changes and page reloads, and exits when TRAE closes. Run stop.bat to remove the skin.'
exit 0
