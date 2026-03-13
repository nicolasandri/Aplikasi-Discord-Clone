#!/bin/bash
#
# FIX NGINX PROXY - Fix 400 Bad Request
#

echo "========================================"
echo "🔧 FIX NGINX PROXY"
echo "========================================"
echo ""

cd /opt/workgrid

# Check current nginx config
echo "📋 Current nginx config:"
docker exec discord_clone_nginx cat /etc/nginx/conf.d/default.conf | head -50

# Restart nginx
echo ""
echo "🔄 Restarting nginx..."
docker restart discord_clone_nginx

sleep 5

# Check if nginx is running
echo ""
echo "📋 Nginx status:"
docker ps | grep nginx

# Test from localhost
echo ""
echo "🧪 Testing from VPS:"
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workgrid.com","password":"admin123"}' 2>/dev/null | head -20

echo ""
echo "========================================"
echo "✅ NGINX RESTARTED!"
echo "========================================"
echo ""
echo "🔗 Try: https://workgrid.homeku.net/login"
echo ""
