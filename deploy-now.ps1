# Deploy Message Limit Update
$VPS_IP = '152.42.229.212'
$VPS_USER = 'root'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deploy: Message Limit 50 -> 1000" -ForegroundColor Cyan
Write-Host "  VPS: $VPS_IP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PasswordFile = "$PSScriptRoot\.temppass"
$VPS_PASS = Get-Content $PasswordFile -Raw
$VPS_PASS = $VPS_PASS.Trim()

Write-Host "[*] Checking Posh-SSH..." -ForegroundColor Yellow
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "[*] Installing Posh-SSH..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser
}
Import-Module Posh-SSH

$SecurePassword = ConvertTo-SecureString $VPS_PASS -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential($VPS_USER, $SecurePassword)

Write-Host "[*] Connecting to VPS..." -ForegroundColor Yellow
$Session = New-SSHSession -ComputerName $VPS_IP -Credential $Credential -AcceptKey
Write-Host "[✓] Connected to VPS" -ForegroundColor Green

$ProjectDir = "$PSScriptRoot"

Write-Host ""
Write-Host "[*] Copying server.js..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $VPS_IP -Credential $Credential -Path "$ProjectDir\server\server.js" -Destination '/opt/workgrid/server/' -Force

Write-Host "[*] Copying database.js..." -ForegroundColor Yellow  
Set-SCPItem -ComputerName $VPS_IP -Credential $Credential -Path "$ProjectDir\server\database.js" -Destination '/opt/workgrid/server/' -Force

Write-Host "[*] Copying database-postgres.js..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $VPS_IP -Credential $Credential -Path "$ProjectDir\server\database-postgres.js" -Destination '/opt/workgrid/server/' -Force

Write-Host ""
Write-Host "[*] Restarting backend container..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SSHSession $Session -Command 'cd /opt/workgrid && docker-compose restart backend'
Write-Host $result.Output

Remove-SSHSession -SSHSession $Session | Out-Null

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  [✓] Deploy Selesai!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Message limit berhasil diubah dari 50 ke 1000!" -ForegroundColor Cyan
Write-Host ""
Read-Host "Tekan Enter untuk keluar"
