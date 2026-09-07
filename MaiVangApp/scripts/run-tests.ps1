$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root '.test-build'
if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output -Recurse -Force
}
New-Item -ItemType Directory -Path $output | Out-Null
$tests = @(Get-ChildItem -LiteralPath (Join-Path $root 'src') -Filter '*.test.ts' -Recurse | ForEach-Object FullName)
if (-not $tests.Count) { throw 'No tests found.' }
$esbuild = Join-Path $root 'node_modules\@esbuild\win32-x64\esbuild.exe'
& $esbuild @tests --bundle --platform=node --format=cjs --external:expo-file-system/legacy --outdir=$output
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$built = @(Get-ChildItem -LiteralPath $output -Filter '*.test.js' -Recurse | ForEach-Object FullName)
& node --test --test-isolation=none @built
exit $LASTEXITCODE
