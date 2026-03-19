@echo off
chcp 65001 >nul
echo.
echo 🚀 WorkGrid Automated Deployment
echo ================================
echo VPS: 152.42.229.212
echo.

REM Check for SSH key
if not exist "%USERPROFILE%\.ssh\workgrid_deploy_key.pub" (
    echo ❌ SSH key not found. Generating...
    cmd /c "ssh-keygen -t ed25519 -C workgrid-deploy -f %USERPROFILE%\.ssh\workgrid_deploy_key -N """
    if errorlevel 1 (
        echo ❌ Failed to generate SSH key
        pause
        exit /b 1
    )
    echo ✅ SSH key generated
)

echo.
echo =========================================
echo STEP 1: Copy SSH Key to VPS
echo =========================================
echo.
echo Anda perlu login ke VPS sekali untuk setup SSH key.
echo.
echo Jalankan perintah berikut di window baru:
echo.
echo ssh root@152.42.229.212
echo Password: %%0^|F?H@f!berhO3e
echo.
echo Lalu paste command ini di VPS:
echo.
echo mkdir -p ~/.ssh ^&^& chmod 700 ~/.ssh
echo.
echo Lalu paste public key ini:
echo.
type "%USERPROFILE%\.ssh\workgrid_deploy_key.pub"
echo.
echo Di VPS, jalankan:
echo cat ^>^> ~/.ssh/authorized_keys
echo [paste key di atas]
echo Ctrl+D
echo chmod 600 ~/.ssh/authorized_keys
echo.
pause

echo.
echo =========================================
echo STEP 2: Setup VPS (Docker, Firewall)
echo =========================================
echo.
echo SSH ke VPS dan jalankan:
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
echo STEP 3: Copy Project Files
echo =========================================
echo.
echo Di folder project ini, buka PowerShell baru dan jalankan:
echo.
echo tar -czf $env:TEMP\workgrid.tar.gz --exclude="node_modules" --exclude=".git" --exclude="app/dist" --exclude="app/release" --exclude="*.log" --exclude="backups" .
echo scp -i "%USERPROFILE%\.ssh\workgrid_deploy_key" $env:TEMP\workgrid.tar.gz root@152.42.229.212:/tmp/
echo.
pause

echo.
echo =========================================
echo STEP 4: Extract and Configure
echo =========================================
echo.
echo SSH ke VPS dan jalankan:
echo.
echo cd /opt/workgrid ^&^& tar -xzf /tmp/workgrid.tar.gz ^&^& rm /tmp/workgrid.tar.gz
echo.
echo Buat file .env:
echo cat ^> .env ^<^< 'EOF'
echo DB_PASSWORD=WorkGridSecurePass123!
echo JWT_SECRET=WorkGridSuperSecretKey2024ForProductionUse
echo FRONTEND_URL=http://152.42.229.212
echo NODE_ENV=production
echo ALLOWED_ORIGINS=http://152.42.229.212,http://localhost:5173
echo EOF
echo.
pause

echo.
echo =========================================
echo STEP 5: Deploy
echo =========================================
echo.
echo SSH ke VPS dan jalankan:
echo.
echo cd /opt/workgrid
echo docker-compose -f deployment/docker-compose.vps.yml down 2^>/dev/null ^|^| true
echo docker-compose -f deployment/docker-compose.vps.yml up --build -d
echo sleep 20
echo docker-compose -f deployment/docker-compose.vps.yml ps
echo.
pause

echo.
echo =========================================
echo ✅ DEPLOYMENT COMPLETE!
echo =========================================
echo.
echo 🌐 Akses WorkGrid Anda di:
echo    http://152.42.229.212
echo.
echo 📋 Perintah berguna:
echo    ssh -i %USERPROFILE%\.ssh\workgrid_deploy_key root@152.42.229.212
echo.
pause
