#!/bin/bash
set -e

# ============================================
# WorkGrid Deploy Script - VPS Baru
# Target: 152.42.242.180
# Jalankan sebagai root di VPS
# ============================================

VPS_IP="152.42.242.180"
INSTALL_DIR="/opt/workgrid"
DB_PASSWORD="WorkGrid2024SecurePass!"
JWT_SECRET="workgrid-jwt-secret-$(openssl rand -hex 16)"

echo "=========================================="
echo "  WorkGrid Deploy Script"
echo "  VPS IP: $VPS_IP"
echo "=========================================="

# 1. Update system & install Docker
echo ""
echo "[1/7] Installing Docker..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git curl openssl > /dev/null 2>&1 || {
    # Fallback: install docker via script
    curl -fsSL https://get.docker.com | sh
    apt-get install -y -qq git curl openssl > /dev/null 2>&1
}
systemctl enable docker
systemctl start docker
echo "✅ Docker installed"

# 2. Create directory structure
echo ""
echo "[2/7] Creating directory structure..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
echo "✅ Directory created"

# 3. Create .env file
echo ""
echo "[3/7] Creating environment config..."
cat > $INSTALL_DIR/.env << EOF
# Database
DB_PASSWORD=$DB_PASSWORD
DB_PORT=5432

# JWT
JWT_SECRET=$JWT_SECRET

# Frontend URL
FRONTEND_URL=http://$VPS_IP

# Node Environment
NODE_ENV=production

# Allowed Origins
ALLOWED_ORIGINS=http://$VPS_IP,https://$VPS_IP
EOF
echo "✅ Environment configured"

# 4. Create docker-compose.yml for this VPS
echo ""
echo "[4/7] Creating Docker Compose config..."
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

# 5. Create Dockerfile for backend if not exists
echo ""
echo "[5/7] Checking backend Dockerfile..."
mkdir -p $INSTALL_DIR/server
cat > $INSTALL_DIR/server/Dockerfile << 'DEOF'
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start server
CMD ["node", "server.js"]
DEOF
echo "✅ Backend Dockerfile created"

# 6. Create Dockerfile for frontend
echo ""
echo "[6/7] Checking frontend Dockerfile..."
mkdir -p $INSTALL_DIR/app
cat > $INSTALL_DIR/app/Dockerfile << 'DEOF'
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build arguments
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

# Build app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
DEOF
echo "✅ Frontend Dockerfile created"

# Create nginx.conf for frontend
cat > $INSTALL_DIR/app/nginx.conf << 'DEOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Uploads
    location /uploads {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
DEOF
echo "✅ Nginx config created"

# 7. Create .dockerignore files
cat > $INSTALL_DIR/app/.dockerignore << 'DEOF'
node_modules
npm-debug.log
dist
release
.android
.electron-vendors
electron
capacitor.config.ts
DEOF

cat > $INSTALL_DIR/server/.dockerignore << 'DEOF'
node_modules
npm-debug.log
uploads/*.jpg
uploads/*.png
uploads/*.gif
.DS_Store
*.log
DEOF

echo ""
echo "=========================================="
echo "  SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "📝 LANGKAH BERIKUTNYA:"
echo ""
echo "1. Copy project files ke VPS:"
echo "   rsync -avz --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' ./ root@$VPS_IP:/opt/workgrid/"
echo ""
echo "2. SSH ke VPS dan build:"
echo "   ssh root@$VPS_IP"
echo "   cd /opt/workgrid"
echo "   docker compose up --build -d"
echo ""
echo "🌐 Akses nanti di: http://$VPS_IP"
echo "=========================================="
