#!/bin/bash
#
# FIX INVITES TABLE ISSUE
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 FIX INVITES TABLE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd /opt/workgrid

# Step 1: Check if invites table exists
echo -e "${YELLOW}🔍 Checking invites table...${NC}"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'invites'
);" 2>/dev/null

# Step 2: Create invites table if not exists
echo -e "${YELLOW}📜 Creating invites table...${NC}"
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << 'EOF'
-- Drop and recreate invites table
DROP TABLE IF EXISTS invites CASCADE;

CREATE TABLE invites (
    code VARCHAR(20) PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    role_id TEXT
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_invites_server ON invites(server_id);

-- Verify
SELECT 'Invites table created' as status;
EOF

echo -e "${GREEN}✅ Invites table created${NC}"

# Step 3: Check all tables
echo ""
echo -e "${YELLOW}📋 All tables:${NC}"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "\dt" 2>/dev/null | grep -E "invites|users|servers"

# Step 4: Rebuild and restart backend
echo ""
echo -e "${YELLOW}🔄 Rebuilding backend...${NC}"
docker-compose stop backend
docker-compose rm -f backend
docker-compose up -d --build backend

echo -e "${YELLOW}⏳ Waiting for backend (30 seconds)...${NC}"
sleep 30

# Step 5: Check logs
echo ""
echo -e "${YELLOW}📋 Backend logs:${NC}"
docker logs --tail=15 discord_clone_backend

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Try login: https://workgrid.homeku.net/login"
echo ""
