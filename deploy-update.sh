#!/bin/bash
# Update WorkGrid VPS - quick deploy script
# Run this from local machine with SSH access

VPS_IP="152.42.242.180"
VPS_USER="root"
LOCAL_DIR="$(pwd)"

echo "===================================="
echo "  WorkGrid VPS Quick Update"
echo "  Target: $VPS_IP"
echo "===================================="

# Check if dist exists
if [ ! -d "$LOCAL_DIR/app/dist" ]; then
    echo "ERROR: Build the frontend first!"
    echo "Run: cd app && npm run build"
    exit 1
fi

# Create temp directories on VPS
echo "[1/4] Preparing VPS..."
ssh -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "mkdir -p /tmp/workgrid-update/uploads"

# Copy dist files
echo "[2/4] Copying frontend files..."
scp -r "$LOCAL_DIR/app/dist/"* "$VPS_USER@$VPS_IP:/tmp/workgrid-update/"

# Copy uploads
echo "[3/4] Copying uploads..."
scp -r "$LOCAL_DIR/server/uploads/"* "$VPS_USER@$VPS_IP:/tmp/workgrid-update/uploads/" 2>/dev/null || echo "No uploads to copy"

# Execute update on VPS
echo "[4/4] Executing update..."
ssh -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" << 'EOF'
cd /opt/workgrid

# Backup current
cp -r app/dist app/dist.backup.$(date +%s) 2>/dev/null || true

# Update frontend
cp -r /tmp/workgrid-update/* app/dist/

# Update uploads if directory exists
if [ -d /tmp/workgrid-update/uploads ]; then
    mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
    cp -r /tmp/workgrid-update/uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null || true
    chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/ 2>/dev/null || true
fi

# Restart only frontend container
docker-compose -f docker-compose.vps.yml restart frontend

# Cleanup
rm -rf /tmp/workgrid-update

echo "Update completed!"
EOF

echo ""
echo "===================================="
echo "  UPDATE COMPLETED!"
echo "===================================="
echo "Test URL: http://$VPS_IP"
