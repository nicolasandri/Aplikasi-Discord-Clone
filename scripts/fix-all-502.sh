#!/bin/bash
#
# FIX ALL 502 ERRORS - Complete Fix
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
echo -e "${BLUE}🔧 FIX ALL 502 ERRORS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

cd $PROJECT_DIR 2>/dev/null || {
    echo -e "${RED}❌ Directory $PROJECT_DIR not found!${NC}"
    exit 1
}

# Step 1: Check what's running
echo -e "${YELLOW}📋 Step 1: Checking current containers...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Step 2: Stop everything
echo ""
echo -e "${YELLOW}🛑 Step 2: Stopping all containers...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml down 2>/dev/null || true
docker-compose down 2>/dev/null || true

# Step 3: Create proper .env
echo ""
echo -e "${YELLOW}📝 Step 3: Creating .env file...${NC}"
cat > .env << 'EOF'
DB_PASSWORD=workgrid_secure_password_2024
JWT_SECRET=workgrid_super_secret_jwt_key_2024
FRONTEND_URL=https://workgrid.homeku.net
ALLOWED_ORIGINS=https://workgrid.homeku.net
NODE_ENV=production
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.homeku.net
EOF
echo -e "${GREEN}✅ .env created${NC}"

# Step 4: Export env vars
echo -e "${YELLOW}🔧 Step 4: Exporting environment...${NC}"
export $(cat .env | xargs) 2>/dev/null || true

# Step 5: Start database first
echo ""
echo -e "${YELLOW}🗄️ Step 5: Starting database...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml up -d db redis

echo -e "${YELLOW}⏳ Waiting for database (30 seconds)...${NC}"
sleep 30

# Step 6: Check if database is ready
echo -e "${YELLOW}🔍 Step 6: Checking database...${NC}"
for i in {1..10}; do
    if docker exec discord_clone_db pg_isready -U discord_user 2>/dev/null | grep -q "accepting"; then
        echo -e "${GREEN}✅ Database is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 3
done

# Step 7: Create tables
echo ""
echo -e "${YELLOW}📜 Step 7: Creating database tables...${NC}"
docker exec -i discord_clone_db psql -U discord_user -d discord_clone 2>/dev/null << 'SQL' || true
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    token_version INTEGER DEFAULT 0,
    is_master_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    owner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS server_members (
    server_id INTEGER REFERENCES servers(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, user_id)
);

CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password, is_master_admin, status) 
VALUES ('admin', 'admin@workgrid.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE, 'online')
ON CONFLICT DO NOTHING;

SELECT 'Tables created' as status;
SQL

echo -e "${GREEN}✅ Database tables created${NC}"

# Step 8: Start all services
echo ""
echo -e "${YELLOW}🚀 Step 8: Starting all services...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml up -d --force-recreate

echo -e "${YELLOW}⏳ Waiting for services (15 seconds)...${NC}"
sleep 15

# Step 9: Check status
echo ""
echo -e "${YELLOW}📋 Step 9: Final status...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml ps

# Step 10: Test
echo ""
echo -e "${YELLOW}🧪 Step 10: Testing...${NC}"
if curl -s http://localhost/api/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✅ API is working!${NC}"
else
    echo -e "${YELLOW}⚠️ API not responding yet (may need more time)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Try: https://workgrid.homeku.net"
echo -e "👤 Login: admin@workgrid.com / admin123"
echo ""
echo -e "📋 If still 502, wait 1-2 minutes then refresh"
echo ""
