#!/bin/bash
# Fix permissions untuk uploads

echo "=== Fix Uploads Permissions ==="

# Cek current user
echo "Current user: $(whoami)"

# Fix ownership (gunakan sudo)
sudo chown -R $(whoami):$(whoami) /opt/workgrid/server/uploads/
sudo chmod -R 755 /opt/workgrid/server/uploads/

echo "=== Check Ownership ==="
ls -la /opt/workgrid/server/uploads/ | head -5

echo ""
echo "=== Fix Environment ==="
cd /opt/workgrid

# Pastikan .env ada dan benar
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DB_PASSWORD=WorkGridSecurePass123!
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://103.118.175.196
NODE_ENV=production
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
EOF
else
    echo "Updating FRONTEND_URL in .env..."
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://103.118.175.196|' .env
fi

echo "=== Check .env ==="
cat .env | grep FRONTEND_URL

echo ""
echo "=== Restart Backend ==="
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Check Status ==="
sleep 3
docker ps
curl -s http://localhost/api/health
