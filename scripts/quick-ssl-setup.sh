#!/bin/bash
#
# QUICK SSL SETUP for workgrid.homeku.net
#

set -e

echo "========================================"
echo "🔒 QUICK SSL SETUP"
echo "========================================"
echo ""

DOMAIN="workgrid.homeku.net"
PROJECT_DIR="/opt/workgrid"

# Install certbot if needed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update -qq && apt-get install -y -qq certbot
fi

# Stop services
systemctl stop nginx 2>/dev/null || true
cd $PROJECT_DIR && docker-compose down 2>/dev/null || true
sleep 2

# Generate certificate
echo "🔐 Generating SSL certificate..."
certbot certonly --standalone -d $DOMAIN --agree-tos -m admin@$DOMAIN --non-interactive

# Copy certs
mkdir -p $PROJECT_DIR/certbot/conf
rsync -av /etc/letsencrypt/ $PROJECT_DIR/certbot/conf/
chmod -R 755 $PROJECT_DIR/certbot

# Update env
cat > $PROJECT_DIR/.env << EOF
DB_PASSWORD=workgrid_secure_password_2024
JWT_SECRET=workgrid_super_secret_jwt_key_2024
FRONTEND_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN
NODE_ENV=production
EOF

# Start with SSL
cd $PROJECT_DIR
docker-compose -f deployment/docker-compose.ssl.yml up -d

echo ""
echo "========================================"
echo "✅ SSL Setup Complete!"
echo "========================================"
echo ""
echo "🔗 https://$DOMAIN"
echo ""
