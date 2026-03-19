@echo off
chcp 65001 >nul
title Deploy Message Limit Update to VPS 152.42.229.212
echo ==========================================
echo   Deploy: Message Limit 50 -^> 1000
echo   VPS: 152.42.229.212
echo ==========================================
echo.
echo [*] CARA DEPLOY MANUAL:
echo.
echo Step 1: Download WinSCP
echo   https://winscp.net/eng/download.php
echo.
echo Step 2: Buka WinSCP dan login:
echo   - File protocol: SFTP
echo   - Host name: 152.42.229.212
echo   - User name: root
echo   - Password: %%0^|F?H@f!berhO3e
echo.
echo Step 3: Copy 3 file ke VPS:
echo.
echo   Dari: server\server.js
echo   Ke: /opt/workgrid/server/server.js
echo.
echo   Dari: server\database.js
echo   Ke: /opt/workgrid/server/database.js
echo.
echo   Dari: server\database-postgres.js
echo   Ke: /opt/workgrid/server/database-postgres.js
echo.
echo Step 4: SSH ke VPS dan restart:
echo   ssh root@152.42.229.212
echo   cd /opt/workgrid ^&^& docker-compose restart backend
echo.
echo ==========================================
echo.
echo Mau buka WinSCP download page? (y/n)
set /p choice="Pilihan: "

if "%choice%"=="y" (
    start https://winscp.net/eng/download.php
)

echo.
echo File yang perlu di-copy:
dir "server\server.js" "server\database.js" "server\database-postgres.js" /b
echo.
pause
