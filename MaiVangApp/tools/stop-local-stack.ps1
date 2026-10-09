$ErrorActionPreference='Stop'
$workspace=Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$pids=Join-Path $workspace '.runtime\pids'
function Stop-ManagedTree([int]$Id){
  Get-CimInstance Win32_Process -Filter "ParentProcessId=$Id" -ErrorAction SilentlyContinue | ForEach-Object { Stop-ManagedTree ([int]$_.ProcessId) }
  Stop-Process -Id $Id -Force -ErrorAction SilentlyContinue
}
foreach($name in @('expo','django','chatbot','yolo')){ $file=Join-Path $pids "$name.pid"; if(Test-Path -LiteralPath $file){ $processId=[int](Get-Content -LiteralPath $file); if(Get-Process -Id $processId -ErrorAction SilentlyContinue){ Stop-ManagedTree $processId }; Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue; Write-Host "Stopped $name" } }
