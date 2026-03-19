# Deploy Update to Backend VPS (152.42.229.212)
# Run this in PowerShell as Administrator

$VPS_IP = "152.42.229.212"
$VPS_USER = "root"
$VPS_PASS = "%0|F?H@f!berhO3e"
$ProjectDir = $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deploy Message Limit Update" -ForegroundColor Cyan
Write-Host "  Backend VPS: $VPS_IP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Test connection
Write-Host "[*] Testing connection to VPS..." -ForegroundColor Yellow
$pingResult = Test-Connection -ComputerName $VPS_IP -Count 2 -Quiet
if (-not $pingResult) {
    Write-Host "[!] VPS tidak dapat dijangkau!" -ForegroundColor Red
    exit 1
}
Write-Host "[✓] VPS online" -ForegroundColor Green
Write-Host ""

# Check if Posh-SSH is installed
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "[*] Installing Posh-SSH module..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser
}
Import-Module Posh-SSH

# Create PSCredential
$SecurePassword = ConvertTo-SecureString $VPS_PASS -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $SecurePassword)

Write-Host "[*] Connecting to VPS..." -ForegroundColor Yellow
$Session = New-SSHSession -ComputerName $VPS_IP -Credential $Credential -AcceptKey

if (-not $Session) {
    Write-Host "[!] Failed to connect!" -ForegroundColor Red
    exit 1
}
Write-Host "[✓] Connected to VPS" -ForegroundColor Green
Write-Host ""

# Copy files
Write-Host "[*] Copying server.js..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $VPS_IP -Credential $Credential -Path "$ProjectDir\server\server.js" -Destination "/opt/workgrid/server/" -Force

Write-Host "[*] Copying database.js..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $VPS_IP -Credential $Credential -Path "$ProjectDir\server\database.js" -Destination "/opt/workgrid/server/" -Force

Write-Host "[*] Copying database-postgres.js..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $VPS_IP -Credential $Credential -Path "$ProjectDir\server\database-postgres.js" -Destination "/opt/workgrid/server/" -Force

Write-Host ""
Write-Host "[*] Restarting backend container..." -ForegroundColor Yellow
$Command = "cd /opt/workgrid && docker-compose restart backend"
Invoke-SSHCommand -SSHSession $Session -Command $Command | Select-Object -ExpandProperty Output

# Close session
Remove-SSHSession -SSHSession $Session | Out-Null

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  [✓] Deploy Selesai!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Message limit berhasil diubah dari 50 ke 1000!" -ForegroundColor Cyan
Write-Host ""
Read-Host "Tekan Enter untuk keluar"
