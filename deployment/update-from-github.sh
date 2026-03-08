#!/bin/bash
# WorkGrid Update from GitHub Script
# Usage: bash /opt/workgrid/deployment/update-from-github.sh

set -e

APP_DIR="/opt/workgrid"
REPO_URL="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"

echo "🔄 Updating WorkGrid from GitHub..."
echo "===================================="
echo ""

cd "$APP_DIR"

# Backup database first
echo "💾 Creating database backup..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec workgrid-db pg_dump -U workgrid workgrid > "$APP_DIR/$BACKUP_FILE" 2>/dev/null || echo "⚠️  Database backup skipped (container may not be running)"

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git pull origin main || git pull origin master

# Rebuild and restart
echo "🔨 Rebuilding containers..."
docker-compose -f deployment/docker-compose.vps.yml down
docker-compose -f deployment/docker-compose.vps.yml up --build -d

# Wait for services
echo "⏳ Waiting for services..."
sleep 10

# Check status
echo ""
echo "📊 Service Status:"
docker-compose -f deployment/docker-compose.vps.yml ps

echo ""
echo "===================================="
echo "✅ Update Complete!"
echo "===================================="
echo ""
