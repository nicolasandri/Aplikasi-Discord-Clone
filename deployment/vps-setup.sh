#!/bin/bash

# ============================================
# Discord Clone - VPS Setup Script
# For Proxmox VPS with Ubuntu 22.04 LTS
# Run as root or with sudo
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Discord Clone - VPS Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Get VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')
echo -e "${YELLOW}VPS IP Address: $VPS_IP${NC}"
echo ""

# ============================================
# Step 1: System Update
# ============================================
echo -e "${YELLOW}[1/10] Updating system...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban software-properties-common apt-transport-https ca-certificates gnupg2

# ============================================
# Step 2: Create Deploy User
# ============================================
echo -e "${YELLOW}[2/10] Creating deploy user...${NC}"
if id "deploy" &>/dev/null; then
    echo -e "${GREEN}User 'deploy' already exists${NC}"
else
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    echo -e "${GREEN}User 'deploy' created${NC}"
fi

# ============================================
# Step 3: Install Docker
# ============================================
echo -e "${YELLOW}[3/10] Installing Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}Docker already installed${NC}"
else
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Add deploy user to docker group
    usermod -aG docker deploy
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    echo -e "${GREEN}Docker installed successfully${NC}"
fi

# ============================================
# Step 4: Install Docker Compose
# ============================================
echo -e "${YELLOW}[4/10] Installing Docker Compose...${NC}"
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}Docker Compose already installed${NC}"
else
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Also install as plugin
    mkdir -p /usr/local/lib/docker/cli-plugins
    ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
    
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
fi

# ============================================
# Step 5: Configure Firewall (UFW)
# ============================================
echo -e "${YELLOW}[5/10] Configuring firewall...${NC}"

# Reset UFW to default
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (be careful!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP & HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow WebSocket for Socket.io
ufw allow 3001/tcp comment 'Socket.io WebSocket'

# Enable firewall
ufw --force enable

echo -e "${GREEN}Firewall configured${NC}"
ufw status verbose

# ============================================
# Step 6: Install Fail2Ban
# ============================================
echo -e "${YELLOW}[6/10] Installing Fail2Ban...${NC}"

# Configure Fail2Ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
filter = nginx-noscript
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6
EOF

# Restart Fail2Ban
systemctl restart fail2ban
systemctl enable fail2ban

echo -e "${GREEN}Fail2Ban configured${NC}"

# ============================================
# Step 7: Install Nginx
# ============================================
echo -e "${YELLOW}[7/10] Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}Nginx installed${NC}"

# ============================================
# Step 8: System Optimization for Docker
# ============================================
echo -e "${YELLOW}[8/10] Optimizing system for Docker...${NC}"

# Increase file descriptors
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF

# Kernel parameters for networking
cat >> /etc/sysctl.conf << 'EOF'
# Increase max connections
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65536

# TCP optimizations
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 5000

# Memory settings
vm.swappiness = 10
vm.overcommit_memory = 1
EOF

# Apply sysctl settings
sysctl -p

echo -e "${GREEN}System optimized${NC}"

# ============================================
# Step 9: Setup Log Rotation
# ============================================
echo -e "${YELLOW}[9/10] Setting up log rotation...${NC}"

cat > /etc/logrotate.d/discord-clone << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=100M
    missingok
    delaycompress
    copytruncate
}

/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
EOF

echo -e "${GREEN}Log rotation configured${NC}"

# ============================================
# Step 10: Setup Monitoring Script
# ============================================
echo -e "${YELLOW}[10/10] Setting up monitoring...${NC}"

cat > /usr/local/bin/discord-monitor << 'EOF'
#!/bin/bash
while true; do
    clear
    echo "========================================"
    echo "   Discord Clone VPS Monitor"
    echo "========================================"
    echo "Date: $(date)"
    echo "Uptime: $(uptime -p)"
    echo ""
    
    echo "=== Docker Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"
    echo ""
    
    echo "=== Resource Usage ==="
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "No containers running"
    echo ""
    
    echo "=== System Resources ==="
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
    echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
    echo ""
    
    echo "=== Network Connections ==="
    echo "Active connections: $(netstat -an 2>/dev/null | grep :3001 | grep ESTABLISHED | wc -l)"
    echo ""
    
    sleep 5
done
EOF

chmod +x /usr/local/bin/discord-monitor
echo -e "${GREEN}Monitoring script installed${NC}"

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} VPS Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Switch to deploy user: ${GREEN}su - deploy${NC}"
echo "2. Clone your project: ${GREEN}git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git${NC}"
echo "3. Navigate to project: ${GREEN}cd Aplikasi-Discord-Clone${NC}"
echo "4. Run deployment: ${GREEN}./deployment/deploy-to-vps.sh${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "- Monitor containers: ${GREEN}discord-monitor${NC}"
echo "- Check firewall: ${GREEN}ufw status${NC}"
echo "- View Docker logs: ${GREEN}docker-compose logs -f${NC}"
echo "- Restart services: ${GREEN}docker-compose restart${NC}"
echo ""
echo -e "${GREEN}Your VPS is ready for deployment!${NC}"
