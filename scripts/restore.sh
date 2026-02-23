#!/bin/bash

# ============================================
# Discord Clone - Restore Script
# Usage: ./scripts/restore.sh <backup_file>
# ============================================

set -e

echo "🔄 Discord Clone Restore"
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

# Check arguments
if [ -z "$1" ]; then
    print_error "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh backups/*.tar.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Confirm restore
print_warning "This will restore data from: $BACKUP_FILE"
print_warning "Current data will be overwritten!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Check if containers are running
if ! docker-compose ps | grep -q "discord_clone_db"; then
    print_warning "Containers not running, starting them..."
    docker-compose up -d
    sleep 10
fi

# Extract backup
BACKUP_NAME=$(basename "$BACKUP_FILE" .tar.gz)
EXTRACT_DIR="backups/$BACKUP_NAME"

echo ""
echo "📦 Extracting backup..."
rm -rf "$EXTRACT_DIR"
tar -xzf "$BACKUP_FILE" -C backups/

if [ ! -d "$EXTRACT_DIR" ]; then
    print_error "Failed to extract backup"
    exit 1
fi

print_success "Backup extracted"

# Restore database
echo ""
echo "🗄️  Restoring database..."

if [ -f "$EXTRACT_DIR/database.sql" ]; then
    # Drop and recreate database
    docker-compose exec -T db psql -U discord_user -d postgres -c "DROP DATABASE IF EXISTS discord_clone;" || true
    docker-compose exec -T db psql -U discord_user -d postgres -c "CREATE DATABASE discord_clone;" || true
    
    # Restore data
    docker-compose exec -T db psql -U discord_user discord_clone < "$EXTRACT_DIR/database.sql"
    
    print_success "Database restored"
else
    print_error "Database backup not found in archive"
    exit 1
fi

# Restore uploads
echo ""
echo "📤 Restoring uploads..."

if [ -d "$EXTRACT_DIR/uploads" ]; then
    docker cp "$EXTRACT_DIR/uploads/." discord_clone_backend:/app/uploads/
    print_success "Uploads restored"
else
    print_warning "No uploads to restore"
fi

# Cleanup
rm -rf "$EXTRACT_DIR"

# Restart services
echo ""
echo "🔄 Restarting services..."
docker-compose restart

echo ""
echo "========================================"
print_success "Restore complete! 🎉"
echo ""
echo "Please verify your data is correct."
echo ""
