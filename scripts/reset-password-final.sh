#!/bin/bash
#
# RESET PASSWORD FINAL
#

echo "========================================"
echo "🔑 RESET PASSWORD"
echo "========================================"
echo ""

cd /opt/workgrid

# Reset password dengan hash yang benar untuk 'admin123'
echo "Resetting admin password..."
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << 'EOF'
-- Update admin password (hash untuk 'admin123')
UPDATE users 
SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G'
WHERE email = 'admin@workgrid.com';

-- Verify
SELECT id, username, email, substr(password, 1, 30) as pwd FROM users WHERE email = 'admin@workgrid.com';
EOF

# Test login dari backend
echo ""
echo "Testing login..."
docker exec discord_clone_backend curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workgrid.com","password":"admin123"}'

echo ""
echo "========================================"
echo "✅ DONE!"
echo "========================================"
echo ""
