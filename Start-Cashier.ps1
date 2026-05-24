#Requires -Version 5.1
<#
.SYNOPSIS
    IMS-Pro Portable Launcher — starts the full cashier system from any folder.

.DESCRIPTION
    1. Verifies Node.js >= 18 is installed
    2. Installs npm dependencies if node_modules is missing
    3. Initialises the SQLite database if cashier.db does not exist
    4. Optionally downloads the Arabic PDF font (Amiri) if missing
    5. Starts the Express API server (port 4001)
    6. Starts the Next.js web server (port 3001)
    7. Opens the browser automatically

.USAGE
    Right-click  → "Run with PowerShell"
    OR in terminal: .\Start-Cashier.ps1
    OR with flag:   .\Start-Cashier.ps1 -NoBrowser
#>

param(
  [switch]$NoBrowser,
  [switch]$Reset      # drops and recreates the SQLite DB (caution: wipes all data)
)

# ─── Paths (all relative to this script's location) ───────────────────────────
$Root      = $PSScriptRoot
$DataDir   = Join-Path $Root "data"
$DbFile    = Join-Path $DataDir "cashier.db"
$LogsDir   = Join-Path $DataDir "logs"
$BackupDir = Join-Path $DataDir "backups"
$FontDir   = Join-Path $Root "apps\web\public\fonts"
$FontFile  = Join-Path $FontDir "Amiri-Regular.ttf"
$ApiDir    = Join-Path $Root "apps\api"
$WebDir    = Join-Path $Root "apps\web"
$DbSchema  = Join-Path $Root "packages\db\prisma\schema.prisma"

# Absolute SQLite URI — single "file:" prefix + forward slashes (Prisma on Windows)
$DbUrl = "file:" + $DbFile.Replace('\', '/')

# ─── Colour helpers ────────────────────────────────────────────────────────────
function Write-Step  ($msg) { Write-Host "`n► $msg" -ForegroundColor Cyan }
function Write-Ok    ($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn  ($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Fail  ($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

# ─── Banner ───────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║        IMS-Pro — إيتانا  v1.0.0          ║" -ForegroundColor Blue
Write-Host "  ║   نظام إدارة المخزون ونقاط البيع المحلي  ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ─── Step 1: Check Node.js ────────────────────────────────────────────────────
Write-Step "Checking Node.js..."
try {
  $nodeVer = (node --version 2>&1).ToString().TrimStart('v')
  $major   = [int]($nodeVer.Split('.')[0])
  if ($major -lt 18) {
    Write-Fail "Node.js $nodeVer found — version 18+ is required."
    Write-Host "  Download from: https://nodejs.org/en/download" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
  }
  Write-Ok "Node.js v$nodeVer"
} catch {
  Write-Fail "Node.js not found."
  Write-Host "  Download from: https://nodejs.org/en/download" -ForegroundColor Yellow
  Read-Host "Press Enter to exit"
  exit 1
}

# ─── Step 2: Create data directories ──────────────────────────────────────────
Write-Step "Preparing data directories..."
foreach ($dir in @($DataDir, $LogsDir, $BackupDir, $FontDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force $dir | Out-Null
    Write-Ok "Created $dir"
  }
}
Write-Ok "Data directories ready"

# ─── Step 3: Install dependencies ─────────────────────────────────────────────
Write-Step "Checking dependencies..."
if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  Write-Warn "node_modules missing — running npm install (one-time setup, may take a few minutes)..."
  Push-Location $Root
  npm install --silent 2>&1 | Out-Null
  Pop-Location
  Write-Ok "Dependencies installed"
} else {
  Write-Ok "Dependencies present"
}

# ─── Step 4: Database setup ───────────────────────────────────────────────────
Write-Step "Database..."
$env:DATABASE_URL = $DbUrl

if ($Reset -and (Test-Path $DbFile)) {
  Write-Warn "Removing existing database (--Reset flag set)..."
  Remove-Item $DbFile -Force
}

if (-not (Test-Path $DbFile)) {
  Write-Warn "cashier.db not found — creating fresh SQLite database..."
  Push-Location (Join-Path $Root "packages\db")
  npx prisma migrate deploy --schema prisma/schema.prisma 2>&1 | Out-Null
  npx prisma db seed                                        2>&1 | Out-Null
  Pop-Location
  Write-Ok "Database created and seeded (admin/admin123)"
} else {
  Write-Ok "Database ready: $DbFile"
  # Apply any pending migrations silently
  Push-Location (Join-Path $Root "packages\db")
  npx prisma migrate deploy --schema prisma/schema.prisma 2>&1 | Out-Null
  Pop-Location
}

# ─── Step 5: Arabic font (optional, best-effort) ──────────────────────────────
Write-Step "Arabic PDF font..."
if (-not (Test-Path $FontFile) -or (Get-Item $FontFile).Length -lt 10000) {
  Write-Warn "Amiri-Regular.ttf not found — attempting download..."
  $fontUrls = @(
    "https://github.com/alif-type/amiri/releases/download/1.000/amiri-1.000.zip",
    "https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf"
  )
  $downloaded = $false
  foreach ($url in $fontUrls) {
    try {
      if ($url -like "*.zip") {
        $zip = Join-Path $env:TEMP "amiri.zip"
        Invoke-WebRequest $url -OutFile $zip -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
        Expand-Archive $zip -DestinationPath $env:TEMP -Force -ErrorAction Stop
        $ttf = Get-ChildItem $env:TEMP -Recurse -Filter "Amiri-Regular.ttf" | Select-Object -First 1
        if ($ttf) { Copy-Item $ttf.FullName $FontFile -Force; $downloaded = $true; break }
      } else {
        Invoke-WebRequest $url -OutFile $FontFile -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop
        if ((Get-Item $FontFile).Length -gt 10000) { $downloaded = $true; break }
      }
    } catch { }
  }
  if ($downloaded) {
    Write-Ok "Font downloaded: $([math]::Round((Get-Item $FontFile).Length/1KB)) KB"
  } else {
    Write-Warn "Font download failed — PDF reports will use fallback font (Latin only)."
    Write-Warn "Place Amiri-Regular.ttf in: $FontDir"
  }
} else {
  Write-Ok "Amiri font ready ($([math]::Round((Get-Item $FontFile).Length/1KB)) KB)"
}

# ─── Step 6: Kill any stale processes on our ports ────────────────────────────
Write-Step "Clearing ports 4001 and 3001..."
foreach ($port in @(4001, 3001)) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Warn "Killed stale process on port $port"
  }
}
Start-Sleep -Seconds 1
Write-Ok "Ports clear"

# ─── Step 7: Start API server ─────────────────────────────────────────────────
Write-Step "Starting API server (port 4001)..."
$apiEnv = @{
  DATABASE_URL    = $DbUrl
  JWT_SECRET      = "***REMOVED***"
  JWT_REFRESH_SECRET = "***REMOVED***"
  PORT            = "4001"
  NODE_ENV        = "development"
  CORS_ORIGIN     = "http://localhost:3001"
}
foreach ($kv in $apiEnv.GetEnumerator()) { [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value) }

$apiJob = Start-Job -ScriptBlock {
  param($dir, $env)
  foreach ($kv in $env.GetEnumerator()) { [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value) }
  Set-Location $dir
  npm run dev 2>&1
} -ArgumentList $ApiDir, $apiEnv

# Wait for API to be ready (max 30s)
$apiReady = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:4001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $apiReady = $true; break }
  } catch { }
  if ($i % 5 -eq 4) { Write-Host "  ... waiting for API ($($i+1)s)" }
}
if (-not $apiReady) {
  Write-Warn "API may still be starting (no /health response yet, continuing anyway)"
} else {
  Write-Ok "API server ready"
}

# ─── Step 8: Start Web server ─────────────────────────────────────────────────
Write-Step "Starting Web server (port 3001)..."
$webJob = Start-Job -ScriptBlock {
  param($dir, $apiUrl)
  $env:NEXT_PUBLIC_API_URL = $apiUrl
  Set-Location $dir
  npm run dev 2>&1
} -ArgumentList $WebDir, "http://localhost:4001"

# Wait for web to be ready (max 60s)
$webReady = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    if ($r.StatusCode -eq 200) { $webReady = $true; break }
  } catch { }
  if ($i % 10 -eq 9) { Write-Host "  ... waiting for web server ($($i+1)s)" }
}

if ($webReady) {
  Write-Ok "Web server ready"
} else {
  Write-Warn "Web server still starting — browser may show a brief loading screen"
}

# ─── Step 9: Open browser ─────────────────────────────────────────────────────
if (-not $NoBrowser) {
  Write-Step "Opening browser..."
  Start-Process "http://localhost:3001"
  Write-Ok "Browser launched"
}

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║         IMS-Pro is RUNNING               ║" -ForegroundColor Green
Write-Host "  ║                                          ║" -ForegroundColor Green
Write-Host "  ║   App:  http://localhost:3001            ║" -ForegroundColor Green
Write-Host "  ║   API:  http://localhost:4001            ║" -ForegroundColor Green
Write-Host "  ║   DB:   data\cashier.db  (SQLite)        ║" -ForegroundColor Green
Write-Host "  ║                                          ║" -ForegroundColor Green
Write-Host "  ║   Login:  admin / admin123               ║" -ForegroundColor Green
Write-Host "  ║                                          ║" -ForegroundColor Green
Write-Host "  ║   Press Ctrl+C to stop all servers       ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ─── Keep running — show live output and handle Ctrl+C ───────────────────────
try {
  while ($true) {
    Start-Sleep -Seconds 5
    # Forward any output from background jobs
    $apiOut = Receive-Job $apiJob -ErrorAction SilentlyContinue
    $webOut = Receive-Job $webJob -ErrorAction SilentlyContinue
  }
} finally {
  Write-Host "`nShutting down..." -ForegroundColor Yellow
  Stop-Job $apiJob, $webJob -ErrorAction SilentlyContinue
  Remove-Job $apiJob, $webJob -Force -ErrorAction SilentlyContinue
  # Kill any remaining node processes on our ports
  foreach ($port in @(4001, 3001)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) { Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue }
  }
  Write-Host "Goodbye!" -ForegroundColor Cyan
}
