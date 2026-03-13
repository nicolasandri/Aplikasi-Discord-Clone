#!/bin/bash
#
# FIX CONTAINER CONFLICT
#

echo "========================================"
echo "🔧 FIX CONTAINER CONFLICT"
echo "========================================"
echo ""

cd /opt/workgrid

# Stop and remove all containers
echo "🛑 Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "🗑️ Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Remove old images
echo "🧹 Removing old images..."
docker rmi -f workgrid-backend workgrid-frontend 2>/dev/null || true

# Start fresh
echo "🚀 Starting fresh..."
docker-compose -f deployment/docker-compose.ssl.yml up -d

echo ""
echo "⏳ Waiting 30 seconds..."
sleep 30

echo ""
echo "========================================"
echo "✅ DONE!"
echo "========================================"
echo ""
echo "🔗 https://workgrid.homeku.net"
echo ""
