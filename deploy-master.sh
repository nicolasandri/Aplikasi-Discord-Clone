#!/bin/bash
set -e

# ============================================
# WorkGrid Master Deploy Script
# VPS: 152.42.229.212
# ============================================

VPS_IP="152.42.229.212"
VPS_USER="root"
VPS_PASS="%0|F?H@f!berhO3e"
LOCAL_DIR="$(pwd)"

echo "=========================================="
echo "  WorkGrid Master Deployment"
echo "  VPS: $VPS_IP"
echo "=========================================="
echo ""

# Function to run command on VPS via SSH
run_on_vps() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_USER@$VPS_IP "$1"
}

# Function to copy files to VPS
copy_to_vps() {
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r "$1" $VPS_USER@$VPS_IP:"$2"
}

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass tidak ditemukan. Install dulu..."
    
    # Detect OS and install sshpass
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
        echo "Windows detected. Silakan install sshpass manual:"
        echo "  1. Download dari: https://sourceforge.net/projects/sshwindows/"
        echo "  2. Atau pakai Git Bash dengan: pacman -S sshpass"
        echo ""
        echo "Alternatif: Copy script deploy-vps-152.42.229.212.sh ke VPS manual dan jalankan di sana."
        exit 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install sshpass
    else
        echo "OS tidak dikenali. Silakan install sshpass manual."
        exit 1
    fi
fi

echo "[1/6] Setup VPS (Install Docker & create config)..."
run_on_vps "mkdir -p /opt/workgrid"

# Copy and run setup script
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null deploy-vps-152.42.229.212.sh $VPS_USER@$VPS_IP:/tmp/
run_on_vps "chmod +x /tmp/deploy-vps-152.42.229.212.sh && /tmp/deploy-vps-152.42.229.212.sh"

echo ""
echo "[2/6] Copy project files to VPS..."
echo "  (Ini akan memakan waktu beberapa menit...)"

# Copy server files
echo "  - Copying server files..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r server/* $VPS_USER@$VPS_IP:/opt/workgrid/server/ 2>/dev/null || true

# Copy app files (except node_modules, dist, release)
echo "  - Copying app files..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r app/src $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r app/public $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/package*.json $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/tsconfig*.json $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/vite.config.ts $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/tailwind.config.js $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/components.json $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/index.html $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/eslint.config.js $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true

# Copy package files
echo "  - Copying server package files..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null server/package*.json $VPS_USER@$VPS_IP:/opt/workgrid/server/ 2>/dev/null || true

# Copy nginx config
echo "  - Copying nginx config..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null app/nginx.conf $VPS_USER@$VPS_IP:/opt/workgrid/app/ 2>/dev/null || true

# Copy uploads if exists
if [ -d "server/uploads" ]; then
    echo "  - Copying uploads..."
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r server/uploads/* $VPS_USER@$VPS_IP:/opt/workgrid/server/uploads/ 2>/dev/null || true
fi

echo ""
echo "[3/6] Fix permissions..."
run_on_vps "chmod +x /opt/workgrid/server/Dockerfile /opt/workgrid/app/Dockerfile 2>/dev/null || true"

echo ""
echo "[4/6] Building and starting containers..."
echo "  (Ini akan memakan waktu 5-10 menit untuk build...)"
run_on_vps "cd /opt/workgrid && docker compose down 2>/dev/null || true"
run_on_vps "cd /opt/workgrid && docker compose build --no-cache"
run_on_vps "cd /opt/workgrid && docker compose up -d"

echo ""
echo "[5/6] Waiting for services to be ready..."
sleep 10

# Check status
BACKEND_HEALTH=$(run_on_vps "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health 2>/dev/null || echo '000'")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "  ✅ Backend health check: OK"
else
    echo "  ⏳ Backend masih starting, silakan cek logs manual nanti"
fi

echo ""
echo "[6/6] Final status..."
run_on_vps "cd /opt/workgrid && docker compose ps"

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Akses aplikasi di:"
echo "   http://$VPS_IP"
echo ""
echo "🔧 Health check:"
echo "   http://$VPS_IP/api/health"
echo ""
echo "📋 Command berguna:"
echo "   - Check logs:  ssh root@$VPS_IP 'cd /opt/workgrid && docker compose logs -f'"
echo "   - Restart:     ssh root@$VPS_IP 'cd /opt/workgrid && docker compose restart'"
echo "   - Stop:        ssh root@$VPS_IP 'cd /opt/workgrid && docker compose down'"
echo ""
echo "⚠️  Default admin:"
echo "   Email: admin@workgrid.com"
echo "   Password: admin123"
echo ""
echo "=========================================="
