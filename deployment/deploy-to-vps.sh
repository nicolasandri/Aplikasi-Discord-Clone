#!/bin/bash
# WorkGrid Deploy Script
# Usage: ./deploy-to-vps.sh root@167.172.72.73

set -e

VPS_IP=${1:-"root@167.172.72.73"}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 Deploying WorkGrid to VPS: $VPS_IP"

# Check if SSH key exists, if not use password
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "📦 Step 1: Creating remote directory..."
ssh $SSH_OPTS $VPS_IP "mkdir -p /opt/workgrid/updates"

echo "📦 Step 2: Copying project files..."
# Exclude unnecessary files
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='app/node_modules' \
    --exclude='server/node_modules' \
    --exclude='app/dist' \
    --exclude='app/release' \
    --exclude='*.log' \
    --exclude='.env' \
    "$PROJECT_DIR/" \
    "$VPS_IP:/opt/workgrid/"

echo "📦 Step 3: Running VPS setup..."
ssh $SSH_OPTS $VPS_IP "cd /opt/workgrid && chmod +x deployment/setup-vps.sh && bash deployment/setup-vps.sh"

echo "📦 Step 4: Creating environment file..."
ssh $SSH_OPTS $VPS_IP "cat > /opt/workgrid/.env << 'ENVFILE'
# Database
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432

# JWT (change this in production!)
JWT_SECRET=$(openssl rand -base64 32)

# Frontend URL
FRONTEND_URL=http://167.172.72.73

# Node Environment
NODE_ENV=production

# VAPID Keys (for push notifications - optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.app
ENVFILE"

echo "📦 Step 5: Building and starting services..."
ssh $SSH_OPTS $VPS_IP "cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml down || true"
ssh $SSH_OPTS $VPS_IP "cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml up --build -d"

echo "📦 Step 6: Waiting for services to start..."
sleep 10

echo "📦 Step 7: Checking service status..."
ssh $SSH_OPTS $VPS_IP "cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.ps"

echo "✅ Deployment complete!"
echo ""
echo "🌐 WorkGrid is now running at:"
echo "   Web App: http://167.172.72.73"
echo "   API: http://167.172.72.73:3001"
echo "   Update Server: http://167.172.72.73:8080"
echo ""
echo "📋 Useful commands:"
echo "   View logs: ssh $VPS_IP 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml logs -f'"
echo "   Restart: ssh $VPS_IP 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart'"
echo "   Stop: ssh $VPS_IP 'cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml stop'"
