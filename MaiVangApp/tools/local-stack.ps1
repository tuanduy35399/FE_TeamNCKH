param([switch]$NoExpo)
$ErrorActionPreference = 'Stop'
$frontend = Split-Path $PSScriptRoot -Parent
$workspace = Split-Path (Split-Path $frontend -Parent) -Parent
$django = Join-Path $workspace 'reference\django-backend'
$chatbot = Join-Path $workspace 'reference\chatbot-service'
$runtime = Join-Path $workspace '.runtime'
$cache = Join-Path $workspace '.cache'
$tmp = Join-Path $workspace '.tmp'
$logs = Join-Path $runtime 'logs'
$pids = Join-Path $runtime 'pids'
$venvs = Join-Path $runtime 'venvs'
@($runtime,$cache,$tmp,$logs,$pids,$venvs,(Join-Path $runtime 'db')) | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }
$env:TEMP=$tmp; $env:TMP=$tmp; $env:NPM_CONFIG_CACHE=Join-Path $cache 'npm'; $env:PIP_CACHE_DIR=Join-Path $cache 'pip'; $env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $cache 'playwright'; $env:GRADLE_USER_HOME=Join-Path $cache 'gradle'; $env:PYTHONDONTWRITEBYTECODE='1'

function Get-LanIPv4 {
  $candidate = Get-NetIPConfiguration | Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway -and $_.NetAdapter.InterfaceDescription -notmatch 'VMware|VirtualBox|Loopback|Hyper-V|WSL' } | ForEach-Object IPv4Address | ForEach-Object IPAddress | Where-Object { $_ -notmatch '^(127\.|169\.254\.)' } | Select-Object -First 1
  if (-not $candidate) { throw 'No active LAN IPv4 address was found.' }
  return $candidate
}
function Test-Url([string]$Url) { try { $response=Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3; return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500 } catch { return $false } }
function Wait-Url([string]$Name,[string]$Url,[int]$Seconds=90) { $limit=(Get-Date).AddSeconds($Seconds); while((Get-Date) -lt $limit){ if(Test-Url $Url){ return }; Start-Sleep -Milliseconds 800 }; throw "$Name is not ready at $Url" }
function Ensure-Venv([string]$Name,[string]$Requirements) {
  $venv=Join-Path $venvs $Name; $python=Join-Path $venv 'Scripts\python.exe'; $marker=Join-Path $venv '.requirements.sha256'; $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $Requirements).Hash
  if(-not (Test-Path -LiteralPath $python)){ python -m venv $venv }
  $installed=if(Test-Path -LiteralPath $marker){ (Get-Content -LiteralPath $marker -Raw).Trim() }else{ '' }
  if($installed -ne $hash){ & $python -m pip install --disable-pip-version-check -r $Requirements | Out-Host; if($LASTEXITCODE -ne 0){ throw "Dependency installation failed for $Name." }; Set-Content -LiteralPath $marker -Value $hash -Encoding ascii }
  return $python
}
function Ensure-Packages([string]$Name,[string[]]$Packages) {
  $venv=Join-Path $venvs $Name; $python=Join-Path $venv 'Scripts\python.exe'; $marker=Join-Path $venv '.packages.sha256'
  $spec=($Packages -join "`n"); $sha=[Security.Cryptography.SHA256]::Create(); try { $hash=([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($spec)))).Replace('-','') } finally { $sha.Dispose() }
  if(-not (Test-Path -LiteralPath $python)){ python -m venv $venv }
  $installed=if(Test-Path -LiteralPath $marker){ (Get-Content -LiteralPath $marker -Raw).Trim() }else{ '' }
  if($installed -ne $hash){ & $python -m pip install --disable-pip-version-check @Packages | Out-Host; if($LASTEXITCODE -ne 0){ throw "Dependency installation failed for $Name." }; Set-Content -LiteralPath $marker -Value $hash -Encoding ascii }
  return $python
}
function Start-Managed([string]$Name,[string]$File,[string[]]$Arguments,[string]$WorkingDirectory) {
  $pidFile=Join-Path $pids "$Name.pid"; if(Test-Path -LiteralPath $pidFile){ $old=[int](Get-Content $pidFile); if(Get-Process -Id $old -ErrorAction SilentlyContinue){ return $old }; Remove-Item -LiteralPath $pidFile -Force }
  $process=Start-Process -FilePath $File -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logs "$Name.out.log") -RedirectStandardError (Join-Path $logs "$Name.err.log")
  Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii; return $process.Id
}

$lan=Get-LanIPv4; $djangoUrl="http://${lan}:8000"; $localFastApiUrl='http://127.0.0.1:8004'; $localYoloUrl='http://127.0.0.1:8005/predict'; $localYoloHealth='http://127.0.0.1:8005/health'
$fastApiChatUrl=if($env:MAICARE_FASTAPI_CHAT_URL){$env:MAICARE_FASTAPI_CHAT_URL}elseif($env:FASTAPI_CHAT_URL){$env:FASTAPI_CHAT_URL}else{''}
$fastApiImageUrl=if($env:MAICARE_FASTAPI_IMAGE_CHAT_URL){$env:MAICARE_FASTAPI_IMAGE_CHAT_URL}elseif($env:FASTAPI_IMAGE_CHAT_URL){$env:FASTAPI_IMAGE_CHAT_URL}else{''}
$yoloUrl=if($env:MAICARE_YOLO_URL){$env:MAICARE_YOLO_URL}elseif($env:YOLO_API_URL){$env:YOLO_API_URL}else{''}
$yoloHealth=if($env:MAICARE_YOLO_HEALTH_URL){$env:MAICARE_YOLO_HEALTH_URL}else{$localYoloHealth}

$yoloStart=Join-Path $runtime 'local-services\yolo\start.ps1'
if(-not $yoloUrl -and (Test-Url $localYoloHealth)){ $yoloUrl=$localYoloUrl }
if(-not $yoloUrl -and (Test-Path -LiteralPath $yoloStart)){
  $yoloPid=Start-Managed 'yolo' 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$yoloStart) (Split-Path $yoloStart -Parent); Wait-Url 'YOLO' $yoloHealth 120
  $yoloUrl=$localYoloUrl
}
if(-not $fastApiChatUrl -and (Test-Url "$localFastApiUrl/")){ $fastApiChatUrl="$localFastApiUrl/chat"; $fastApiImageUrl="$localFastApiUrl/chat/image" }
$hasAiCredential=[bool]($env:GOOGLE_API_KEY -or $env:GEMINI_API_KEY -or $env:GOOGLE_APPLICATION_CREDENTIALS -or $env:OPENAI_API_KEY)
if(-not $fastApiChatUrl -and $hasAiCredential){
  $chatPython=Ensure-Venv 'chatbot' (Join-Path $chatbot 'requirements.txt')
  Start-Managed 'chatbot' $chatPython @('-m','uvicorn','google_model.main:app','--host','127.0.0.1','--port','8004') $chatbot | Out-Null; Wait-Url 'FastAPI' "$localFastApiUrl/" 120
  $fastApiChatUrl="$localFastApiUrl/chat"; $fastApiImageUrl="$localFastApiUrl/chat/image"
}
if($fastApiChatUrl -and -not $fastApiImageUrl){ $fastApiImageUrl=$fastApiChatUrl.TrimEnd('/')+'/image' }
$djangoPackages=@('Django==6.1','django-cors-headers==4.9.0','django-filter==26.1','djangorestframework==3.18.0','djangorestframework-simplejwt==5.5.1','python-dotenv==1.2.2','drf-spectacular==0.30.0','dj-database-url==3.1.2','requests==2.34.2','Pillow==12.3.0')
$djangoPython=Ensure-Packages 'django' $djangoPackages
$secretFile=Join-Path $runtime 'django-secret.txt'; if(-not (Test-Path -LiteralPath $secretFile)){ Set-Content -LiteralPath $secretFile -Value ([guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')) -Encoding ascii }
$env:DEBUG='True'; $env:ALLOWED_HOSTS="localhost,127.0.0.1,$lan"; $env:CORS_ALLOWED_ORIGINS="http://localhost:5175,http://127.0.0.1:5175,http://localhost:8081,http://${lan}:8081"; $env:FASTAPI_CHAT_URL=if($fastApiChatUrl){$fastApiChatUrl}else{'http://127.0.0.1:8004/chat'}; $env:FASTAPI_IMAGE_CHAT_URL=if($fastApiImageUrl){$fastApiImageUrl}else{'http://127.0.0.1:8004/chat/image'}; $env:FASTAPI_TIMEOUT='180'; $env:YOLO_API_URL=$yoloUrl; $env:YOLO_API_TIMEOUT='180'; if(-not $env:YOLO_API_KEY){$env:YOLO_API_KEY=''}; $env:DJANGO_SECRET_KEY=(Get-Content -LiteralPath $secretFile -Raw).Trim(); $db=(Join-Path $runtime 'db\maicare.sqlite3').Replace('\','/'); $env:DATABASE_URL="sqlite:///$db"
if(-not (Test-Url "$djangoUrl/api/v1/schema/")){ & $djangoPython (Join-Path $django 'manage.py') migrate --noinput; if($LASTEXITCODE -ne 0){ throw 'Django migration failed.' }; Start-Managed 'django' $djangoPython @((Join-Path $django 'manage.py'),'runserver','0.0.0.0:8000','--noreload') $django | Out-Null; Wait-Url 'Django' "$djangoUrl/api/v1/schema/" 90 }
$envFile=Join-Path $frontend '.env.local'; Set-Content -LiteralPath $envFile -Value "EXPO_PUBLIC_API_BASE_URL=$djangoUrl" -Encoding utf8
if(-not $NoExpo){ if(-not (Test-Path (Join-Path $frontend 'node_modules'))){ throw 'node_modules is missing. Run npm ci once before starting Expo.' }; Start-Managed 'expo' 'npx.cmd' @('expo','start','--clear','--lan') $frontend | Out-Null }
Write-Host "PC LAN IP: $lan"; Write-Host "Django URL: $djangoUrl"; Write-Host "FastAPI URL: $(if($fastApiChatUrl){$fastApiChatUrl}else{'NOT CONFIGURED (AI text is degraded)'})"; Write-Host "YOLO URL: $(if($yoloUrl){$yoloUrl}else{'NOT CONFIGURED (image inference is degraded)'})"; Write-Host "Expo API URL: $djangoUrl"
Write-Host 'Local Django stack healthy.'
