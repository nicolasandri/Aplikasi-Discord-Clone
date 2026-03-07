# WorkGrid VPS Deployment Script for Windows
# Run this in PowerShell as Administrator

$VPS_IP = "167.172.72.73"
$VPS_USER = "root"
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🚀 WorkGrid VPS Deployment Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from project root
if (-not (Test-Path "$PROJECT_DIR\app")) {
    Write-Host "❌ Error: Please run this script from project root directory!" -ForegroundColor Red
    exit 1
}

# Function to execute SSH command
function Invoke-SSHCommand {
    param($Command)
    ssh "$VPS_USER@$VPS_IP" $Command
}

# Step 1: Prepare VPS
Write-Host "📦 Step 1: Preparing VPS..." -ForegroundColor Yellow
$setupScript = @'
#!/bin/bash
set -e

echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
fi

echo "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "Creating directories..."
mkdir -p /opt/workgrid/updates
mkdir -p /opt/workgrid/ssl

echo "Configuring firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 8080/tcp
ufw --force enable

echo "Setup complete!"
'@

$setupScript | ssh "$VPS_USER@$VPS_IP" "cat > /tmp/setup.sh && chmod +x /tmp/setup.sh && bash /tmp/setup.sh"

# Step 2: Copy files
Write-Host "📦 Step 2: Copying project files to VPS..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

# Create tar archive of project (excluding unnecessary files)
$tarFile = "$env:TEMP\workgrid-deploy.tar.gz"
Write-Host "Creating archive..." -ForegroundColor Gray

# Use 7zip or tar if available
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $tarFile --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' --exclude='*.log' -C $PROJECT_DIR .
} else {
    Write-Host "⚠️  tar not found. Please install Git for Windows or use WSL." -ForegroundColor Yellow
    Write-Host "Alternative: Use WinSCP to manually copy files to /opt/workgrid/" -ForegroundColor Yellow
    exit 1
}

# Copy archive to VPS
Write-Host "Uploading to VPS..." -ForegroundColor Gray
scp $tarFile "$VPS_USER@${VPS_IP}:/tmp/"

# Extract on VPS
Write-Host "Extracting on VPS..." -ForegroundColor Gray
ssh "$VPS_USER@$VPS_IP" "cd /opt/workgrid && tar -xzf /tmp/workgrid-deploy.tar.gz && rm /tmp/workgrid-deploy.tar.gz"

# Cleanup local tar
Remove-Item $tarFile -ErrorAction SilentlyContinue

# Step 3: Create environment file
Write-Host "📦 Step 3: Creating environment configuration..." -ForegroundColor Yellow
$envContent = @"
# Database
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432

# JWT Secret (auto-generated)
JWT_SECRET=$(-join ((65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }))

# Frontend URL
FRONTEND_URL=http://$VPS_IP

# Node Environment
NODE_ENV=production

# VAPID Keys (optional - for push notifications)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.app
"@

$envContent | ssh "$VPS_USER@$VPS_IP" "cat > /opt/workgrid/.env"

# Step 4: Deploy with Docker Compose
Write-Host "📦 Step 4: Building and starting services..." -ForegroundColor Yellow
$deployScript = @'
cd /opt/workgrid

# Stop existing containers
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

# Build and start
docker-compose -f deployment/docker-compose.vps.yml up --build -d

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Check status
docker-compose -f deployment/docker-compose.vps.yml ps
'@

$deployScript | ssh "$VPS_USER@$VPS_IP"

# Step 5: Verify deployment
Write-Host "📦 Step 5: Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://$VPS_IP" -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web app is accessible!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify web app. Please check manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your WorkGrid is now running at:" -ForegroundColor Cyan
Write-Host "   Web App: http://$VPS_IP" -ForegroundColor White
Write-Host "   API: http://$VPS_IP/api" -ForegroundColor White
Write-Host "   Update Server: http://$VPS_IP:8080" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs: ssh $VPS_USER@$VPS_IP 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml logs -f'" -ForegroundColor Gray
Write-Host "   Restart:   ssh $VPS_USER@$VPS_IP 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart'" -ForegroundColor Gray
Write-Host "   Stop:      ssh $VPS_USER@$VPS_IP 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml stop'" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For more info, see: DEPLOY_VPS_GUIDE.md" -ForegroundColor Cyan
