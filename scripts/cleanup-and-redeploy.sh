#!/bin/bash
#
# CLEANUP EVERYTHING AND REDEPLOY
# WARNING: This will delete all data!
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}⚠️  WARNING: CLEANUP EVERYTHING${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${YELLOW}This will delete:${NC}"
echo "  - All Docker containers"
echo "  - All Docker volumes (including database)"
echo "  - All Docker networks"
echo "  - /opt/workgrid directory"
echo ""
echo -e "${RED}ALL DATA WILL BE LOST!${NC}"
echo ""

read -p "Are you sure? Type 'yes' to continue: " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}🛑 Stopping all containers...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true

echo -e "${YELLOW}🗑️ Removing all containers...${NC}"
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo -e "${YELLOW}🗑️ Removing all volumes...${NC}"
docker volume rm $(docker volume ls -q) 2>/dev/null || true

echo -e "${YELLOW}🗑️ Removing all networks...${NC}"
docker network prune -f 2>/dev/null || true

echo -e "${YELLOW}🗑️ Removing /opt/workgrid...${NC}"
rm -rf /opt/workgrid

echo -e "${YELLOW}🧹 Cleaning up Docker system...${NC}"
docker system prune -af --volumes 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Now run deploy script:${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "curl -sL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deploy-new-vps.sh | bash"
echo ""
