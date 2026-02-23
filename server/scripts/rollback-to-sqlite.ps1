# Rollback Script: Switch back to SQLite
# Usage: .\rollback-to-sqlite.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔄 Rolling back to SQLite..." -ForegroundColor Yellow

# 1. Check for PostgreSQL database file
$postgresDbPath = "..\database-postgres.js"
$originalDbPath = "..\database.js"
$backupPath = "..\database-sqlite-backup.js"

# 2. Restore original database.js if backup exists
if (Test-Path $backupPath) {
    Copy-Item -Path $backupPath -Destination $originalDbPath -Force
    Write-Host "✅ Restored SQLite database.js" -ForegroundColor Green
} else {
    Write-Host "⚠️  SQLite backup not found at $backupPath" -ForegroundColor Yellow
}

# 3. Update server.js to use SQLite
$serverJsPath = "..\server.js"
if (Test-Path $serverJsPath) {
    $content = Get-Content $serverJsPath -Raw
    
    # Replace PostgreSQL import with SQLite
    if ($content -match "database-postgres") {
        $content = $content -replace "database-postgres", "database"
        Set-Content $serverJsPath $content -NoNewline
        Write-Host "✅ Updated server.js to use SQLite" -ForegroundColor Green
    }
}

Write-Host "`n✅ Rollback complete!" -ForegroundColor Green
Write-Host "⚠️  Note: Data in PostgreSQL is preserved but not synced back to SQLite" -ForegroundColor Yellow
Write-Host "`nTo restart the server:" -ForegroundColor Cyan
Write-Host "  1. Stop the current server (Ctrl+C)" -ForegroundColor Gray
Write-Host "  2. Update .env to remove PostgreSQL settings" -ForegroundColor Gray
Write-Host "  3. Run: npm start" -ForegroundColor Gray
