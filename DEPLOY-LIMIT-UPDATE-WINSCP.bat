@echo off
chcp 65001 >nul
title Deploy Message Limit Update - WorkGrid
echo ==========================================
echo   Deploy: Message Limit 50 -^> 1000
echo ==========================================
echo.
echo [*] IP VPS Backend: 152.42.229.212
echo [*] User: root
echo [*] Password: %%0^|F?H@f!berhO3e
echo.
echo ==========================================
echo   CARA DEPLOY DENGAN WINSCP
echo ==========================================
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
echo Step 3: Copy file ke VPS:
echo   Local: server\server.js
echo   Remote: /opt/workgrid/server/server.js
echo.
echo   Local: server\database.js  
echo   Remote: /opt/workgrid/server/database.js
echo.
echo   Local: server\database-postgres.js
echo   Remote: /opt/workgrid/server/database-postgres.js
echo.
echo Step 4: SSH ke VPS dan restart:
echo   ssh root@152.42.229.212
echo   cd /opt/workgrid ^&^& docker-compose restart backend
echo.
echo ==========================================
echo.
echo Mau buka WinSCP sekarang? (y/n)
set /p choice="Pilihan: "

if "%choice%"=="y" (
    start https://winscp.net/eng/download.php
)

echo.
echo File yang perlu di-copy sudah siap di folder:
echo   - server\server.js
echo   - server\database.js
echo   - server\database-postgres.js
echo.
pause
