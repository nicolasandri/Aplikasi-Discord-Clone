#!/bin/bash

# ============================================
# Discord Clone - Automated Backup Script
# Run via Cron for daily backups
# ============================================

set -e

# Configuration
PROJECT_DIR="$HOME/Aplikasi-Discord-Clone"
BACKUP_DIR="$PROJECT_DIR/backups"
RETENTION_DAYS=7
LOG_FILE="$HOME/backup.log"

# Colors (for terminal output)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Change to project directory
cd "$PROJECT_DIR" || exit 1

log "========================================"
log "Starting automated backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="discord_clone_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Create temp directory
mkdir -p "$BACKUP_PATH"

# ============================================
# Backup Database
# ============================================
log "Backing up database..."

if docker-compose ps | grep -q "discord_clone_db"; then
    docker-compose exec -T db pg_dump \
        -U discord_user \
        -d discord_clone \
        --verbose \
        > "$BACKUP_PATH/database.sql" 2>> "$LOG_FILE"
    
    DB_SIZE=$(du -h "$BACKUP_PATH/database.sql" | cut -f1)
    log "Database backup created: $DB_SIZE"
else
    log "WARNING: Database container not running!"
fi

# ============================================
# Backup Uploads
# ============================================
log "Backing up uploads..."

if [ -d "uploads" ]; then
    cp -r uploads "$BACKUP_PATH/"
    UPLOADS_SIZE=$(du -sh "$BACKUP_PATH/uploads" 2>/dev/null | cut -f1 || echo "0B")
    log "Uploads backup created: $UPLOADS_SIZE"
else
    log "No uploads directory found"
fi

# ============================================
# Backup Configuration
# ============================================
log "Backing up configuration..."

cp .env "$BACKUP_PATH/" 2>/dev/null || log "No .env file found"
cp docker-compose.yml "$BACKUP_PATH/" 2>/dev/null || log "No docker-compose.yml found"

# Create backup info
cat > "$BACKUP_PATH/backup-info.txt" << EOF
Discord Clone Backup
====================
Backup Date: $(date)
Hostname: $(hostname)
Backup Type: Automated (Cron)
Project Directory: $PROJECT_DIR

Docker Containers Status:
$(docker-compose ps 2>/dev/null || echo "Docker not running")

Disk Usage:
$(df -h $PROJECT_DIR | tail -1)

Database Size:
$(docker-compose exec -T db psql -U discord_user -d discord_clone -c "SELECT pg_size_pretty(pg_database_size('discord_clone'));" 2>/dev/null || echo "N/A")
EOF

# ============================================
# Compress Backup
# ============================================
log "Compressing backup..."

cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

COMPRESSED_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log "Backup compressed: ${BACKUP_NAME}.tar.gz ($COMPRESSED_SIZE)"

# ============================================
# Cleanup Old Backups
# ============================================
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

DELETED_COUNT=$(find "$BACKUP_DIR" -name "discord_clone_*.tar.gz" -mtime +$RETENTION_DAYS | wc -l)
find "$BACKUP_DIR" -name "discord_clone_*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Deleted $DELETED_COUNT old backup(s)"

# ============================================
# Upload to Cloud (Optional)
# ============================================
# Uncomment and configure if using cloud backup

# # AWS S3
# if command -v aws &> /dev/null; then
#     aws s3 cp "${BACKUP_NAME}.tar.gz" s3://your-bucket/discord-clone-backups/ \
#         --storage-class STANDARD_IA
#     log "Backup uploaded to S3"
# fi

# # Google Drive (using rclone)
# if command -v rclone &> /dev/null; then
#     rclone copy "${BACKUP_NAME}.tar.gz" gdrive:discord-clone-backups/
#     log "Backup uploaded to Google Drive"
# fi

# ============================================
# Summary
# ============================================
REMAINING=$(ls -1 "$BACKUP_DIR"/discord_clone_*.tar.gz 2>/dev/null | wc -l)

log "========================================"
log "Backup Summary:"
log "  Backup file: ${BACKUP_NAME}.tar.gz"
log "  Size: $COMPRESSED_SIZE"
log "  Location: $BACKUP_DIR"
log "  Total backups: $REMAINING"
log "========================================"

# Check disk space
DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARNING: Disk usage is ${DISK_USAGE}%! Consider cleaning up old backups."
fi

log "Backup completed successfully!"

# Send notification (optional)
# Uncomment if you want notifications

# # Email notification (requires mailutils)
# if command -v mail &> /dev/null; then
#     echo "Backup completed: ${BACKUP_NAME}.tar.gz ($COMPRESSED_SIZE)" | \
#         mail -s "Discord Clone Backup - $(date +%Y-%m-%d)" admin@example.com
# fi

# # Discord webhook notification
# if [ -n "$DISCORD_WEBHOOK_URL" ]; then
#     curl -H "Content-Type: application/json" \
#          -d "{\"content\":\"✅ Backup completed: ${BACKUP_NAME}.tar.gz ($COMPRESSED_SIZE)\"}" \
#          "$DISCORD_WEBHOOK_URL"
# fi

exit 0
