#!/bin/bash
#
# DEBUG LOGIN ISSUE
#

echo "========================================"
echo "🔍 DEBUG LOGIN"
echo "========================================"
echo ""

cd /opt/workgrid

# Check if admin user exists
echo "1. Checking admin user in database:"
docker exec discord_clone_db psql -U discord_user -d discord_clone -c "
SELECT id, username, email, is_active, is_master_admin, length(password) as pwd_length 
FROM users WHERE email = 'admin@workgrid.com';
"

# Test backend directly
echo ""
echo "2. Testing backend directly:"
docker exec discord_clone_backend curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workgrid.com","password":"admin123"}' 2>/dev/null || echo "Backend test failed"

# Check backend logs for errors
echo ""
echo "3. Backend logs (last 30 lines):"
docker logs --tail=30 discord_clone_backend 2>&1 | grep -E "error|Error|login|auth" | tail -10

# Check nginx config
echo ""
echo "4. Nginx proxy config:"
docker exec discord_clone_nginx cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -A20 "location /api"

# Reset password with plain text (for testing)
echo ""
echo "5. Creating test user with simple password..."
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << 'EOF'
-- Update admin password hash
UPDATE users SET 
    password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G',
    is_active = TRUE,
    is_master_admin = TRUE
WHERE email = 'admin@workgrid.com';

-- Verify
SELECT email, is_active, substr(password, 1, 30) as pwd_preview FROM users WHERE email = 'admin@workgrid.com';
EOF

# Restart backend
echo ""
echo "6. Restarting backend..."
docker restart discord_clone_backend
sleep 10

# Test again
echo ""
echo "7. Testing login after fix..."
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workgrid.com","password":"admin123"}' 2>/dev/null || echo "Test failed"

echo ""
echo "========================================"
echo "✅ DEBUG COMPLETE"
echo "========================================"
echo ""
echo "Try login again: https://workgrid.homeku.net/login"
echo "Email: admin@workgrid.com"
echo "Password: admin123"
echo ""
