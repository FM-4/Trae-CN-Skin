# Shared helpers for start.ps1 / stop.ps1.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Port = 9341
$StateDir = Join-Path $env:APPDATA 'trae-work-skin'
$WatcherFile = Join-Path $StateDir 'watcher.pid'

function Fail([string]$Message) {
  Write-Host ''
  Write-Host "  $Message" -ForegroundColor Red
  Write-Host ''
  exit 1
}

# Inno Setup records TRAE CN under a fixed AppId; fall back to matching the display name.
function Get-TraeExe {
  $roots = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
  $entries = foreach ($root in $roots) { Get-ItemProperty "$root\*" -ErrorAction SilentlyContinue }
  $entry = $entries | Where-Object { $_.PSChildName -eq '{98EB0EF0-1DE3-4838-B14A-3B0DC4570E8B}_is1' } | Select-Object -First 1
  if (-not $entry) { $entry = $entries | Where-Object { $_.DisplayName -match '^TRAE CN\b' } | Select-Object -First 1 }
  if (-not $entry -or -not $entry.InstallLocation) { return $null }
  $exe = Join-Path $entry.InstallLocation 'Trae CN.exe'
  if (Test-Path -LiteralPath $exe -PathType Leaf) { return (Resolve-Path -LiteralPath $exe).Path }
  return $null
}

function Get-Node {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { return $null }
  $major = [int]((& $node.Source --version) -replace '^v(\d+).*', '$1')
  if ($major -lt 22) { return $null }
  return $node.Source
}

# Main TRAE processes only; helper processes carry --type=... or run bundled scripts.
function Get-TraeMain([string]$Exe) {
  Get-CimInstance Win32_Process -Filter "Name='Trae CN.exe'" | Where-Object {
    $_.ExecutablePath -and ($_.ExecutablePath -ieq $Exe) -and ($_.CommandLine -notmatch '--type=') -and ($_.CommandLine -notmatch '--node-ipc')
  }
}

function Test-DebugPort {
  try { $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 2; return $true } catch { return $false }
}

# Returns $true when a live watcher was stopped. Checks the process is node before killing a recorded PID.
function Stop-Watcher {
  if (-not (Test-Path -LiteralPath $WatcherFile)) { return $false }
  $id = Get-Content -LiteralPath $WatcherFile -ErrorAction SilentlyContinue
  $process = if ($id) { Get-Process -Id $id -ErrorAction SilentlyContinue | Where-Object ProcessName -eq 'node' }
  if ($process) { Stop-Process -Id $process.Id -Force; $process.WaitForExit(3000) | Out-Null }
  Remove-Item -LiteralPath $WatcherFile -Force -ErrorAction SilentlyContinue
  return [bool]$process
}

# Node output goes straight to the console; returning it through the pipeline would swallow the exit code.
function Invoke-Skin([string]$Node, [string]$Exe, [string[]]$Arguments) {
  $env:TRAE_CN_EXE = $Exe
  & $Node (Join-Path $Root 'skin.mjs') @Arguments | Out-Host
  return $LASTEXITCODE
}
