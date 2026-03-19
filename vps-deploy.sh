#!/bin/bash

# VPS Deployment Script
# Run this on VPS: bash vps-deploy.sh
# This script pulls the latest code from GitHub and deploys it

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   WorkGrid ModernLogin - VPS Deployment Script            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
REPO_URL="https://github.com/nicolasandri/Aplikasi-Discord-Clone.git"
PROJECT_DIR="/app/workgrid"
APP_DIR="$PROJECT_DIR/app"
DIST_DIR="$APP_DIR/dist"
FRONTEND_DIR="/app/frontend"
BACKUP_DIR="/backup"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📍 Deployment Configuration${NC}"
echo "Repository: $REPO_URL"
echo "Project Directory: $PROJECT_DIR"
echo "Frontend Deployment: $FRONTEND_DIR"
echo ""

# Step 1: Create backup
echo -e "${YELLOW}📦 Step 1: Creating backup of current frontend...${NC}"
if [ -d "$FRONTEND_DIR" ]; then
    BACKUP_NAME="frontend_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r "$FRONTEND_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    echo -e "${GREEN}✓ Backup created: $BACKUP_DIR/$BACKUP_NAME${NC}"
else
    echo -e "${YELLOW}ℹ Frontend directory not found, skipping backup${NC}"
    mkdir -p "$FRONTEND_DIR"
fi
echo ""

# Step 2: Clone or pull repository
echo -e "${YELLOW}📥 Step 2: Pulling latest code from GitHub...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    cd "$PROJECT_DIR"
    echo "Repository exists, pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi
echo -e "${GREEN}✓ Repository updated${NC}"
echo ""

# Step 3: Build the application
echo -e "${YELLOW}🔨 Step 3: Building application (this may take 1-2 minutes)...${NC}"
cd "$APP_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the application
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

# Step 4: Deploy to frontend directory
echo -e "${YELLOW}📤 Step 4: Deploying to frontend directory...${NC}"
rm -rf "$FRONTEND_DIR"
cp -r "$DIST_DIR" "$FRONTEND_DIR"
chmod -R 755 "$FRONTEND_DIR"
echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

# Step 5: Reload nginx
echo -e "${YELLOW}🔄 Step 5: Reloading Nginx...${NC}"
nginx -t > /dev/null 2>&1 && echo "Nginx configuration OK"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# Step 6: Verify deployment
echo -e "${YELLOW}✅ Step 6: Verifying deployment...${NC}"
sleep 2

# Check if files exist
if [ -f "$FRONTEND_DIR/index.html" ]; then
    echo -e "${GREEN}✓ index.html found${NC}"
else
    echo -e "${RED}✗ index.html NOT found${NC}"
    exit 1
fi

if [ -d "$FRONTEND_DIR/assets" ]; then
    FILE_COUNT=$(find "$FRONTEND_DIR/assets" -type f | wc -l)
    echo -e "${GREEN}✓ Assets found ($FILE_COUNT files)${NC}"
else
    echo -e "${RED}✗ Assets directory NOT found${NC}"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}║   ✅ DEPLOYMENT SUCCESSFUL!                             ║${NC}"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}📍 Deployment Summary:${NC}"
echo "   ✓ Code pulled from GitHub"
echo "   ✓ Application built successfully"
echo "   ✓ Frontend deployed to $FRONTEND_DIR"
echo "   ✓ Nginx reloaded"
echo ""

echo -e "${GREEN}🌐 Access your app at:${NC}"
echo "   https://workgrid.homeku.net"
echo "   https://$(hostname -I | awk '{print $1}')"
echo ""

echo -e "${GREEN}📋 Backup Info:${NC}"
echo "   Location: $BACKUP_DIR/"
echo "   List backups: ls -la $BACKUP_DIR/"
echo ""

echo -e "${BLUE}📊 Frontend Status:${NC}"
ls -lh "$FRONTEND_DIR/" | grep -E "^d|^-" | awk '{print "   " $9 " (" $5 ")"}'
echo ""

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Visit https://workgrid.homeku.net to verify"
echo "  2. Check logs if issues: tail -100 /var/log/nginx/error.log"
echo "  3. To rollback: cp -r /backup/frontend_backup_YYYYMMDD_HHMMSS /app/frontend"
echo ""
