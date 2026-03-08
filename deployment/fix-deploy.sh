#!/bin/bash
# Fix Deployment Script
# Run this if deployment failed

set -e

REPO_URL="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"
APP_DIR="/opt/workgrid"
VPS_IP=$(curl -s ifconfig.me || echo "167.172.72.73")

echo "🔧 Fixing WorkGrid Deployment"
echo "=============================="
echo ""

# Create directory if not exists
mkdir -p "$APP_DIR"

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    echo "📁 Repository exists, updating..."
    cd "$APP_DIR"
    git reset --hard HEAD
    git clean -fd
    git pull origin main
else
    echo "📁 Cloning repository..."
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Create necessary directories
mkdir -p "$APP_DIR/updates/latest"
mkdir -p "$APP_DIR/server/uploads"
mkdir -p "$APP_DIR/certbot/conf"
mkdir -p "$APP_DIR/certbot/www"

# Generate secrets if not exists
if [ ! -f "$APP_DIR/.env" ]; then
    echo "🔧 Creating environment file..."
    JWT_SECRET=$(openssl rand -base64 48)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)
    
    cat > "$APP_DIR/.env" << EOF
DB_PASSWORD=${DB_PASSWORD}
DB_PORT=5432
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=http://${VPS_IP}
NODE_ENV=production
VAPID_PUBLIC_KEY=BKlTzkEfOlZTNmGlIOYUYFhKqVirXvVXmDDlRIkpgWpGK3Vc1O6YgQz8I8C1QMr6OfdQXcSKd5gAl6pBO_75130
VAPID_PRIVATE_KEY=gfNAVZ4EixhnANxAp4xahC_WEZ_EW4UA-8cpMNHfDoQ
VAPID_SUBJECT=mailto:admin@workgrid.app
EOF
fi

# Create frontend env
cat > "$APP_DIR/app/.env.production" << EOF
VITE_API_URL=/api
VITE_SOCKET_URL=
EOF

# Copy nginx config if not exists
if [ ! -f "$APP_DIR/nginx/nginx.vps.conf" ]; then
    cp "$APP_DIR/deployment/nginx.vps.conf" "$APP_DIR/nginx/nginx.vps.conf" 2>/dev/null || \
    cp "$APP_DIR/deployment/nginx.ssl.template.conf" "$APP_DIR/nginx/nginx.vps.conf" 2>/dev/null || true
fi

# Stop any running containers
echo "🛑 Stopping existing containers..."
cd "$APP_DIR/deployment"
docker-compose -f docker-compose.vps.yml down 2>/dev/null || true

# Build and start
echo "🔨 Building containers..."
docker-compose -f docker-compose.vps.yml build --no-cache

echo "🚀 Starting services..."
docker-compose -f docker-compose.vps.yml up -d

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 15

# Check status
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "=============================="
echo "✅ Fix Complete!"
echo "=============================="
echo ""
echo "🌐 Access: http://${VPS_IP}"
echo ""
