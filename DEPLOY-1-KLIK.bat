@echo off
chcp 65001 >nul
echo.
echo 🚀 WORKGRID - DEPLOY 1 KLIK KE VPS
echo ===================================
echo.
echo VPS: 152.42.242.180
echo GitHub: https://github.com/nicolasandri/Aplikasi-Discord-Clone
echo.
echo =========================================
echo CARA DEPLOY (Pilih salah satu):
echo =========================================
echo.
echo [METODE 1 - PALING MUDAH]
echo Jalankan 1 command di VPS:
echo.
echo    curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deploy-from-github.sh ^| bash
echo.
echo =========================================
echo.
echo [METODE 2 - Manual Step-by-Step]
echo.
echo 1. SSH ke VPS:
echo    ssh root@152.42.242.180
echo    Password: %%0^|F?H@f!berhO3e
echo.
echo 2. Clone repo:
echo    cd /opt ^&^& git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git workgrid
echo.
echo 3. Deploy:
echo    cd workgrid ^&^& bash deploy-from-github.sh
echo.
echo =========================================
echo.
pause
