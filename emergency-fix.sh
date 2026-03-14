#!/bin/bash
# EMERGENCY FIX - WorkGrid VPS

echo "=== EMERGENCY FIX ==="

cd /opt/workgrid

echo ""
echo "1. STOP & REMOVE ALL CONTAINERS"
docker stop $(docker ps -aq) 2>/dev/null
docker rm $(docker ps -aq) 2>/dev/null

echo ""
echo "2. REMOVE UNUSED IMAGES & VOLUMES"
docker system prune -af --volumes

echo ""
echo "3. CHECK NETWORK"
docker network ls
NETWORK=$(docker network ls | grep discord | awk '{print $2}' | head -1)
if [ -z "$NETWORK" ]; then
    echo "Creating network..."
    docker network create workgrid_discord_network
    NETWORK="workgrid_discord_network"
fi
echo "Using network: $NETWORK"

echo ""
echo "4. START DATABASE & REDIS"
docker compose -f docker-compose.prod.yml up -d db redis

echo ""
echo "5. WAIT FOR DB"
sleep 10

echo ""
echo "6. START BACKEND"
docker compose -f docker-compose.prod.yml up -d backend

echo ""
echo "7. CHECK BACKEND HEALTH"
sleep 5
curl http://localhost:3001/health || echo "Backend not ready yet"

echo ""
echo "8. CREATE STATIC FRONTEND"
mkdir -p /opt/workgrid/html
cat > /opt/workgrid/html/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <title>WorkGrid</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a1a2e; color: white; }
        h1 { color: #00d4aa; }
        .status { padding: 20px; background: #16213e; border-radius: 10px; margin: 20px; }
    </style>
</head>
<body>
    <h1>🚀 WorkGrid</h1>
    <div class="status">
        <h2>Server Online!</h2>
        <p>Backend API: <span id="api">Checking...</span></p>
        <p>Frontend akan segera tersedia.</p>
    </div>
    <script>
        fetch('/api/health')
            .then(r => r.ok ? '✅ Online' : '❌ Error')
            .then(status => document.getElementById('api').innerText = status)
            .catch(() => document.getElementById('api').innerText = '❌ Offline');
    </script>
</body>
</html>
HTMLEOF

echo ""
echo "9. CREATE NGINX CONFIG"
mkdir -p /opt/workgrid/nginx
cat > /opt/workgrid/nginx/nginx.conf << 'NGINXEOF'
upstream backend {
    server discord_clone_backend:3001;
}

server {
    listen 80;
    server_name 103.118.175.196 _;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
    
    location /uploads {
        proxy_pass http://backend;
    }
}
NGINXEOF

echo ""
echo "10. START NGINX"
docker run -d \
  --name discord_clone_nginx \
  --restart always \
  -p 80:80 \
  -v /opt/workgrid/html:/usr/share/nginx/html:ro \
  -v /opt/workgrid/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  --network $NETWORK \
  nginx:alpine

echo ""
echo "11. CHECK ALL SERVICES"
sleep 3
docker ps

echo ""
echo "12. TEST CONNECTION"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost
curl -s http://localhost | head -5

echo ""
echo "=== DONE ==="
echo "Akses: http://103.118.175.196"
