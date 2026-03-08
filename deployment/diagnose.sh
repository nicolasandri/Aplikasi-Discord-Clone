#!/bin/bash
# Diagnose Deployment Issues

echo "🔍 Diagnosing Issues..."
echo "=============================="
cd /opt/workgrid/deployment

echo ""
echo "📋 Container Status:"
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "📝 Backend Logs (last 30 lines):"
docker-compose -f docker-compose.vps.yml logs --tail=30 backend

echo ""
echo "📝 Nginx Logs (last 30 lines):"
docker-compose -f docker-compose.vps.yml logs --tail=30 nginx

echo ""
echo "🔐 SSL Certificate Check:"
ls -la /etc/letsencrypt/live/workgrid.homeku.net/ 2>/dev/null || echo "❌ Not found in /etc/letsencrypt/"
ls -la ../certbot/conf/live/workgrid.homeku.net/ 2>/dev/null || echo "❌ Not found in certbot/"

echo ""
echo "🌐 Port Check:"
netstat -tlnp 2>/dev/null | grep -E ":80|:443" || ss -tlnp | grep -E ":80|:443"

echo ""
echo "🔥 Firewall:"
ufw status

echo ""
echo "⚙️  Nginx Config Test:"
docker-compose -f docker-compose.vps.yml exec nginx nginx -t 2>&1 || echo "❌ Config test failed"

echo ""
echo "=============================="
echo "🔧 Trying to fix..."

# Fix: Copy SSL certs to accessible location
if [ -d "/etc/letsencrypt/live/workgrid.homeku.net" ]; then
    echo "Copying SSL certs..."
    mkdir -p ../certbot/conf/live/workgrid.homeku.net
    cp /etc/letsencrypt/live/workgrid.homeku.net/* ../certbot/conf/live/workgrid.homeku.net/ 2>/dev/null || true
fi

echo ""
echo "✅ Diagnose complete!"
