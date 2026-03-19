# WorkGrid Automated Deployment Script
# VPS: 152.42.229.212
# One-time setup with password, then automated

param(
    [string]$VPS_IP = "152.42.229.212",
    [string]$VPS_USER = "root",
    [string]$VPS_PASS = "%0|F?H@f!berhO3e"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 WorkGrid Automated Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "VPS: $VPS_IP" -ForegroundColor Gray
Write-Host ""

# Function to run SSH command with password
function Invoke-SSHWithPassword {
    param($Command)
    
    $secpasswd = ConvertTo-SecureString $VPS_PASS -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $secpasswd)
    
    # Use ssh with password authentication
    $sshCommand = "ssh -o StrictHostKeyChecking=no -o PasswordAuthentication=yes ${VPS_USER}@${VPS_IP} '${Command}'"
    return Invoke-Expression $sshCommand 2>&1
}

# Step 1: Copy SSH Public Key to VPS
Write-Host "📦 Step 1: Installing SSH Key to VPS..." -ForegroundColor Yellow
Write-Host "    (You may be prompted for password once)" -ForegroundColor Gray

$sshKey = Get-Content "$HOME\.ssh\workgrid_deploy_key.pub" -Raw
$sshKey = $sshKey.Trim()

# Create .ssh directory and add key
$setupCommands = @"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$sshKey' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"@

# Save to temp file and execute
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$setupCommands | Out-File -FilePath $tempScript -Encoding utf8

# Copy and execute
scp -o StrictHostKeyChecking=no $tempScript "${VPS_USER}@${VPS_IP}:/tmp/setup_ssh.sh" 2>&1
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "bash /tmp/setup_ssh.sh && rm /tmp/setup_ssh.sh" 2>&1

Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host "✅ SSH Key installed!" -ForegroundColor Green
Write-Host ""

# Step 2: Setup VPS (Docker, Firewall, etc)
Write-Host "📦 Step 2: Setting up VPS (Docker, Firewall)..." -ForegroundColor Yellow

$vpsSetupScript = @'
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

echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 8080/tcp
ufw --force enable 2>/dev/null || true

echo "VPS Setup Complete!"
'@

$tempSetup = [System.IO.Path]::GetTempFileName() + ".sh"
$vpsSetupScript | Out-File -FilePath $tempSetup -Encoding utf8

scp -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no $tempSetup "${VPS_USER}@${VPS_IP}:/tmp/vps_setup.sh" 2>&1
ssh -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no "${VPS_USER}@${VPS_IP}" "bash /tmp/vps_setup.sh" 2>&1

Remove-Item $tempSetup -ErrorAction SilentlyContinue

Write-Host "✅ VPS Setup Complete!" -ForegroundColor Green
Write-Host ""

# Step 3: Copy Project Files
Write-Host "📦 Step 3: Copying project files to VPS..." -ForegroundColor Yellow
Write-Host "    This may take a few minutes..." -ForegroundColor Gray

$PROJECT_DIR = $PWD
$TAR_FILE = "$env:TEMP\workgrid-deploy.tar.gz"

# Create archive
Write-Host "    Creating archive..." -ForegroundColor Gray
tar -czf $TAR_FILE --exclude="node_modules" --exclude=".git" --exclude="app/dist" --exclude="app/release" --exclude="*.log" --exclude="backups" -C $PROJECT_DIR .

# Copy to VPS
Write-Host "    Uploading to VPS..." -ForegroundColor Gray
scp -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no $TAR_FILE "${VPS_USER}@${VPS_IP}:/tmp/" 2>&1

# Extract on VPS
Write-Host "    Extracting on VPS..." -ForegroundColor Gray
ssh -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no "${VPS_USER}@${VPS_IP}" "cd /opt/workgrid && tar -xzf /tmp/workgrid-deploy.tar.gz && rm /tmp/workgrid-deploy.tar.gz" 2>&1

# Cleanup
Remove-Item $TAR_FILE -ErrorAction SilentlyContinue

Write-Host "✅ Project files copied!" -ForegroundColor Green
Write-Host ""

# Step 4: Create Environment File
Write-Host "📦 Step 4: Creating environment configuration..." -ForegroundColor Yellow

$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

$envContent = @"
# Database
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432

# JWT Secret
JWT_SECRET=$jwtSecret

# Frontend URL
FRONTEND_URL=http://$VPS_IP

# Node Environment
NODE_ENV=production

# VAPID Keys (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.app

# Allowed Origins
ALLOWED_ORIGINS=http://$VPS_IP,http://localhost:5173
"@

$tempEnv = [System.IO.Path]::GetTempFileName()
$envContent | Out-File -FilePath $tempEnv -Encoding utf8

scp -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no $tempEnv "${VPS_USER}@${VPS_IP}:/opt/workgrid/.env" 2>&1

Remove-Item $tempEnv -ErrorAction SilentlyContinue

Write-Host "✅ Environment file created!" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy with Docker Compose
Write-Host "📦 Step 5: Building and starting services..." -ForegroundColor Yellow

$deployScript = @'
#!/bin/bash
set -e

cd /opt/workgrid

echo "Stopping existing containers..."
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

echo "Building and starting services..."
docker-compose -f deployment/docker-compose.vps.yml up --build -d

echo ""
echo "Waiting for services to start..."
sleep 20

echo ""
echo "=== Service Status ==="
docker-compose -f deployment/docker-compose.vps.yml ps

echo ""
echo "=== Recent Logs ==="
docker-compose -f deployment/docker-compose.vps.yml logs --tail=30
'@

$tempDeploy = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScript | Out-File -FilePath $tempDeploy -Encoding utf8

scp -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no $tempDeploy "${VPS_USER}@${VPS_IP}:/tmp/deploy.sh" 2>&1
ssh -i "$HOME\.ssh\workgrid_deploy_key" -o StrictHostKeyChecking=no -o PasswordAuthentication=no "${VPS_USER}@${VPS_IP}" "bash /tmp/deploy.sh && rm /tmp/deploy.sh" 2>&1

Remove-Item $tempDeploy -ErrorAction SilentlyContinue

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""

# Step 6: Verify
Write-Host "📦 Step 6: Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $response = Invoke-WebRequest -Uri "http://$VPS_IP" -TimeoutSec 15 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web app is accessible!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Could not verify automatically. Please check manually at http://$VPS_IP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your WorkGrid is now running at:" -ForegroundColor Cyan
Write-Host "   Web App: http://$VPS_IP" -ForegroundColor White
Write-Host "   API: http://$VPS_IP/api" -ForegroundColor White
Write-Host "   Update Server: http://$VPS_IP:8080" -ForegroundColor White
Write-Host ""
Write-Host "📋 SSH Key saved to: $HOME\.ssh\workgrid_deploy_key" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Useful commands (SSH key will be used automatically):" -ForegroundColor Cyan
Write-Host "   View logs:  ssh -i $HOME\.ssh\workgrid_deploy_key ${VPS_USER}@${VPS_IP} 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml logs -f'" -ForegroundColor Gray
Write-Host "   Restart:    ssh -i $HOME\.ssh\workgrid_deploy_key ${VPS_USER}@${VPS_IP} 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart'" -ForegroundColor Gray
Write-Host ""

# Save connection info for future use
$connectionInfo = @"
# WorkGrid VPS Connection
VPS_IP=$VPS_IP
VPS_USER=$VPS_USER
SSH_KEY=$HOME\.ssh\workgrid_deploy_key
"@
$connectionInfo | Out-File -FilePath ".vps-connection" -Encoding utf8

Write-Host "💾 Connection info saved to .vps-connection" -ForegroundColor Gray
