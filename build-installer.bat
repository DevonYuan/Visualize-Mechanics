@echo off
REM Build script for Visualize Mechanics NSIS Installer
REM Run this from the project root directory

echo ============================================
echo Visualize Mechanics - NSIS Installer Build
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from the project root directory
    exit /b 1
)

echo [1/5] Installing frontend dependencies...
cd frontend
npm ci
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)
cd ..

echo.
echo [2/5] Installing backend dependencies...
cd backend
pip install -e .
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    exit /b 1
)
pip install pyinstaller
if errorlevel 1 (
    echo ERROR: Failed to install PyInstaller
    exit /b 1
)
cd ..

echo.
echo [3/5] Building backend executable with PyInstaller...
cd backend
python -m PyInstaller backend.spec --clean --noconfirm
if errorlevel 1 (
    echo ERROR: PyInstaller build failed
    exit /b 1
)
cd ..

echo.
echo [4/5] Building frontend...
cd frontend
npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    exit /b 1
)
cd ..

echo.
echo [5/5] Building NSIS installer with electron-builder...
npx electron-builder --win
if errorlevel 1 (
    echo ERROR: electron-builder failed
    exit /b 1
)

echo.
echo ============================================
echo Build completed successfully!
echo Installer location: electron-dist/
echo ============================================