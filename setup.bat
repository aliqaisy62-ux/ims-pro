@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  IMS-Pro - Setup Script
echo ============================================

:: Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not running. Please start it and try again.
    pause
    exit /b 1
)

:: Copy .env if not exists
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo [OK] Created .env from .env.example
        echo [WARN] Please edit .env and set your JWT secrets before production use.
    ) else (
        echo [ERROR] .env.example not found. Cannot create .env
        pause
        exit /b 1
    )
) else (
    echo [OK] .env already exists
)

:: Install dependencies
echo.
echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)

:: Start database
echo.
echo [INFO] Starting PostgreSQL database...
docker-compose up -d postgres
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start database
    pause
    exit /b 1
)

:: Wait for DB to be healthy
echo [INFO] Waiting for database to be ready...
timeout /t 10 /nobreak >nul

:: Run migrations
echo.
echo [INFO] Running database migrations...
call npm run db:migrate
if %errorlevel% neq 0 (
    echo [ERROR] Migration failed
    pause
    exit /b 1
)

:: Run seed
echo.
echo [INFO] Seeding database...
call npm run db:seed
if %errorlevel% neq 0 (
    echo [ERROR] Seed failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Setup complete!
echo  Default login: admin / admin123
echo  API: http://localhost:4000
echo  Web: http://localhost:3000
echo ============================================
echo.
echo Run "npm run dev" to start in development mode.
pause
