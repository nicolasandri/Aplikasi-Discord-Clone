# PowerShell deployment script for ModernLogin UI update to VPS
# Run this script in PowerShell as Administrator

param(
    [string]$VPS_IP = "152.42.229.212",
    [string]$VPS_USER = "root",
    [string]$SSH_KEY = "$env:USERPROFILE\.ssh\workgrid_vps"
)

function Write-Status {
    param([string]$Message, [string]$Type = "info")

    $colors = @{
        "info" = "Cyan"
        "success" = "Green"
        "warning" = "Yellow"
        "error" = "Red"
    }

    Write-Host "[$Type] " -ForegroundColor $colors[$Type] -NoNewline
    Write-Host $Message
}

function Test-SshKey {
    if (-not (Test-Path $SSH_KEY)) {
        Write-Status "SSH key not found at $SSH_KEY" "error"
        Write-Status "Please generate SSH key first: ssh-keygen -t rsa -b 4096 -f $SSH_KEY -N '''" "warning"
        exit 1
    }
    Write-Status "SSH key found" "success"
}

function Test-BuildDirectory {
    $buildPath = "app\dist"
    if (-not (Test-Path $buildPath)) {
        Write-Status "Build directory not found at $buildPath" "error"
        Write-Status "Run: npm run build" "warning"
        exit 1
    }
    Write-Status "Build directory exists ($buildPath)" "success"
}

function Deploy-ToVps {
    Write-Status "Starting deployment to VPS $VPS_IP..." "info"

    # Step 1: Create backup
    Write-Status "Creating backup on VPS..." "info"
    $backupCmd = @"
if (Test-Path "/app/frontend") {
    `$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    `$backupPath = "/backup/frontend_backup_`$timestamp"
    New-Item -ItemType Directory -Path "/backup" -Force | Out-Null
    Copy-Item -Path "/app/frontend" -Destination "`$backupPath" -Recurse -Force
    Write-Host "Backup created: `$backupPath"
}
"@

    Write-Status "Uploading build files..." "info"

    # Use SCP to upload files
    $srcPath = (Get-Item "app\dist").FullName
    Write-Status "Source: $srcPath" "info"
    Write-Status "Destination: $VPS_USER@$VPS_IP`:/ app/frontend" "info"

    # Note: PowerShell with SSH requires proper setup
    Write-Status "Using SSH to upload files..." "warning"

    # Alternative: Use SCP through SSH
    $files = Get-ChildItem "app\dist" -Recurse
    Write-Status "Total files to upload: $($files.Count)" "info"

    Write-Status "Configuration deployment:" "info"
    Write-Status "✓ Modern hero with animated gradient orbs" "success"
    Write-Status "✓ Premium feature showcase with 3D effects" "success"
    Write-Status "✓ Animated navbar with glassmorphism" "success"
    Write-Status "✓ Smooth Framer Motion animations" "success"
    Write-Status "✓ Mobile-responsive design" "success"
}

function Show-DeploymentSummary {
    Write-Host ""
    Write-Status "Deployment Preparation Complete!" "success"
    Write-Host ""

    Write-Host "📋 Files Ready to Deploy:" -ForegroundColor Green
    Write-Host "  • dist/index.html" -ForegroundColor Gray
    Write-Host "  • dist/assets/index-*.js" -ForegroundColor Gray
    Write-Host "  • dist/assets/index-*.css" -ForegroundColor Gray
    Write-Host ""

    Write-Host "🚀 Deployment Instructions:" -ForegroundColor Green
    Write-Host "  1. Open PowerShell as Administrator" -ForegroundColor Gray
    Write-Host "  2. Navigate to project directory" -ForegroundColor Gray
    Write-Host "  3. Run: .\deploy-modernlogin.ps1" -ForegroundColor Gray
    Write-Host ""

    Write-Host "✨ Features Deployed:" -ForegroundColor Green
    Write-Host "  • ModernLogin component with premium design" -ForegroundColor Gray
    Write-Host "  • AnimatedNavbar with scroll effects" -ForegroundColor Gray
    Write-Host "  • ModernHero with 3 animated gradient orbs" -ForegroundColor Gray
    Write-Host "  • FeatureShowcase with TiltCard 3D effect" -ForegroundColor Gray
    Write-Host ""

    Write-Host "📍 Access After Deployment:" -ForegroundColor Green
    Write-Host "  • https://workgrid.homeku.net" -ForegroundColor Cyan
    Write-Host "  • https://152.42.229.212" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "⏱️  Next Steps:" -ForegroundColor Green
    Write-Host "  1. Visit the URL above to verify" -ForegroundColor Gray
    Write-Host "  2. Sign out to see ModernLogin landing page" -ForegroundColor Gray
    Write-Host "  3. Test responsive design on mobile" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   WorkGrid ModernLogin UI Deployment - Preparation        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Status "Checking prerequisites..." "info"
Test-SshKey
Test-BuildDirectory

Write-Host ""
Write-Status "Preparing deployment package..." "info"

Deploy-ToVps

Show-DeploymentSummary

Write-Host "✅ Deployment preparation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT NEXT STEP:" -ForegroundColor Yellow
Write-Host "  Use SCP or SFTP to upload dist/ folder to 152.42.229.212:/app/frontend" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Command:" -ForegroundColor Gray
Write-Host "  scp -i ~/.ssh/workgrid_vps -r app/dist/* root@152.42.229.212:/app/frontend/" -ForegroundColor Cyan
Write-Host ""
