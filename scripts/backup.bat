@echo off
:: ═══════════════════════════════════════════════════════════
::  IMS-Pro — PostgreSQL Backup Script (Windows)
::
::  Run manually:   scripts\backup.bat
::  Scheduled via Task Scheduler (created by setup.bat)
:: ═══════════════════════════════════════════════════════════
setlocal

set "DB_CONTAINER=ims-pro-db"
set "DB_USER=imspro"
set "DB_NAME=ims_pro"
set "BACKUP_RETENTION_DAYS=30"

:: Load retention days from .env if present
for /f "tokens=2 delims==" %%a in ('findstr /i "BACKUP_RETENTION_DAYS" .env 2^>nul') do set "BACKUP_RETENTION_DAYS=%%a"

:: Build timestamp
for /f "tokens=1-6 delims=/: " %%a in ('echo %date% %time%') do (
  set "YY=%%a" & set "MM=%%b" & set "DD=%%c"
  set "HH=%%d" & set "MIN=%%e" & set "SS=%%f"
)
set "TIMESTAMP=%YY%%MM%%DD%_%HH%%MIN%%SS%"
set "FILENAME=backup_%TIMESTAMP%.sql.gz"
set "BACKUP_DIR=%~dp0..\backups"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [%date% %time%] Starting backup: %FILENAME%

:: Dump via docker exec — no local pg_dump needed
docker exec %DB_CONTAINER% pg_dump -U %DB_USER% %DB_NAME% | gzip > "%BACKUP_DIR%\%FILENAME%"

if %errorlevel% equ 0 (
  echo [%date% %time%] Backup saved: %BACKUP_DIR%\%FILENAME%
) else (
  echo [%date% %time%] [ERR] Backup failed. Is Docker running?
  exit /b 1
)

:: Remove old backups using PowerShell
powershell -NoProfile -Command ^
  "Get-ChildItem '%BACKUP_DIR%' -Filter 'backup_*.sql.gz' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-%BACKUP_RETENTION_DAYS%) } | Remove-Item -Force"

echo [%date% %time%] Backup complete.
endlocal
