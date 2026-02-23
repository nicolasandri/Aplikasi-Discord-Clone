#!/bin/bash

# ============================================
# Discord Clone - Update Script
# Usage: ./scripts/update.sh
# ============================================

set -e

echo "⬆️  Discord Clone Update"
echo "========================================"

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

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main || {
    print_error "Failed to pull code"
    exit 1
}

# Create backup before update
echo ""
echo "💾 Creating backup before update..."
./scripts/backup.sh || print_warning "Backup failed, continuing with update"

# Rebuild and redeploy
echo ""
echo "🔄 Rebuilding and redeploying..."
docker-compose down

echo ""
echo "📦 Pulling latest images..."
docker-compose pull

echo ""
echo "🔨 Building new images..."
docker-compose build --no-cache

echo ""
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Update successful! 🎉"
else
    print_error "Update may have failed. Check logs: docker-compose logs"
    exit 1
fi

echo ""
echo "📊 Updated containers:"
docker-compose ps

echo ""
print_success "Update complete!"
