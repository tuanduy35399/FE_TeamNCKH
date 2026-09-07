$ErrorActionPreference = 'Stop'
$appPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$workspacePath = (Resolve-Path (Join-Path $appPath '..\..')).Path
$runtimePath = Join-Path $workspacePath '.tmp'
$cachePath = Join-Path $workspacePath '.cache\npm'
$logPath = Join-Path $appPath '.dev-logs'
New-Item -ItemType Directory -Force -Path $runtimePath,$cachePath,$logPath | Out-Null
$env:TEMP=$runtimePath
$env:TMP=$runtimePath
$env:npm_config_cache=$cachePath
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD='1'
$env:MAIVANG_DJANGO_ORIGIN='https://chat-bot-maivang-backend.onrender.com'
$env:EXPO_PUBLIC_API_BASE_URL=$env:MAIVANG_DJANGO_ORIGIN
$env:EXPO_PUBLIC_WEB_API_BASE_URL='http://127.0.0.1:8010'

foreach($port in @(8010,5175)) {
  if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    throw "MaiCare không thể khởi động vì cổng $port đang được sử dụng."
  }
}

$bridge = Start-Process -FilePath 'node.exe' -ArgumentList (Join-Path $PSScriptRoot 'api-bridge.cjs') -WorkingDirectory $appPath -RedirectStandardOutput (Join-Path $logPath 'bridge.stdout.log') -RedirectStandardError (Join-Path $logPath 'bridge.stderr.log') -PassThru -WindowStyle Hidden
try {
  for($attempt=0;$attempt -lt 40;$attempt++) {
    try {
      $response=Invoke-WebRequest -Uri 'http://127.0.0.1:8010/__maicare_bridge_health' -UseBasicParsing -TimeoutSec 2
      if($response.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep -Milliseconds 250
  }
  if(-not (Get-NetTCPConnection -State Listen -LocalPort 8010 -ErrorAction SilentlyContinue)) { throw 'MaiCare web bridge did not start.' }
  Set-Location $appPath
  & npm.cmd run web:expo
  exit $LASTEXITCODE
} finally {
  if($bridge -and -not $bridge.HasExited) { Stop-Process -Id $bridge.Id -Force -ErrorAction SilentlyContinue }
}
