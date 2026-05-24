@echo off
:: ═══════════════════════════════════════════════════════════
::  IMS-Pro — First-Time Setup Script (Windows)
::  Usage:  setup.bat [SERVER_IP]
::  Example: setup.bat 192.168.1.100
:: ═══════════════════════════════════════════════════════════
setlocal EnableDelayedExpansion

:: ─── Detect server IP ──────────────────────────────────────
if not "%~1"=="" (
  set "SERVER_IP=%~1"
) else (
  for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "RAW=%%a"
    set "SERVER_IP=!RAW: =!"
    goto :ip_found
  )
  set "SERVER_IP=localhost"
)
:ip_found
echo [INFO]  Server IP detected: %SERVER_IP%

:: ─── 1. Check Docker ───────────────────────────────────────
echo.
echo ^> Checking prerequisites...
docker --version >nul 2>&1 || (
  echo [ERR]  Docker is not installed.
  echo        Download: https://docs.docker.com/desktop/windows/
  pause & exit /b 1
)
docker info >nul 2>&1 || (
  echo [ERR]  Docker Desktop is not running. Start it and try again.
  pause & exit /b 1
)
docker compose version >nul 2>&1 || (
  echo [ERR]  Docker Compose not found. Upgrade Docker Desktop.
  pause & exit /b 1
)
echo [INFO]  Docker OK.

:: ─── 2. Generate .env ──────────────────────────────────────
echo.
echo ^> Setting up environment...
if not exist ".env" (
  if not exist ".env.example" (
    echo [ERR]  .env.example not found. Run from the ims-pro folder.
    pause & exit /b 1
  )
  copy ".env.example" ".env" >nul

  :: Generate secrets with PowerShell
  for /f "delims=" %%i in ('powershell -NoProfile -Command "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))"') do set "JWT_SECRET=%%i"
  for /f "delims=" %%i in ('powershell -NoProfile -Command "[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))"') do set "JWT_REFRESH=%%i"

  powershell -NoProfile -Command "$c=(Get-Content '.env'); $c=$c -replace 'JWT_SECRET=.*',('JWT_SECRET='+$env:JWT_SECRET); $c=$c -replace 'JWT_REFRESH_SECRET=.*',('JWT_REFRESH_SECRET='+$env:JWT_REFRESH); $c=$c -replace 'CORS_ORIGIN=.*','CORS_ORIGIN=http://%SERVER_IP%'; $c=$c -replace 'NEXT_PUBLIC_API_URL=.*','NEXT_PUBLIC_API_URL=http://%SERVER_IP%/api'; $c | Set-Content '.env'"
  echo [INFO]  .env created with secure auto-generated secrets.
) else (
  echo [WARN]  .env already exists — skipping. Edit manually if needed.
)

:: ─── 3. Create directories ─────────────────────────────────
echo.
echo ^> Creating directories...
if not exist "backups" mkdir backups
if not exist "uploads" mkdir uploads
echo [INFO]  backups\ and uploads\ ready.

:: ─── 4. Build and start containers ────────────────────────
echo.
echo ^> Building and starting Docker containers (this may take several minutes)...
docker compose up -d --build
if %errorlevel% neq 0 (
  echo [ERR]  Docker Compose failed. See output above.
  pause & exit /b 1
)

:: ─── 5. Wait for PostgreSQL ────────────────────────────────
echo.
echo ^> Waiting for PostgreSQL to be ready...
set /a attempts=0
:wait_loop
  docker compose exec -T postgres pg_isready -U imspro >nul 2>&1 && goto :pg_ready
  set /a attempts+=1
  if %attempts% geq 30 (
    echo [ERR]  PostgreSQL did not start. Check: docker compose logs postgres
    pause & exit /b 1
  )
  timeout /t 2 /nobreak >nul
  goto :wait_loop
:pg_ready
echo [INFO]  PostgreSQL is ready.

:: ─── 6. Seed database ──────────────────────────────────────
echo.
echo ^> Seeding initial data...
docker compose exec -T api node_modules\.bin\tsx packages\db\prisma\seed.ts
if %errorlevel% equ 0 (
  echo [INFO]  Database seeded successfully.
) else (
  echo [WARN]  Seed may have already run (safe to ignore on re-install).
)

:: ─── 7. Schedule daily backup via Windows Task Scheduler ──
echo.
echo ^> Scheduling daily backup at 02:00...
schtasks /query /tn "IMS-Pro Backup" >nul 2>&1 && (
  echo [WARN]  Backup task already exists.
) || (
  schtasks /create /tn "IMS-Pro Backup" /tr "cmd /c cd /d \"%CD%\" && scripts\backup.bat >> logs\backup.log 2>&1" /sc daily /st 02:00 /f >nul
  echo [INFO]  Daily backup task created (runs at 02:00 AM).
)

:: ─── 8. Done ───────────────────────────────────────────────
echo.
echo ══════════════════════════════════════════════════════
echo   IMS-Pro is ready!
echo ══════════════════════════════════════════════════════
echo   Open from any device on the network:
echo     http://%SERVER_IP%
echo.
echo   Default login:  admin / admin123
echo.
echo   IMPORTANT: Change the admin password in:
echo   Settings -^> User Management -^> Edit Admin
echo ══════════════════════════════════════════════════════
pause
endlocal
