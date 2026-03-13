# WorkGrid VPS Deployment Script
# VPS: 152.42.242.180
# Run this in PowerShell

$VPS_IP = "152.42.242.180"
$VPS_USER = "root"
$VPS_PASS = "%0|F?H@f!berhO3e"
$PROJECT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🚀 WorkGrid VPS Deployment Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Target VPS: $VPS_IP" -ForegroundColor Gray
Write-Host ""

# Check if running from project root
if (-not (Test-Path "$PROJECT_DIR\app")) {
    Write-Host "❌ Error: Please run this script from project root directory!" -ForegroundColor Red
    exit 1
}

# Step 1: Setup VPS (Install Docker, etc)
Write-Host "📦 Step 1: Setting up VPS (Installing Docker...)" -ForegroundColor Yellow
$setupScript = @'
#!/bin/bash
set -e

echo "Updating system..."
apt-get update -y

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
mkdir -p /opt/workgrid
mkdir -p /opt/workgrid/updates
mkdir -p /opt/workgrid/certbot/www
mkdir -p /var/www/workgrid

echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 8080/tcp
ufw --force enable

echo "VPS setup complete!"
'@

# Use plink/putty or ssh with password if available
Write-Host "Connecting to VPS..." -ForegroundColor Gray

# Check for sshpass
$useSSHPASS = $false
try {
    $sshpassCheck = sshpass -V 2>&1
    if ($sshpassCheck -match "sshpass") {
        $useSSHPASS = $true
    }
} catch {}

if ($useSSHPASS) {
    # Use sshpass for password authentication
    $setupScript | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cat > /tmp/setup.sh && chmod +x /tmp/setup.sh && bash /tmp/setup.sh"
} else {
    Write-Host ""
    Write-Host "⚠️  Manual SSH required" -ForegroundColor Yellow
    Write-Host "Please run the following commands on your VPS manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ssh $VPS_USER@$VPS_IP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then paste this setup script:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host $setupScript -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter after you've completed the VPS setup..."
}

# Step 2: Create archive and copy files
Write-Host ""
Write-Host "📦 Step 2: Preparing project files..." -ForegroundColor Yellow

# Create tar archive
$tarFile = "$env:TEMP\workgrid-deploy.tar.gz"
Write-Host "Creating archive (this may take a few minutes)..." -ForegroundColor Gray

# Create exclusion file
$excludeFile = "$env:TEMP\exclude.txt"
@"
node_modules
.git
app/dist
app/release
*.log
backups
.gitignore
.gitattributes
"@ | Out-File -FilePath $excludeFile -Encoding utf8

# Use tar if available
if (Get-Command tar -ErrorAction SilentlyContinue) {
    tar -czf $tarFile -X $excludeFile -C $PROJECT_DIR .
    Write-Host "✅ Archive created: $tarFile" -ForegroundColor Green
} else {
    Write-Host "❌ tar command not found. Please install Git for Windows or use WSL." -ForegroundColor Red
    exit 1
}

# Copy to VPS
Write-Host ""
Write-Host "📦 Step 3: Uploading files to VPS..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

if ($useSSHPASS) {
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no $tarFile "$VPS_USER@${VPS_IP}:/tmp/"
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd /opt/workgrid && tar -xzf /tmp/workgrid-deploy.tar.gz && rm /tmp/workgrid-deploy.tar.gz"
} else {
    Write-Host "Please run these commands manually:" -ForegroundColor Yellow
    Write-Host "scp $tarFile ${VPS_USER}@${VPS_IP}:/tmp/" -ForegroundColor Cyan
    Write-Host "ssh ${VPS_USER}@${VPS_IP} 'cd /opt/workgrid && tar -xzf /tmp/workgrid-deploy.tar.gz && rm /tmp/workgrid-deploy.tar.gz'" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter after you've copied the files..."
}

# Cleanup
Remove-Item $tarFile -ErrorAction SilentlyContinue
Remove-Item $excludeFile -ErrorAction SilentlyContinue

# Step 4: Create environment file
Write-Host ""
Write-Host "📦 Step 4: Creating environment configuration..." -ForegroundColor Yellow

$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

$envContent = @"
# Database
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432

# JWT Secret (auto-generated)
JWT_SECRET=$jwtSecret

# Frontend URL
FRONTEND_URL=http://$VPS_IP

# Node Environment
NODE_ENV=production

# VAPID Keys (optional - for push notifications)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.app

# Allowed Origins
ALLOWED_ORIGINS=http://$VPS_IP,http://localhost:5173
"@

if ($useSSHPASS) {
    $envContent | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cat > /opt/workgrid/.env"
} else {
    Write-Host "Create /opt/workgrid/.env with this content:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host $envContent -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter after you've created the .env file..."
}

# Step 5: Deploy with Docker Compose
Write-Host ""
Write-Host "📦 Step 5: Building and starting services..." -ForegroundColor Yellow

$deployScript = @'
cd /opt/workgrid

echo "Stopping existing containers..."
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

echo "Building and starting services..."
docker-compose -f deployment/docker-compose.vps.yml up --build -d

echo "Waiting for services to start..."
sleep 15

echo ""
echo "Service Status:"
docker-compose -f deployment/docker-compose.vps.yml ps

echo ""
echo "Recent logs:"
docker-compose -f deployment/docker-compose.vps.yml logs --tail=20
'@

if ($useSSHPASS) {
    $deployScript | sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "bash"
} else {
    Write-Host "Please run these commands on VPS:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host $deployScript -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter after deployment is complete..."
}

# Step 6: Verify
Write-Host ""
Write-Host "📦 Step 6: Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://$VPS_IP" -TimeoutSec 15 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web app is accessible!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify web app automatically. Please check manually at http://$VPS_IP" -ForegroundColor Yellow
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
