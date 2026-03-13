#!/bin/bash
#
# FIX 502 BAD GATEWAY ERROR
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 FIX 502 BAD GATEWAY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Check if .env exists and has required vars
echo -e "${YELLOW}📋 Checking .env file...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Creating .env with default values..."
    cat > .env << 'EOF'
DB_PASSWORD=workgrid_secure_password_2024
JWT_SECRET=workgrid_jwt_secret_key_min_32_chars
FRONTEND_URL=https://workgrid.homeku.net
ALLOWED_ORIGINS=https://workgrid.homeku.net
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.homeku.net
EOF
fi

# Check DB_PASSWORD
if ! grep -q "DB_PASSWORD=" .env || grep -q "DB_PASSWORD=your" .env || grep -q "DB_PASSWORD=$" .env; then
    echo -e "${YELLOW}⚠️ Setting default DB_PASSWORD...${NC}"
    sed -i 's/DB_PASSWORD=.*/DB_PASSWORD=workgrid_secure_password_2024/' .env
fi

# Check JWT_SECRET
if ! grep -q "JWT_SECRET=" .env || grep -q "JWT_SECRET=your" .env || grep -q "JWT_SECRET=$" .env; then
    echo -e "${YELLOW}⚠️ Setting default JWT_SECRET...${NC}"
    sed -i 's/JWT_SECRET=.*/JWT_SECRET=workgrid_jwt_secret_key_min_32_chars/' .env
fi

echo -e "${GREEN}✅ .env file ready${NC}"

# Stop all containers
echo ""
echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml down 2>/dev/null || true

# Remove old containers to force rebuild
echo ""
echo -e "${YELLOW}🗑️ Removing old containers...${NC}"
docker rm -f discord_clone_backend discord_clone_frontend discord_clone_nginx 2>/dev/null || true

# Start fresh
echo ""
echo -e "${YELLOW}🚀 Starting all services...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml up -d --build

# Wait for services
echo ""
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check logs
echo ""
echo -e "${YELLOW}📋 Backend logs (checking for errors)...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml logs --tail=20 backend

echo ""
echo -e "${YELLOW}📋 Container status...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml ps

# Test connections
echo ""
echo -e "${YELLOW}🧪 Testing connections...${NC}"
sleep 5

echo "   Testing backend health..."
if docker exec discord_clone_backend curl -s http://localhost:3001/api/health 2>/dev/null; then
    echo -e "${GREEN}   ✅ Backend is healthy${NC}"
else
    echo -e "${RED}   ❌ Backend health check failed${NC}"
fi

echo "   Testing nginx -> backend..."
if docker exec discord_clone_nginx curl -s http://backend:3001/api/health 2>/dev/null; then
    echo -e "${GREEN}   ✅ Nginx can reach backend${NC}"
else
    echo -e "${RED}   ❌ Nginx cannot reach backend${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🧪 Test login at: https://workgrid.homeku.net/login"
echo ""
echo -e "📋 If still 502, check logs:"
echo -e "   docker-compose -f deployment/docker-compose.ssl.yml logs -f backend"
echo ""
