@echo off
chcp 65001 >nul
echo ===========================================
echo 🚀 Deploy DM Monitor Fix to VPS
echo ===========================================
echo.
echo Pastikan Anda sudah:
echo 1. Build frontend dengan: cd app ^&^& npm run build
echo 2. Memiliki akses SSH ke VPS 152.42.229.212
echo.
echo File yang akan di-deploy:
echo - app/dist (frontend build)
echo.
echo Tekan ENTER untuk lanjutkan...
pause >nul

cd "C:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone"

echo.
echo 📦 Creating archive...
tar -czf frontend-update.tar.gz -C app/dist .

echo.
echo 📤 Uploading to VPS...
scp frontend-update.tar.gz root@152.42.229.212:/tmp/

echo.
echo 🚀 Deploying on VPS...
ssh root@152.42.229.212 "cd /tmp && tar -xzf frontend-update.tar.gz -C /opt/workgrid/nginx/html/ && rm frontend-update.tar.gz && docker restart discord_clone_frontend"

echo.
echo ✅ Deployment complete!
echo 🌐 Check: https://workgrid.homeku.net
echo.
pause
