# IMS-Pro — Windows Desktop Build Script
# Run from: apps/desktop  OR  root of monorepo
# Usage: .\apps\desktop\build.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "../../")

Write-Host "`n[1/5] Installing desktop dependencies..." -ForegroundColor Cyan
Set-Location "$root\apps\desktop"
npm install

Write-Host "`n[2/5] Building Express API..." -ForegroundColor Cyan
Set-Location "$root\apps\api"
npm run build

Write-Host "`n[3/5] Building Next.js (standalone)..." -ForegroundColor Cyan
Set-Location "$root\apps\web"
npm run build

Write-Host "`n[4/5] Copying static assets into standalone..." -ForegroundColor Cyan
$standalone = "$root\apps\web\.next\standalone"
$static     = "$root\apps\web\.next\static"
$public     = "$root\apps\web\public"

if (Test-Path "$standalone\.next\static") { Remove-Item -Recurse -Force "$standalone\.next\static" }
Copy-Item -Recurse -Force $static "$standalone\.next\static"

if (Test-Path "$standalone\public") { Remove-Item -Recurse -Force "$standalone\public" }
Copy-Item -Recurse -Force $public "$standalone\public"

Write-Host "`n[5/5] Packaging Electron installer..." -ForegroundColor Cyan
Set-Location "$root\apps\desktop"
npm run build:win

Write-Host "`n✅ Build complete! Installer is in: apps/desktop/dist/" -ForegroundColor Green
Set-Location $root
