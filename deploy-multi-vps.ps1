# ============================================
# WorkGrid Multi-VPS Deployment Script
# Frontend VPS: 165.22.63.51
# Backend VPS: 152.42.229.212
# ============================================

param(
    [Parameter()]
    [ValidateSet("Frontend", "Backend", "Both", "Test")]
    [string]$Target = "Both",
    
    [Parameter()]
    [string]$FrontendIP = "165.22.63.51",
    
    [Parameter()]
    [string]$BackendIP = "152.42.229.212"
)

# SSH Key paths
$SSHKeyFrontend = "$env:USERPROFILE\.ssh\workgrid_deploy_key"
$SSHKeyBackend = "$env:USERPROFILE\.ssh\workgrid_deploy_key"

# Remote paths
$FrontendRemotePath = "/var/www/workgrid"
$BackendRemotePath = "/opt/workgrid"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([int]$Step, [int]$Total, [string]$Message)
    Write-Host "[$Step/$Total] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ✗ $Message" -ForegroundColor Red
}

function Test-SSHConnection {
    param([string]$IP, [string]$KeyPath)
    
    try {
        $result = & ssh -i $KeyPath -o ConnectTimeout=5 -o BatchMode=yes root@$IP "echo 'OK'" 2>&1
        return $result -eq "OK"
    }
    catch {
        return $false
    }
}

function Deploy-Frontend {
    param([string]$IP, [string]$KeyPath)
    
    Write-Header "Deploying Frontend to $IP"
    
    # 1. Test SSH connection
    Write-Step 1 4 "Testing SSH connection..."
    if (-not (Test-SSHConnection -IP $IP -KeyPath $KeyPath)) {
        Write-Error "Cannot connect to frontend VPS"
        return $false
    }
    Write-Success "SSH connection OK"
    
    # 2. Create tarball of dist
    Write-Step 2 4 "Creating distribution archive..."
    $tarPath = "frontend-deploy.tar.gz"
    if (Test-Path $tarPath) { Remove-Item $tarPath }
    
    # Use tar command
    & tar -czf $tarPath -C app dist 2>&1 | Out-Null
    if (-not (Test-Path $tarPath)) {
        Write-Error "Failed to create archive"
        return $false
    }
    Write-Success "Archive created: $tarPath ($([math]::Round((Get-Item $tarPath).Length / 1MB, 2)) MB)"
    
    # 3. Upload to VPS
    Write-Step 3 4 "Uploading to VPS..."
    try {
        & scp -i $KeyPath -o ConnectTimeout=30 $tarPath "root@${IP}:/tmp/" 2>&1 | Out-Null
        Write-Success "Upload complete"
    }
    catch {
        Write-Error "Upload failed: $_"
        return $false
    }
    
    # 4. Extract and setup
    Write-Step 4 4 "Extracting and setting up..."
    $commands = @"
cd /tmp
tar -xzf $tarPath -C $FrontendRemotePath --strip-components=1
rm $tarPath
chown -R www-data:www-data $FrontendRemotePath
chmod -R 755 $FrontendRemotePath
nginx -t && systemctl reload nginx
echo "Frontend deployed successfully"
"@
    
    try {
        $result = & ssh -i $KeyPath root@$IP $commands 2>&1
        Write-Success "Frontend deployed"
        Write-Info "URL: http://$IP"
        return $true
    }
    catch {
        Write-Error "Deployment failed: $_"
        return $false
    }
}

function Deploy-Backend {
    param([string]$IP, [string]$KeyPath)
    
    Write-Header "Deploying Backend to $IP"
    
    # 1. Test SSH connection
    Write-Step 1 5 "Testing SSH connection..."
    if (-not (Test-SSHConnection -IP $IP -KeyPath $KeyPath)) {
        Write-Error "Cannot connect to backend VPS"
        return $false
    }
    Write-Success "SSH connection OK"
    
    # 2. Create tarball of server
    Write-Step 2 5 "Creating server archive..."
    $tarPath = "backend-deploy.tar.gz"
    if (Test-Path $tarPath) { Remove-Item $tarPath }
    
    # Exclude node_modules and uploads
    & tar -czf $tarPath --exclude='node_modules' --exclude='uploads' -C . server 2>&1 | Out-Null
    if (-not (Test-Path $tarPath)) {
        Write-Error "Failed to create archive"
        return $false
    }
    Write-Success "Archive created: $tarPath ($([math]::Round((Get-Item $tarPath).Length / 1MB, 2)) MB)"
    
    # 3. Upload to VPS
    Write-Step 3 5 "Uploading to VPS..."
    try {
        & scp -i $KeyPath -o ConnectTimeout=30 $tarPath "root@${IP}:/tmp/" 2>&1 | Out-Null
        Write-Success "Upload complete"
    }
    catch {
        Write-Error "Upload failed: $_"
        return $false
    }
    
    # 4. Extract and install
    Write-Step 4 5 "Extracting and installing..."
    $commands = @"
cd /tmp
tar -xzf $tarPath -C $BackendRemotePath --strip-components=1
rm $tarPath
cd $BackendRemotePath/server
npm install --production
echo "Backend files deployed"
"@
    
    try {
        & ssh -i $KeyPath root@$IP $commands 2>&1
        Write-Success "Backend files deployed"
    }
    catch {
        Write-Error "Extraction failed: $_"
        return $false
    }
    
    # 5. Restart service
    Write-Step 5 5 "Restarting backend service..."
    $restartCmd = "cd $BackendRemotePath && docker-compose restart backend"
    
    try {
        & ssh -i $KeyPath root@$IP $restartCmd 2>&1
        Write-Success "Backend restarted"
        Write-Info "API URL: http://${IP}:3001/api"
        return $true
    }
    catch {
        Write-Error "Restart failed: $_"
        return $false
    }
}

function Test-Login {
    param([string]$FrontendIP, [string]$BackendIP)
    
    Write-Header "Testing Login"
    
    # Test backend directly
    Write-Host "Testing backend API..." -ForegroundColor Yellow
    try {
        $body = @{ email = "admin@workgrid.com"; password = "admin123" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://${BackendIP}:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
        Write-Success "Backend login API works!"
        Write-Host "  Token received: $($response.token.Substring(0, 20))..." -ForegroundColor Gray
    }
    catch {
        Write-Error "Backend login failed: $_"
    }
    
    # Test through frontend proxy
    Write-Host "Testing through frontend proxy..." -ForegroundColor Yellow
    try {
        $body = @{ email = "admin@workgrid.com"; password = "admin123" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://${FrontendIP}/api/auth/login" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
        Write-Success "Frontend proxy works!"
    }
    catch {
        Write-Error "Frontend proxy failed: $_"
    }
}

# ============================================
# MAIN
# ============================================

Write-Header "WorkGrid Multi-VPS Deployment"
Write-Host "Frontend VPS: $FrontendIP" -ForegroundColor White
Write-Host "Backend VPS:  $BackendIP" -ForegroundColor White
Write-Host "Target:       $Target" -ForegroundColor White
Write-Host ""

switch ($Target) {
    "Frontend" {
        Deploy-Frontend -IP $FrontendIP -KeyPath $SSHKeyFrontend
    }
    "Backend" {
        Deploy-Backend -IP $BackendIP -KeyPath $SSHKeyBackend
    }
    "Both" {
        $frontendOK = Deploy-Frontend -IP $FrontendIP -KeyPath $SSHKeyFrontend
        $backendOK = Deploy-Backend -IP $BackendIP -KeyPath $SSHKeyBackend
        
        if ($frontendOK -and $backendOK) {
            Write-Host ""
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host "  Deployment Complete!" -ForegroundColor Green
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "  Frontend: http://$FrontendIP" -ForegroundColor White
            Write-Host "  Backend:  http://$BackendIP:3001" -ForegroundColor White
            Write-Host ""
        }
    }
    "Test" {
        Test-Login -FrontendIP $FrontendIP -BackendIP $BackendIP
    }
}
