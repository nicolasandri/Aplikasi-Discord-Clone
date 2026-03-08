#!/bin/bash
# WorkGrid Deploy from GitHub Script
# Usage: curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deployment/deploy-from-github.sh | bash
# Atau: wget -qO- https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deployment/deploy-from-github.sh | bash

set -e

REPO_URL="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"
APP_DIR="/opt/workgrid"
VPS_IP=$(curl -s ifconfig.me || echo "167.172.72.73")

echo "🚀 WorkGrid Deployment from GitHub"
echo "===================================="
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y curl wget git vim htop ufw fail2ban certbot python3-certbot-nginx nginx

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
    systemctl enable docker
    systemctl start docker
    rm -f get-docker.sh
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Setup firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 8080/tcp
ufw --force enable

# Setup fail2ban
echo "🛡️  Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban

# Clone repository
echo "📁 Cloning repository from GitHub..."
if [ -d "$APP_DIR" ]; then
    echo "   Directory exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main || git pull origin master
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Create necessary directories
mkdir -p "$APP_DIR/updates/latest"
mkdir -p "$APP_DIR/server/uploads"

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 48)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)

# Create environment file
echo "🔧 Creating environment configuration..."
cat > "$APP_DIR/.env" << EOF
# Database Configuration
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=5432

# JWT Secret
JWT_SECRET=${JWT_SECRET}

# Frontend URL
FRONTEND_URL=http://${VPS_IP}

# Node Environment
NODE_ENV=production

# VAPID Keys untuk Push Notifications
VAPID_PUBLIC_KEY=BKlTzkEfOlZTNmGlIOYUYFhKqVirXvVXmDDlRIkpgWpGK3Vc1O6YgQz8I8C1QMr6OfdQXcSKd5gAl6pBO_75130
VAPID_PRIVATE_KEY=gfNAVZ4EixhnANxAp4xahC_WEZ_EW4UA-8cpMNHfDoQ
VAPID_SUBJECT=mailto:admin@workgrid.app
EOF

# Create frontend env
cat > "$APP_DIR/app/.env.production" << EOF
VITE_API_URL=/api
VITE_SOCKET_URL=
EOF

# Ensure nginx config exists
if [ ! -f "$APP_DIR/nginx/nginx.vps.conf" ]; then
    echo "⚠️  Nginx config not found, using default..."
    cp "$APP_DIR/deployment/nginx.vps.conf" "$APP_DIR/nginx/nginx.conf" 2>/dev/null || true
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
cd "$APP_DIR"
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f deployment/docker-compose.vps.yml up --build -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 15

# Check status
echo ""
echo "📊 Service Status:"
docker-compose -f deployment/docker-compose.vps.yml ps

echo ""
echo "===================================="
echo "✅ Deployment Complete!"
echo "===================================="
echo ""
echo "🌐 Access URLs:"
echo "   Web App:     http://${VPS_IP}"
echo "   API:         http://${VPS_IP}/api"
echo "   Health:      http://${VPS_IP}/api/health"
echo "   Update Svr:  http://${VPS_IP}:8080"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:   cd ${APP_DIR} && docker-compose -f deployment/docker-compose.vps.yml logs -f"
echo "   Restart:     cd ${APP_DIR} && docker-compose -f deployment/docker-compose.vps.yml restart"
echo "   Stop:        cd ${APP_DIR} && docker-compose -f deployment/docker-compose.vps.yml stop"
echo ""
echo "🔐 Environment file saved at: ${APP_DIR}/.env"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Save the DB_PASSWORD and JWT_SECRET from ${APP_DIR}/.env"
echo "   - Default admin: admin@workgrid.com / admin123"
echo ""
echo "🔒 NEXT STEP - Setup SSL/HTTPS:"
echo "   If you have a domain, run:"
echo "   bash ${APP_DIR}/deployment/setup-ssl.sh your-domain.com"
echo ""
