#Requires -Version 5.1
<#
.SYNOPSIS
    IMS-Pro — Full Windows installer build pipeline.
    Run from any directory; script locates the monorepo root automatically.

.DESCRIPTION
    Step 1 — Bundle Express API with esbuild  (single server.js, no node_modules)
    Step 2 — Copy Prisma native binary        (query_engine-windows.dll.node)
    Step 3 — Build Next.js standalone output  (NEXT_PUBLIC_API_URL baked in)
    Step 4 — Assemble web staging folder      (standalone + static + public)
    Step 5 — Copy pre-seeded SQLite template  (seed.db → assets/)
    Step 6 — Run electron-builder             (NSIS installer + portable .exe)

.OUTPUT
    apps/desktop/dist/
      IMS-Pro إيتانا Setup <version>.exe    ← NSIS installer
      IMS-Pro إيتانا <version>.exe           ← portable single-file exe
#>

$ErrorActionPreference = 'Stop'
$Root    = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Desktop = $PSScriptRoot

function Write-Step($n, $msg) { Write-Host "`n[$n/6] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)        { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail($msg)      { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║  IMS-Pro — Windows Desktop Build Pipeline    ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host "  Root : $Root"
Write-Host "  Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# ─── Clean staging ────────────────────────────────────────────────────────────
$StagingApi = Join-Path $Desktop 'staging\api'
$StagingWeb = Join-Path $Desktop 'staging\web'
$AssetsDir  = Join-Path $Desktop 'assets'

foreach ($d in @($StagingApi, $StagingWeb, $AssetsDir)) {
  if (Test-Path $d) { Remove-Item $d -Recurse -Force }
  New-Item -ItemType Directory -Force $d | Out-Null
}

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Bundle Express API with esbuild
# ══════════════════════════════════════════════════════════════════════════════
Write-Step 1 "Bundling Express API (esbuild)..."

Push-Location (Join-Path $Root 'apps\api')
try {
  node build-electron.mjs
  if (-not (Test-Path "$StagingApi\server.js")) { Write-Fail "esbuild output not found" }
  Write-Ok "API bundled: $([math]::Round((Get-Item "$StagingApi\server.js").Length/1KB)) KB"
} catch { Write-Fail "esbuild failed: $_" }
finally { Pop-Location }

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Copy Prisma native binary + client JS
# ══════════════════════════════════════════════════════════════════════════════
Write-Step 2 "Copying Prisma client + native binary..."

$NmRoot         = Join-Path $Root 'node_modules'
$PrismaClient   = Join-Path $NmRoot '@prisma\client'
$PrismaEngine   = Join-Path $NmRoot '.prisma\client'

if (-not (Test-Path $PrismaClient)) { Write-Fail "@prisma/client not found at $PrismaClient" }
if (-not (Test-Path $PrismaEngine)) { Write-Fail ".prisma/client not found at $PrismaEngine" }

$DestClient = Join-Path $StagingApi 'node_modules\@prisma\client'
$DestEngine = Join-Path $StagingApi 'node_modules\.prisma\client'
New-Item -ItemType Directory -Force (Split-Path $DestClient) | Out-Null
New-Item -ItemType Directory -Force (Split-Path $DestEngine) | Out-Null

Copy-Item -Recurse -Force $PrismaClient $DestClient
Copy-Item -Recurse -Force $PrismaEngine $DestEngine

$binary = Get-ChildItem $DestEngine -Filter '*.node' | Select-Object -First 1
if (-not $binary) { Write-Fail "Prisma native binary (.node) not found in $DestEngine" }
Write-Ok "Prisma client copied ($([math]::Round((Get-Item $binary.FullName).Length/1MB, 1)) MB binary)"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Build Next.js (standalone output)
# ══════════════════════════════════════════════════════════════════════════════
Write-Step 3 "Building Next.js (standalone mode)..."

Push-Location (Join-Path $Root 'apps\web')
try {
  $env:NEXT_PUBLIC_API_URL = 'http://localhost:4001'
  $env:NODE_ENV = 'production'
  npm run build 2>&1 | Tee-Object -Variable buildOut | Select-Object -Last 10
  $standaloneDir = Join-Path $Root 'apps\web\.next\standalone'
  if (-not (Test-Path $standaloneDir)) { Write-Fail "Next.js standalone output not found" }
  Write-Ok "Next.js build complete"
} catch { Write-Fail "Next.js build failed: $_" }
finally { Pop-Location }

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Assemble web staging (standalone + static + public)
# ══════════════════════════════════════════════════════════════════════════════
Write-Step 4 "Assembling web staging folder..."

$WebSrc      = Join-Path $Root 'apps\web'
$Standalone  = Join-Path $WebSrc '.next\standalone'
$NextStatic  = Join-Path $WebSrc '.next\static'
$PublicDir   = Join-Path $WebSrc 'public'

# Copy standalone server
Copy-Item -Recurse -Force "$Standalone\*" "$StagingWeb\"

# Next.js docs: copy static assets into the standalone folder
$DestStatic = Join-Path $StagingWeb '.next\static'
$DestPublic = Join-Path $StagingWeb 'public'

if (Test-Path $DestStatic) { Remove-Item $DestStatic -Recurse -Force }
Copy-Item -Recurse -Force $NextStatic $DestStatic

if (Test-Path $DestPublic) { Remove-Item $DestPublic -Recurse -Force }
if (Test-Path $PublicDir)  { Copy-Item -Recurse -Force $PublicDir $DestPublic }

Write-Ok "Web staging assembled"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Copy pre-seeded SQLite template
# ══════════════════════════════════════════════════════════════════════════════
Write-Step 5 "Preparing seed database template..."

$DbSrc  = Join-Path $Root 'data\cashier.db'
$DbDest = Join-Path $AssetsDir 'seed.db'

if (-not (Test-Path $DbSrc)) {
  Write-Host "  cashier.db not found — running seed..." -ForegroundColor Yellow
  Push-Location (Join-Path $Root 'packages\db')
  $env:DATABASE_URL = "file:../../../data/cashier.db"
  npx prisma migrate deploy --schema prisma/schema.prisma 2>&1 | Out-Null
  npx prisma db seed 2>&1 | Out-Null
  Pop-Location
}

Copy-Item -Force $DbSrc $DbDest
Write-Ok "seed.db: $([math]::Round((Get-Item $DbDest).Length/1KB)) KB (admin/admin123 seeded)"

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Electron-builder
# ══════════════════════════════════════════════════════════════════════════════
Write-Step 6 "Running electron-builder (NSIS + portable)..."

Push-Location $Desktop
try {
  npm install --silent 2>&1 | Out-Null
  npx electron-builder --win --x64 2>&1 | Tee-Object -Variable builderOut | Select-Object -Last 15
  $installerDir = Join-Path $Desktop 'dist'
  $exes = Get-ChildItem $installerDir -Filter '*.exe' -ErrorAction SilentlyContinue
  if ($exes) {
    foreach ($exe in $exes) {
      Write-Ok "$($exe.Name)  ($([math]::Round($exe.Length/1MB, 1)) MB)"
    }
  } else {
    Write-Fail "No .exe files found in dist/"
  }
} catch { Write-Fail "electron-builder failed: $_" }
finally { Pop-Location }

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║       BUILD COMPLETE                         ║" -ForegroundColor Green
Write-Host "  ║                                              ║" -ForegroundColor Green
Write-Host "  ║   Installer: apps/desktop/dist/              ║" -ForegroundColor Green
Write-Host "  ║                                              ║" -ForegroundColor Green
Write-Host "  ║   First-run: copies seed.db to %APPDATA%    ║" -ForegroundColor Green
Write-Host "  ║   Login:     admin / admin123                ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green
