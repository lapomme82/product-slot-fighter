$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LauncherRoot = Join-Path $ProjectRoot "launcher"
$ReleaseRoot = Join-Path $ProjectRoot "release"
$ZipPath = Join-Path $LauncherRoot "dist.zip"
$PublishRoot = Join-Path $LauncherRoot "publish"
$FinalExe = Join-Path $ReleaseRoot "WuxiaSlotTournament.exe"

Set-Location $ProjectRoot

Write-Host "Building web app..."
npm run build

Write-Host "Packing dist assets..."
if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $ProjectRoot "dist\*") -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Host "Publishing single executable..."
if (Test-Path $PublishRoot) {
  Remove-Item -LiteralPath $PublishRoot -Recurse -Force
}
dotnet publish (Join-Path $LauncherRoot "WuxiaSlotTournament.Launcher.csproj") `
  -c Release `
  -r win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:EnableCompressionInSingleFile=true `
  -o $PublishRoot

New-Item -ItemType Directory -Force -Path $ReleaseRoot | Out-Null
Copy-Item -LiteralPath (Join-Path $PublishRoot "WuxiaSlotTournament.exe") -Destination $FinalExe -Force

Write-Host "Done:"
Write-Host $FinalExe
