#!/bin/bash
set -e

# ============================================
# WorkGrid Deploy Script - RUN THIS IN VPS
# Target: 152.42.242.180
# ============================================

VPS_IP="152.42.242.180"
INSTALL_DIR="/opt/workgrid"

echo "=========================================="
echo "  WorkGrid Deployment Script"
echo "  VPS: $VPS_IP"
echo "=========================================="

# 1. Update system & install Docker
echo ""
echo "[1/6] Installing Docker..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git curl openssl
systemctl enable docker
systemctl start docker
docker --version
echo "✅ Docker installed"

# 2. Create directory
echo ""
echo "[2/6] Creating directory structure..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
echo "✅ Directory created"

# 3. Create .env file
echo ""
echo "[3/6] Creating environment config..."
cat > $INSTALL_DIR/.env << 'EOF'
DB_PASSWORD=WorkGrid2024SecurePass!
JWT_SECRET=workgrid-jwt-secret-2024-production-random-key-here
FRONTEND_URL=http://152.42.242.180
NODE_ENV=production
ALLOWED_ORIGINS=http://152.42.242.180
EOF
echo "✅ Environment configured"

# 4. Check if project files exist
echo ""
echo "[4/6] Checking project files..."
if [ ! -f "$INSTALL_DIR/app/package.json" ]; then
    echo ""
    echo "⚠️  PROJECT FILES BELUM ADA!"
    echo ""
    echo "Silakan copy project files terlebih dahulu dengan cara:"
    echo ""
    echo "  Opsi 1 - WinSCP:"
    echo "    - Connect SFTP ke $VPS_IP dengan user root"
    echo "    - Copy semua file project ke $INSTALL_DIR/"
    echo ""
    echo "  Opsi 2 - rsync (dari lokal):"
    echo "    rsync -avz --exclude='node_modules' --exclude='.git' ./ root@$VPS_IP:$INSTALL_DIR/"
    echo ""
    echo "  Opsi 3 - Git clone:"
    echo "    git clone <your-repo-url> $INSTALL_DIR"
    echo ""
    exit 1
fi
echo "✅ Project files found"

# 5. Create docker-compose.yml
echo ""
echo "[5/6] Creating Docker Compose config..."
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
      FRONTEND_URL: ${FRONTEND_URL:-http://152.42.242.180}
      USE_POSTGRES: "true"
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://152.42.242.180}
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

# 6. Build and start
echo ""
echo "[6/6] Building and starting containers..."
echo "    (Ini akan memakan waktu 5-10 menit...)"
echo ""
cd $INSTALL_DIR
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# Wait and check
sleep 5
echo ""
echo "Checking services..."
docker compose ps

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Akses aplikasi di:"
echo "   http://$VPS_IP"
echo ""
echo "🔧 Health check:"
echo "   http://$VPS_IP/api/health"
echo ""
echo "📋 Command berguna:"
echo "   cd $INSTALL_DIR && docker compose logs -f  # View logs"
echo "   cd $INSTALL_DIR && docker compose restart  # Restart"
echo "   cd $INSTALL_DIR && docker compose down     # Stop"
echo ""
echo "⚠️  Default admin login:"
echo "   Email: admin@workgrid.com"
echo "   Password: admin123"
echo ""
echo "=========================================="
