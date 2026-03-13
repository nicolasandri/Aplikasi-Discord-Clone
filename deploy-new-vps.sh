#!/bin/bash
set -e

# ============================================
# WorkGrid Deploy Script - VPS Baru
# Jalankan sebagai root di VPS baru
# ============================================

VPS_IP="165.245.187.155"
GITHUB_REPO="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"
INSTALL_DIR="/opt/workgrid"
DB_PASSWORD="WorkGrid2024SecurePass"
JWT_SECRET="workgrid-jwt-secret-2024-production"

echo "=========================================="
echo "  WorkGrid Deploy Script"
echo "  VPS IP: $VPS_IP"
echo "=========================================="

# 1. Update system & install Docker
echo ""
echo "[1/8] Installing Docker..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git curl > /dev/null 2>&1 || {
    # Fallback: install docker via script
    curl -fsSL https://get.docker.com | sh
    apt-get install -y -qq git curl > /dev/null 2>&1
}
systemctl enable docker
systemctl start docker
echo "✅ Docker installed"

# 2. Clone repository
echo ""
echo "[2/8] Cloning repository..."
rm -rf $INSTALL_DIR
git clone $GITHUB_REPO $INSTALL_DIR
cd $INSTALL_DIR
echo "✅ Repository cloned"

# 3. Create .env file
echo ""
echo "[3/8] Creating environment config..."
cat > $INSTALL_DIR/.env << EOF
DB_HOST=db
DB_PORT=5432
DB_NAME=discord_clone
DB_USER=discord_user
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=http://$VPS_IP
USE_POSTGRES=true
REDIS_URL=redis://redis:6379
NODE_ENV=production
ALLOWED_ORIGINS=http://$VPS_IP,https://$VPS_IP
VITE_API_URL=/api
VITE_SOCKET_URL=
EOF
echo "✅ Environment configured"

# 4. Create docker-compose.yml for this VPS
echo ""
echo "[4/8] Creating Docker Compose config..."
cat > $INSTALL_DIR/docker-compose.yml << 'DEOF'
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: discord_clone_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: discord_clone
      POSTGRES_USER: discord_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - discord_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U discord_user -d discord_clone"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=768MB
      -c work_mem=4MB

  redis:
    image: redis:7-alpine
    container_name: discord_clone_redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - discord_network
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: discord_clone_backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: discord_clone
      DB_USER: discord_user
      DB_PASSWORD: ${DB_PASSWORD}
      DB_SSL: "false"
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: redis://redis:6379
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost}
      USE_POSTGRES: "true"
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    volumes:
      - uploads_data:/app/uploads
    networks:
      - discord_network
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
      args:
        VITE_API_URL: /api
        VITE_SOCKET_URL: ""
    container_name: discord_clone_frontend
    restart: unless-stopped
    ports:
      - "80:80"
    networks:
      - discord_network
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
  uploads_data:

networks:
  discord_network:
    driver: bridge
DEOF
echo "✅ Docker Compose configured"

# 5. Build and start containers
echo ""
echo "[5/8] Building and starting containers (this may take a few minutes)..."
cd $INSTALL_DIR
docker compose build --no-cache
docker compose up -d
echo "✅ Containers started"

# 6. Wait for DB to be ready
echo ""
echo "[6/8] Waiting for database to be ready..."
for i in $(seq 1 30); do
    if docker exec discord_clone_db pg_isready -U discord_user -d discord_clone > /dev/null 2>&1; then
        echo "✅ Database ready"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

# 7. Restore database from backup
echo ""
echo "[7/8] Restoring database from backup..."
if [ -f "$INSTALL_DIR/backups/workgrid_backup.sql" ]; then
    # Clean the SQL file - remove \restrict line and fix compatibility
    sed '/^\\restrict/d; /^\\unrestrict/d; /transaction_timeout/d' \
        $INSTALL_DIR/backups/workgrid_backup.sql > /tmp/clean_backup.sql

    docker cp /tmp/clean_backup.sql discord_clone_db:/tmp/clean_backup.sql

    # Drop and recreate schema to start fresh
    docker exec discord_clone_db psql -U discord_user -d discord_clone -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO discord_user;"

    # Restore
    docker exec discord_clone_db psql -U discord_user -d discord_clone -f /tmp/clean_backup.sql 2>&1 | tail -5

    # Add missing columns that may not be in backup
    docker exec discord_clone_db psql -U discord_user -d discord_clone -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;" 2>/dev/null

    echo "✅ Database restored"
else
    echo "⚠️  No backup file found, starting with empty database"
fi

# 8. Restore uploads
echo ""
echo "[8/8] Restoring uploads..."
if [ -f "$INSTALL_DIR/backups/uploads_backup.tar.gz" ]; then
    tar xzf $INSTALL_DIR/backups/uploads_backup.tar.gz -C /tmp/ 2>/dev/null
    if [ -d "/tmp/uploads" ] && [ "$(ls -A /tmp/uploads 2>/dev/null)" ]; then
        docker cp /tmp/uploads/. discord_clone_backend:/app/uploads/
        UPLOAD_COUNT=$(docker exec discord_clone_backend ls /app/uploads/ 2>/dev/null | wc -l)
        echo "✅ Uploads restored ($UPLOAD_COUNT files)"
    else
        echo "⚠️  Uploads archive is empty"
    fi
else
    echo "⚠️  No uploads backup found"
fi

# Restart backend to pick up restored data
docker compose restart backend

# Final status
echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
docker compose ps
echo ""
echo "🌐 Access your app at: http://$VPS_IP"
echo "🔧 Backend health:     http://$VPS_IP/api/health"
echo ""
echo "To check logs:  cd $INSTALL_DIR && docker compose logs -f"
echo "To restart:     cd $INSTALL_DIR && docker compose restart"
echo "=========================================="
