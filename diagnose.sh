#!/bin/bash
# Diagnose WorkGrid Issue

echo "=== Container Status ==="
docker ps -a

echo ""
echo "=== Nginx Logs ==="
docker logs discord_clone_nginx --tail 50

echo ""
echo "=== Check Upstream Containers ==="
docker inspect workgrid-backend-1 --format='{{.NetworkSettings.Networks}}' 2>/dev/null || echo "workgrid-backend-1 not found"
docker inspect workgrid-frontend-1 --format='{{.NetworkSettings.Networks}}' 2>/dev/null || echo "workgrid-frontend-1 not found"

echo ""
echo "=== Network Details ==="
docker network inspect workgrid_discord_network

echo ""
echo "=== Test Direct Access to Backend ==="
docker exec workgrid-backend-1 wget -qO- http://localhost:3001/health 2>/dev/null || echo "Backend health check failed"

echo ""
echo "=== Test Direct Access to Frontend ==="
docker exec workgrid-frontend-1 wget -qO- http://localhost:80 2>/dev/null | head -20 || echo "Frontend check failed"
