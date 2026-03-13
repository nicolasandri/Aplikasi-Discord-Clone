#!/bin/bash
#
# VPS COMPLETE FIX SCRIPT
# Memperbaiki semua masalah di VPS
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="workgrid.homeku.net"
PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 VPS COMPLETE FIX${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

# Step 1: Install Docker Compose
echo -e "${YELLOW}📦 Step 1: Install Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo "   Installing docker-compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo -e "${GREEN}   ✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}   ✅ Docker Compose already installed${NC}"
fi

docker-compose --version

# Step 2: Check what's using port 80
echo ""
echo -e "${YELLOW}🔍 Step 2: Check what's using port 80...${NC}"
echo "   Processes on port 80:"
lsof -i :80 2>/dev/null || ss -tlnp | grep :80 || netstat -tlnp | grep :80 || echo "   Could not detect"

# Step 3: Stop services using port 80
echo ""
echo -e "${YELLOW}🛑 Step 3: Stop services using port 80...${NC}"

# Stop nginx if running
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# Stop apache if running
systemctl stop apache2 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true

# Kill any process on port 80
fuser -k 80/tcp 2>/dev/null || true

echo -e "${GREEN}   ✅ Services stopped${NC}"

# Step 4: Open firewall ports
echo ""
echo -e "${YELLOW}🔓 Step 4: Open firewall ports...${NC}"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 22/tcp
echo -e "${GREEN}   ✅ Ports opened${NC}"

# Step 5: Setup project directory
echo ""
echo -e "${YELLOW}📁 Step 5: Setup project...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "   Cloning repository..."
    git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git $PROJECT_DIR
fi

cd $PROJECT_DIR
git pull origin main --quiet

echo -e "${GREEN}   ✅ Project ready${NC}"

# Step 6: Create .env if not exists
echo ""
echo -e "${YELLOW}📝 Step 6: Setup environment...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cat > $PROJECT_DIR/.env << 'EOF'
# Database
DB_PASSWORD=your_secure_password_here
DB_PORT=5432

# JWT (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Frontend URL
FRONTEND_URL=https://workgrid.homeku.net
ALLOWED_ORIGINS=https://workgrid.homeku.net,http://workgrid.homeku.net,http://165.245.187.155

# Node Environment
NODE_ENV=production

# VAPID Keys for Push Notifications (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.homeku.net
EOF
    echo -e "${YELLOW}   ⚠️  Please edit $PROJECT_DIR/.env with your actual values${NC}"
else
    # Update existing .env
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://workgrid.homeku.net|' $PROJECT_DIR/.env
    if ! grep -q "ALLOWED_ORIGINS" $PROJECT_DIR/.env; then
        echo "ALLOWED_ORIGINS=https://workgrid.homeku.net,http://workgrid.homeku.net,http://165.245.187.155" >> $PROJECT_DIR/.env
    else
        sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://workgrid.homeku.net,http://workgrid.homeku.net,http://165.245.187.155|' $PROJECT_DIR/.env
    fi
    echo -e "${GREEN}   ✅ .env updated${NC}"
fi

# Step 7: Start with HTTP first (without SSL)
echo ""
echo -e "${YELLOW}🚀 Step 7: Start services (HTTP mode)...${NC}"
cd $PROJECT_DIR

# Stop any running containers
docker-compose down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

# Start services
docker-compose up -d --build

sleep 5

echo -e "${GREEN}   ✅ Services started${NC}"

# Step 8: Check status
echo ""
echo -e "${YELLOW}📋 Step 8: Status check...${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}🧪 Testing local connection...${NC}"
sleep 3
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost || echo "Local test failed"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ VPS FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📋 Try accessing:"
echo -e "   ${YELLOW}http://workgrid.homeku.net${NC}"
echo -e "   ${YELLOW}http://165.245.187.155${NC}"
echo ""
echo -e "🔒 To setup SSL/HTTPS, run:"
echo -e "   ${YELLOW}cd $PROJECT_DIR && bash scripts/setup-ssl.sh${NC}"
echo ""
echo -e "⚠️  IMPORTANT: If you haven't set DB_PASSWORD and JWT_SECRET in .env:"
echo -e "   ${YELLOW}nano $PROJECT_DIR/.env${NC}"
echo ""
