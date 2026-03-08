#!/bin/bash
# Fix SSL Nginx Issues

echo "🔧 Diagnosing SSL/HTTPS Issues..."
echo "=============================="

cd /opt/workgrid/deployment

# Check if containers are running
echo "📋 Container Status:"
docker-compose -f docker-compose.vps.yml ps

# Check nginx logs
echo ""
echo "📝 Nginx Logs:"
docker-compose -f docker-compose.vps.yml logs nginx --tail=50

# Check if SSL cert exists
echo ""
echo "🔐 SSL Certificates:"
ls -la /etc/letsencrypt/live/workgrid.homeku.net/ 2>/dev/null || echo "❌ Certificate not found"

# Check nginx config
echo ""
echo "⚙️  Nginx Config:"
docker-compose -f docker-compose.vps.yml exec nginx nginx -t 2>/dev/null || echo "❌ Nginx config test failed"

# Check firewall
echo ""
echo "🔥 Firewall Status:"
ufw status | grep -E "80|443"

# Check ports
echo ""
echo "🌐 Ports Listening:"
netstat -tlnp | grep -E ":80|:443" || ss -tlnp | grep -E ":80|:443"

# Fix: Ensure nginx config has HTTPS
echo ""
echo "🔧 Checking nginx config file..."
cat /opt/workgrid/nginx/nginx.vps.conf | head -100

echo ""
echo "=============================="
echo "Attempting fixes..."

# Restart containers
docker-compose -f docker-compose.vps.yml restart nginx

echo "✅ Done! Check again with: curl -I https://workgrid.homeku.net"
