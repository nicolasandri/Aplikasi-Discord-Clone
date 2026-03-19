@echo off
echo ==========================================
echo   DEPLOY: Message Limit 50 -^> 1000
echo ==========================================
echo.
echo [*] Copy file dengan password...
echo.

set VPS_IP=152.42.229.212
set VPS_USER=root

:: Create temporary script for commands
set TEMP_CMD=%TEMP%\deploy_cmds.txt
echo cd /opt/workgrid/server ^> %TEMP_CMD%
echo put server\server.js ^>^> %TEMP_CMD%
echo put server\database.js ^>^> %TEMP_CMD%
echo put server\database-postgres.js ^>^> %TEMP_CMD%
echo exit ^>^> %TEMP_CMD%

echo [*] Instruksi manual:
echo.
echo 1. Buka WinSCP atau FileZilla
echo 2. Login ke %VPS_IP% dengan user root
echo 3. Password: %%0^|F?H@f!berhO3e
echo 4. Copy 3 file ke /opt/workgrid/server/:
echo    - server.js
echo    - database.js
echo    - database-postgres.js
echo 5. SSH ke VPS dan jalankan:
echo    cd /opt/workgrid ^&^& docker-compose restart backend
echo.

:: Try with wsl sshpass if available
wsl which sshpass >nul 2>&1
if %errorlevel% equ 0 (
    echo [*] sshpass tersedia, mencoba deploy otomatis...
    wsl sshpass -p '%0|F?H@f!berhO3e' scp -o StrictHostKeyChecking=no server/server.js root@152.42.229.212:/opt/workgrid/server/
    wsl sshpass -p '%0|F?H@f!berhO3e' scp -o StrictHostKeyChecking=no server/database.js root@152.42.229.212:/opt/workgrid/server/
    wsl sshpass -p '%0|F?H@f!berhO3e' scp -o StrictHostKeyChecking=no server/database-postgres.js root@152.42.229.212:/opt/workgrid/server/
    wsl sshpass -p '%0|F?H@f!berhO3e' ssh -o StrictHostKeyChecking=no root@152.42.229.212 "cd /opt/workgrid && docker-compose restart backend"
    echo.
    echo [✓] Deploy selesai!
) else (
    echo [!] sshpass tidak tersedia, gunakan WinSCP manual
echo    https://winscp.net/eng/download.php
    start https://winscp.net/eng/download.php
)

echo.
pause
