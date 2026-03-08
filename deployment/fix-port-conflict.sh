#!/bin/bash
# Fix Port 80 Conflict

echo "🔧 Fixing Port 80 Conflict..."

# Check what's using port 80
echo "📋 Checking what's using port 80..."
lsof -i :80 || netstat -tlnp | grep :80 || ss -tlnp | grep :80

# Stop nginx if running on host
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# Kill any process using port 80
fuser -k 80/tcp 2>/dev/null || true

# Stop docker containers
cd /opt/workgrid/deployment
docker-compose -f docker-compose.vps.yml down

# Start again
echo "🚀 Starting containers..."
docker-compose -f docker-compose.vps.yml up -d

echo "✅ Done! Check status with: docker-compose -f docker-compose.vps.yml ps"
