#!/bin/bash

# Setup SSL untuk WorkGrid menggunakan Let's Encrypt
# Usage: ./setup-ssl.sh workgrid.homeku.net

set -e

DOMAIN=${1:-workgrid.homeku.net}
EMAIL=${2:-admin@workgrid.homeku.net}
PROJECT_DIR="/opt/workgrid"

echo "🔒 Setting up SSL for WorkGrid"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if domain is provided
if [ -z "$DOMAIN" ]; then
    echo "❌ Usage: ./setup-ssl.sh <domain> [email]"
    echo "Example: ./setup-ssl.sh workgrid.homeku.net admin@workgrid.homeku.net"
    exit 1
fi

# Update system
echo "📦 Updating system..."
apt update -qq

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt install -y -qq certbot
fi

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Create certbot directories
echo "📁 Creating certbot directories..."
mkdir -p certbot/conf certbot/www

# Stop nginx container to free port 80
echo "🛑 Stopping nginx container..."
if docker-compose -f deployment/docker-compose.vps.yml ps | grep -q "workgrid-nginx"; then
    docker-compose -f deployment/docker-compose.vps.yml stop nginx
    NGINX_STOPPED=true
else
    NGINX_STOPPED=false
fi

# Generate certificate
echo "🔐 Generating SSL certificate for $DOMAIN..."
if certbot certonly --standalone -d "$DOMAIN" --agree-tos -m "$EMAIL" --non-interactive; then
    echo "✅ Certificate generated successfully!"
else
    echo "❌ Failed to generate certificate"
    if [ "$NGINX_STOPPED" = true ]; then
        docker-compose -f deployment/docker-compose.vps.yml start nginx
    fi
    exit 1
fi

# Copy certificates to project directory
echo "📋 Copying certificates..."
rsync -av /etc/letsencrypt/ "$PROJECT_DIR/certbot/conf/" --exclude=archive --exclude=keys

# Restart nginx if it was stopped
if [ "$NGINX_STOPPED" = true ]; then
    echo "🚀 Starting nginx container..."
    docker-compose -f deployment/docker-compose.vps.yml start nginx
fi

# Setup auto-renewal cron job
echo "⏰ Setting up auto-renewal..."
CRON_JOB="0 2 * * * /usr/bin/certbot renew --quiet --deploy-hook 'cd $PROJECT_DIR && docker-compose -f deployment/docker-compose.vps.yml restart nginx'"

# Remove existing cron job for this domain if exists
(crontab -l 2>/dev/null | grep -v "certbot renew" || true) | crontab -

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Auto-renewal configured"

# Restart nginx to apply new certificates
echo "🔄 Restarting nginx..."
docker-compose -f deployment/docker-compose.vps.yml restart nginx

# Test HTTPS
echo ""
echo "🧪 Testing HTTPS..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200\\|301\\|302"; then
    echo "✅ HTTPS is working!"
    echo "🌐 Your site is now accessible at: https://$DOMAIN"
else
    echo "⚠️  Could not verify HTTPS. Please check manually."
    echo "🌐 Try accessing: https://$DOMAIN"
fi

echo ""
echo "========================================="
echo "✅ SSL Setup Complete!"
echo "========================================="
echo "Domain: https://$DOMAIN"
echo "Certificate path: $PROJECT_DIR/certbot/conf/"
echo "Auto-renewal: Enabled (daily at 2 AM)"
echo ""
echo "📋 Useful commands:"
echo "  Check certificate: openssl x509 -in $PROJECT_DIR/certbot/conf/live/$DOMAIN/cert.pem -text -noout"
echo "  Test renewal: certbot renew --dry-run"
echo "  View nginx logs: docker-compose -f deployment/docker-compose.vps.yml logs nginx"
echo "========================================="
