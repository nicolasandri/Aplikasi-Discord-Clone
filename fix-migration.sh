#!/bin/bash
# Fix WorkGrid Migration Issues

echo "=== Fix Uploads Directory ==="

# Pastikan folder uploads ada
mkdir -p /opt/workgrid/server/uploads
chmod 777 /opt/workgrid/server/uploads

# Jika pakai Docker, pastikan volume ter-mount
cd /opt/workgrid

# Check docker-compose mounts
echo "=== Checking Docker Volumes ==="
docker inspect workgrid-backend-1 2>/dev/null | grep -A 5 "Mounts" || echo "Checking container..."

# Fix uploads path di docker-compose
if [ -f "docker-compose.prod.yml" ]; then
    # Pastikan uploads volume ter-mount
    if ! grep -q "/app/uploads" docker-compose.prod.yml; then
        echo "Adding uploads volume to docker-compose..."
        sed -i 's|volumes:|volumes:\n      - ./server/uploads:/app/uploads|' docker-compose.prod.yml
    fi
fi

echo "=== Restart Backend ==="
docker compose -f docker-compose.prod.yml restart backend

echo "=== Check Uploads Accessibility ==="
sleep 3
ls -la /opt/workgrid/server/uploads/
docker exec workgrid-backend-1 ls -la /app/uploads/ 2>/dev/null || echo "Checking container path..."

echo "=== Test Upload API ==="
curl -s http://localhost/api/health

echo ""
echo "=== Done! ==="
