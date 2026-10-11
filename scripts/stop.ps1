. (Join-Path $PSScriptRoot 'common.ps1')

# Stop the watcher first so it cannot re-inject while we restore.
if (Stop-Watcher) { Write-Host 'Background watcher stopped.' }

$exe = Get-TraeExe
if (-not $exe) { Fail 'TRAE CN installation not found.' }
$node = Get-Node
if (-not $node) { Fail 'Node.js 22 or later is required.' }

# restore also puts TRAE's light/dark setting back even if TRAE is closed.
$code = Invoke-Skin $node $exe @('restore')
if ($code -ne 0) {
  if (-not (Test-DebugPort)) { Write-Host 'TRAE CN is not running in debug mode; nothing to remove. Any skin disappears when TRAE restarts.' -ForegroundColor Yellow; exit 0 }
  Fail 'Removal did not complete; see the messages above.'
}
