#!/bin/bash

# Deployment script for ModernLogin UI update to VPS
# Run this on your local machine (Windows Git Bash or WSL)

set -e

echo "🚀 Starting ModernLogin UI Deployment to VPS..."
echo "VPS: 152.42.229.212"

# Configuration
VPS_IP="152.42.229.212"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/workgrid_vps"
APP_DIR="c:/Users/PC/Downloads/PROJECT\ TEAMCHAT/Aplikasi\ Discord\ Clone"
REMOTE_PATH="/app/frontend"

# Step 1: Verify SSH key exists
echo "✓ Checking SSH key..."
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    exit 1
fi
echo "✓ SSH key found"

# Step 2: Verify build exists
echo "✓ Checking build directory..."
if [ ! -d "$APP_DIR/app/dist" ]; then
    echo "❌ Build directory not found. Run: npm run build"
    exit 1
fi
echo "✓ Build directory exists"

# Step 3: Create backup on VPS
echo "🔄 Creating backup on VPS..."
ssh -i "$SSH_KEY" $VPS_USER@$VPS_IP "
    if [ -d \"$REMOTE_PATH\" ]; then
        mkdir -p /backup
        BACKUP_NAME=\"frontend_backup_\$(date +%Y%m%d_%H%M%S)\"
        cp -r $REMOTE_PATH /backup/\$BACKUP_NAME
        echo \"✓ Backup created: /backup/\$BACKUP_NAME\"
    fi
"

# Step 4: Upload new build
echo "📤 Uploading build files to VPS..."
scp -i "$SSH_KEY" -r "$APP_DIR/app/dist/*" $VPS_USER@$VPS_IP:$REMOTE_PATH/

echo "✓ Build files uploaded"

# Step 5: Update environment variables on VPS
echo "🔧 Updating application configuration..."
ssh -i "$SSH_KEY" $VPS_USER@$VPS_IP "
    # Update nginx configuration
    cat > /etc/nginx/sites-available/workgrid <<'EOF'
server {
    listen 80;
    server_name workgrid.homeku.net *.homeku.net 152.42.229.212;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name workgrid.homeku.net *.homeku.net 152.42.229.212;

    # SSL certificates
    ssl_certificate /etc/ssl/certs/workgrid.crt;
    ssl_certificate_key /etc/ssl/private/workgrid.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root directory
    root $REMOTE_PATH;
    index index.html;

    # Client configuration
    client_max_body_size 50M;

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_redirect off;
    }

    # SPA routing - serve index.html for all non-file requests
    location / {
        try_files \$uri \$uri/ /index.html;
        expires 30d;
        add_header Cache-Control 'public, immutable';
    }

    # Cache assets with long expiry
    location ~* \.(?:js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control 'public, immutable';
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;
    add_header Permissions-Policy \"geolocation=(), microphone=(), camera=()\" always;
}
EOF

    # Enable nginx site
    ln -sf /etc/nginx/sites-available/workgrid /etc/nginx/sites-enabled/workgrid

    # Test nginx configuration
    nginx -t

    # Reload nginx
    systemctl reload nginx

    echo \"✓ Nginx configuration updated and reloaded\"
"

# Step 6: Verify deployment
echo "✅ Verifying deployment..."
sleep 2

# Try to access the deployment
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k https://workgrid.homeku.net/ || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Your WorkGrid app is now live!"
    echo ""
    echo "📍 Access points:"
    echo "   • https://workgrid.homeku.net"
    echo "   • https://152.42.229.212"
    echo ""
    echo "📋 What's new:"
    echo "   ✨ Modern hero section with animated gradient orbs"
    echo "   ✨ Premium feature showcase with TiltCard 3D effects"
    echo "   ✨ Animated navbar with scroll glassmorphism"
    echo "   ✨ Smooth animations with Framer Motion"
    echo "   ✨ Mobile-responsive modern design"
    echo ""
    echo "🔄 Next steps:"
    echo "   1. Visit https://workgrid.homeku.net to test"
    echo "   2. Create an account to see the app"
    echo "   3. Check the landing page with unauthenticated access"
    echo ""
    echo "📊 Deployment details:"
    echo "   VPS: 152.42.229.212"
    echo "   Build time: $(date)"
    echo "   HTTP Status: $HTTP_CODE"
else
    echo "⚠️  Deployment may need verification"
    echo "HTTP Status: $HTTP_CODE"
    echo "Check: https://workgrid.homeku.net"
fi

echo ""
echo "✅ Deployment script completed!"
