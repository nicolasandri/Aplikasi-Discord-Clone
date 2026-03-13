#!/bin/bash
# WorkGrid One-Click Deploy Script from GitHub
# VPS: 152.42.242.180
# Usage: curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deploy-from-github.sh | bash

set -e

VPS_IP="152.42.242.180"
PROJECT_DIR="/opt/workgrid"
GITHUB_REPO="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"

clear
echo "🚀 WorkGrid One-Click Deploy from GitHub"
echo "========================================"
echo "VPS: $VPS_IP"
echo "Repo: $GITHUB_REPO"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use: sudo su)"
    exit 1
fi

# Step 1: Install Docker
echo "📦 Step 1/7: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
    systemctl enable docker
    systemctl start docker
    rm -f get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed ($(docker --version))"
fi

# Step 2: Install Docker Compose
echo ""
echo "📦 Step 2/7: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed ($(docker-compose --version))"
fi

# Step 3: Setup Firewall
echo ""
echo "📦 Step 3/7: Configuring Firewall..."
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw allow 3001/tcp >/dev/null 2>&1 || true
ufw allow 8080/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
echo "✅ Firewall configured"

# Step 4: Clone Repository
echo ""
echo "📦 Step 4/7: Cloning Repository..."
if [ -d "$PROJECT_DIR" ]; then
    echo "   Directory exists, pulling latest changes..."
    cd $PROJECT_DIR
    git pull
else
    echo "   Cloning fresh copy..."
    git clone $GITHUB_REPO $PROJECT_DIR
    cd $PROJECT_DIR
fi
echo "✅ Repository ready"

# Step 5: Create Environment File
echo ""
echo "📦 Step 5/7: Creating Environment File..."

# Generate random JWT secret
JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || echo "WorkGridSuperSecretKey2024ForProductionUse")

cat > $PROJECT_DIR/.env << EOF
# Database
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432

# JWT Secret
JWT_SECRET=$JWT_SECRET

# Frontend URL
FRONTEND_URL=http://$VPS_IP

# Node Environment
NODE_ENV=production

# VAPID Keys (optional - for push notifications)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.app

# Allowed Origins
ALLOWED_ORIGINS=http://$VPS_IP,http://localhost:5173
EOF

echo "✅ Environment file created"

# Step 6: Deploy with Docker Compose
echo ""
echo "📦 Step 6/7: Building and Starting Services..."
echo "   This may take 5-10 minutes..."
echo ""

cd $PROJECT_DIR

# Stop existing containers if any
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

# Build and start
docker-compose -f deployment/docker-compose.vps.yml up --build -d

echo ""
echo "✅ Services started"

# Step 7: Verification
echo ""
echo "📦 Step 7/7: Verification..."
echo ""
echo "Waiting for services to be ready (30 seconds)..."
sleep 30

echo ""
echo "=== Service Status ==="
docker-compose -f deployment/docker-compose.vps.yml ps

echo ""
echo "=== Testing Health Endpoint ==="
HEALTH_STATUS=$(curl -s http://localhost:3001/health || echo "failed")
if [ "$HEALTH_STATUS" != "failed" ]; then
    echo "✅ API Health: $HEALTH_STATUS"
else
    echo "⚠️  Health check failed (services may still be starting)"
fi

echo ""
echo "=== Recent Logs ==="
docker-compose -f deployment/docker-compose.vps.yml logs --tail=10

# Final message
echo ""
echo "========================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "🌐 Your WorkGrid is now running at:"
echo "   ➜ Web App:     http://$VPS_IP"
echo "   ➜ API:         http://$VPS_IP/api"
echo "   ➜ Socket.IO:   ws://$VPS_IP/socket.io"
echo "   ➜ Updates:     http://$VPS_IP:8080"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:  docker-compose -f deployment/docker-compose.vps.yml logs -f"
echo "   Restart:    docker-compose -f deployment/docker-compose.vps.yml restart"
echo "   Stop:       docker-compose -f deployment/docker-compose.vps.yml stop"
echo "   Update:     cd $PROJECT_DIR && git pull && docker-compose -f deployment/docker-compose.vps.yml up --build -d"
echo ""
echo "💾 Project location: $PROJECT_DIR"
echo ""
