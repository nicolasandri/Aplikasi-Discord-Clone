#!/bin/bash
# Fix Database Connection Issues

echo "🔧 Fixing Database Connection..."
echo "=============================="
cd /opt/workgrid

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Check environment file
echo ""
echo "🔍 Checking environment..."
cat .env

# Ensure proper environment variables
echo ""
echo "🔧 Setting environment variables..."
export NODE_ENV=production
export USE_POSTGRES=true
export DB_HOST=db
export DB_PORT=5432
export DB_NAME=workgrid
export DB_USER=workgrid
export DB_PASSWORD=${DB_PASSWORD:-WorkGridSecurePass123!}

# Stop and rebuild
echo ""
echo "🛑 Stopping containers..."
cd deployment
docker-compose -f docker-compose.vps.yml down

echo ""
echo "🔨 Rebuilding backend..."
docker-compose -f docker-compose.vps.yml build --no-cache backend

echo ""
echo "🚀 Starting containers..."
docker-compose -f docker-compose.vps.yml up -d

echo ""
echo "⏳ Waiting for services..."
sleep 15

echo ""
echo "📊 Status:"
docker-compose -f docker-compose.vps.yml ps

echo ""
echo "📝 Backend logs:"
docker-compose -f docker-compose.vps.yml logs backend --tail=30

echo ""
echo "=============================="
echo "✅ Done!"
