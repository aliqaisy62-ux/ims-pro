#Requires -Version 5.1
<#
.SYNOPSIS
    IMS-Pro Windows installer build pipeline.
    Run from any directory; script locates the monorepo root automatically.

.DESCRIPTION
    Step 1 - Bundle Express API with esbuild  (single server.js, no node_modules)
    Step 2 - Copy Prisma native binary        (query_engine-windows.dll.node)
    Step 3 - Copy node.exe into staging       (so clients need no Node.js install)
    Step 4 - Build Next.js standalone output  (NEXT_PUBLIC_API_URL baked in)
    Step 5 - Assemble web staging folder      (standalone + static + public)
    Step 6 - Copy pre-seeded SQLite template  (seed.db -> assets/)
    Step 7 - Run electron-builder             (NSIS installer + portable .exe)

.OUTPUT
    apps/desktop/dist/
      IMS-Pro Setup <version>.exe    <- NSIS installer
      IMS-Pro <version>.exe          <- portable single-file exe
#>

$ErrorActionPreference = 'Stop'
$Root    = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Desktop = $PSScriptRoot

function Write-Step($n, $msg) { Write-Host "`n[$n/7] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)        { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail($msg)      { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  +----------------------------------------------+" -ForegroundColor Blue
Write-Host "  |  IMS-Pro - Windows Desktop Build Pipeline    |" -ForegroundColor Blue
Write-Host "  +----------------------------------------------+" -ForegroundColor Blue
Write-Host "  Root : $Root"
Write-Host "  Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# --- Clean staging ---
$StagingApi  = Join-Path $Desktop 'staging\api'
$StagingWeb  = Join-Path $Desktop 'staging\web'
$StagingNode = Join-Path $Desktop 'staging\node'
$AssetsDir   = Join-Path $Desktop 'assets'

foreach ($d in @($StagingApi, $StagingWeb, $StagingNode, $AssetsDir)) {
  if (Test-Path $d) { Remove-Item $d -Recurse -Force }
  New-Item -ItemType Directory -Force $d | Out-Null
}

# ============================================================
# STEP 1 - Bundle Express API with esbuild
# ============================================================
Write-Step 1 "Bundling Express API (esbuild)..."

Push-Location (Join-Path $Root 'apps\api')
try {
  node build-electron.mjs
  if (-not (Test-Path "$StagingApi\server.js")) { Write-Fail "esbuild output not found" }
  Write-Ok "API bundled: $([math]::Round((Get-Item "$StagingApi\server.js").Length/1KB)) KB"
} catch { Write-Fail "esbuild failed: $_" }
finally { Pop-Location }

# ============================================================
# STEP 2 - Copy Prisma native binary + client JS
# ============================================================
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

# ============================================================
# STEP 3 - Copy bundled node.exe (zero client dependencies)
# ============================================================
Write-Step 3 "Copying node.exe into staging (bundles Node.js runtime)..."

$NodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $NodeCmd) { $NodeCmd = Get-Command node -ErrorAction Stop }
$NodeExe = $NodeCmd.Source
if (-not (Test-Path $NodeExe)) { Write-Fail "node.exe not found at: $NodeExe" }

Copy-Item -Force $NodeExe (Join-Path $StagingNode 'node.exe')
Write-Ok "node.exe copied ($([math]::Round((Get-Item $NodeExe).Length/1MB, 1)) MB) from $NodeExe"

# ============================================================
# STEP 4 - Build Next.js (standalone output)
# ============================================================
Write-Step 4 "Building Next.js (standalone mode)..."

Push-Location (Join-Path $Root 'apps\web')
try {
  $env:NEXT_PUBLIC_API_URL    = 'http://localhost:4001'
  $env:NODE_ENV               = 'production'
  $env:NEXT_OUTPUT_STANDALONE = '1'   # tells next.config.mjs to use standalone output
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Fail "Next.js build exited with code $LASTEXITCODE" }
  $standaloneDir = Join-Path $Root 'apps\web\.next\standalone'
  if (-not (Test-Path $standaloneDir)) { Write-Fail "Next.js standalone output not found" }
  Write-Ok "Next.js build complete"
} catch { Write-Fail "Next.js build failed: $_" }
finally { Pop-Location }

# ============================================================
# STEP 5 - Assemble web staging (standalone + static + public)
# ============================================================
Write-Step 5 "Assembling web staging folder..."

$WebSrc      = Join-Path $Root 'apps\web'
$Standalone  = Join-Path $WebSrc '.next\standalone'
$NextStatic  = Join-Path $WebSrc '.next\static'
$PublicDir   = Join-Path $WebSrc 'public'

Copy-Item -Recurse -Force "$Standalone\*" "$StagingWeb\"

# In a monorepo, Next.js standalone places server.js at apps/web/server.js.
# Static assets and public must live alongside server.js so the server can find them.
$WebAppDir  = Join-Path $StagingWeb 'apps\web'
New-Item -ItemType Directory -Force $WebAppDir | Out-Null

$DestStatic = Join-Path $WebAppDir '.next\static'
$DestPublic = Join-Path $WebAppDir 'public'

if (Test-Path $DestStatic) { Remove-Item $DestStatic -Recurse -Force }
Copy-Item -Recurse -Force $NextStatic $DestStatic

if (Test-Path $DestPublic) { Remove-Item $DestPublic -Recurse -Force }
if (Test-Path $PublicDir)  { Copy-Item -Recurse -Force $PublicDir $DestPublic }

Write-Ok "Web staging assembled"

# ============================================================
# STEP 6 - Copy pre-seeded SQLite template
# ============================================================
Write-Step 6 "Preparing seed database template..."

$DbSrc  = Join-Path $Root 'data\cashier.db'
$DbDest = Join-Path $AssetsDir 'seed.db'

if (-not (Test-Path $DbSrc)) {
  Write-Host "  cashier.db not found - running seed..." -ForegroundColor Yellow
  Push-Location (Join-Path $Root 'packages\db')
  $env:DATABASE_URL = "file:../../../data/cashier.db"
  npx prisma migrate deploy --schema prisma/schema.prisma 2>&1 | Out-Null
  npx prisma db seed 2>&1 | Out-Null
  Pop-Location
}

Copy-Item -Force $DbSrc $DbDest
Write-Ok "seed.db: $([math]::Round((Get-Item $DbDest).Length/1KB)) KB (seeded — set SEED_ADMIN_PASSWORD before distributing)"

# ============================================================
# STEP 7 - Electron-builder
# ============================================================
Write-Step 7 "Running electron-builder (NSIS + portable)..."

Push-Location $Desktop
try {
  # Use electron-builder from root node_modules (installed as root devDependency)
  $eb = Join-Path $Root 'node_modules\.bin\electron-builder.cmd'
  if (-not (Test-Path $eb)) { Write-Fail "electron-builder not found. Run: npm install from the monorepo root first." }

  & $eb --win --x64
  if ($LASTEXITCODE -ne 0) { Write-Fail "electron-builder exited with code $LASTEXITCODE" }
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

# --- Done ---
Write-Host ""
Write-Host "  +----------------------------------------------+" -ForegroundColor Green
Write-Host "  |  BUILD COMPLETE                              |" -ForegroundColor Green
Write-Host "  |                                              |" -ForegroundColor Green
Write-Host "  |  Installer: apps/desktop/dist/              |" -ForegroundColor Green
Write-Host "  |                                              |" -ForegroundColor Green
Write-Host "  |  First-run: copies seed.db to %APPDATA%     |" -ForegroundColor Green
Write-Host "  |  Login: use account from SEED_ADMIN_PASSWORD |" -ForegroundColor Green
Write-Host "  +----------------------------------------------+" -ForegroundColor Green
