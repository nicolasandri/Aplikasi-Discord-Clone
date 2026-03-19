# ============================================
# Add SSH Key to VPS via Manual Input
# ============================================

$PublicKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFkqF4F/1dUxVJs480h3jkFKGsztK0Y5TSkSQ1Ri0w5d workgrid-access@local"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Setup SSH Key untuk Multi-VPS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Public Key yang akan ditambahkan:" -ForegroundColor Yellow
Write-Host $PublicKey -ForegroundColor Gray
Write-Host ""

Write-Host "INSTRUKSI:" -ForegroundColor Green
Write-Host "1. Copy public key di atas" -ForegroundColor White
Write-Host "2. Buka DigitalOcean Console untuk masing-masing VPS" -ForegroundColor White
Write-Host "3. Jalankan perintah berikut di console:" -ForegroundColor White
Write-Host ""

Write-Host "# Untuk VPS Frontend (165.22.63.51):" -ForegroundColor Cyan
Write-Host "mkdir -p ~/.ssh && chmod 700 ~/.ssh" -ForegroundColor Gray
Write-Host "echo '$PublicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "systemctl restart ssh" -ForegroundColor Gray
Write-Host ""

Write-Host "# Untuk VPS Backend (152.42.229.212):" -ForegroundColor Cyan
Write-Host "mkdir -p ~/.ssh && chmod 700 ~/.ssh" -ForegroundColor Gray
Write-Host "echo '$PublicKey' >> ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Gray
Write-Host "systemctl restart ssh" -ForegroundColor Gray
Write-Host ""

Write-Host "Setelah itu, test koneksi dengan:" -ForegroundColor Green
Write-Host "ssh -i `"`$env:USERPROFILE\.ssh\workgrid_vps_access`" root@165.22.63.51" -ForegroundColor Yellow
Write-Host "ssh -i `"`$env:USERPROFILE\.ssh\workgrid_vps_access`" root@152.42.229.212" -ForegroundColor Yellow
Write-Host ""

# Simpan key info
$keyInfo = @"
# WorkGrid VPS SSH Access
# Generated: $(Get-Date)

## Public Key
$PublicKey

## VPS List
Frontend: 165.22.63.51
Backend: 152.42.229.212

## SSH Commands
ssh -i ~/.ssh/workgrid_vps_access root@165.22.63.51
ssh -i ~/.ssh/workgrid_vps_access root@152.42.229.212
"@

$keyInfo | Out-File -FilePath "SSH_KEY_INFO.txt" -Encoding utf8
Write-Host "Info disimpan ke: SSH_KEY_INFO.txt" -ForegroundColor Green
