$ErrorActionPreference = 'Stop'
$appPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspacePath = (Resolve-Path (Join-Path $appPath '..\..')).Path
$backendPath = Join-Path $workspacePath 'chat_bot_maivang-backend'
$pythonPath = Join-Path $workspacePath '.venv-backend\Scripts\python.exe'
$runtimePath = Join-Path $workspacePath '.tmp'
$logPath = Join-Path $appPath '.dev-logs'
$corsOrigins = 'http://localhost:5175,http://127.0.0.1:5175'
$backendProcess = $null
$bridgeProcess = $null
if (-not (Test-Path -LiteralPath $pythonPath)) { throw "Backend Python was not found: $pythonPath" }
if (-not (Test-Path -LiteralPath (Join-Path $backendPath 'manage.py'))) { throw "Backend repository was not found: $backendPath" }
New-Item -ItemType Directory -Force -Path $runtimePath, $logPath | Out-Null
function Clear-ProjectPort {
    param([int]$Port, [string[]]$ProjectMarkers)
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $ownerPid = $listener.OwningProcess
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction SilentlyContinue
        $evidence = (($process.ExecutablePath, $process.CommandLine) -join ' ')
        $isProjectOwned = $false
        foreach ($marker in $ProjectMarkers) { if ($evidence -like "*$marker*") { $isProjectOwned = $true; break } }
        if ($isProjectOwned) {
            Write-Host "Stopping stale MaiCare process on port $Port (PID $ownerPid)."
            Stop-Process -Id $ownerPid -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 250
        } else {
            $name = if ($process.Name) { $process.Name } else { 'unknown process' }
            throw "Port $Port is used by unrelated process '$name' (PID $ownerPid). MaiCare did not stop it."
        }
    }
}
Clear-ProjectPort -Port 8000 -ProjectMarkers @($backendPath, '.venv-backend')
Clear-ProjectPort -Port 8010 -ProjectMarkers @($appPath, 'api-bridge.cjs')
Clear-ProjectPort -Port 5175 -ProjectMarkers @($appPath)
$env:DJANGO_SECRET_KEY = ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))
$env:DEBUG = 'true'
$env:ALLOWED_HOSTS = 'localhost,127.0.0.1,127.0.0.2'
$env:CORS_ALLOWED_ORIGINS = $corsOrigins
$env:DATABASE_URL = 'sqlite:///D:/NCKH_MaiVang/.tmp/frontend-dev.sqlite3'
$backendHost = '127.0.0.1'
$existing = @()
try {
    if ($existing.Count -eq 0) {
        if (Get-NetTCPConnection -State Listen -LocalAddress $backendHost -LocalPort 8000 -ErrorAction SilentlyContinue) { throw ("Cannot start Django: {0}:8000 is already in use." -f $backendHost) }
        Push-Location $backendPath
        try {
            & $pythonPath (Join-Path $backendPath 'manage.py') migrate --noinput
            if ($LASTEXITCODE -ne 0) { throw 'Django migrations failed.' }
            $backendProcess = Start-Process -FilePath $pythonPath -ArgumentList @((Join-Path $backendPath 'manage.py'), 'runserver', "$($backendHost):8000", '--noreload', '--nostatic') -WorkingDirectory $backendPath -RedirectStandardOutput (Join-Path $logPath 'backend.stdout.log') -RedirectStandardError (Join-Path $logPath 'backend.stderr.log') -PassThru -WindowStyle Hidden
        } finally { Pop-Location }
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            try {
                $response = Invoke-WebRequest -Uri "http://$($backendHost):8000/api/v1/schema/" -UseBasicParsing -TimeoutSec 2
                if ($response.StatusCode -eq 200) { $ready = $true; break }
            } catch { Start-Sleep -Milliseconds 300 }
        }
        if (-not $ready) {
            Get-Content -LiteralPath (Join-Path $logPath 'backend.stderr.log') -ErrorAction SilentlyContinue
            throw 'Django did not become ready.'
        }
        Write-Host "Django ready at http://$($backendHost):8000"
    }
    if (Get-NetTCPConnection -State Listen -LocalAddress '127.0.0.1' -LocalPort 8010 -ErrorAction SilentlyContinue) { throw 'Cannot start the API bridge: 127.0.0.1:8010 is already in use.' }
    $env:MAIVANG_BACKEND_ORIGIN = "http://$($backendHost):8000"
    $bridgeProcess = Start-Process -FilePath 'node.exe' -ArgumentList (Join-Path $PSScriptRoot 'api-bridge.cjs') -WorkingDirectory $appPath -RedirectStandardOutput (Join-Path $logPath 'bridge.stdout.log') -RedirectStandardError (Join-Path $logPath 'bridge.stderr.log') -PassThru -WindowStyle Hidden
    $bridgeReady = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try {
            $bridgeCheck = Invoke-WebRequest -Uri 'http://127.0.0.1:8010/api/v1/schema/' -UseBasicParsing -TimeoutSec 2
            if ($bridgeCheck.StatusCode -eq 200) { $bridgeReady = $true; break }
        } catch { Start-Sleep -Milliseconds 200 }
    }
    if (-not $bridgeReady) { throw 'The frontend API bridge did not become ready.' }
    $env:EXPO_PUBLIC_API_BASE_URL = "http://$($backendHost):8000"
    $env:EXPO_PUBLIC_WEB_API_BASE_URL = 'http://127.0.0.1:8010'
    Set-Location $appPath
    Write-Host 'Expo Web starting at http://localhost:5175'
    & npm.cmd run web
    exit $LASTEXITCODE
} finally {
    if ($bridgeProcess -and -not $bridgeProcess.HasExited) {
        Stop-Process -Id $bridgeProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host 'Stopped the API bridge child process.'
    }
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host 'Stopped the Django child process.'
    }
}
