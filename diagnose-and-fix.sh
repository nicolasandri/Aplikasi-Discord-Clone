#!/bin/bash
# Diagnose dan Fix WorkGrid VPS Baru

echo "=== DIAGNOSE WORKGRID ==="

echo ""
echo "1. Check Docker Containers:"
docker ps -a

echo ""
echo "2. Check Port 80:"
sudo netstat -tlnp | grep :80 || echo "Port 80 not listening"

echo ""
echo "3. Check Docker Networks:"
docker network ls

echo ""
echo "4. Check nginx container logs:"
docker logs discord_clone_nginx 2>/dev/null || echo "Container discord_clone_nginx not found"

echo ""
echo "5. Check frontend container:"
docker logs workgrid-frontend-1 2>/dev/null || echo "Container workgrid-frontend-1 not found"

echo ""
echo "6. Check if docker-compose is running:"
cd /opt/workgrid
docker compose -f docker-compose.prod.yml ps

echo ""
echo "=== FIXING ==="

echo ""
echo "7. Start/Restart all services:"
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "8. Wait 10 seconds..."
sleep 10

echo ""
echo "9. Check status after restart:"
docker ps

echo ""
echo "10. Test local connection:"
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://localhost

echo ""
echo "=== DONE ==="
