#!/bin/bash

# SSL Setup Script for WorkGrid
# Domain: workgrid.homeku.net
# IP: 165.245.187.155

set -e

echo "========================================"
echo "🔒 SSL Setup untuk WorkGrid"
echo "========================================"
echo ""

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check apakah berjalan sebagai root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Harus dijalankan sebagai root (gunakan sudo)${NC}"
    exit 1
fi

# Variables
DOMAIN="workgrid.homeku.net"
EMAIL="admin@workgrid.homeku.net"  # Ganti dengan email kamu
PROJECT_DIR="/opt/workgrid"

# Update system
echo -e "${YELLOW}📦 Update system...${NC}"
apt update -qq

# Install certbot
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Install Certbot...${NC}"
    apt install -y certbot
fi

# Buat direktori untuk certbot
echo -e "${YELLOW}📁 Setup direktori certbot...${NC}"
mkdir -p $PROJECT_DIR/certbot/conf
mkdir -p $PROJECT_DIR/certbot/www
chmod -R 755 $PROJECT_DIR/certbot

# Stop nginx container agar port 80 free
echo -e "${YELLOW}🛑 Stop nginx container...${NC}"
cd $PROJECT_DIR
docker-compose stop nginx 2>/dev/null || true
docker stop discord_clone_nginx 2>/dev/null || true

# Tunggu sebentar
sleep 2

# Generate SSL certificate menggunakan standalone mode
echo -e "${YELLOW}🔐 Generate SSL certificate untuk $DOMAIN...${NC}"
certbot certonly --standalone \
    -d $DOMAIN \
    --agree-tos \
    -m $EMAIL \
    --non-interactive \
    --keep-until-expiring

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL Certificate berhasil digenerate!${NC}"
else
    echo -e "${RED}❌ Gagal generate SSL certificate${NC}"
    exit 1
fi

# Copy sertifikat ke project directory
echo -e "${YELLOW}📁 Copy sertifikat ke project directory...${NC}"
rsync -av /etc/letsencrypt/ $PROJECT_DIR/certbot/conf/

# Set permission
chmod -R 755 $PROJECT_DIR/certbot
chmod 644 $PROJECT_DIR/certbot/conf/live/*/fullchain.pem 2>/dev/null || true
chmod 600 $PROJECT_DIR/certbot/conf/live/*/privkey.pem 2>/dev/null || true

# Update .env file untuk HTTPS
echo -e "${YELLOW}📝 Update environment variables...${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    # Update FRONTEND_URL
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://workgrid.homeku.net|' $PROJECT_DIR/.env
    
    # Update atau tambah ALLOWED_ORIGINS
    if grep -q "ALLOWED_ORIGINS" $PROJECT_DIR/.env; then
        sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://workgrid.homeku.net|' $PROJECT_DIR/.env
    else
        echo "ALLOWED_ORIGINS=https://workgrid.homeku.net" >> $PROJECT_DIR/.env
    fi
    
    echo -e "${GREEN}✅ .env file updated${NC}"
fi

# Restart dengan SSL compose
echo -e "${YELLOW}🚀 Restart services dengan SSL...${NC}"
cd $PROJECT_DIR

# Stop services yang berjalan
docker-compose down 2>/dev/null || true

# Jalankan dengan SSL compose
docker-compose -f deployment/docker-compose.ssl.yml up -d

# Tunggu services start
sleep 5

# Check status
echo ""
echo -e "${YELLOW}📋 Status Services:${NC}"
docker-compose ps

echo ""
echo "========================================"
echo -e "${GREEN}✅ SSL Setup Complete!${NC}"
echo "========================================"
echo ""
echo -e "🔗 Akses aplikasi di: ${GREEN}https://$DOMAIN${NC}"
echo -e "🔗 Health check: ${GREEN}https://$DOMAIN/api/health${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Test akses HTTPS di browser"
echo "   2. Cek SSL certificate: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "🔧 Auto-renewal sudah diatur di crontab"
echo "   Sertifikat akan otomatis di-renew setiap hari jam 2 pagi"
echo ""
