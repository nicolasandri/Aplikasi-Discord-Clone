#!/bin/bash

# ============================================
# Discord Clone - Deployment Script
# Usage: ./scripts/deploy.sh
# ============================================

set -e  # Exit on error

echo "🚀 Discord Clone Deployment"
echo "========================================"

# Warna untuk output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fungsi untuk print dengan warna
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker tidak ditemukan. Silakan install Docker terlebih dahulu."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose tidak ditemukan. Silakan install Docker Compose."
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        print_warning "File .env tidak ditemukan, menyalin dari .env.example"
        cp .env.example .env
        print_warning "Silakan edit file .env dan sesuaikan konfigurasi sebelum melanjutkan"
        exit 1
    else
        print_error "File .env dan .env.example tidak ditemukan"
        exit 1
    fi
fi

# Optional: Pull latest code
if [ "$1" == "--pull" ]; then
    echo ""
    echo "📥 Pulling latest code..."
    git pull origin main || print_warning "Gagal pull code, melanjutkan dengan code yang ada"
fi

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose build --no-cache

# Start containers
echo ""
echo "▶️  Starting containers..."
docker-compose up -d

# Wait for database to be ready
echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check database health
RETRIES=30
until docker-compose exec -T db pg_isready -U discord_user -d discord_clone > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo "   Waiting for database... $RETRIES retries left"
    sleep 2
    RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
    print_error "Database tidak ready dalam waktu yang ditentukan"
    exit 1
fi
print_success "Database is ready"

# Initialize database schema if needed
echo ""
echo "🗄️  Checking database schema..."
docker-compose exec -T backend node migrations/setup-postgres.js || print_warning "Schema setup may have already been run"

# Check health
echo ""
echo "🔍 Checking services health..."
sleep 5

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_success "Backend is healthy"
else
    print_error "Backend is not responding"
    docker-compose logs backend --tail=50
    exit 1
fi

# Check frontend
if curl -f http://localhost > /dev/null 2>&1; then
    print_success "Frontend is healthy"
else
    print_error "Frontend is not responding"
    docker-compose logs frontend --tail=50
    exit 1
fi

# Show status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "========================================"
print_success "Deployment complete! 🎉"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost"
echo "   API:      http://localhost:3001"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Backup:       ./scripts/backup.sh"
echo ""
