#!/bin/bash
#
# RESTART BACKEND AND VERIFY
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔄 RESTART & VERIFY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd /opt/workgrid

# Step 1: Restart backend
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
docker-compose restart backend

echo -e "${YELLOW}⏳ Waiting for backend to start (20 seconds)...${NC}"
sleep 20

# Step 2: Check logs
echo ""
echo -e "${YELLOW}📋 Backend logs (last 20 lines)...${NC}"
docker logs --tail=20 discord_clone_backend

# Step 3: Verify admin user exists
echo ""
echo -e "${YELLOW}🔍 Checking admin user...${NC}"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
SELECT id, username, email, is_active, is_master_admin FROM users WHERE email = 'admin@workgrid.com';
" 2>/dev/null || echo "Could not query database"

# Step 4: Test API
echo ""
echo -e "${YELLOW}🧪 Testing API...${NC}"
if curl -s http://localhost/api/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✅ API is working!${NC}"
else
    echo -e "${YELLOW}⚠️ API not ready yet${NC}"
fi

# Step 5: Test login endpoint
echo -e "${YELLOW}🧪 Testing login endpoint...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@workgrid.com","password":"admin123"}' 2>/dev/null || echo "")

if echo "$LOGIN_RESPONSE" | grep -q "token\|user"; then
    echo -e "${GREEN}✅ Login working!${NC}"
elif echo "$LOGIN_RESPONSE" | grep -q "Invalid"; then
    echo -e "${YELLOW}⚠️ Login returns: $LOGIN_RESPONSE${NC}"
else
    echo -e "${YELLOW}⚠️ Login response: $LOGIN_RESPONSE${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ RESTART COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Try login: https://workgrid.homeku.net/login"
echo ""
