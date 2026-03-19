@echo off
chcp 65001 >nul
echo ========================================
echo   WorkGrid VPS Deployment Tool
echo ========================================
echo.

:: Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Run the deployment script
echo Starting deployment to 152.42.229.212...
echo.

python "%~dp0deploy_vps.py"

if errorlevel 1 (
    echo.
    echo [FAILED] Deployment failed!
    pause
    exit /b 1
) else (
    echo.
    echo [SUCCESS] Deployment completed!
    pause
    exit /b 0
)
