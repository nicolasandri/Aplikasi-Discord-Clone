@echo off
chcp 65001 >nul
title WorkGrid Deployment to VPS 152.42.242.180
echo ==========================================
echo   WorkGrid Deployment
echo   VPS: 152.42.242.180
echo ==========================================
echo.

set VPS_IP=152.42.242.180
set VPS_USER=root
set VPS_PASS=%0|F?H@f!berhO3e

echo [!] Pilih metode deployment:
echo.
echo [1] Deploy otomatis (butuh sshpass)
echo [2] Setup VPS saja (persiapan manual)
echo [3] Copy files saja (jika sudah setup)
echo [4] Build saja (jika files sudah di-copy)
echo.
set /p choice="Pilihan (1-4): "

if "%choice%"=="1" goto AUTO_DEPLOY
if "%choice%"=="2" goto SETUP_ONLY
if "%choice%"=="3" goto COPY_ONLY
if "%choice%"=="4" goto BUILD_ONLY

echo Pilihan tidak valid!
pause
exit /b 1

:AUTO_DEPLOY
echo.
echo [*] Mode: Deploy Otomatis
echo [*] Checking prerequisites...

where sshpass >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] sshpass tidak ditemukan!
    echo [!] Install dulu dengan salah satu cara:
    echo     1. Git Bash:   pacman -S sshpass
    echo     2. Chocolatey: choco install sshpass
    echo     3. Manual:     https://sourceforge.net/projects/sshwindows/
    echo.
    echo [!] Atau gunakan opsi 2-4 untuk deploy manual step-by-step.
    pause
    exit /b 1
)

echo [*] Menjalankan deploy-master.sh...
bash deploy-master.sh
pause
exit /b

:SETUP_ONLY
echo.
echo [*] Mode: Setup VPS saja
echo [*] Membuat direktori dan config di VPS...

:: Create setup script
echo #!/bin/bash > "%TEMP%\setup_vps.sh"
echo mkdir -p /opt/workgrid >> "%TEMP%\setup_vps.sh"
echo cd /opt/workgrid >> "%TEMP%\setup_vps.sh"
echo. >> "%TEMP%\setup_vps.sh"
echo # Install Docker if not exists >> "%TEMP%\setup_vps.sh"
echo if ! command -v docker ^&^> /dev/null; then >> "%TEMP%\setup_vps.sh"
echo     apt-get update -qq >> "%TEMP%\setup_vps.sh"
echo     apt-get install -y -qq docker.io docker-compose-v2 git curl openssl >> "%TEMP%\setup_vps.sh"
echo     systemctl enable docker >> "%TEMP%\setup_vps.sh"
echo     systemctl start docker >> "%TEMP%\setup_vps.sh"
echo fi >> "%TEMP%\setup_vps.sh"
echo. >> "%TEMP%\setup_vps.sh"
echo # Create .env >> "%TEMP%\setup_vps.sh"
echo cat ^> /opt/workgrid/.env ^<^< 'EOF' >> "%TEMP%\setup_vps.sh"
echo DB_PASSWORD=WorkGrid2024SecurePass! >> "%TEMP%\setup_vps.sh"
echo JWT_SECRET=$(openssl rand -base64 32) >> "%TEMP%\setup_vps.sh"
echo FRONTEND_URL=http://%VPS_IP% >> "%TEMP%\setup_vps.sh"
echo NODE_ENV=production >> "%TEMP%\setup_vps.sh"
echo ALLOWED_ORIGINS=http://%VPS_IP%,https://%VPS_IP% >> "%TEMP%\setup_vps.sh"
echo EOF >> "%TEMP%\setup_vps.sh"
echo. >> "%TEMP%\setup_vps.sh"
echo echo "Setup complete!" >> "%TEMP%\setup_vps.sh"

echo [*] Copy setup script ke VPS...
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "%TEMP%\setup_vps.sh" %VPS_USER%@%VPS_IP%:/tmp/

echo [*] Running setup script...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null %VPS_USER%@%VPS_IP% "bash /tmp/setup_vps.sh"

echo.
echo [✓] VPS Setup selesai!
echo [*] Langkah selanjutnya: Copy project files dengan WinSCP atau rsync
echo.
pause
exit /b

:COPY_ONLY
echo.
echo [*] Mode: Copy Files saja
echo [*] Pastikan Anda sudah menginstall rsync atau gunakan WinSCP
echo.
echo [!] Jika punya rsync (Git Bash/WSL), jalankan command berikut:
echo.
echo     rsync -avz --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' ./ %VPS_USER%@%VPS_IP%:/opt/workgrid/
echo.
echo [!] Atau gunakan WinSCP untuk copy folder project ke /opt/workgrid/
echo.
pause
exit /b

:BUILD_ONLY
echo.
echo [*] Mode: Build saja
echo [*] Menjalankan build di VPS...

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null %VPS_USER%@%VPS_IP% "cd /opt/workgrid && docker compose down 2>/dev/null || true && docker compose build --no-cache && docker compose up -d"

echo.
echo [*] Menunggu services start...
timeout /t 10 /nobreak >nul

echo [*] Checking status...
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null %VPS_USER%@%VPS_IP% "cd /opt/workgrid && docker compose ps"

echo.
echo [✓] Build selesai!
echo [*] Akses aplikasi di: http://%VPS_IP%
echo.
pause
exit /b
