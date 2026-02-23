#!/bin/bash

# ============================================
# Discord Clone - Backup Script
# Usage: ./scripts/backup.sh
# ============================================

set -e

echo "💾 Discord Clone Backup"
echo "========================================"

# Warna
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup directory
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"

# Check if containers are running
if ! docker-compose ps | grep -q "discord_clone_db"; then
    print_error "Database container tidak berjalan"
    exit 1
fi

# Backup database
echo ""
echo "🗄️  Backing up database..."
docker-compose exec -T db pg_dump -U discord_user discord_clone > "$BACKUP_DIR/database.sql"

if [ -f "$BACKUP_DIR/database.sql" ]; then
    DB_SIZE=$(du -h "$BACKUP_DIR/database.sql" | cut -f1)
    print_success "Database backup created ($DB_SIZE)"
else
    print_error "Failed to create database backup"
    exit 1
fi

# Backup uploads
echo ""
echo "📤 Backing up uploads..."
UPLOADS_BACKUP_DIR="$BACKUP_DIR/uploads"
mkdir -p "$UPLOADS_BACKUP_DIR"

# Copy uploads dari container
docker cp discord_clone_backend:/app/uploads "$UPLOADS_BACKUP_DIR/" 2>/dev/null || true

if [ -d "$UPLOADS_BACKUP_DIR/uploads" ]; then
    UPLOADS_SIZE=$(du -sh "$UPLOADS_BACKUP_DIR/uploads" 2>/dev/null | cut -f1 || echo "0B")
    print_success "Uploads backup created ($UPLOADS_SIZE)"
else
    print_warning "No uploads to backup"
fi

# Backup environment files
echo ""
echo "⚙️  Backing up configuration..."
cp .env "$BACKUP_DIR/" 2>/dev/null || print_warning ".env file not found"
cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true

# Create backup info
echo ""
echo "📝 Creating backup info..."
cat > "$BACKUP_DIR/backup-info.txt" << EOF
Discord Clone Backup
====================
Backup Date: $(date)
Hostname: $(hostname)
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version)

Containers Status:
$(docker-compose ps)

Database Size:
$(docker-compose exec -T db psql -U discord_user -d discord_clone -c "SELECT pg_size_pretty(pg_database_size('discord_clone'));" 2>/dev/null || echo "N/A")
EOF

# Compress backup
echo ""
echo "🗜️  Compressing backup..."
cd backups
BACKUP_TAR="$(basename $BACKUP_DIR).tar.gz"
tar -czf "$BACKUP_TAR" "$(basename $BACKUP_DIR)"
cd ..

# Remove uncompressed backup
rm -rf "$BACKUP_DIR"

if [ -f "backups/$BACKUP_TAR" ]; then
    TAR_SIZE=$(du -h "backups/$BACKUP_TAR" | cut -f1)
    print_success "Backup compressed: backups/$BACKUP_TAR ($TAR_SIZE)"
else
    print_error "Failed to compress backup"
    exit 1
fi

# Cleanup old backups (keep last 10)
echo ""
echo "🧹 Cleaning up old backups..."
cd backups
ls -t *.tar.gz | tail -n +11 | xargs -r rm --
cd ..

REMAINING=$(ls -1 backups/*.tar.gz 2>/dev/null | wc -l)
print_success "Cleanup complete. $REMAINING backups remaining."

echo ""
echo "========================================"
print_success "Backup complete! 💾"
echo ""
echo "📦 Backup file: backups/$BACKUP_TAR"
echo ""
echo "To restore from backup:"
echo "  1. Extract: tar -xzf backups/$BACKUP_TAR"
echo "  2. Restore DB: docker-compose exec -T db psql -U discord_user discord_clone < backups/$(basename $BACKUP_DIR .tar.gz)/database.sql"
echo ""
