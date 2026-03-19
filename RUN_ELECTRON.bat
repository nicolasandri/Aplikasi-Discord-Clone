@echo off
echo =========================================
echo  WorkGrid Electron - Test Mode
echo =========================================
echo.
echo Memulai aplikasi WorkGrid...
echo.
cd /d "%~dp0\app"
npm run electron
pause
