@echo off
chcp 65001 >nul
echo.
echo 🚀 WorkGrid VPS Deployment Tool
echo ================================
echo Target VPS: 152.42.242.180
echo.
echo ⚠️  Pastikan Anda sudah menginstall:
echo    - Git for Windows (untuk SSH dan SCP)
echo    - Atau PuTTY (plink dan pscp)
echo.
echo =========================================
echo STEP 1: Setup VPS
echo =========================================
echo.
echo Jalankan perintah berikut di VPS Anda:
echo.
echo ssh root@152.42.242.180
echo Password: %%0^|F?H@f!berhO3e
echo.
echo Lalu jalankan script setup:
echo.
echo curl -fsSL https://get.docker.com -o get-docker.sh ^&^& sh get-docker.sh ^&^& usermod -aG docker root ^&^& systemctl enable docker ^&^& systemctl start docker ^&^& rm get-docker.sh
echo.
echo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose ^&^& chmod +x /usr/local/bin/docker-compose
echo.
echo mkdir -p /opt/workgrid ^&^& mkdir -p /opt/workgrid/updates ^&^& mkdir -p /opt/workgrid/certbot/www
echo.
echo ufw allow 22/tcp ^&^& ufw allow 80/tcp ^&^& ufw allow 443/tcp ^&^& ufw allow 3001/tcp ^&^& ufw allow 8080/tcp ^&^& ufw --force enable
echo.
pause

echo.
echo =========================================
echo STEP 2: Copy Project Files
echo =========================================
echo.
echo Membuat archive project...
echo.

set "PROJECT_DIR=%CD%"
set "TEMP_DIR=%TEMP%"

echo Exclude file list:
echo node_modules
echo .git
echo app/dist
echo app/release
echo *.log
echo backups
echo.

echo Creating tar.gz archive...
tar -czf "%TEMP_DIR%\workgrid-deploy.tar.gz" --exclude="node_modules" --exclude=".git" --exclude="app/dist" --exclude="app/release" --exclude="*.log" --exclude="backups" -C "%PROJECT_DIR%" .

echo.
echo Archive created: %TEMP_DIR%\workgrid-deploy.tar.gz
echo.
echo Sekarang copy file ke VPS dengan perintah:
echo.
echo scp %TEMP_DIR%\workgrid-deploy.tar.gz root@152.42.242.180:/tmp/
echo.
echo Password: %%0^|F?H@f!berhO3e
echo.
pause

echo.
echo Setelah file tercopy, SSH ke VPS dan extract:
echo.
echo ssh root@152.42.242.180
echo cd /opt/workgrid ^&^& tar -xzf /tmp/workgrid-deploy.tar.gz ^&^& rm /tmp/workgrid-deploy.tar.gz
echo.
pause

echo.
echo =========================================
echo STEP 3: Create Environment File
echo =========================================
echo.
echo SSH ke VPS dan buat file .env:
echo.
echo ssh root@152.42.242.180
echo.
echo cat ^> /opt/workgrid/.env ^<^< 'EOF'
echo # Database
echo DB_PASSWORD=WorkGridSecurePass123!
echo DB_PORT=5432
echo.
echo # JWT Secret
echo JWT_SECRET=YourSuperSecretJWTKeyForProduction123456789012
echo.
echo # Frontend URL
echo FRONTEND_URL=http://152.42.242.180
echo.
echo # Node Environment
echo NODE_ENV=production
echo.
echo # VAPID Keys (optional)
echo VAPID_PUBLIC_KEY=
echo VAPID_PRIVATE_KEY=
echo VAPID_SUBJECT=mailto:admin@workgrid.app
echo.
echo # Allowed Origins
echo ALLOWED_ORIGINS=http://152.42.242.180,http://localhost:5173
echo EOF
echo.
pause

echo.
echo =========================================
echo STEP 4: Deploy dengan Docker Compose
echo =========================================
echo.
echo SSH ke VPS dan jalankan:
echo.
echo cd /opt/workgrid
echo docker-compose -f deployment/docker-compose.vps.yml down 2^>/dev/null ^|^| true
echo docker-compose -f deployment/docker-compose.vps.yml up --build -d
echo.
echo sleep 15
echo docker-compose -f deployment/docker-compose.vps.yml ps
echo.
pause

echo.
echo =========================================
echo Deployment Complete!
echo =========================================
echo.
echo 🌐 Akses WorkGrid Anda di:
echo    http://152.42.242.180
echo.
echo 📋 Perintah berguna:
echo    View logs:  docker-compose -f deployment/docker-compose.vps.yml logs -f
echo    Restart:    docker-compose -f deployment/docker-compose.vps.yml restart
echo    Stop:       docker-compose -f deployment/docker-compose.vps.yml stop
echo.
pause
