#!/bin/bash
#
# FORCE CLEANUP - No confirmation (DANGEROUS)
# WARNING: This will delete all data without asking!
#

set -e

echo "========================================"
echo "⚠️  FORCE CLEANUP - NO CONFIRMATION"
echo "========================================"
echo ""

echo "🛑 Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "🗑️ Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo "🗑️ Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || true

echo "🗑️ Removing all networks..."
docker network prune -f 2>/dev/null || true

echo "🗑️ Removing /opt/workgrid..."
rm -rf /opt/workgrid 2>/dev/null || true

echo "🧹 Cleaning up Docker system..."
docker system prune -af --volumes 2>/dev/null || true

echo ""
echo "========================================"
echo "✅ CLEANUP COMPLETE!"
echo "========================================"
echo ""
echo "🚀 Now run deploy script:"
echo ""
echo "curl -sL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deploy-new-vps.sh | bash"
echo ""
