#!/bin/bash
#
# CREATE ALL DATABASE TABLES
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🗄️ CREATE ALL DATABASE TABLES${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd $PROJECT_DIR

# SQL to create all tables
SQL=$(cat << 'EOF'
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
    is_active BOOLEAN DEFAULT TRUE,
    display_name VARCHAR(100),
    joined_via_group_code VARCHAR(50)
);

-- Servers table
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(255),
    banner VARCHAR(255),
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    group_code VARCHAR(50) UNIQUE
);

-- Server members table
CREATE TABLE IF NOT EXISTS server_members (
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    role_id INTEGER,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    join_method VARCHAR(20) DEFAULT 'invite',
    PRIMARY KEY (server_id, user_id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER DEFAULT 0
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
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
    pinned_at TIMESTAMP,
    pinned_by INTEGER REFERENCES users(id),
    reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    forwarded_from INTEGER REFERENCES messages(id)
);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, emoji)
);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

-- DM Channels table
CREATE TABLE IF NOT EXISTS dm_channels (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) DEFAULT 'direct',
    creator_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DM Channel members table
CREATE TABLE IF NOT EXISTS dm_channel_members (
    channel_id INTEGER REFERENCES dm_channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

-- DM Messages table
CREATE TABLE IF NOT EXISTS dm_messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES dm_channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    code VARCHAR(20) PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    role_id TEXT
);

-- Bans table
CREATE TABLE IF NOT EXISTS bans (
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    banned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (server_id, user_id)
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(10) DEFAULT '#99AAB5',
    permissions BIGINT DEFAULT 0,
    position INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server roles table (user roles)
CREATE TABLE IF NOT EXISTS server_roles (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, server_id)
);

-- Role channel access table
CREATE TABLE IF NOT EXISTS role_channel_access (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    allowed BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (role_id, channel_id)
);

-- User server access table
CREATE TABLE IF NOT EXISTS user_server_access (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    access_type VARCHAR(20) DEFAULT 'full',
    PRIMARY KEY (user_id, server_id)
);

-- Voice participants table
CREATE TABLE IF NOT EXISTS voice_participants (
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255),
    is_muted BOOLEAN DEFAULT FALSE,
    is_deafened BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_screen_sharing BOOLEAN DEFAULT FALSE,
    screen_share_stream_id VARCHAR(255),
    PRIMARY KEY (channel_id, user_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    server_id INTEGER REFERENCES servers(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id),
    target_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (username, email, password, is_master_admin, status, is_active) 
VALUES ('admin', 'admin@workgrid.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE, 'online', TRUE)
ON CONFLICT (email) DO NOTHING;

SELECT 'All tables created successfully' as status;
EOF
)

echo -e "${YELLOW}Creating all database tables...${NC}"
docker exec -i discord_clone_db psql -U discord_user -d discord_clone <<< "$SQL" 2>/dev/null || {
    echo -e "${RED}Failed to create tables. Trying alternative method...${NC}"
    # Save to file and execute
    echo "$SQL" > /tmp/create_tables.sql
    docker cp /tmp/create_tables.sql discord_clone_db:/tmp/
    docker exec discord_clone_db psql -U discord_user -d discord_clone -f /tmp/create_tables.sql
}

echo -e "${GREEN}✅ All tables created!${NC}"

echo ""
echo -e "${YELLOW}Restarting backend...${NC}"
docker-compose restart backend

sleep 5

echo ""
echo -e "${YELLOW}Checking tables...${NC}"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "\dt" 2>/dev/null | head -30

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DATABASE SETUP COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Try login: https://workgrid.homeku.net/login"
echo -e "👤 Admin: admin@workgrid.com / admin123"
echo ""
