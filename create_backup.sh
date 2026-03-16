#!/bin/bash

# WorkGrid Versioned Backup Script

VERSION="v1.0.1"
DATE_STR=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="workgrid_${DATE_STR}_${VERSION}"
BACKUP_DIR="/opt/workgrid/backups/versions/${BACKUP_NAME}"

mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "WORKGRID BACKUP - $VERSION"
echo "=========================================="
echo "Date: $(date)"
echo "Version: $VERSION"
echo "Backup Name: $BACKUP_NAME"
echo ""

# 1. Database backup
echo "[1/4] Backing up database..."
docker exec discord_clone_db pg_dump -U discord_user -d discord_clone > "$BACKUP_DIR/database.sql"
echo "      Database: $(ls -lh $BACKUP_DIR/database.sql | cut -d' ' -f5)"

# 2. Config files
echo "[2/4] Backing up config files..."
cp /opt/workgrid/docker-compose.vps.yml "$BACKUP_DIR/"
cp /opt/workgrid/server/config/database.js "$BACKUP_DIR/"
cp /opt/workgrid/app/src/components/DMChatArea.tsx "$BACKUP_DIR/"
cp /opt/workgrid/app/src/components/DMList.tsx "$BACKUP_DIR/"
cp /opt/workgrid/app/src/components/ChatLayout.tsx "$BACKUP_DIR/"
echo "      Config files backed up"

# 3. Create version info
echo "[3/4] Creating version info..."
cat > "$BACKUP_DIR/VERSION_INFO.txt" << EOF
=================================================================
WORKGRID BACKUP - VERSION INFORMATION
=================================================================

Version:        $VERSION
Backup Date:    $(date +"%Y-%m-%d")
Backup Time:    $(date +"%H:%M:%S") WIB
Timestamp:      $DATE_STR
Backup Name:    $BACKUP_NAME

=================================================================
CHANGES IN THIS VERSION
=================================================================

Bug Fixes:
----------
1. FIXED: DM user names showing "Unknown" in sidebar and header
   - Root cause: API returns 'members' array, frontend expected 'friend' object
   - Fix: Extract friend from members array where user ID != current user
   - Files: DMList.tsx, ChatLayout.tsx

2. FIXED: Timestamps showing UTC instead of WIB (Asia/Jakarta)
   - Root cause: Database and backend using UTC timezone
   - Fix: 
     * Set VPS timezone to Asia/Jakarta
     * Set PostgreSQL container TZ=Asia/Jakarta, PGTZ=Asia/Jakarta
     * Set Backend container TZ=Asia/Jakarta with tzdata package
     * Update Node.js pg connection with timezone config
     * Update frontend formatTime() to use Asia/Jakarta timezone
   - Files: docker-compose.vps.yml, database.js, DMChatArea.tsx

=================================================================
FILES INCLUDED
=================================================================

Config Files:
- docker-compose.vps.yml    (Docker compose configuration)
- database.js               (Backend database config with timezone)

Frontend Components:
- DMChatArea.tsx            (DM chat with WIB timezone formatting)
- DMList.tsx                (DM list with friend extraction fix)
- ChatLayout.tsx            (Layout with DM channel mapping fix)

Database:
- database.sql              (Full PostgreSQL dump)

=================================================================
RESTORE INSTRUCTIONS
=================================================================

1. Extract backup:
   tar -xzf ${BACKUP_NAME}.tar.gz

2. Restore database:
   docker exec -i discord_clone_db psql -U discord_user -d discord_clone < database.sql

3. Copy config files back to their locations

4. Rebuild and restart containers:
   docker-compose -f docker-compose.vps.yml up -d --build

=================================================================
CONTAINER STATUS (at backup time)
=================================================================
EOF

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' >> "$BACKUP_DIR/VERSION_INFO.txt"

cat >> "$BACKUP_DIR/VERSION_INFO.txt" << EOF

=================================================================
END OF VERSION INFO
=================================================================
EOF

echo "      Version info created"

# 4. Create archive
echo "[4/4] Creating archive..."
cd /opt/workgrid/backups/versions
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
ARCHIVE_SIZE=$(ls -lh "${BACKUP_NAME}.tar.gz" | cut -d' ' -f5)
echo "      Archive: $ARCHIVE_SIZE"

echo ""
echo "=========================================="
echo "BACKUP COMPLETED SUCCESSFULLY"
echo "=========================================="
echo "Version:     $VERSION"
echo "Timestamp:   $DATE_STR"
echo "Location:    $BACKUP_DIR"
echo "Archive:     /opt/workgrid/backups/versions/${BACKUP_NAME}.tar.gz"
echo "Size:        $ARCHIVE_SIZE"
echo "=========================================="

# Output the backup name for GitHub push
echo "BACKUP_NAME:$BACKUP_NAME"
