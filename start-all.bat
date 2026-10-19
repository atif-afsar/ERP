@echo off
title EduNexus ERP - Launcher
echo ===================================================
echo        Launching EduNexus ERP Platform
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting PostgreSQL Database...
start "EduNexus - PostgreSQL" cmd /k "wsl -d docker-desktop -e sh /mnt/host/c/Users/asus/Desktop/ERP/backend/run_pg.sh"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend API Server (Port 5000)...
start "EduNexus - Backend API" cmd /k "npm run dev:backend"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend Dev Server (Port 5173)...
start "EduNexus - Frontend" cmd /k "npm run dev:frontend"

echo.
echo ===================================================
echo  All 3 services have been launched in separate windows!
echo.
echo  Frontend URL:     http://localhost:5173
echo  Sign In Page:     http://localhost:5173/#login
echo  Super Admin:      http://localhost:5173/#super-admin
echo  Backend Health:   http://localhost:5000/health
echo ===================================================
echo.
pause
