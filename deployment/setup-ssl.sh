#!/bin/bash

# ============================================
# Discord Clone - SSL Setup with Let's Encrypt
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Discord Clone - SSL Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Get domain from user
read -p "Enter your domain name (e.g., discord.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain name is required!${NC}"
    exit 1
fi

echo -e "${YELLOW}Setting up SSL for: $DOMAIN${NC}"
echo ""

# ============================================
# Install Certbot
# ============================================
echo -e "${YELLOW}[1/5] Installing Certbot...${NC}"

if command -v certbot &> /dev/null; then
    echo -e "${GREEN}Certbot already installed${NC}"
else
    apt update
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}Certbot installed${NC}"
fi

# ============================================
# Create webroot for challenges
# ============================================
echo -e "${YELLOW}[2/5] Creating webroot for ACME challenges...${NC}"
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

# ============================================
# Update Nginx Configuration
# ============================================
echo -e "${YELLOW}[3/5] Updating Nginx configuration...${NC}"

# Backup current config
cp /etc/nginx/sites-available/discord-clone /etc/nginx/sites-available/discord-clone.backup.$(date +%Y%m%d)

# Create new config with SSL
cat > /etc/nginx/sites-available/discord-clone << EOF
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Client body size
    client_max_body_size 50M;
    
    # Rate limiting
    limit_req zone=api burst=20 nodelay;
    
    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400s;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001;
        access_log off;
    }
}
EOF

echo -e "${GREEN}Nginx configuration updated${NC}"

# Test Nginx config
nginx -t
echo -e "${GREEN}Nginx configuration test passed${NC}"

# ============================================
# Obtain SSL Certificate
# ============================================
echo -e "${YELLOW}[4/5] Obtaining SSL certificate...${NC}"
echo -e "${BLUE}Make sure your domain DNS is pointing to this server ($VPS_IP)${NC}"
echo ""

# Stop nginx temporarily to free port 80 for standalone mode
systemctl stop nginx

# Obtain certificate
certbot certonly --standalone -d $DOMAIN --agree-tos --non-interactive --email admin@$DOMAIN

# Start nginx
systemctl start nginx

echo -e "${GREEN}SSL certificate obtained${NC}"

# ============================================
# Setup Auto-Renewal
# ============================================
echo -e "${YELLOW}[5/5] Setting up auto-renewal...${NC}"

# Create renewal hook
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Test renewal
certbot renew --dry-run

echo -e "${GREEN}Auto-renewal configured${NC}"

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Your Discord Clone is now accessible at:${NC}"
echo -e "  🔒 ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}SSL Certificate Details:${NC}"
certbot certificates | grep -A 5 "Certificate Name: $DOMAIN"
echo ""
echo -e "${YELLOW}Auto-renewal:${NC}"
echo -e "  Certificates will auto-renew 30 days before expiry"
echo -e "  Run ${BLUE}certbot renew --dry-run${NC} to test renewal"
echo ""
echo -e "${GREEN}Setup complete! 🎉${NC}"
