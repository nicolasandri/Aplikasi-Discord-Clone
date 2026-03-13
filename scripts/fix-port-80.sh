#!/bin/bash
#
# KILL ALL SERVICES USING PORT 80
#

set -e

echo "🔪 Killing all services using port 80..."

# Find and kill processes on port 80
echo "   Finding processes on port 80..."
fuser -k 80/tcp 2>/dev/null || true

# Stop nginx service
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# Stop apache
systemctl stop apache2 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true

# Kill any docker containers using port 80
docker stop $(docker ps -q --filter "publish=80") 2>/dev/null || true

# Force kill any remaining
PIDS=$(lsof -t -i:80 2>/dev/null || echo "")
if [ ! -z "$PIDS" ]; then
    echo "   Force killing PIDs: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
fi

# Check again
echo "   Checking port 80 again..."
sleep 2
if lsof -i :80 2>/dev/null; then
    echo "   ⚠️  Port 80 still in use!"
else
    echo "   ✅ Port 80 is now free!"
fi
