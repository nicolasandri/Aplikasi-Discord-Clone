#!/bin/bash
#
# DIAGNOSE SSL ISSUES
#

echo "========================================"
echo "🔍 SSL DIAGNOSIS"
echo "========================================"
echo ""

# Check if certificate exists
echo "1. Checking certificate files..."
ls -la /etc/letsencrypt/live/workgrid.homeku.net/ 2>/dev/null || echo "   ❌ No certificate found in /etc/letsencrypt/live/"
ls -la /opt/workgrid/certbot/conf/live/workgrid.homeku.net/ 2>/dev/null || echo "   ❌ No certificate found in /opt/workgrid/certbot/"

echo ""
echo "2. Checking certificate validity..."
if [ -f "/opt/workgrid/certbot/conf/live/workgrid.homeku.net/fullchain.pem" ]; then
    openssl x509 -in /opt/workgrid/certbot/conf/live/workgrid.homeku.net/fullchain.pem -noout -subject -dates
else
    echo "   ❌ Certificate file not found"
fi

echo ""
echo "3. Checking what nginx is serving..."
docker exec discord_clone_nginx nginx -T 2>/dev/null | grep -E "ssl_certificate|listen" | head -10

echo ""
echo "4. Testing HTTPS connection..."
curl -vI https://workgrid.homeku.net 2>&1 | grep -E "SSL|certificate|subject|issuer" | head -10

echo ""
echo "5. Check if using self-signed cert..."
openssl s_client -connect workgrid.homeku.net:443 -servername workgrid.homeku.net 2>/dev/null | openssl x509 -noout -subject -issuer

echo ""
echo "6. Container status..."
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
