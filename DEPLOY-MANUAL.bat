@echo off
chcp 65001 >nul
title WorkGrid Manual Deployment
echo ==========================================
echo   WORKGRID DEPLOYMENT TO VPS
echo   IP: 152.42.229.212
echo ==========================================
echo.
echo [!] PASTIKAN ANDA SUDAH:
echo     1. Punya akses SSH ke VPS
echo     2. Punya WinSCP atau rsync
echo.
pause
echo.
echo ==========================================
echo   STEP 1: SSH ke VPS
echo ==========================================
echo.
echo Jalankan command berikut di terminal: 
echo.
echo     ssh root@152.42.229.212
echo.
echo Password: %%0^|F?H@f!berhO3e
echo.
pause
echo.
echo ==========================================
echo   STEP 2: Setup Docker
echo ==========================================
echo.
echo Copy dan paste command berikut di VPS:
echo.
echo     apt-get update -qq
echo     apt-get install -y -qq docker.io docker-compose-v2 git curl openssl
echo     systemctl enable docker
echo     systemctl start docker
echo     docker --version
echo.
pause
echo.
echo ==========================================
echo   STEP 3: Create Directory
echo ==========================================
echo.
echo     mkdir -p /opt/workgrid
echo     cd /opt/workgrid
echo.
pause
echo.
echo ==========================================
echo   STEP 4: Create .env File
echo ==========================================
echo.
echo     cat ^> /opt/workgrid/.env ^<^< 'EOF'
echo     DB_PASSWORD=WorkGrid2024SecurePass!
echo     JWT_SECRET=workgrid-jwt-secret-2024-production
echo     FRONTEND_URL=http://152.42.229.212
echo     NODE_ENV=production
echo     ALLOWED_ORIGINS=http://152.42.229.212
echo     EOF
echo.
pause
echo.
echo ==========================================
echo   STEP 5: Copy Project Files
echo ==========================================
echo.
echo [PILIH SALAH SATU:]
echo.
echo A. Menggunakan WinSCP:
echo    1. Download WinSCP dari https://winscp.net/
echo    2. Connect ke 152.42.229.212 dengan user root
echo    3. Copy folder project ini ke /opt/workgrid/
echo.
echo B. Menggunakan rsync (Git Bash):
echo    rsync -avz --exclude='node_modules' --exclude='.git' ./ root@152.42.229.212:/opt/workgrid/
echo.
echo C. Menggunakan FileZilla:
echo    1. Connect SFTP ke 152.42.229.212
echo    2. Copy semua file ke /opt/workgrid/
echo.
pause
echo.
echo ==========================================
echo   STEP 6: Copy Docker Compose
echo ==========================================
echo.
echo     cp /opt/workgrid/docker-compose.vps.yml /opt/workgrid/docker-compose.yml
echo.
pause
echo.
echo ==========================================
echo   STEP 7: Build dan Jalankan
echo ==========================================
echo.
echo     cd /opt/workgrid
echo     docker compose down 2^>/dev/null ^|^| true
echo     docker compose build --no-cache
echo     docker compose up -d
echo.
pause
echo.
echo ==========================================
echo   STEP 8: Verifikasi
echo ==========================================
echo.
echo     docker compose ps
echo     curl http://localhost:3001/health
echo.
pause
echo.
echo ==========================================
echo   DEPLOYMENT SELESAI!
echo ==========================================
echo.
echo 🌐 Akses aplikasi di: http://152.42.229.212
echo.
echo 📋 Command berguna:
echo    - Check status:   docker compose ps
echo    - View logs:      docker compose logs -f
echo    - Restart:        docker compose restart
echo    - Stop:           docker compose down
echo.
echo ⚠️  Default Admin:
echo    Email: admin@workgrid.com
echo    Password: admin123
echo.
pause
