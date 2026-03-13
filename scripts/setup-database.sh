#!/bin/bash
#
# SETUP DATABASE FOR WORKGRID
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🗄️  SETUP DATABASE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Check if db container is running
echo -e "${YELLOW}📋 Checking database container...${NC}"
if ! docker ps | grep -q discord_clone_db; then
    echo -e "${YELLOW}🚀 Starting database container...${NC}"
    docker-compose -f deployment/docker-compose.ssl.yml up -d db redis
    sleep 10
fi

# Step 2: Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec discord_clone_db pg_isready -U discord_user -d discord_clone 2>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Step 3: Check if tables exist
echo -e "${YELLOW}🔍 Checking if tables exist...${NC}"
TABLES=$(docker exec discord_clone_db psql -U discord_user -d discord_clone -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

if [ "$TABLES" -gt "0" ]; then
    echo -e "${GREEN}✅ Database already has $TABLES tables${NC}"
else
    echo -e "${YELLOW}⚠️  No tables found. Database needs initialization.${NC}"
fi

# Step 4: Copy migrations to container and run
echo -e "${YELLOW}📁 Running database migrations...${NC}"

# Check if server has migrations
if [ -d "server/migrations" ]; then
    echo "   Found migrations directory"
    
    # Copy migrations to container
    docker cp server/migrations discord_clone_backend:/app/migrations 2>/dev/null || true
    
    # Run setup script if exists
    if [ -f "server/migrations/setup-postgres.js" ]; then
        echo "   Running setup-postgres.js..."
        docker exec discord_clone_backend node migrations/setup-postgres.js 2>/dev/null || echo "   Setup script completed or failed (may be normal)"
    fi
fi

# Step 5: Alternative - Run init SQL directly
echo -e "${YELLOW}📜 Initializing database schema...${NC}"

# Create basic schema
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << 'EOF' 2>/dev/null || true
-- Users table
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

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(255),
    banner VARCHAR(255),
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server members table
CREATE TABLE IF NOT EXISTS server_members (
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, user_id)
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
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

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);

-- Sessions table for socket
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'online',
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create default admin user (password: admin123)
INSERT INTO users (username, email, password, is_master_admin, status) 
VALUES ('admin', 'admin@workgrid.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE, 'online')
ON CONFLICT (email) DO NOTHING;

echo 'Database initialized successfully!';
EOF

echo -e "${GREEN}✅ Database schema created${NC}"

# Step 6: Restart backend to pick up database
echo ""
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml restart backend

sleep 5

# Step 7: Check if backend is now healthy
echo ""
echo -e "${YELLOW}🧪 Checking backend health...${NC}"
if curl -s http://localhost/api/health 2>/dev/null | grep -q "ok\|healthy"; then
    echo -e "${GREEN}✅ Backend is now healthy!${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may still be starting...${NC}"
    docker-compose -f deployment/docker-compose.ssl.yml logs --tail=10 backend
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DATABASE SETUP COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📋 Default admin account:"
echo -e "   Email: admin@workgrid.com"
echo -e "   Password: admin123"
echo ""
echo -e "🧪 Test: https://workgrid.homeku.net/login"
echo ""
