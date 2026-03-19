# ============================================
# Deploy Script for VPS - workgrid.homeku.net
# VPS: 152.42.229.212
# ============================================

$ErrorActionPreference = "Stop"
$VPS_IP = "152.42.229.212"
$VPS_USER = "root"
$PROJECT_NAME = "workgrid"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DEPLOY WORKGRID TO VPS" -ForegroundColor Cyan
Write-Host "  Target: $VPS_IP" -ForegroundColor Cyan
Write-Host "  Domain: workgrid.homeku.net" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Step 1: Build Frontend
Write-Host "`n[1/7] Building frontend..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\app"
$env:VITE_API_URL = "/api"
$env:VITE_SOCKET_URL = ""
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed!"
    exit 1
}
Write-Host "     Frontend build completed" -ForegroundColor Green

# Step 2: Create deployment package
Write-Host "`n[2/7] Creating deployment package..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot"
$deployFiles = @(
    "docker-compose.vps.yml",
    ".env",
    "nginx/nginx.conf",
    "server/uploads"
)

# Create deploy directory
New-Item -ItemType Directory -Force -Path "deploy-vps" | Out-Null

# Copy files
Copy-Item -Path "docker-compose.vps.yml" -Destination "deploy-vps/" -Force
Copy-Item -Path ".env" -Destination "deploy-vps/" -Force
Copy-Item -Path "nginx/nginx.conf" -Destination "deploy-vps/" -Force
Copy-Item -Path "server/uploads" -Destination "deploy-vps/" -Recurse -Force
Copy-Item -Path "app/dist" -Destination "deploy-vps/frontend-dist" -Recurse -Force

# Create tar.gz
Compress-Archive -Path "deploy-vps/*" -DestinationPath "deploy-vps-package.zip" -Force
Write-Host "     Package created: deploy-vps-package.zip" -ForegroundColor Green

# Step 3: Copy files to VPS
Write-Host "`n[3/7] Copying files to VPS..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no deploy-vps-package.zip "${VPS_USER}@${VPS_IP}:/root/workgrid-update.zip"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to copy files to VPS!"
    exit 1
}
Write-Host "     Files copied to VPS" -ForegroundColor Green

# Step 4: Execute remote deployment commands
Write-Host "`n[4/7] Executing remote deployment..." -ForegroundColor Yellow
$remoteCommands = @"
cd /root
unzip -o workgrid-update.zip -d workgrid-update/
cd workgrid-update/deploy-vps

# Backup current uploads
echo "[DEPLOY] Backing up uploads..."
mkdir -p /opt/workgrid/backups/uploads-$(date +%Y%m%d_%H%M%S)
if [ -d /var/lib/docker/volumes/workgrid_uploads_data/_data ]; then
    cp -r /var/lib/docker/volumes/workgrid_uploads_data/_data/* /opt/workgrid/backups/uploads-$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
fi

# Update project files
echo "[DEPLOY] Updating project files..."
cp docker-compose.vps.yml /opt/workgrid/
cp .env /opt/workgrid/
cp nginx.conf /opt/workgrid/nginx/

# Copy uploads to Docker volume
echo "[DEPLOY] Restoring uploads..."
mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
if [ -d uploads ]; then
    cp -r uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/
    chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/
fi

# Update frontend dist
echo "[DEPLOY] Updating frontend..."
rm -rf /opt/workgrid/app/dist
mkdir -p /opt/workgrid/app/dist
cp -r frontend-dist/* /opt/workgrid/app/dist/

# Restart services
echo "[DEPLOY] Restarting services..."
cd /opt/workgrid
docker-compose -f docker-compose.vps.yml down
docker-compose -f docker-compose.vps.yml up -d

# Cleanup
rm -rf /root/workgrid-update /root/workgrid-update.zip

echo "[DEPLOY] Deployment completed!"
"@

ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "$remoteCommands"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Remote deployment failed!"
    exit 1
}
Write-Host "     Remote deployment completed" -ForegroundColor Green

# Step 5: Verify deployment
Write-Host "`n[5/7] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    $response = Invoke-RestMethod -Uri "http://${VPS_IP}/api/health" -Method GET -TimeoutSec 10
    Write-Host "     Health check: OK" -ForegroundColor Green
} catch {
    Write-Warning "Health check failed, but deployment may still be starting..."
}

# Step 6: Cleanup local files
Write-Host "`n[6/7] Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "deploy-vps" -ErrorAction SilentlyContinue
Remove-Item -Force "deploy-vps-package.zip" -ErrorAction SilentlyContinue
Write-Host "     Cleanup completed" -ForegroundColor Green

# Step 7: Final status
Write-Host "`n[7/7] Deployment Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Status: DEPLOYED SUCCESSFULLY" -ForegroundColor Green
Write-Host "Domain: http://workgrid.homeku.net" -ForegroundColor Green
Write-Host "IP:     http://${VPS_IP}" -ForegroundColor Green
Write-Host "API:    http://${VPS_IP}/api" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "`nNext steps:"
Write-Host "  1. Configure DNS for workgrid.homeku.net → ${VPS_IP}"
Write-Host "  2. Test all features at http://workgrid.homeku.net"
Write-Host "  3. Setup SSL with: certbot --nginx -d workgrid.homeku.net"
