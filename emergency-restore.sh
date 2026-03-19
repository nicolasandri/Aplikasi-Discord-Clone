#!/bin/bash
# Emergency Restore Script for WorkGrid
# Version: v1.0.0-stable
# Date: 2025-03-15

VPS_IP="152.42.229.212"
BACKUP_FILE="workgrid_20250315_044400_v1.0.0_stable.sql"

echo "🆘 EMERGENCY RESTORE - WorkGrid v1.0.0-stable"
echo "================================================"
echo ""

# Check if running on VPS or local
if [ -f "/opt/workgrid/docker-compose.yml" ]; then
    echo "✅ Detected VPS environment"
    cd /opt/workgrid
    
    echo "🛑 Stopping backend..."
    docker-compose stop backend
    
    echo "📦 Restoring database from stable backup..."
    if [ -f "backups/versions/$BACKUP_FILE" ]; then
        docker exec -i discord_clone_db psql -U discord_user discord_clone < backups/versions/$BACKUP_FILE
        echo "✅ Database restored successfully!"
    else
        echo "❌ Backup file not found: backups/versions/$BACKUP_FILE"
        echo "🔍 Available backups:"
        ls -la backups/versions/
        exit 1
    fi
    
    echo "🚀 Starting backend..."
    docker-compose up -d backend
    
    echo ""
    echo "⏳ Waiting for backend to start..."
    sleep 10
    
    echo "📊 Status check:"
    docker-compose ps
    
    echo ""
    echo "📝 Recent logs:"
    docker logs discord_clone_backend --tail 20
    
    echo ""
    echo "✅ RESTORE COMPLETE!"
    echo "🌐 Test at: http://$VPS_IP"
    echo "🔑 Login: admin@workgrid.com / admin123"
    
else
    echo "⚠️  This script should be run on the VPS"
    echo "📝 Please SSH to the VPS first:"
    echo "   ssh root@$VPS_IP"
    echo ""
    echo "📋 Then run these commands:"
    echo "   cd /opt/workgrid"
    echo "   ./emergency-restore.sh"
fi
