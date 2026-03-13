#!/bin/bash
#
# CREATE USER
#

set -e

echo "========================================"
echo "👤 CREATE USER"
echo "========================================"
echo ""

# Create jebolkasir1 user
echo "Creating jebolkasir1@gmail.com..."
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << 'EOF'
-- Create user jebolkasir1
INSERT INTO users (username, email, password, is_active, status) 
VALUES ('jebolkasir1', 'jebolkasir1@gmail.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', TRUE, 'online')
ON CONFLICT (email) DO UPDATE SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G';

-- Verify
SELECT id, username, email, is_active FROM users WHERE email = 'jebolkasir1@gmail.com';
EOF

echo ""
echo "========================================"
echo "✅ USER CREATED!"
echo "========================================"
echo ""
echo "Email: jebolkasir1@gmail.com"
echo "Password: admin123"
echo ""
