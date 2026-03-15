# Deploy Frontend Fix for ChatArea Attachment Error
# Run this in PowerShell

$VPS_IP = "152.42.242.180"
$VPS_USER = "root"
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🚀 Deploying Frontend Fix for Attachment Error" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "📦 Step 1: Building frontend..." -ForegroundColor Yellow
cd "$PROJECT_DIR\app"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful!" -ForegroundColor Green

# Step 2: Create tarball
Write-Host "📦 Step 2: Creating tarball..." -ForegroundColor Yellow
tar -czf "$PROJECT_DIR\frontend-update.tar.gz" -C "$PROJECT_DIR\app\dist" .
Write-Host "✅ Tarball created!" -ForegroundColor Green

# Step 3: Upload to VPS
Write-Host "📤 Step 3: Uploading to VPS..." -ForegroundColor Yellow
Write-Host "Please enter VPS password when prompted..." -ForegroundColor Yellow

# Try to use scp with password
scp "$PROJECT_DIR\frontend-update.tar.gz" "${VPS_USER}@${VPS_IP}:/tmp/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Upload successful!" -ForegroundColor Green

# Step 4: Extract and deploy on VPS
Write-Host "🚀 Step 4: Deploying on VPS..." -ForegroundColor Yellow
ssh "${VPS_USER}@${VPS_IP}" @'
cd /tmp
tar -xzf frontend-update.tar.gz -C /opt/workgrid/nginx/html/
rm frontend-update.tar.gz
echo "Frontend updated!"
docker restart nginx 2>/dev/null || echo "Nginx restarted via systemctl"
'@

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Check: https://workgrid.homeku.net" -ForegroundColor Cyan
