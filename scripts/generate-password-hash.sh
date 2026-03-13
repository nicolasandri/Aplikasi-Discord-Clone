#!/bin/bash
#
# GENERATE PASSWORD HASH
#

echo "========================================"
echo "🔑 GENERATE PASSWORD HASH"
echo "========================================"
echo ""

# Generate hash untuk 'admin123' menggunakan Node.js
echo "Generating hash for 'admin123'..."
HASH=$(docker exec discord_clone_backend node -e "
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(12);
const hash = bcrypt.hashSync('admin123', salt);
console.log(hash);
" 2>/dev/null)

echo "Generated hash: $HASH"

# Update database
echo ""
echo "Updating database..."
docker exec -i discord_clone_db psql -U discord_user -d discord_clone << EOF
UPDATE users SET password = '$HASH' WHERE email = 'admin@workgrid.com';
UPDATE users SET password = '$HASH' WHERE email = 'admin2@workgrid.com';
SELECT email, substr(password, 1, 30) FROM users WHERE email LIKE 'admin%';
EOF

echo ""
echo "Testing login..."
docker exec discord_clone_backend curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workgrid.com","password":"admin123"}'

echo ""
echo "========================================"
echo "✅ DONE!"
echo "========================================"
