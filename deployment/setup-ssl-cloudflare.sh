#!/bin/bash

# Setup SSL untuk WorkGrid menggunakan Cloudflare Origin Certificate
# Usage: ./setup-ssl-cloudflare.sh

set -e

PROJECT_DIR="/opt/workgrid"
SSL_DIR="$PROJECT_DIR/ssl"

echo "🔒 Setting up SSL for WorkGrid with Cloudflare"
echo ""
echo "📋 Instruksi:"
echo "1. Login ke Cloudflare dashboard"
echo "2. Pilih domain workgrid.homeku.net"
echo "3. Menu: SSL/TLS → Origin Server"
echo "4. Click 'Create Certificate'"
echo "5. Pilih 'Let Cloudflare generate a private key and a CSR'"
echo "6. Copy certificate dan private key"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create SSL directory
mkdir -p "$SSL_DIR"

# Prompt for certificate
echo "📋 Paste your Cloudflare Origin Certificate (PEM format):"
echo "(Press Ctrl+D when done)"
cat > "$SSL_DIR/workgrid.pem"

# Prompt for private key
echo ""
echo "📋 Paste your Cloudflare Origin Private Key (PEM format):"
echo "(Press Ctrl+D when done)"
cat > "$SSL_DIR/workgrid.key"

# Set permissions
chmod 600 "$SSL_DIR/workgrid.key"
chmod 644 "$SSL_DIR/workgrid.pem"

echo ""
echo "✅ Certificate files saved"

# Verify files
if [ -s "$SSL_DIR/workgrid.pem" ] && [ -s "$SSL_DIR/workgrid.key" ]; then
    echo "✅ Certificate files verified"
else
    echo "❌ Certificate files are empty. Please try again."
    exit 1
fi

# Update nginx config to use Cloudflare certificates
NGINX_CONF="$PROJECT_DIR/nginx/nginx.vps.conf"

# Backup original config
cp "$NGINX_CONF" "$NGINX_CONF.backup"

# Update SSL paths in nginx config
sed -i "s|ssl_certificate /etc/letsencrypt/live/workgrid.homeku.net/fullchain.pem;|ssl_certificate /etc/nginx/ssl/workgrid.pem;|g" "$NGINX_CONF"
sed -i "s|ssl_certificate_key /etc/letsencrypt/live/workgrid.homeku.net/privkey.pem;|ssl_certificate_key /etc/nginx/ssl/workgrid.key;|g" "$NGINX_CONF"

echo "✅ Nginx config updated"

# Update docker-compose to mount SSL directory
echo "📝 Updating docker-compose..."
DOCKER_COMPOSE="$PROJECT_DIR/deployment/docker-compose.vps.yml"

# Check if SSL volume already exists
if ! grep -q "../ssl:/etc/nginx/ssl:ro" "$DOCKER_COMPOSE"; then
    # Add SSL volume mount
    sed -i '/- ..\/nginx\/nginx.vps.conf:/a\      - ..\/ssl:/etc\/nginx\/ssl:ro' "$DOCKER_COMPOSE"
    echo "✅ Docker compose updated"
else
    echo "✅ SSL volume already configured"
fi

# Restart nginx
echo "🔄 Restarting nginx..."
cd "$PROJECT_DIR"
docker-compose -f deployment/docker-compose.vps.yml restart nginx

echo ""
echo "========================================="
echo "✅ Cloudflare SSL Setup Complete!"
echo "========================================="
echo ""
echo "⚠️  Penting: Konfigurasi Cloudflare SSL Mode"
echo ""
echo "1. Login ke Cloudflare Dashboard"
echo "2. Pilih domain: workgrid.homeku.net"
echo "3. Menu: SSL/TLS → Overview"
echo "4. Set SSL/TLS encryption mode ke: 'Full (strict)'"
echo "5. Enable 'Always Use HTTPS'")
echo "6. Enable 'Automatic HTTPS Rewrites'")
echo ""
echo "🌐 Your site will be accessible at: https://workgrid.homeku.net"
echo "========================================="
