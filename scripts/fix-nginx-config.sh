#!/bin/bash
#
# FIX NGINX CONFIG - Fix proxy pass
#

echo "========================================"
echo "🔧 FIX NGINX CONFIG"
echo "========================================"
echo ""

cd /opt/workgrid

# Create proper nginx config
cat > /tmp/nginx.ssl.conf << 'EOF'
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
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name workgrid.homeku.net;
    
    ssl_certificate /etc/letsencrypt/live/workgrid.homeku.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workgrid.homeku.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Frontend
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
    
    # API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Content-Type $content_type;
        proxy_set_header Content-Length $content_length;
        proxy_buffering off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.IO
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Copy config to nginx container
docker cp /tmp/nginx.ssl.conf discord_clone_nginx:/etc/nginx/conf.d/default.conf

# Test nginx config
docker exec discord_clone_nginx nginx -t

# Reload nginx
docker exec discord_clone_nginx nginx -s reload

echo ""
echo "========================================"
echo "✅ NGINX CONFIG FIXED!"
echo "========================================"
echo ""
echo "🔗 Try: https://workgrid.homeku.net/login"
echo ""
