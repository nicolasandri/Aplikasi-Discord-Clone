#!/bin/bash
#
# VPS SSL INSTALL SCRIPT
# Script ini dijalankan di VPS untuk setup SSL Let's Encrypt
# Domain: workgrid.homeku.net
#
# CARA PAKAI:
# 1. SSH ke VPS: ssh root@165.245.187.155
# 2. Paste command ini di terminal:
#    curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/scripts/vps-ssl-install.sh | bash
#
# Atau manual:
#    wget -qO- https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/scripts/vps-ssl-install.sh | bash
#

set -e

# Warna
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_URL="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"
PROJECT_DIR="/opt/workgrid"
DOMAIN="workgrid.homeku.net"
EMAIL="admin@workgrid.homeku.net"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔒 WorkGrid SSL Auto-Installer${NC}"
echo -e "${BLUE}Domain: $DOMAIN${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Error: Harus dijalankan sebagai root!${NC}"
    echo "   Jalankan: sudo bash atau login sebagai root"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
apt-get update -qq
apt-get install -y -qq git curl rsync

# Install certbot if not exists
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Certbot...${NC}"
    apt-get install -y -qq certbot
fi

# Setup project directory
echo -e "${YELLOW}📁 Setup project directory...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}   Directory exists, updating...${NC}"
    cd $PROJECT_DIR
    git pull origin main --quiet
else
    echo -e "${YELLOW}   Cloning repository...${NC}"
    git clone $REPO_URL $PROJECT_DIR --quiet
    cd $PROJECT_DIR
fi

# Open firewall ports
echo -e "${YELLOW}🔓 Opening firewall ports...${NC}"
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

# Create certbot directories
echo -e "${YELLOW}📁 Creating certbot directories...${NC}"
mkdir -p $PROJECT_DIR/certbot/conf
mkdir -p $PROJECT_DIR/certbot/www
chmod -R 755 $PROJECT_DIR/certbot

# Stop nginx to free port 80
echo -e "${YELLOW}🛑 Stopping nginx container...${NC}"
cd $PROJECT_DIR
docker-compose stop nginx 2>/dev/null || true
docker stop discord_clone_nginx 2>/dev/null || true
docker-compose down 2>/dev/null || true

sleep 3

# Generate SSL certificate
echo -e "${YELLOW}🔐 Generating SSL certificate for $DOMAIN...${NC}"
certbot certonly --standalone \
    -d $DOMAIN \
    --agree-tos \
    -m $EMAIL \
    --non-interactive \
    --keep-until-expiring

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate SSL certificate!${NC}"
    echo "   Pastikan:"
    echo "   - Domain $DOMAIN sudah pointing ke IP ini"
    echo "   - Port 80 tidak terblokir"
    exit 1
fi

echo -e "${GREEN}✅ SSL certificate generated successfully!${NC}"

# Copy certificates
echo -e "${YELLOW}📁 Copying certificates...${NC}"
rsync -av /etc/letsencrypt/ $PROJECT_DIR/certbot/conf/ --quiet
chmod -R 755 $PROJECT_DIR/certbot

# Update .env for HTTPS
echo -e "${YELLOW}📝 Updating environment variables...${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    # Update FRONTEND_URL
    if grep -q "FRONTEND_URL=" $PROJECT_DIR/.env; then
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" $PROJECT_DIR/.env
    else
        echo "FRONTEND_URL=https://$DOMAIN" >> $PROJECT_DIR/.env
    fi
    
    # Update ALLOWED_ORIGINS
    if grep -q "ALLOWED_ORIGINS=" $PROJECT_DIR/.env; then
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN|" $PROJECT_DIR/.env
    else
        echo "ALLOWED_ORIGINS=https://$DOMAIN" >> $PROJECT_DIR/.env
    fi
    
    echo -e "${GREEN}✅ .env updated${NC}"
fi

# Start services with SSL
echo -e "${YELLOW}🚀 Starting services with SSL...${NC}"
cd $PROJECT_DIR
docker-compose -f deployment/docker-compose.ssl.yml up -d --build

# Wait for services
sleep 10

# Check status
echo ""
echo -e "${YELLOW}📋 Service Status:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Your app is now available at:"
echo -e "   ${GREEN}https://$DOMAIN${NC}"
echo -e "   ${GREEN}https://$DOMAIN/api/health${NC}"
echo ""
echo -e "📋 Notes:"
echo "   - HTTP automatically redirects to HTTPS"
echo "   - Certificate valid for 90 days"
echo "   - Auto-renewal: Run 'certbot renew' manually or setup cron"
echo ""
echo -e "🔧 To setup auto-renewal, run:"
echo -e "   ${YELLOW}bash $PROJECT_DIR/scripts/setup-auto-renew.sh${NC}"
echo ""
