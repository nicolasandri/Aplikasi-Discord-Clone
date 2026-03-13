#!/bin/bash
#
# FIX DOMAIN CONNECTION SCRIPT
# Script ini memperbaiki koneksi domain ke WorkGrid
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="workgrid.homeku.net"
PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 FIX DOMAIN CONNECTION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Harus dijalankan sebagai root!${NC}"
    exit 1
fi

echo -e "${YELLOW}🔍 Step 1: Cek status container...${NC}"
cd $PROJECT_DIR
docker-compose ps

echo ""
echo -e "${YELLOW}🔍 Step 2: Open firewall ports...${NC}"
# Open ports
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp

# Cek status ufw
echo -e "${YELLOW}   Status Firewall:${NC}"
ufw status | grep -E "80|443|3001" || echo "   Ports not found in ufw"

echo ""
echo -e "${YELLOW}🔍 Step 3: Cek DNS resolution...${NC}"
IP_FROM_DNS=$(dig +short $DOMAIN)
echo "   Domain: $DOMAIN"
echo "   IP dari DNS: $IP_FROM_DNS"
echo "   IP VPS ini: $(curl -s ifconfig.me 2>/dev/null || echo 'tidak terdeteksi')"

echo ""
echo -e "${YELLOW}🔍 Step 4: Cek apakah port 80 dan 443 terbuka...${NC}"
netstat -tlnp | grep -E ":80|:443" || ss -tlnp | grep -E ":80|:443" || echo "   No services on 80/443"

echo ""
echo -e "${YELLOW}📝 Step 5: Update .env untuk domain...${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    # Backup dulu
    cp $PROJECT_DIR/.env $PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update FRONTEND_URL
    if grep -q "FRONTEND_URL=" $PROJECT_DIR/.env; then
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" $PROJECT_DIR/.env
    else
        echo "FRONTEND_URL=https://$DOMAIN" >> $PROJECT_DIR/.env
    fi
    
    # Update ALLOWED_ORIGINS
    if grep -q "ALLOWED_ORIGINS=" $PROJECT_DIR/.env; then
        sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN,http://165.245.187.155|" $PROJECT_DIR/.env
    else
        echo "ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN,http://165.245.187.155" >> $PROJECT_DIR/.env
    fi
    
    echo -e "${GREEN}   ✅ .env updated${NC}"
else
    echo -e "${RED}   ⚠️ .env file not found${NC}"
fi

echo ""
echo -e "${YELLOW}🚀 Step 6: Restart services dengan HTTP (tanpa SSL dulu)...${NC}"
cd $PROJECT_DIR

# Stop semua
docker-compose down 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true

# Start dengan docker-compose biasa (HTTP)
docker-compose up -d

# Tunggu services start
sleep 5

echo ""
echo -e "${YELLOW}📋 Step 7: Status setelah restart...${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}🧪 Step 8: Test akses lokal...${NC}"
curl -s -o /dev/null -w "%{http_code}" http://localhost:80 && echo " - localhost:80 OK" || echo " - localhost:80 FAILED"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health && echo " - backend:3001 OK" || echo " - backend:3001 FAILED"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📋 Coba akses:"
echo -e "   ${YELLOW}http://$DOMAIN${NC} (HTTP - harusnya work)"
echo -e "   ${YELLOW}http://165.245.187.155${NC} (HTTP - harusnya work)"
echo ""
echo -e "🔒 Untuk SSL/HTTPS, jalankan:"
echo -e "   ${YELLOW}curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/scripts/vps-ssl-install.sh | bash${NC}"
echo ""
