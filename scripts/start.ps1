param([string]$Theme = '')
. (Join-Path $PSScriptRoot 'common.ps1')

$exe = Get-TraeExe
if (-not $exe) { Fail 'TRAE CN installation not found. Make sure TRAE CN (China edition) is installed.' }
$node = Get-Node
if (-not $node) { Fail 'Node.js 22 or later is required: https://nodejs.org' }

$running = @(Get-TraeMain $exe)
if ($running.Count -gt 0) {
  if (-not (Test-DebugPort)) {
    Fail 'TRAE CN is running but was not started by start.bat, so it cannot be skinned. Save your work, fully quit TRAE CN (including the tray icon), then run start.bat again.'
  }
  Write-Host 'Connected to the running TRAE CN.'
} else {
  if (Test-DebugPort) { Fail "Port $Port is used by another program. Close it and try again." }
  Write-Host "Starting TRAE CN: $exe"
  Start-Process -FilePath $exe -ArgumentList '--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$Port"
}

# Wait for the Agent workbench page rather than just the port; TRAE opens it a few seconds after launch.
$deadline = (Get-Date).AddSeconds(40)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $pages = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2
    if ($pages | Where-Object { $_.type -eq 'page' -and $_.url -like '*solo/solo-lite.html*' }) { $ready = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 700
}
if (-not $ready) { Fail 'Timed out waiting for the TRAE CN Agent workbench. Open the Agent window in TRAE CN, then run start.bat again.' }
Start-Sleep -Seconds 1

# Inject in the foreground so errors show here, then hand over to a hidden watcher and exit.
$arguments = @('apply')
if ($Theme) { $arguments += $Theme }
if ((Invoke-Skin $node $exe $arguments) -ne 0) { Fail 'Injection failed; see the messages above.' }

$null = Stop-Watcher
$env:TRAE_CN_EXE = $exe
$watchArgs = @("`"$(Join-Path $Root 'skin.mjs')`"", 'watch')
if ($Theme) { $watchArgs += $Theme }
Start-Process -FilePath $node -ArgumentList $watchArgs -WindowStyle Hidden -WorkingDirectory $Root
Write-Host 'Background watcher started: it follows TRAE light/dark changes and page reloads, and exits when TRAE closes. Run stop.bat to remove the skin.'
