#!/bin/bash
#
# FIX CHAT & UPLOADS
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"
DOMAIN="workgrid.homeku.net"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}💬 FIX CHAT & UPLOADS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Must run as root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Check uploads directory
echo -e "${YELLOW}📁 Checking uploads...${NC}"
if [ -d "backups/uploads_latest" ]; then
    echo "   Found uploads backup, restoring..."
    docker cp backups/uploads_latest/. discord_clone_backend:/app/uploads/ 2>/dev/null || true
    echo -e "${GREEN}   ✅ Uploads restored${NC}"
elif [ -f "backups/uploads_latest.tar.gz" ]; then
    echo "   Extracting uploads backup..."
    tar -xzf backups/uploads_latest.tar.gz -C /tmp/ 2>/dev/null || true
    docker cp /tmp/uploads/. discord_clone_backend:/app/uploads/ 2>/dev/null || true
    echo -e "${GREEN}   ✅ Uploads restored${NC}"
else
    echo "   No uploads backup found (this is OK for fresh install)"
fi

# Step 2: Fix permissions
echo -e "${YELLOW}🔧 Fixing permissions...${NC}"
docker exec discord_clone_backend mkdir -p /app/uploads 2>/dev/null || true
docker exec discord_clone_backend chmod -R 755 /app/uploads 2>/dev/null || true

# Step 3: Check WebSocket/Socket.IO configuration
echo -e "${YELLOW}🔍 Checking WebSocket configuration...${NC}"
docker exec discord_clone_nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -A10 "socket.io" || echo "   Socket.IO config not found in nginx"

# Step 4: Restart backend and nginx
echo -e "${YELLOW}🔄 Restarting services...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml restart backend nginx

sleep 5

# Step 5: Test WebSocket
echo -e "${YELLOW}🧪 Testing connections...${NC}"

# Test API
echo "   Testing API..."
if curl -s https://$DOMAIN/api/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}   ✅ API is working${NC}"
else
    echo -e "${RED}   ❌ API not responding${NC}"
fi

# Test Socket.IO endpoint
echo "   Testing Socket.IO..."
if curl -sI https://$DOMAIN/socket.io/ 2>/dev/null | grep -q "200\|401"; then
    echo -e "${GREEN}   ✅ Socket.IO endpoint reachable${NC}"
else
    echo -e "${YELLOW}   ⚠️ Socket.IO may have issues${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🧪 Test chat at: https://$DOMAIN"
echo ""
echo -e "📋 If chat still not working:"
echo -e "   1. Clear browser cache (Ctrl+Shift+R)"
echo -e "   2. Check browser console (F12 → Console)"
echo -e "   3. Check logs: docker logs discord_clone_backend"
echo ""
