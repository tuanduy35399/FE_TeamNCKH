$ErrorActionPreference = 'Stop'
$appPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspacePath = (Resolve-Path (Join-Path $appPath '..\..')).Path
$sourceBackendPath = Join-Path $workspacePath 'chat_bot_maivang-backend'
$worktreePath = Join-Path $workspacePath '.backend-api-worktree'
$backendPath = if (Test-Path -LiteralPath (Join-Path $worktreePath 'manage.py')) { $worktreePath } else { $sourceBackendPath }
$completePython = Join-Path $sourceBackendPath 'venv\Scripts\python.exe'
$fallbackPython = Join-Path $workspacePath '.venv-backend\Scripts\python.exe'
$pythonPath = if (Test-Path -LiteralPath $completePython) { $completePython } else { $fallbackPython }
$runtimePath = Join-Path $workspacePath '.tmp'
$cachePath = Join-Path $workspacePath '.cache'
$dataPath = Join-Path $workspacePath '.data'
$logPath = Join-Path $appPath '.dev-logs'
$envFile = Join-Path $sourceBackendPath '.env'
$children = [System.Collections.Generic.List[System.Diagnostics.Process]]::new()

if (-not (Test-Path -LiteralPath $pythonPath)) { throw "A compatible backend Python environment was not found." }
if (-not (Test-Path -LiteralPath (Join-Path $backendPath 'manage.py'))) { throw "The backend repository was not found." }
New-Item -ItemType Directory -Force -Path $runtimePath,$cachePath,(Join-Path $cachePath 'npm'),(Join-Path $cachePath 'pip'),$dataPath,$logPath | Out-Null
$env:TEMP=$runtimePath; $env:TMP=$runtimePath; $env:npm_config_cache=Join-Path $cachePath 'npm'; $env:PIP_CACHE_DIR=Join-Path $cachePath 'pip'; $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD='1'

function Clear-ProjectPort {
  param([int]$Port,[string[]]$ProjectMarkers)
  foreach($listener in @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) {
    $ownerPid=$listener.OwningProcess
    $process=Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction SilentlyContinue
    $evidence=(($process.ExecutablePath,$process.CommandLine) -join ' ')
    $owned=$false
    try {
      if($Port -eq 8000 -or $Port -eq 8010) {
        $probe=Invoke-WebRequest -Uri ('http://127.0.0.1:' + $Port + '/api/v1/schema/') -UseBasicParsing -TimeoutSec 2
        $schema=[Text.Encoding]::UTF8.GetString($probe.Content)
        $owned=$schema -like '*title: Backend App Cay Mai*'
      } elseif($Port -eq 8004) {
        $owned=(Invoke-RestMethod -Uri 'http://127.0.0.1:8004/openapi.json' -TimeoutSec 2).info.title -eq 'Mai Vang Chat Service'
      } elseif($Port -eq 5175) {
        $owned=(Invoke-WebRequest -Uri 'http://127.0.0.1:5175' -UseBasicParsing -TimeoutSec 2).Content -like '*<title>MaiCare</title>*'
      }
    } catch { $owned=$false }
    foreach($marker in $ProjectMarkers){ if($evidence -like "*$marker*"){ $owned=$true; break } }
    if($owned){ Write-Host "Stopping stale MaiCare process on port $Port (PID $ownerPid)."; Stop-Process -Id $ownerPid -Force -ErrorAction Stop; Start-Sleep -Milliseconds 300 }
    else { $name=if($process.Name){$process.Name}else{'unknown process'}; throw "Port $Port is used by unrelated process '$name' (PID $ownerPid). MaiCare did not stop it." }
  }
}
function Wait-Http {
  param([string]$Name,[string]$Url)
  for($attempt=0;$attempt -lt 80;$attempt++){ try{$response=Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2;if($response.StatusCode -ge 200 -and $response.StatusCode -lt 500){Write-Host "$Name ready";return}}catch{};Start-Sleep -Milliseconds 400 }
  throw "$Name did not become ready."
}
function Start-Child {
  param([string]$FilePath,[string[]]$Arguments,[string]$WorkingDirectory,[string]$Name)
  $process=Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -RedirectStandardOutput (Join-Path $logPath "$Name.stdout.log") -RedirectStandardError (Join-Path $logPath "$Name.stderr.log") -PassThru -WindowStyle Hidden
  $children.Add($process); return $process
}

Clear-ProjectPort 8000 @($backendPath,$sourceBackendPath)
Clear-ProjectPort 8004 @($backendPath,$sourceBackendPath)
Clear-ProjectPort 8010 @($appPath,'api-bridge.cjs')
Clear-ProjectPort 5175 @($appPath,'expo','metro')

$env:DJANGO_SECRET_KEY=[Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N')
$env:DEBUG='true'; $env:ALLOWED_HOSTS='localhost,127.0.0.1'; $env:CORS_ALLOWED_ORIGINS='http://localhost:5175,http://127.0.0.1:5175'
$env:DATABASE_URL='sqlite:///D:/NCKH_MaiVang/.data/maicare-dev.sqlite3'
$env:FASTAPI_CHAT_URL='http://127.0.0.1:8004/chat'; $env:FASTAPI_IMAGE_CHAT_URL='http://127.0.0.1:8004/chat/image'; $env:FASTAPI_TIMEOUT='120'

try {
  & $pythonPath (Join-Path $backendPath 'manage.py') migrate --noinput
  if($LASTEXITCODE -ne 0){throw 'Django migrations failed.'}
  Start-Child $pythonPath @((Join-Path $backendPath 'manage.py'),'runserver','127.0.0.1:8000','--noreload','--nostatic') $backendPath 'django' | Out-Null
  Wait-Http 'Django' 'http://127.0.0.1:8000/api/v1/schema/'
  $fastArgs=@('-m','uvicorn','chat.google_model.main:app','--host','127.0.0.1','--port','8004')
  if(Test-Path -LiteralPath $envFile){$fastArgs += @('--env-file',$envFile)}
  Start-Child $pythonPath $fastArgs $backendPath 'fastapi' | Out-Null
  Wait-Http 'FastAPI' 'http://127.0.0.1:8004/openapi.json'
  $env:MAIVANG_DJANGO_ORIGIN='http://127.0.0.1:8000'; $env:MAIVANG_CHAT_ORIGIN='http://127.0.0.1:8004'
  Start-Child 'node.exe' @((Join-Path $PSScriptRoot 'api-bridge.cjs')) $appPath 'bridge' | Out-Null
  Wait-Http 'Bridge' 'http://127.0.0.1:8010/__maicare_bridge_health'
  $env:EXPO_PUBLIC_AUTH_API_BASE_URL='http://127.0.0.1:8000'; $env:EXPO_PUBLIC_CHAT_API_BASE_URL='http://127.0.0.1:8004'; $env:EXPO_PUBLIC_WEB_API_BASE_URL='http://127.0.0.1:8010'
  Set-Location $appPath
  Write-Host 'MaiCare ready: http://localhost:5175'
  & npm.cmd run web:expo
  exit $LASTEXITCODE
} finally {
  foreach($child in $children){if($child -and -not $child.HasExited){Stop-Process -Id $child.Id -Force -ErrorAction SilentlyContinue}}
  Write-Host 'MaiCare child processes stopped.'
}
