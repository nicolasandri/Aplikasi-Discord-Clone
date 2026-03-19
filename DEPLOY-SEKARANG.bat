@echo off
chcp 65001 >nul
title 🚀 Deploy Message Limit Update
echo ==========================================
echo   DEPLOY: Message Limit 50 -^> 1000
echo   VPS Backend: 152.42.229.212
echo ==========================================
echo.

set VPS_IP=152.42.229.212
set VPS_USER=root
set VPS_PASS=%0|F?H@f!berhO3e

echo [*] VPS Backend: %VPS_IP%
echo [*] File yang akan di-deploy:
echo    1. server.js
echo    2. database.js
echo    3. database-postgres.js
echo.

:: Check if WinSCP is installed
if exist "C:\Program Files\WinSCP\WinSCP.exe" (
    echo [✓] WinSCP ditemukan
    set WINSCP="C:\Program Files\WinSCP\WinSCP.exe"
    goto DEPLOY
)

if exist "C:\Program Files (x86)\WinSCP\WinSCP.exe" (
    echo [✓] WinSCP ditemukan
    set WINSCP="C:\Program Files (x86)\WinSCP\WinSCP.exe"
    goto DEPLOY
)

echo [!] WinSCP tidak ditemukan!
echo.
echo [*] Silakan install WinSCP terlebih dahulu:
echo    https://winscp.net/eng/download.php
echo.
echo [*] Atau deploy manual dengan cara:
echo.
echo    1. Download WinSCP
echo    2. Login ke %VPS_IP% dengan user root
echo    3. Copy file berikut:
echo       - server\server.js ^-^> /opt/workgrid/server/
echo       - server\database.js ^-^> /opt/workgrid/server/
echo       - server\database-postgres.js ^-^> /opt/workgrid/server/
echo    4. SSH ke VPS dan jalankan:
echo       cd /opt/workgrid ^&^& docker-compose restart backend
echo.
start https://winscp.net/eng/download.php
pause
exit /b 1

:DEPLOY
echo.
echo [*] Memulai deploy dengan WinSCP...
echo.

:: Create temporary script for WinSCP
set TEMP_SCRIPT=%TEMP%\winscp_deploy.txt
echo option batch on > %TEMP_SCRIPT%
echo option confirm off >> %TEMP_SCRIPT%
echo open sftp://root:%%0%%7CF%%3fH%%40f%%21berhO3e@152.42.229.212/ -hostkey=* >> %TEMP_SCRIPT%
echo put "%~dp0server\server.js" /opt/workgrid/server/ >> %TEMP_SCRIPT%
echo put "%~dp0server\database.js" /opt/workgrid/server/ >> %TEMP_SCRIPT%
echo put "%~dp0server\database-postgres.js" /opt/workgrid/server/ >> %TEMP_SCRIPT%
echo exit >> %TEMP_SCRIPT%

echo [*] Copying files to VPS...
%WINSCP% /script=%TEMP_SCRIPT%

if %errorlevel% neq 0 (
    echo [!] Gagal copy file dengan WinSCP
    del %TEMP_SCRIPT%
    pause
    exit /b 1
)

del %TEMP_SCRIPT%

echo.
echo [✓] File berhasil di-copy!
echo.
echo ==========================================
echo   LANGKAH BERIKUTNYA:
echo ==========================================
echo.
echo Silakan SSH ke VPS dan restart backend:
echo.
echo    ssh root@152.42.229.212
echo    cd /opt/workgrid ^&^& docker-compose restart backend
echo.
echo Atau jika ada PuTTY:
echo    putty -ssh root@152.42.229.212
echo.
pause
