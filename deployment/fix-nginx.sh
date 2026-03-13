#!/bin/bash
# Fix Nginx for WorkGrid

cd /opt/workgrid

echo "=== Checking Nginx Container ==="
docker ps -a | grep nginx

echo ""
echo "=== Checking Nginx Config ==="
# Fix nginx config untuk domain workgrid.homeku.net
cat > nginx/nginx.conf << 'EOF'
upstream backend {
    server discord_clone_backend:3001;
}

upstream frontend {
    server discord_clone_frontend:80;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name workgrid.homeku.net 167.172.72.73 _;
    
    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
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
    
    # API Proxy
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.IO WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

echo "=== Stopping Nginx if exists ==="
docker stop discord_clone_nginx 2>/dev/null || true
docker rm discord_clone_nginx 2>/dev/null || true

echo ""
echo "=== Starting Nginx Container ==="
docker run -d \
  --name discord_clone_nginx \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -v /opt/workgrid/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /opt/workgrid/nginx/ssl:/etc/nginx/ssl:ro \
  --network discord_network \
  nginx:alpine

echo ""
echo "=== Checking Nginx Logs ==="
sleep 2
docker logs discord_clone_nginx --tail 20

echo ""
echo "=== Testing Connection ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "Failed"

echo ""
echo "=== Done! ==="
echo "Akses: http://workgrid.homeku.net"
