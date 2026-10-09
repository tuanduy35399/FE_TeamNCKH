$ErrorActionPreference='Stop'
$frontend=Split-Path $PSScriptRoot -Parent
$workspace=Split-Path (Split-Path $frontend -Parent) -Parent
$backend=Join-Path $workspace 'reference\django-backend'
if(-not (Test-Path -LiteralPath $backend)){ throw "Django reference repo is missing: $backend" }
$historyUrls=Get-Content -LiteralPath (Join-Path $backend 'history\urls.py') -Raw
$historyViews=Get-Content -LiteralPath (Join-Path $backend 'history\views.py') -Raw
$userUrls=Get-Content -LiteralPath (Join-Path $backend 'user\urls.py') -Raw
$diseaseUrls=Get-Content -LiteralPath (Join-Path $backend 'diseases\urls.py') -Raw
$frontendEndpoints=Get-Content -LiteralPath (Join-Path $frontend 'src\api\endpoints.ts') -Raw
$checks=[ordered]@{
  'auth register'=($userUrls -match 'register/'); 'auth login'=($userUrls -match 'login/'); 'auth refresh'=($userUrls -match 'login/refresh/'); 'auth me'=($userUrls -match 'me/');
  'history detail'=($historyUrls -match '<int:pk>/'); 'text chat'=($historyUrls -match '<int:pk>/chat/'); 'image chat'=($historyUrls -match '<int:pk>/chat/image/');
  'disease detail'=($diseaseUrls -match '<int:pk>/'); 'history id response'=($historyViews -match '"history_id"'); 'answer response'=($historyViews -match '"answer"'); 'detections response'=($historyViews -match '"detections"');
  'frontend public prefix'=($frontendEndpoints -match '/api/v1/');
}
$failed=@($checks.GetEnumerator() | Where-Object { -not $_.Value })
if($failed.Count){ throw "Django public contract mismatch: $($failed.Name -join ', ')" }
Write-Host "Django public contract: PASS ($($checks.Count) checks)"
