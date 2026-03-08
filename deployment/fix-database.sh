#!/bin/bash
# Fix Database Issues

set -e

echo "🔧 Fixing Database..."
cd /opt/workgrid/deployment

# Stop all containers
docker-compose -f docker-compose.vps.yml down

# Remove old volumes (WARNING: data will be lost!)
docker volume rm deployment_postgres_data 2>/dev/null || true

# Start only database first
docker-compose -f docker-compose.vps.yml up -d db

# Wait for database
echo "⏳ Waiting for database..."
sleep 10

# Check database logs
docker-compose -f docker-compose.vps.yml logs db

# Start remaining services
docker-compose -f docker-compose.vps.yml up -d

echo "✅ Done!"
