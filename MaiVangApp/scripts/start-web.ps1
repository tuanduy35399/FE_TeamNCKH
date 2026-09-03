$ErrorActionPreference = 'Stop'
$port = 5175
$listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
if ($listeners.Count -gt 0) {
    $owners = ($listeners | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
    throw "Expo Web cannot start: port $port is already in use by PID(s): $owners. The port will not be changed automatically."
}
$appPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $appPath
& npx.cmd expo start --web --port $port
exit $LASTEXITCODE
