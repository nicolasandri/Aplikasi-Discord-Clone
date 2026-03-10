#!/bin/bash
# Script untuk update WorkGrid di VPS - Manual Run
# Copy file ini ke VPS dan jalankan: bash update-vps-manual.sh

set -e

echo "🚀 WorkGrid VPS Update Script"
echo "=============================="
echo ""

# Warna untuk output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Deteksi lokasi project
if [ -d "/opt/workgrid" ]; then
    PROJECT_DIR="/opt/workgrid"
elif [ -d "$HOME/Aplikasi-Discord-Clone" ]; then
    PROJECT_DIR="$HOME/Aplikasi-Discord-Clone"
elif [ -d "$HOME/workgrid" ]; then
    PROJECT_DIR="$HOME/workgrid"
else
    echo -e "${RED}❌ Error: Project directory not found!${NC}"
    echo "Pastikan project ada di /opt/workgrid atau ~/Aplikasi-Discord-Clone"
    exit 1
fi

echo -e "${YELLOW}📁 Project directory: $PROJECT_DIR${NC}"
cd $PROJECT_DIR

# Backup current state
echo -e "${YELLOW}💾 Creating backup...${NC}"
BACKUP_DIR="$PROJECT_DIR/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r server $BACKUP_DIR/ 2>/dev/null || true
cp -r app/src $BACKUP_DIR/ 2>/dev/null || true
echo -e "${GREEN}✅ Backup created at $BACKUP_DIR${NC}"

# Pull latest changes from GitHub
echo ""
echo -e "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
git fetch origin
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"

# Check if using Docker or PM2
echo ""
echo -e "${YELLOW}🔍 Detecting deployment method...${NC}"

if command -v docker-compose &> /dev/null && [ -f "$PROJECT_DIR/deployment/docker-compose.vps.yml" ]; then
    echo -e "${YELLOW}🐳 Docker deployment detected${NC}"
    
    echo -e "${YELLOW}🔄 Rebuilding and restarting containers...${NC}"
    docker-compose -f deployment/docker-compose.vps.yml down
    docker-compose -f deployment/docker-compose.vps.yml up --build -d
    
    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Container status:${NC}"
    docker-compose -f deployment/docker-compose.vps.yml ps
    
    echo ""
    echo -e "${YELLOW}📝 Recent logs:${NC}"
    docker-compose -f deployment/docker-compose.vps.yml logs --tail=20

elif command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 PM2 deployment detected${NC}"
    
    # Update backend
    echo -e "${YELLOW}📦 Updating backend...${NC}"
    cd $PROJECT_DIR/server
    npm install
    
    # Update frontend
    echo -e "${YELLOW}📦 Building frontend...${NC}"
    cd $PROJECT_DIR/app
    npm install
    npm run build
    
    # Restart services
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    pm2 restart workgrid-backend || pm2 restart all
    sudo systemctl restart nginx
    
    echo ""
    echo -e "${GREEN}✅ Update complete!${NC}"
    echo ""
    echo -e "${YELLOW}📋 PM2 status:${NC}"
    pm2 status

elif [ -f "/etc/systemd/system/workgrid.service" ]; then
    echo -e "${YELLOW}⚙️  Systemd deployment detected${NC}"
    
    # Update backend
    echo -e "${YELLOW}📦 Updating backend...${NC}"
    cd $PROJECT_DIR/server
    npm install
    
    # Update frontend
    echo -e "${YELLOW}📦 Building frontend...${NC}"
    cd $PROJECT_DIR/app
    npm install
    npm run build
    
    # Restart services
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    sudo systemctl restart workgrid
    sudo systemctl restart nginx
    
    echo ""
    echo -e "${GREEN}✅ Update complete!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Service status:${NC}"
    sudo systemctl status workgrid --no-pager
else
    echo -e "${YELLOW}⚠️  Unknown deployment method. Manual update required.${NC}"
    echo ""
    echo -e "${YELLOW}📋 Manual steps:${NC}"
    echo "1. Update backend: cd $PROJECT_DIR/server && npm install"
    echo "2. Build frontend: cd $PROJECT_DIR/app && npm install && npm run build"
    echo "3. Restart your services (PM2, systemd, or Docker)"
fi

echo ""
echo "=============================="
echo -e "${GREEN}🎉 Update process completed!${NC}"
echo ""
echo -e "${YELLOW}🔗 Your app should be accessible at:${NC}"
echo "   - Web: http://167.172.72.73"
echo "   - API: http://167.172.72.73/api"
echo ""
echo -e "${YELLOW}📖 Troubleshooting:${NC}"
echo "   - Check logs: tail -f $PROJECT_DIR/server/logs/app.log"
echo "   - Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "   - Backup location: $BACKUP_DIR"
