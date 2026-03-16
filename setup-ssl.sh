#!/bin/bash
set -e

DOMAIN="workgrid.homeku.net"
EMAIL="admin@workgrid.app"

echo "🚀 Setting up SSL for $DOMAIN..."

# Install certbot nginx plugin if not exists
apt-get update
apt-get install -y python3-certbot-nginx

# Stop nginx temporarily if running on host
cd /var/www/workgrid

# Get certificate using standalone mode
certbot certonly --standalone -d $DOMAIN --agree-tos --non-interactive --email $EMAIL || {
    echo "❌ Failed to get certificate"
    exit 1
}

echo "✅ Certificate obtained for $DOMAIN"

# Create combined nginx config with SSL
cat > /tmp/nginx-ssl.conf << 'EOF'
upstream backend {
    server discord_clone_backend:3001;
}

server {
    listen 80;
    server_name workgrid.homeku.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name workgrid.homeku.net;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/workgrid.homeku.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workgrid.homeku.net/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Uploads
    location ^~ /uploads/ {
        proxy_pass http://backend/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|otf)$ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # React Router
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    # API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://backend/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }
}
EOF

# Copy new nginx config
docker cp /tmp/nginx-ssl.conf discord_clone_frontend:/etc/nginx/conf.d/default.conf

# Reload nginx
docker exec discord_clone_frontend nginx -s reload

echo "✅ SSL Setup Complete!"
echo "🔗 https://$DOMAIN"

# Setup auto-renewal
echo "0 12 * * * certbot renew --quiet && docker exec discord_clone_frontend nginx -s reload" | crontab -
echo "✅ Auto-renewal cron job added"