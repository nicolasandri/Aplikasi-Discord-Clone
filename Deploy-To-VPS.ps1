# ============================================
# WorkGrid Deployment Script for Windows
# VPS: 152.42.229.212
# ============================================

param(
    [Parameter()]
    [ValidateSet("Full", "Setup", "Copy", "Build", "Status")]
    [string]$Action = "Full"
)

$VPS_IP = "152.42.229.212"
$VPS_User = "root"
$VPS_Pass = '%0|F?H@f!berhO3e'
$InstallDir = "/opt/workgrid"

# Helper function untuk SSH commands
function Invoke-VPSCommand {
    param([string]$Command)
    $securePass = ConvertTo-SecureString $VPS_Pass -AsPlainText -Force
    $cred = New-Object System.Management.Automation.PSCredential($VPS_User, $securePass)
    return Invoke-Command -ComputerName $VPS_IP -Credential $cred -ScriptBlock { 
        param($cmd)
        Invoke-Expression $cmd
    } -ArgumentList $Command
}

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

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ $Message" -ForegroundColor Gray
}

# ============================================
# MAIN
# ============================================

Write-Header "WorkGrid Deployment to VPS $VPS_IP"

switch ($Action) {
    "Full" {
        Write-Host "Mode: Full Deployment (Setup + Copy + Build)" -ForegroundColor Magenta
        Write-Host ""
        
        # Check if Posh-SSH is installed
        if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
            Write-Host "[!] Module Posh-SSH tidak ditemukan. Install dulu..." -ForegroundColor Red
            Write-Host "    Jalankan: Install-Module -Name Posh-SSH -Force" -ForegroundColor Yellow
            exit 1
        }
        
        Import-Module Posh-SSH
        
        # Create SSH session
        Write-Step 1 6 "Connecting to VPS..."
        $securePass = ConvertTo-SecureString $VPS_Pass -AsPlainText -Force
        $cred = New-Object System.Management.Automation.PSCredential($VPS_User, $securePass)
        
        try {
            $session = New-SSHSession -ComputerName $VPS_IP -Credential $cred -AcceptKey
            Write-Success "Connected to VPS"
        }
        catch {
            Write-Host "  ✗ Gagal connect: $_" -ForegroundColor Red
            exit 1
        }
        
        # Setup VPS
        Write-Step 2 6 "Setting up VPS..."
        $setupScript = @"
mkdir -p $InstallDir
cd $InstallDir

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    apt-get update -qq
    apt-get install -y -qq docker.io docker-compose-v2 git curl openssl
    systemctl enable docker
    systemctl start docker
fi

echo "Docker version: 
$(docker --version)"
"@
        Invoke-SSHCommand -SSHSession $session -Command $setupScript | Out-Null
        Write-Success "VPS setup complete"
        
        # Create docker-compose.yml
        Write-Step 3 6 "Creating Docker Compose config..."
        $dockerCompose = Get-Content "docker-compose.yml" -Raw
        Set-SCPFile -ComputerName $VPS_IP -Credential $cred -RemotePath "$InstallDir/docker-compose.yml" -LocalFile "docker-compose.yml"
        Write-Success "Docker Compose config created"
        
        # Copy project files
        Write-Step 4 6 "Copying project files..."
        Write-Info "Ini akan memakan waktu beberapa menit..."
        
        # Create temp tar archive
        $tarFile = "workgrid-deploy.tar.gz"
        Write-Info "Creating archive..."
        tar -czf $tarFile --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' --exclude='*.tar.gz' .
        
        Write-Info "Uploading archive to VPS..."
        Set-SCPFile -ComputerName $VPS_IP -Credential $cred -RemotePath "/tmp/$tarFile" -LocalFile $tarFile
        
        Write-Info "Extracting archive..."
        Invoke-SSHCommand -SSHSession $session -Command "cd $InstallDir && tar -xzf /tmp/$tarFile && rm /tmp/$tarFile" | Out-Null
        
        # Cleanup local tar
        Remove-Item $tarFile -ErrorAction SilentlyContinue
        
        Write-Success "Files copied"
        
        # Build and start
        Write-Step 5 6 "Building and starting containers..."
        Write-Info "Ini akan memakan waktu 5-10 menit..."
        Invoke-SSHCommand -SSHSession $session -Command "cd $InstallDir && docker compose down 2>/dev/null || true" | Out-Null
        Invoke-SSHCommand -SSHSession $session -Command "cd $InstallDir && docker compose build --no-cache" | Out-Null
        Invoke-SSHCommand -SSHSession $session -Command "cd $InstallDir && docker compose up -d" | Out-Null
        Write-Success "Containers built and started"
        
        # Wait and check
        Write-Step 6 6 "Checking services..."
        Start-Sleep -Seconds 10
        $status = Invoke-SSHCommand -SSHSession $session -Command "cd $InstallDir && docker compose ps"
        Write-Host $status.Output
        
        # Close session
        Remove-SSHSession -SSHSession $session | Out-Null
        
        # Final output
        Write-Header "DEPLOYMENT COMPLETE!"
        Write-Host "🌐 Akses aplikasi di: http://$VPS_IP" -ForegroundColor Green
        Write-Host "🔧 Health check:     http://$VPS_IP/api/health" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Command berguna:" -ForegroundColor Cyan
        Write-Host "   ./Deploy-To-VPS.ps1 -Action Status    # Check status" -ForegroundColor Yellow
        Write-Host "   ./Deploy-To-VPS.ps1 -Action Build     # Rebuild only" -ForegroundColor Yellow
    }
    
    "Setup" {
        Write-Host "Mode: Setup VPS Only" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "[!] Install Posh-SSH dulu: Install-Module -Name Posh-SSH -Force" -ForegroundColor Yellow
        Write-Host "[!] Kemudian jalankan dengan mode Full" -ForegroundColor Yellow
    }
    
    "Copy" {
        Write-Host "Mode: Copy Files Only" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "[!] Manual copy dengan rsync:" -ForegroundColor Yellow
        Write-Host "    rsync -avz --exclude='node_modules' --exclude='.git' ./ root@${VPS_IP}:/opt/workgrid/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "[!] Atau pakai WinSCP untuk copy ke /opt/workgrid/" -ForegroundColor Yellow
    }
    
    "Build" {
        Write-Host "Mode: Build Only" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "[*] Jalankan command berikut di VPS:" -ForegroundColor Yellow
        Write-Host "    cd /opt/workgrid && docker compose down && docker compose build --no-cache && docker compose up -d" -ForegroundColor Cyan
    }
    
    "Status" {
        Write-Host "Mode: Check Status" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "[*] Jalankan command berikut untuk check status:" -ForegroundColor Yellow
        Write-Host "    ssh root@$VPS_IP 'cd /opt/workgrid && docker compose ps'" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "[*] Untuk logs:" -ForegroundColor Yellow
        Write-Host "    ssh root@$VPS_IP 'cd /opt/workgrid && docker compose logs -f'" -ForegroundColor Cyan
    }
}

Write-Host ""
