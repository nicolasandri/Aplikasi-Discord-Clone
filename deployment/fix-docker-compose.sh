#!/bin/bash
# Fix Docker Compose untuk menambahkan nginx

cd /opt/workgrid

echo "=== Check Network ==="
docker network ls | grep discord

echo ""
echo "=== Create docker-compose-nginx.yml ==="
cat > docker-compose-nginx.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: discord_clone_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - /var/log/nginx:/var/log/nginx
    networks:
      - discord_network
    depends_on:
      - discord_clone_frontend
      - discord_clone_backend

networks:
  discord_network:
    external: true
EOF

echo "=== Update nginx config ==="
mkdir -p nginx/ssl

cat > nginx/nginx.conf << 'EOFCFG'
upstream backend {
    server discord_clone_backend:3001;
}

upstream frontend {
    server discord_clone_frontend:80;
}

server {
    listen 80;
    server_name workgrid.homeku.net 167.172.72.73 _;
    
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
EOFCFG

echo ""
echo "=== Stop any existing nginx ==="
docker stop discord_clone_nginx 2>/dev/null || true
docker rm discord_clone_nginx 2>/dev/null || true

echo ""
echo "=== Start nginx ==="
docker compose -f docker-compose-nginx.yml up -d

echo ""
echo "=== Check Status ==="
sleep 3
docker ps | grep nginx
docker logs discord_clone_nginx --tail 10

echo ""
echo "=== Test Local Connection ==="
curl -s http://localhost | head -20

echo ""
echo "=== DONE! ==="
echo "Akses aplikasi di: http://workgrid.homeku.net"
