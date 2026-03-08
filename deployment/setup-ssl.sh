#!/bin/bash
# WorkGrid SSL Setup Script
# Usage: bash /opt/workgrid/deployment/setup-ssl.sh your-domain.com
# Atau tanpa parameter untuk input manual

set -e

APP_DIR="/opt/workgrid"
NGINX_CONF="$APP_DIR/nginx/nginx.vps.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 WorkGrid SSL/HTTPS Setup${NC}"
echo "=============================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Get domain name
if [ -z "$1" ]; then
    read -p "Enter your domain name (e.g., workgrid.yourdomain.com): " DOMAIN
else
    DOMAIN=$1
fi

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Domain name is required${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Domain: $DOMAIN${NC}"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Certbot...${NC}"
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create backup of current nginx config
echo -e "${YELLOW}💾 Creating backup of current nginx config...${NC}"
cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d%H%M%S)"

# Update nginx config with domain
echo -e "${YELLOW}📝 Updating nginx configuration...${NC}"

# Create new nginx config with SSL support
cat > "$NGINX_CONF" << EOF
upstream backend {
    server backend:3001;
}

upstream frontend {
    server frontend:80;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    
    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Certificates (will be created by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API Proxy
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.IO WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket specific
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }
}
EOF

echo -e "${GREEN}✅ Nginx config updated${NC}"
echo ""

# Reload nginx to apply new config
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
cd "$APP_DIR"
docker-compose -f deployment/docker-compose.vps.yml exec -T nginx nginx -s reload 2>/dev/null || \
docker-compose -f deployment/docker-compose.vps.yml restart nginx

# Obtain SSL certificate
echo -e "${YELLOW}🔐 Obtaining SSL certificate from Let's Encrypt...${NC}"
echo -e "${YELLOW}   Make sure your domain DNS points to this server!${NC}"
echo ""

# Create certbot directories
mkdir -p /var/www/certbot
mkdir -p /etc/letsencrypt

# Stop nginx container temporarily to free port 80
docker-compose -f deployment/docker-compose.vps.yml stop nginx

# Obtain certificate using standalone mode
certbot certonly --standalone \
    --preferred-challenges http \
    -d "$DOMAIN" \
    --agree-tos \
    --non-interactive \
    --email "admin@$DOMAIN" \
    || {
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
        echo -e "${YELLOW}⚠️  Make sure:${NC}"
        echo "   1. Your domain DNS is pointed to this server IP"
        echo "   2. Port 80 is not blocked by firewall"
        echo "   3. The domain is correct"
        echo ""
        echo -e "${YELLOW}🔄 Restoring nginx...${NC}"
        docker-compose -f deployment/docker-compose.vps.yml start nginx
        exit 1
    }

# Start nginx again with reload
echo -e "${YELLOW}🔄 Starting nginx with SSL...${NC}"
cd "$APP_DIR"
docker-compose -f deployment/docker-compose.vps.yml restart nginx

# Setup auto-renewal
echo -e "${YELLOW}⏰ Setting up auto-renewal...${NC}"

# Create renewal hook script
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'HOOK'
#!/bin/bash
cd /opt/workgrid
/usr/local/bin/docker-compose -f deployment/docker-compose.vps.yml exec -T nginx nginx -s reload
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Add cron job for renewal
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 3 * * * /usr/bin/certbot renew --quiet --deploy-hook '/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh'") | crontab -

# Update environment file to use HTTPS
echo -e "${YELLOW}📝 Updating environment to use HTTPS...${NC}"
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" "$APP_DIR/.env"

# Update frontend environment
if [ -f "$APP_DIR/app/.env.production" ]; then
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|g" "$APP_DIR/app/.env.production"
fi

echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}✅ SSL Setup Complete!${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo -e "🌐 ${GREEN}Your app is now available at:${NC}"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo ""
echo "📋 Details:"
echo "   Domain: $DOMAIN"
echo "   SSL Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo "   Auto-renewal: Enabled (daily check at 3 AM)"
echo "   Nginx Config: $NGINX_CONF"
echo ""
echo "🔧 Useful commands:"
echo "   Test SSL:       curl -I https://$DOMAIN"
echo "   Check cert:     certbot certificates"
echo "   Renew manual:   certbot renew --dry-run"
echo "   View logs:      tail -f /var/log/letsencrypt/letsencrypt.log"
echo ""
echo -e "${YELLOW}⚠️  Note: If you need to add www subdomain, run:${NC}"
echo -e "   ${YELLOW}certbot certonly --expand -d $DOMAIN -d www.$DOMAIN${NC}"
echo ""
