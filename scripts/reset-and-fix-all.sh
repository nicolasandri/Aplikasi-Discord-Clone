#!/bin/bash
#
# COMPLETE RESET AND FIX - Nuclear option
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}☢️  COMPLETE RESET & FIX${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Stop everything
echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml down 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Step 2: Remove database volume (THIS WILL DELETE ALL DATA)
echo -e "${YELLOW}🗑️ Removing database volume...${NC}"
docker volume rm discord_clone_postgres_data 2>/dev/null || true
docker volume rm $(docker volume ls -q | grep postgres) 2>/dev/null || true

# Step 3: Clean up any orphaned volumes
docker volume prune -f 2>/dev/null || true

# Step 4: Create proper .env
echo -e "${YELLOW}📝 Creating .env file...${NC}"
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

# Step 5: Export env vars
echo -e "${YELLOW}🔧 Exporting environment variables...${NC}"
set -a
source .env
set +a
export DB_PASSWORD JWT_SECRET FRONTEND_URL ALLOWED_ORIGINS

# Step 6: Start only database first
echo -e "${YELLOW}🗄️ Starting database...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml up -d db redis

echo -e "${YELLOW}⏳ Waiting for database to be ready (30 seconds)...${NC}"
sleep 30

# Step 7: Check if database is ready
echo -e "${YELLOW}🔍 Checking database status...${NC}"
for i in {1..10}; do
    if docker exec discord_clone_db pg_isready -U discord_user 2>/dev/null | grep -q "accepting connections"; then
        echo -e "${GREEN}✅ Database is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 3
done

# Step 8: Create tables directly
echo -e "${YELLOW}📜 Creating database tables...${NC}"
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << 'SQL_EOF'
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    token_version INTEGER DEFAULT 0,
    is_master_admin BOOLEAN DEFAULT FALSE,
    force_password_change BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(255),
    banner VARCHAR(255),
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create server_members table
CREATE TABLE IF NOT EXISTS server_members (
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, user_id)
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL
);

-- Create admin user (password: admin123)
INSERT INTO users (username, email, password, is_master_admin, status) 
VALUES ('admin', 'admin@workgrid.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE, 'online')
ON CONFLICT DO NOTHING;

SELECT 'Tables created successfully' as status;
SQL_EOF

echo -e "${GREEN}✅ Tables created${NC}"

# Step 9: Start all services
echo -e "${YELLOW}🚀 Starting all services...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml up -d

echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 15

# Step 10: Check status
echo ""
echo -e "${YELLOW}📋 Final status:${NC}"
docker-compose -f deployment/docker-compose.ssl.yml ps

# Step 11: Test
echo ""
echo -e "${YELLOW}🧪 Testing backend...${NC}"
sleep 5

if curl -s http://localhost/api/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}⚠️ Backend may need more time...${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ RESET COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Login: https://workgrid.homeku.net/login"
echo -e "👤 Admin: admin@workgrid.com / admin123"
echo ""
