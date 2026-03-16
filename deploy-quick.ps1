# Quick deploy script for VPS
$VPS_IP = "152.42.242.180"
$VPS_USER = "root"

Write-Host "Deploying WorkGrid to VPS..." -ForegroundColor Cyan

# 1. Create remote directory
ssh "${VPS_USER}@${VPS_IP}" "mkdir -p /opt/workgrid-update && rm -rf /opt/workgrid-update/*"

# 2. Copy files
Write-Host "Copying frontend dist..." -ForegroundColor Yellow
scp -r "app/dist/*" "${VPS_USER}@${VPS_IP}:/opt/workgrid-update/"

Write-Host "Copying uploads..." -ForegroundColor Yellow
scp -r "server/uploads/*" "${VPS_USER}@${VPS_IP}:/opt/workgrid-update-uploads/"

# 3. Remote commands
$remoteCmd = @'
cd /opt/workgrid

# Update frontend
echo "[DEPLOY] Updating frontend..."
rm -rf app/dist/*
cp -r /opt/workgrid-update/* app/dist/

# Update uploads
echo "[DEPLOY] Updating uploads..."
mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
cp -r /opt/workgrid-update-uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null || true
chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null || true

# Restart containers
echo "[DEPLOY] Restarting containers..."
docker-compose -f docker-compose.vps.yml restart frontend
docker-compose -f docker-compose.vps.yml restart backend

# Cleanup
rm -rf /opt/workgrid-update /opt/workgrid-update-uploads

echo "[DEPLOY] Done!"
'@

Write-Host "Executing remote commands..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" $remoteCmd

Write-Host "Deploy completed!" -ForegroundColor Green
Write-Host "Test URL: http://$VPS_IP"
