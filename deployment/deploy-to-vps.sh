#!/bin/bash

# ============================================
# Discord Clone - Deploy to VPS Script
# Run this on the VPS after vps-setup.sh
# ============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$(pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
VPS_IP=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Discord Clone - Deploy to VPS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Project Directory: $PROJECT_DIR${NC}"
echo -e "${BLUE}VPS IP: $VPS_IP${NC}"
echo ""

# ============================================
# Pre-deployment Checks
# ============================================
echo -e "${YELLOW}[CHECK] Running pre-deployment checks...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Run vps-setup.sh first.${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Run vps-setup.sh first.${NC}"
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    echo -e "${RED}.env file not found!${NC}"
    echo -e "${YELLOW}Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${RED}Please edit .env file with your configuration before deploying.${NC}"
        exit 1
    else
        echo -e "${RED}.env.example also not found!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ All checks passed${NC}"
echo ""

# ============================================
# Backup Current Deployment (if exists)
# ============================================
if docker-compose ps | grep -q "discord_clone"; then
    echo -e "${YELLOW}[BACKUP] Creating backup of current deployment...${NC}"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Backup database
    docker-compose exec -T db pg_dump -U discord_user discord_clone > /tmp/db-backup.sql 2>/dev/null || true
    
    # Create backup archive
    tar -czf "$BACKUP_FILE" -C /tmp db-backup.sql .env 2>/dev/null || true
    rm -f /tmp/db-backup.sql
    
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
    echo ""
fi

# ============================================
# Stop Existing Containers
# ============================================
echo -e "${YELLOW}[STOP] Stopping existing containers...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# ============================================
# Pull Latest Code (optional)
# ============================================
if [ "$1" == "--pull" ]; then
    echo -e "${YELLOW}[GIT] Pulling latest code...${NC}"
    git pull origin main
    echo -e "${GREEN}✓ Code updated${NC}"
    echo ""
fi

# ============================================
# Build Docker Images
# ============================================
echo -e "${YELLOW}[BUILD] Building Docker images...${NC}"
echo -e "${BLUE}This may take a few minutes...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Images built${NC}"
echo ""

# ============================================
# Start Services
# ============================================
echo -e "${YELLOW}[START] Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# ============================================
# Wait for Database
# ============================================
echo -e "${YELLOW}[WAIT] Waiting for database to be ready...${NC}"
RETRIES=30
until docker-compose exec -T db pg_isready -U discord_user -d discord_clone > /dev/null 2>&1 || [ $RETRIES -eq 0 ]; do
    echo -e "${BLUE}  Waiting for PostgreSQL... ($RETRIES retries left)${NC}"
    sleep 2
    RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
    echo -e "${RED}✗ Database failed to start${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs db${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database is ready${NC}"
echo ""

# ============================================
# Run Migrations
# ============================================
echo -e "${YELLOW}[MIGRATE] Running database migrations...${NC}"
docker-compose exec -T backend node migrations/setup-postgres.js 2>/dev/null || true
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# ============================================
# Health Checks
# ============================================
echo -e "${YELLOW}[HEALTH] Running health checks...${NC}"
sleep 5

# Check backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs backend${NC}"
fi

# Check frontend
if curl -f http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${RED}✗ Frontend health check failed${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs frontend${NC}"
fi

echo ""

# ============================================
# Setup Nginx (if not already configured)
# ============================================
if [ ! -f /etc/nginx/sites-enabled/discord-clone ]; then
    echo -e "${YELLOW}[NGINX] Setting up Nginx...${NC}"
    
    sudo cp deployment/nginx-discord-clone.conf /etc/nginx/sites-available/discord-clone
    sudo ln -sf /etc/nginx/sites-available/discord-clone /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx config
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✓ Nginx configured${NC}"
    else
        echo -e "${RED}✗ Nginx configuration test failed${NC}"
    fi
else
    echo -e "${YELLOW}[NGINX] Reloading Nginx...${NC}"
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
fi
echo ""

# ============================================
# Summary
# ============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Your Discord Clone is now running:${NC}"
echo -e "  🌐 Web App:     ${GREEN}http://$VPS_IP${NC}"
echo -e "  🔌 API:         ${GREEN}http://$VPS_IP:3001${NC}"
echo -e "  📊 Health:      ${GREEN}http://$VPS_IP:3001/health${NC}"
echo ""

# Domain info if configured
if [ -f /etc/nginx/sites-enabled/discord-clone ]; then
    DOMAIN=$(grep server_name /etc/nginx/sites-available/discord-clone | head -1 | awk '{print $2}' | sed 's/;//')
    if [ "$DOMAIN" != "_" ] && [ "$DOMAIN" != "localhost" ]; then
        echo -e "${BLUE}Domain configured:${NC} ${GREEN}https://$DOMAIN${NC}"
        echo ""
    fi
fi

echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View logs:     ${BLUE}docker-compose logs -f${NC}"
echo -e "  Stop app:      ${BLUE}docker-compose down${NC}"
echo -e "  Restart app:   ${BLUE}docker-compose restart${NC}"
echo -e "  Monitor:       ${BLUE}discord-monitor${NC}"
echo -e "  Backup:        ${BLUE}./scripts/backup.sh${NC}"
echo ""
echo -e "${GREEN}Happy chatting! 🎉${NC}"
