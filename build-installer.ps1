<# 
.SYNOPSIS
    Build script for Visualize Mechanics NSIS Installer

.DESCRIPTION
    This script builds the complete Visualize Mechanics application including:
    - Python backend executable (via PyInstaller)
    - React frontend (via Vite)
    - Electron application with NSIS installer (via electron-builder)

.EXAMPLE
    .\build-installer.ps1
#>

param(
    [switch]$Clean,
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Visualize Mechanics - NSIS Installer Build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "ERROR: Please run this script from the project root directory"
    exit 1
}

$projectRoot = Get-Location

try {
    # Clean previous builds if requested
    if ($Clean) {
        Write-Host "[0/5] Cleaning previous builds..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "electron-dist" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "frontend/dist" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "backend/dist" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force "backend/build" -ErrorAction SilentlyContinue
        Write-Host "Clean completed." -ForegroundColor Green
        Write-Host ""
    }

    # Install frontend dependencies
    Write-Host "[1/5] Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location "frontend"
    npm ci
    Set-Location $projectRoot
    Write-Host "Frontend dependencies installed." -ForegroundColor Green
    Write-Host ""

    # Install backend dependencies
    if (-not $SkipBackend) {
        Write-Host "[2/5] Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location "backend"
        pip install -e .
        pip install pyinstaller
        Set-Location $projectRoot
        Write-Host "Backend dependencies installed." -ForegroundColor Green
        Write-Host ""
    }

    # Build backend executable with PyInstaller
    if (-not $SkipBackend) {
        Write-Host "[3/5] Building backend executable with PyInstaller..." -ForegroundColor Yellow
        Set-Location "backend"
        python -m PyInstaller backend.spec --clean --noconfirm
        Set-Location $projectRoot
        Write-Host "Backend executable built." -ForegroundColor Green
        Write-Host ""
    }

    # Build frontend
    if (-not $SkipFrontend) {
        Write-Host "[4/5] Building frontend..." -ForegroundColor Yellow
        Set-Location "frontend"
        npm run build
        Set-Location $projectRoot
        Write-Host "Frontend built." -ForegroundColor Green
        Write-Host ""
    }

    # Build NSIS installer with electron-builder
    Write-Host "[5/5] Building NSIS installer with electron-builder..." -ForegroundColor Yellow
    npx electron-builder --win
    Write-Host "NSIS installer built." -ForegroundColor Green
    Write-Host ""

    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "Installer location: electron-dist/" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}
catch {
    Write-Error "Build failed: $_"
    exit 1
}