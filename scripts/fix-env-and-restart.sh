#!/bin/bash
#
# FIX ENVIRONMENT VARIABLES AND RESTART
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 FIX ENVIRONMENT & RESTART${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Create proper .env file
echo -e "${YELLOW}📝 Creating .env file with proper values...${NC}"

cat > .env << 'EOF'
# Database Configuration
DB_PASSWORD=workgrid_secure_db_password_2024
DB_PORT=5432

# JWT Configuration (min 32 characters)
JWT_SECRET=workgrid_super_secret_jwt_key_2024_min_32_chars

# Frontend URL
FRONTEND_URL=https://workgrid.homeku.net
ALLOWED_ORIGINS=https://workgrid.homeku.net,http://workgrid.homeku.net

# Node Environment
NODE_ENV=production

# VAPID Keys for Push Notifications (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.homeku.net
EOF

echo -e "${GREEN}✅ .env file created${NC}"

# Step 2: Show current .env
echo ""
echo -e "${YELLOW}📋 Current .env content:${NC}"
cat .env

# Step 3: Stop all containers
echo ""
echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Step 4: Export env vars and start with explicit env-file
echo ""
echo -e "${YELLOW}🚀 Starting with explicit environment...${NC}"

# Export untuk docker-compose
export $(cat .env | xargs) 2>/dev/null || true

# Start dengan env-file yang jelas
docker-compose -f deployment/docker-compose.ssl.yml --env-file .env up -d --force-recreate --build

# Step 5: Wait and check
echo ""
echo -e "${YELLOW}⏳ Waiting 15 seconds for services to start...${NC}"
sleep 15

# Step 6: Check status
echo ""
echo -e "${YELLOW}📋 Container status:${NC}"
docker-compose -f deployment/docker-compose.ssl.yml ps

# Step 7: Check backend logs
echo ""
echo -e "${YELLOW}📋 Backend logs (last 20 lines):${NC}"
docker-compose -f deployment/docker-compose.ssl.yml logs --tail=20 backend 2>/dev/null || docker logs discord_clone_backend --tail=20 2>/dev/null || echo "Could not get logs"

# Step 8: Test connection
echo ""
echo -e "${YELLOW}🧪 Testing connection...${NC}"
sleep 3

if curl -s http://localhost/api/health 2>/dev/null | grep -q "ok\|healthy"; then
    echo -e "${GREEN}✅ Backend is responding!${NC}"
else
    echo -e "${RED}❌ Backend not responding yet${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ RESTART COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🧪 Test: https://workgrid.homeku.net/login"
echo ""
echo -e "📋 If still error, check logs:"
echo -e "   docker logs discord_clone_backend"
echo ""
