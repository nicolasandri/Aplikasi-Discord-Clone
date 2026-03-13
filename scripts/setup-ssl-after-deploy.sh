#!/bin/bash
#
# Setup SSL after fresh deploy
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
echo -e "${BLUE}🔒 SETUP SSL AFTER DEPLOY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Must run as root!${NC}"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Install certbot
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
apt-get update -qq
apt-get install -y -qq certbot

# Step 2: Stop nginx to free port 80
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
docker-compose down 2>/dev/null || true
docker stop discord_clone_frontend 2>/dev/null || true
sleep 3

# Step 3: Generate SSL certificate
echo -e "${YELLOW}🔐 Generating SSL certificate...${NC}"
certbot certonly --standalone \
    -d $DOMAIN \
    --agree-tos \
    -m $EMAIL \
    --non-interactive

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate certificate${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSL certificate generated!${NC}"

# Step 4: Copy certificates
echo -e "${YELLOW}📁 Copying certificates...${NC}"
mkdir -p $PROJECT_DIR/certbot/conf
rsync -av /etc/letsencrypt/ $PROJECT_DIR/certbot/conf/
chmod -R 755 $PROJECT_DIR/certbot

# Step 5: Update .env
echo -e "${YELLOW}📝 Updating .env...${NC}"
cat > .env << EOF
DB_PASSWORD=workgrid_secure_password_2024
JWT_SECRET=workgrid_super_secret_jwt_key_2024
FRONTEND_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN
NODE_ENV=production
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:$EMAIL
EOF

# Step 6: Start with SSL
echo -e "${YELLOW}🚀 Starting with SSL...${NC}"
docker-compose -f deployment/docker-compose.ssl.yml up -d --force-recreate

sleep 10

# Step 7: Check status
echo ""
echo -e "${YELLOW}📋 Status:${NC}"
docker-compose -f deployment/docker-compose.ssl.yml ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SSL SETUP COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🔗 Access: https://$DOMAIN"
echo ""
