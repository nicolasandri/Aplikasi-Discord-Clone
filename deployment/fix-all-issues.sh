#!/bin/bash
# Fix All Deployment Issues

set -e

echo "🔧 Fixing All Issues..."
echo "=============================="
cd /opt/workgrid

# 1. Check SSL certificates exist
echo "1️⃣ Checking SSL certificates..."
if [ ! -d "/etc/letsencrypt/live/workgrid.homeku.net" ]; then
    echo "❌ SSL certificate not found!"
    exit 1
fi
ls -la /etc/letsencrypt/live/workgrid.homeku.net/

# 2. Fix SSL certificate permissions
echo ""
echo "2️⃣ Fixing SSL permissions..."
chmod -R 755 /etc/letsencrypt/live/
chmod -R 755 /etc/letsencrypt/archive/

# 3. Create proper nginx config
echo ""
echo "3️⃣ Creating nginx config..."
cat > nginx/nginx.vps.conf << 'EOF'
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:80;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name workgrid.homeku.net;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name workgrid.homeku.net;
    
    ssl_certificate /etc/letsencrypt/live/workgrid.homeku.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workgrid.homeku.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    location /uploads {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
    }
}
EOF

# 4. Fix firewall
echo ""
echo "4️⃣ Fixing firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# 5. Restart all containers
echo ""
echo "5️⃣ Restarting containers..."
cd deployment
docker-compose -f docker-compose.vps.yml stop

# Remove old containers to ensure clean state
docker-compose -f docker-compose.vps.yml rm -f nginx backend

# Start fresh
docker-compose -f docker-compose.vps.yml up -d

# 6. Wait and check
echo ""
echo "6️⃣ Waiting for services..."
sleep 10

# 7. Show status
echo ""
echo "=============================="
echo "📊 Status:"
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "=============================="
echo "🔍 Testing..."

# Test HTTP
echo "Testing HTTP..."
curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "HTTP failed"

# Test HTTPS (local)
echo "Testing HTTPS (local)..."
curl -s -o /dev/null -w "%{http_code}" -k https://localhost || echo "HTTPS failed"

echo ""
echo "=============================="
echo "✅ Fix Complete!"
echo "=============================="
echo ""
echo "Try accessing: https://workgrid.homeku.net"
