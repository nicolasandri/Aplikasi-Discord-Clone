@echo off
chcp 65001 >nul
echo.
echo 🚀 WorkGrid Deployment - Step 1: Copy Files to VPS
echo ==================================================
echo.
echo VPS: 152.42.242.180
echo User: root
echo.
echo ⚠️  Anda akan diminta password VPS
echo    Password: %%0^|F?H@f!berhO3e
echo.
echo [Tekan Enter untuk mulai copy file...]
pause >nul

echo.
echo 📦 Copying project archive to VPS...
scp workgrid-ready-deploy.tar.gz root@152.42.242.180:/tmp/
if errorlevel 1 (
    echo ❌ Failed to copy archive
    pause
    exit /b 1
)

echo.
echo 📦 Copying deploy script to VPS...
scp deploy-to-vps.sh root@152.42.242.180:/tmp/
if errorlevel 1 (
    echo ❌ Failed to copy deploy script
    pause
    exit /b 1
)

echo.
echo ✅ Files copied successfully!
echo.
echo =========================================
echo NEXT STEP: SSH ke VPS dan jalankan deploy
echo =========================================
echo.
echo Jalankan perintah:
echo   ssh root@152.42.242.180
echo.
echo Lalu di VPS jalankan:
echo   bash /tmp/deploy-to-vps.sh
echo.
pause
