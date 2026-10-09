$ErrorActionPreference='Continue'
$adapter=Get-NetIPConfiguration | Where-Object { $_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway -and $_.NetAdapter.InterfaceDescription -notmatch 'VMware|VirtualBox|Loopback|Hyper-V|WSL' } | Select-Object -First 1
$lan=@($adapter.IPv4Address.IPAddress | Where-Object { $_ -notmatch '^(127\.|169\.254\.)' })[0]
$fastApi=if($env:MAICARE_FASTAPI_CHAT_URL){$env:MAICARE_FASTAPI_CHAT_URL}elseif($env:FASTAPI_CHAT_URL){$env:FASTAPI_CHAT_URL}else{'http://127.0.0.1:8004/'}
$yolo=if($env:MAICARE_YOLO_HEALTH_URL){$env:MAICARE_YOLO_HEALTH_URL}elseif($env:MAICARE_YOLO_URL){$env:MAICARE_YOLO_URL}elseif($env:YOLO_API_URL){$env:YOLO_API_URL}else{'http://127.0.0.1:8005/health'}
$checks=[ordered]@{ Django="http://${lan}:8000/api/v1/schema/"; FastAPI=$fastApi; YOLO=$yolo }
foreach($entry in $checks.GetEnumerator()){ try { $r=Invoke-WebRequest -Uri $entry.Value -UseBasicParsing -TimeoutSec 3; Write-Host "$($entry.Key): HEALTHY ($($entry.Value), HTTP $($r.StatusCode))" } catch { Write-Host "$($entry.Key): DOWN ($($entry.Value))" } }
Write-Host "Expo API URL: http://${lan}:8000"
