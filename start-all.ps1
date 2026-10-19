# EduNexus ERP - 1-Click PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       Launching EduNexus ERP Platform             " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/3] Starting PostgreSQL Database..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k wsl -d docker-desktop -e sh /mnt/host/c/Users/asus/Desktop/ERP/backend/run_pg.sh" -WorkingDirectory $root

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting Backend API Server (Port 5000)..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k npm run dev:backend" -WorkingDirectory $root

Start-Sleep -Seconds 3

Write-Host "[3/3] Starting Frontend Dev Server (Port 5173)..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k npm run dev:frontend" -WorkingDirectory $root

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host " All 3 services launched in separate windows!      " -ForegroundColor Green
Write-Host ""
Write-Host " Frontend URL:     http://localhost:5173" -ForegroundColor White
Write-Host " Sign In Page:     http://localhost:5173/#login" -ForegroundColor White
Write-Host " Super Admin:      http://localhost:5173/#super-admin" -ForegroundColor White
Write-Host " Backend Health:   http://localhost:5000/health" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
