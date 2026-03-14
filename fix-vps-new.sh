#!/bin/bash
# Fix WorkGrid on NEW VPS (103.118.175.196)

cd /opt/workgrid

echo "=== 1. Fix CORS for New IP ==="
# Update environment untuk IP baru
if [ -f ".env" ]; then
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://103.118.175.196|' .env
fi

echo "=== 2. Check and Fix Docker Compose ==="
# Update docker-compose.prod.yml dengan IP baru
if [ -f "docker-compose.prod.yml" ]; then
    # Update FRONTEND_URL
    sed -i 's|FRONTEND_URL: .*|FRONTEND_URL: http://103.118.175.196|' docker-compose.prod.yml
    
    # Update ALLOWED_ORIGINS dengan IP baru
    if grep -q "ALLOWED_ORIGINS" docker-compose.prod.yml; then
        sed -i 's|ALLOWED_ORIGINS: ".*"|ALLOWED_ORIGINS: "http://103.118.175.196,http://localhost:5173"|' docker-compose.prod.yml
    else
        # Tambahkan ALLOWED_ORIGINS
        sed -i 's|FRONTEND_URL: http://103.118.175.196|FRONTEND_URL: http://103.118.175.196\n      ALLOWED_ORIGINS: "http://103.118.175.196,http://localhost:5173"|' docker-compose.prod.yml
    fi
fi

echo "=== 3. Fix Nginx Config ==="
if [ -f "nginx/nginx.conf" ]; then
    # Update server_name dengan IP baru
    sed -i 's|server_name .*|server_name 103.118.175.196 _;|' nginx/nginx.conf
fi

echo "=== 4. Create Uploads Directory ==="
mkdir -p /opt/workgrid/server/uploads
chmod 777 /opt/workgrid/server/uploads

echo "=== 5. Check Volume Mounts ==="
# Pastikan uploads ter-mount di docker-compose
if ! grep -q "uploads:/app/uploads" docker-compose.prod.yml; then
    echo "Fixing uploads volume mount..."
    # Backup dulu
    cp docker-compose.prod.yml docker-compose.prod.yml.bak
    
    # Update volume backend
    sed -i '/volumes:/,/^[^ ]/ {
        /\/var\/www\/discord-clone\/uploads/a\      - /opt/workgrid/server/uploads:/app/uploads
    }' docker-compose.prod.yml
fi

echo "=== 6. Restart Services ==="
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

echo "=== 7. Check Status ==="
sleep 5
docker ps

echo ""
echo "=== Check Uploads ==="
ls -la /opt/workgrid/server/uploads/

echo ""
echo "=== Test API ==="
curl -s http://localhost/api/health | head -20

echo ""
echo "=== DONE! ==="
echo "Akses: http://103.118.175.196"
echo ""
echo "Jika uploads masih 404, copy file uploads dari VPS lama:"
echo "scp -r root@167.172.72.73:/opt/workgrid/server/uploads/* /opt/workgrid/server/uploads/"
