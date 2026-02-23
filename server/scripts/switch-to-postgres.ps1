# Migration Script: Switch to PostgreSQL
# Usage: .\switch-to-postgres.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Switching to PostgreSQL..." -ForegroundColor Green

# 1. Backup SQLite first
Write-Host "`n📦 Step 1: Backing up SQLite database..." -ForegroundColor Cyan
& .\backup-sqlite.ps1

# 2. Update server.js to use PostgreSQL
Write-Host "`n📝 Step 2: Updating server.js..." -ForegroundColor Cyan
$serverJsPath = "..\server.js"
if (Test-Path $serverJsPath) {
    $content = Get-Content $serverJsPath -Raw
    
    # Replace SQLite import with PostgreSQL
    if ($content -match "require\(.\./database.\)" -or $content -match "require\(../database.\)" -or $content -match "from '.\/database'") {
        $content = $content -replace "require\(['\"]\./database['\"]\)", "require('./database-postgres')"
        Set-Content $serverJsPath $content -NoNewline
        Write-Host "✅ Updated server.js to use PostgreSQL" -ForegroundColor Green
    }
}

# 3. Run PostgreSQL setup
Write-Host "`n🐘 Step 3: Setting up PostgreSQL..." -ForegroundColor Cyan
Set-Location ..
Set-Location migrations
node setup-postgres.js

Write-Host "`n✅ Migration to PostgreSQL complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Ensure PostgreSQL is running" -ForegroundColor Gray
Write-Host "  2. Update .env with your PostgreSQL credentials" -ForegroundColor Gray
Write-Host "  3. Restart the server: npm start" -ForegroundColor Gray

Set-Location ..\scripts
