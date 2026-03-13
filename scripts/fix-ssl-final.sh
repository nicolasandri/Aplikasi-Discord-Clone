#!/bin/bash
#
# FIX SSL FINAL - Complete SSL Fix
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="workgrid.homeku.net"
EMAIL="admin@workgrid.homeku.net"
PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔒 FIX SSL FINAL${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

# Step 1: Stop all containers
echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
cd $PROJECT_DIR
docker-compose -f deployment/docker-compose.ssl.yml down 2>/dev/null || true
docker-compose down 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

# Step 2: Free port 80
echo -e "${YELLOW}🔓 Freeing port 80...${NC}"
systemctl stop nginx 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
fuser -k 443/tcp 2>/dev/null || true
sleep 2

# Step 3: Remove old certificates
echo -e "${YELLOW}🗑️ Removing old certificates...${NC}"
rm -rf /opt/workgrid/certbot/conf/live/$DOMAIN 2>/dev/null || true
rm -rf /opt/workgrid/certbot/conf/archive/$DOMAIN 2>/dev/null || true
rm -rf /opt/workgrid/certbot/conf/renewal/$DOMAIN.conf 2>/dev/null || true

# Step 4: Generate new certificate
echo -e "${YELLOW}🔐 Generating new SSL certificate...${NC}"
certbot certonly --standalone \
    -d $DOMAIN \
    --agree-tos \
    -m $EMAIL \
    --non-interactive \
    --force-renewal

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate certificate${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certificate generated!${NC}"

# Step 5: Copy certificates
echo -e "${YELLOW}📁 Copying certificates...${NC}"
mkdir -p /opt/workgrid/certbot/conf
rsync -av /etc/letsencrypt/ /opt/workgrid/certbot/conf/
chmod -R 755 /opt/workgrid/certbot

# Step 6: Verify certificate
echo -e "${YELLOW}🔍 Verifying certificate...${NC}"
openssl x509 -in /opt/workgrid/certbot/conf/live/$DOMAIN/fullchain.pem -noout -subject -dates

# Step 7: Start with SSL compose
echo -e "${YELLOW}🚀 Starting services with SSL...${NC}"
cd $PROJECT_DIR

# Ensure env vars are set
export FRONTEND_URL=https://$DOMAIN

# Start services
docker-compose -f deployment/docker-compose.ssl.yml up -d --force-recreate

sleep 5

echo ""
echo -e "${YELLOW}📋 Container status...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SSL FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Test: https://$DOMAIN"
echo ""
echo -e "📋 To verify certificate:"
echo -e "   openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | openssl x509 -noout -subject -dates"
echo ""
