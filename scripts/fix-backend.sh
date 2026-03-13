#!/bin/bash
#
# FIX BACKEND CONNECTION
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 FIX BACKEND CONNECTION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Check container status
echo -e "${YELLOW}📋 Step 1: Checking containers...${NC}"
docker-compose ps

# Step 2: Check backend logs
echo ""
echo -e "${YELLOW}📋 Step 2: Backend logs (last 30 lines)...${NC}"
docker-compose logs --tail=30 backend 2>/dev/null || docker logs --tail=30 discord_clone_backend 2>/dev/null || echo "   Could not get logs"

# Step 3: Check if backend is listening
echo ""
echo -e "${YELLOW}🔍 Step 3: Checking backend port...${NC}"
docker exec discord_clone_backend netstat -tlnp 2>/dev/null | grep 3001 || docker exec discord_clone_backend ss -tlnp 2>/dev/null | grep 3001 || echo "   Port 3001 not found"

# Step 4: Test backend health internally
echo ""
echo -e "${YELLOW}🧪 Step 4: Testing backend health...${NC}"
docker exec discord_clone_backend curl -s http://localhost:3001/api/health 2>/dev/null || echo "   Health check failed"

# Step 5: Check nginx config
echo ""
echo -e "${YELLOW}📋 Step 5: Nginx configuration...${NC}"
docker exec discord_clone_nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -A5 "upstream backend" || echo "   Could not get nginx config"

# Step 6: Restart backend
echo ""
echo -e "${YELLOW}🔄 Step 6: Restarting backend...${NC}"
docker-compose restart backend
docker-compose restart nginx

sleep 5

# Step 7: Check again
echo ""
echo -e "${YELLOW}📋 Step 7: Status after restart...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Backend fix attempted!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🧪 Test login at: https://workgrid.homeku.net/login"
echo ""
