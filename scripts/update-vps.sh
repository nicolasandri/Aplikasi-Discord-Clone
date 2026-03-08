#!/bin/bash
# ============================================
# Script Update VPS dari GitHub
# Jalankan di VPS: bash update-vps.sh
# ============================================

set -e

DEPLOY_DIR="/opt/workgrid/deployment"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=============================="
echo " WorkGrid - Update dari GitHub"
echo "=============================="

# 1. Masuk ke direktori deployment
cd "$DEPLOY_DIR"
echo "[1/5] Direktori: $DEPLOY_DIR"

# 2. Pull perubahan terbaru dari GitHub
echo "[2/5] Pull dari GitHub..."
git pull origin main
echo "✓ Code terbaru berhasil diambil"

# 3. Rebuild image frontend saja (yang kita ubah)
echo "[3/5] Build ulang Docker image frontend..."
docker-compose -f "$COMPOSE_FILE" build --no-cache frontend
echo "✓ Image frontend berhasil dibuild"

# 4. Restart frontend container
echo "[4/5] Restart frontend container..."
docker-compose -f "$COMPOSE_FILE" up -d --no-deps frontend
echo "✓ Frontend container berjalan"

# 5. Cek status semua container
echo "[5/5] Status container:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "=============================="
echo " Update selesai! ✓"
echo " Buka: https://workgrid.homeku.net"
echo "=============================="
