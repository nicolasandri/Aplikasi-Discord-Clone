#!/bin/bash
# ============================================
# Update CORS and Domain Configuration
# VPS: 152.42.242.180
# Domain: workgrid.homeku.net
# ============================================

set -e

VPS_IP="152.42.242.180"
VPS_USER="root"

echo "============================================"
echo "  UPDATE CORS & DOMAIN CONFIGURATION"
echo "  VPS: $VPS_IP"
echo "  Domain: workgrid.homeku.net"
echo "============================================"

# Create remote update script
cat > /tmp/update-cors-remote.sh << 'REMOTESCRIPT'
#!/bin/bash
set -e

echo "[1/5] Stopping containers..."
cd /opt/workgrid
docker-compose -f docker-compose.vps.yml down

echo "[2/5] Updating environment configuration..."
cat > .env << 'EOF'
# ============================================
# Docker Environment Configuration
# Discord Clone
# ============================================

# ============================================
# Database Configuration
# ============================================
DB_PASSWORD=WorkGridDB@Secure2024!
DB_PORT=5432

# ============================================
# JWT Secret (minimum 32 characters)
# ============================================
JWT_SECRET=WG_SecretKey_2024_Random_Ch4r4ct3rs_F0r_S3cur1ty!@#$%^&*()

# ============================================
# Frontend URL (untuk CORS)
# ============================================
FRONTEND_URL=http://workgrid.homeku.net

# ============================================
# Node Environment
# ============================================
NODE_ENV=production

# ============================================
# CORS Allowed Origins
# ============================================
ALLOWED_ORIGINS=http://workgrid.homeku.net,https://workgrid.homeku.net,http://152.42.242.180,https://152.42.242.180

# ============================================
# Push Notifications (VAPID Keys)
# ============================================
VAPID_PUBLIC_KEY=BKlTzkEfOlZTNmGlIOYUYFhKqVirXvVXmDDlRIkpgWpGK3Vc1O6YgQz8I8C1QMr6OfdQXcSKd5gAl6pBO_75130
VAPID_PRIVATE_KEY=gfNAVZ4EixhnANxAp4xahC_WEZ_EW4UA-8cpMNHfDoQ
VAPID_SUBJECT=mailto:admin@workgrid.app
EOF

echo "[3/5] Updating docker-compose configuration..."
sed -i 's|FRONTEND_URL: ${FRONTEND_URL:-http://152.42.242.180}|FRONTEND_URL: ${FRONTEND_URL:-http://workgrid.homeku.net}|g' docker-compose.vps.yml
sed -i 's|ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://152.42.242.180}|ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://workgrid.homeku.net,https://workgrid.homeku.net,http://152.42.242.180,https://152.42.242.180}|g' docker-compose.vps.yml

echo "[4/5] Restoring uploads if missing..."
if [ -d "/opt/workgrid-backup/uploads" ]; then
    echo "Found backup uploads, restoring..."
    mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
    cp -r /opt/workgrid-backup/uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null || true
    chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null || true
fi

echo "[5/5] Starting containers..."
docker-compose -f docker-compose.vps.yml up -d

echo ""
echo "============================================"
echo "  UPDATE COMPLETED!"
echo "============================================"
echo "Domain: http://workgrid.homeku.net"
echo "IP:     http://152.42.242.180"
echo ""
echo "Health check:"
curl -s http://localhost/api/health | head -1
REMOTESCRIPT

# Copy and execute on VPS
echo "[DEPLOY] Copying update script to VPS..."
scp -o StrictHostKeyChecking=no /tmp/update-cors-remote.sh "${VPS_USER}@${VPS_IP}:/tmp/"

echo "[DEPLOY] Executing update on VPS..."
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "chmod +x /tmp/update-cors-remote.sh && bash /tmp/update-cors-remote.sh"

# Cleanup
rm -f /tmp/update-cors-remote.sh

echo ""
echo "============================================"
echo "  DEPLOYMENT SUCCESSFUL!"
echo "============================================"
echo ""
echo "Test URLs:"
echo "  - http://workgrid.homeku.net"
echo "  - http://152.42.242.180"
echo ""
echo "API Test:"
curl -s "http://${VPS_IP}/api/health" 2>/dev/null | head -1 || echo "Health check pending..."
