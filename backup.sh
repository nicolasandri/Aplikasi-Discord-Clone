#!/bin/bash

# Backup Script for WorkGrid

BACKUP_DIR="/opt/workgrid/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "=== BACKUP STARTED ==="
echo "Date: $(date)"
echo "Backup Directory: $BACKUP_DIR"
echo ""

echo "1. Backup Database PostgreSQL..."
docker exec discord_clone_db pg_dump -U discord_user -d discord_clone > "$BACKUP_DIR/database_backup.sql"
echo "   Database: $(ls -lh $BACKUP_DIR/database_backup.sql | awk '{print $5}')"

echo ""
echo "2. Backup Configuration Files..."
cp /opt/workgrid/docker-compose.vps.yml "$BACKUP_DIR/"
cp /opt/workgrid/server/config/database.js "$BACKUP_DIR/"
cp /opt/workgrid/app/src/components/DMChatArea.tsx "$BACKUP_DIR/"
cp /opt/workgrid/app/src/components/DMList.tsx "$BACKUP_DIR/"
cp /opt/workgrid/app/src/components/ChatLayout.tsx "$BACKUP_DIR/"
echo "   Config files backed up"

echo ""
echo "3. Create Summary File..."
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
BACKUP INFORMATION
==================
Date: $(date)
Description: Fix DM timezone WIB (Asia/Jakarta)

Changes:
- Fixed DM display names (Unknown -> correct names)
- Fixed timestamp format from AM/PM to 24-hour WIB
- Fixed database timezone to Asia/Jakarta
- Fixed frontend timezone display

Files Modified:
- docker-compose.vps.yml (added TZ for db and backend)
- server/config/database.js (added timezone config)
- app/src/components/DMChatArea.tsx (formatTime function)
- app/src/components/DMList.tsx (friend extraction)
- app/src/components/ChatLayout.tsx (friend extraction)

Containers:
- discord_clone_db
- discord_clone_backend
- discord_clone_frontend
EOF
echo "   Backup info: $BACKUP_DIR/BACKUP_INFO.txt"

echo ""
echo "4. Create Archive..."
cd /opt/workgrid/backups
tar -czf "$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"
echo "   Archive: $(ls -lh $BACKUP_DIR.tar.gz | awk '{print $5}')"

echo ""
echo "=== BACKUP COMPLETED ==="
echo "Location: $BACKUP_DIR"
echo "Archive: $BACKUP_DIR.tar.gz"
