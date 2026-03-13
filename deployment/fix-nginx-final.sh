#!/bin/bash
# Fix Nginx - Final Version

cd /opt/workgrid

echo "=== Check Existing Networks ==="
docker network ls

echo ""
echo "=== Find the correct network ==="
docker network ls | grep discord

echo ""
echo "=== Stop existing nginx containers ==="
docker stop discord_clone_nginx 2>/dev/null || true
docker rm discord_clone_nginx 2>/dev/null || true

echo ""
echo "=== Get Network Name ==="
NETWORK_NAME=$(docker network ls | grep discord | head -1 | awk '{print $2}')
echo "Using network: $NETWORK_NAME"

echo ""
echo "=== Create Nginx Config ==="
mkdir -p nginx/ssl

cat > nginx/nginx.conf << 'EOF'
upstream backend {
    server workgrid-backend-1:3001;
}

upstream frontend {
    server workgrid-frontend-1:80;
}

server {
    listen 80;
    server_name workgrid.homeku.net 167.172.72.73 _;
    
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    location /uploads {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF

echo ""
echo "=== Start Nginx ==="
docker run -d \
  --name discord_clone_nginx \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -v /opt/workgrid/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /opt/workgrid/nginx/ssl:/etc/nginx/ssl:ro \
  --network $NETWORK_NAME \
  nginx:alpine

echo ""
echo "=== Check Status ==="
sleep 3
docker ps | grep nginx
docker logs discord_clone_nginx --tail 10

echo ""
echo "=== Test Connection ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost

echo ""
echo "=== Done! ==="
