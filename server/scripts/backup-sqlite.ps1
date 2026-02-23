# SQLite Database Backup Script
# Usage: .\backup-sqlite.ps1

$ErrorActionPreference = "Stop"

$sourceDb = "..\workgrid.db"
$backupDir = "..\backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "workgrid_$timestamp.db"

# Create backups directory if not exists
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "📁 Created backups directory" -ForegroundColor Green
}

# Check if source database exists
if (-not (Test-Path $sourceDb)) {
    Write-Host "⚠️  SQLite database not found at $sourceDb" -ForegroundColor Yellow
    exit 0
}

# Create backup
$destination = Join-Path $backupDir $backupFile
Copy-Item -Path $sourceDb -Destination $destination -Force
Write-Host "✅ Backup created: $destination" -ForegroundColor Green

# List recent backups
Write-Host "`n📋 Recent backups:" -ForegroundColor Cyan
Get-ChildItem $backupDir -Filter "workgrid_*.db" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    ForEach-Object { 
        $size = "{0:N2}" -f ($_.Length / 1MB)
        Write-Host "   - $($_.Name) ($size MB)" -ForegroundColor Gray
    }
