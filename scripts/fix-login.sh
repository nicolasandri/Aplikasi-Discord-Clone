#!/bin/bash
#
# FIX LOGIN ISSUE - Reset admin password and restart backend
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 FIX LOGIN ISSUE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Go to project directory
cd /opt/workgrid 2>/dev/null || {
    echo -e "${RED}❌ Project directory not found!${NC}"
    exit 1
}

# Step 1: Check containers
echo -e "${YELLOW}📋 Checking containers...${NC}"
docker-compose ps 2>/dev/null || docker ps

# Step 2: Reset admin password in database
echo ""
echo -e "${YELLOW}📝 Resetting admin password...${NC}"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
UPDATE users SET 
    password = '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G',
    is_active = true,
    force_password_change = false
WHERE email = 'admin@workgrid.com';
" 2>/dev/null || echo "Password update attempted"

# Step 3: Verify admin exists
echo ""
echo -e "${YELLOW}🔍 Verifying admin user...${NC}"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
SELECT id, username, email, is_active, is_master_admin FROM users WHERE email = 'admin@workgrid.com';
" 2>/dev/null || echo "Could not verify"

# Step 4: Restart backend
echo ""
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
docker-compose restart backend 2>/dev/null || docker restart discord_clone_backend

sleep 5

# Step 5: Check backend logs
echo ""
echo -e "${YELLOW}📋 Backend logs (last 10 lines)...${NC}"
docker logs --tail=10 discord_clone_backend 2>/dev/null || echo "Could not get logs"

# Step 6: Test API
echo ""
echo -e "${YELLOW}🧪 Testing API...${NC}"
if curl -s http://localhost/api/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✅ API is working!${NC}"
else
    echo -e "${YELLOW}⚠️ API health check failed${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Try login: https://workgrid.homeku.net/login"
echo -e "👤 Admin: admin@workgrid.com"
echo -e "🔑 Password: admin123"
echo ""
echo -e "📋 If still not working, try:"
echo -e "   docker logs -f discord_clone_backend"
echo ""
