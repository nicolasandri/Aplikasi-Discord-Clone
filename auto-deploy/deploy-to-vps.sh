#!/bin/bash
# WorkGrid Auto Deployment Script for VPS 152.42.242.180
# Run this on VPS as root

set -e

VPS_IP="152.42.242.180"
PROJECT_DIR="/opt/workgrid"

echo "🚀 WorkGrid Auto Deployment Script"
echo "=================================="
echo "VPS: $VPS_IP"
echo ""

# Step 1: Install Docker if not exists
echo "📦 Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Step 2: Install Docker Compose
echo ""
echo "📦 Step 2: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Step 3: Setup directories and firewall
echo ""
echo "📦 Step 3: Setting up directories and firewall..."
mkdir -p $PROJECT_DIR
mkdir -p $PROJECT_DIR/updates
mkdir -p $PROJECT_DIR/certbot/www

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 8080/tcp
ufw --force enable 2>/dev/null || true

echo "✅ Directories and firewall configured"

# Step 4: Extract project files
echo ""
echo "📦 Step 4: Extracting project files..."
cd $PROJECT_DIR

if [ -f "/tmp/workgrid-ready-deploy.tar.gz" ]; then
    tar -xzf /tmp/workgrid-ready-deploy.tar.gz
    rm /tmp/workgrid-ready-deploy.tar.gz
    echo "✅ Project files extracted"
else
    echo "❌ Archive not found at /tmp/workgrid-ready-deploy.tar.gz"
    exit 1
fi

# Step 5: Create environment file
echo ""
echo "📦 Step 5: Creating environment file..."

# Generate random JWT secret
JWT_SECRET=$(openssl rand -base64 48)

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
echo "📦 Step 6: Deploying with Docker Compose..."
cd $PROJECT_DIR

echo "    Stopping existing containers..."
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

echo "    Building and starting services..."
docker-compose -f deployment/docker-compose.vps.yml up --build -d

echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Step 7: Verify
echo ""
echo "📦 Step 7: Verification..."
echo ""
echo "=== Service Status ==="
docker-compose -f deployment/docker-compose.vps.yml ps

echo ""
echo "=== Testing Health Endpoint ==="
curl -s http://localhost:3001/health || echo "Health check failed - services may still be starting"

echo ""
echo "=== Recent Logs ==="
docker-compose -f deployment/docker-compose.vps.yml logs --tail=20

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "🌐 Your WorkGrid is now running at:"
echo "   Web App: http://$VPS_IP"
echo "   API: http://$VPS_IP/api"
echo "   Update Server: http://$VPS_IP:8080"
echo ""
echo "📋 Useful commands:"
echo "   View logs:  docker-compose -f deployment/docker-compose.vps.yml logs -f"
echo "   Restart:    docker-compose -f deployment/docker-compose.vps.yml restart"
echo "   Stop:       docker-compose -f deployment/docker-compose.vps.yml stop"
echo ""
