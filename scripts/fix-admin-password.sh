#!/bin/bash
#
# FIX ADMIN PASSWORD
#

echo "========================================"
echo "🔧 FIX ADMIN PASSWORD"
echo "========================================"
echo ""

cd /opt/workgrid

# Check current admin user
echo "📋 Current admin user:"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
SELECT id, username, email, is_active, is_master_admin, created_at 
FROM users WHERE email = 'admin@workgrid.com';
"

# Reset password to 'admin123'
echo ""
echo "🔑 Resetting password to 'admin123'..."
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
UPDATE users 
SET password = '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G',
    is_active = TRUE,
    is_master_admin = TRUE
WHERE email = 'admin@workgrid.com';
"

# Verify update
echo ""
echo "✅ Password reset done. Verifying..."
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
SELECT id, username, email, is_active, is_master_admin 
FROM users WHERE email = 'admin@workgrid.com';
"

# Restart backend
echo ""
echo "🔄 Restarting backend..."
docker-compose restart backend
sleep 10

# Test API
echo ""
echo "🧪 Testing API..."
curl -s http://localhost/api/health 2>/dev/null || echo "API not ready"

echo ""
echo "========================================"
echo "✅ DONE!"
echo "========================================"
echo ""
echo "Try login with:"
echo "  Email: admin@workgrid.com"
echo "  Password: admin123"
echo ""
