#!/bin/bash
# ============================================
# WorkGrid VPS Setup Script
# Run this on VPS console directly
# ============================================

set -e

echo "============================================"
echo "  WorkGrid VPS Setup"
echo "  IP: $(curl -s ifconfig.me)"
echo "============================================"

# ============================================
# 1. ADD SSH KEY (IMPORTANT!)
# ============================================
echo ""
echo "[1/6] Setting up SSH key..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# SSH Public Key - GANTI DENGAN KEY DARI LOCAL
PUB_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCqKSVx2nhys6IJ4a4UpT5axETbFWObDmO70PsYXRQ8YAITYcPO7IzdwTxkI/c0XlfXFx4gPfR74qcKeoQ3UMTtojroTf9BSMT5pFoNcsPsha88S6mWLmX7BV41yoEzwU2HTedYxJacc4wiDyJNQ2V97j6/33zbvmOWS8BLpr7NFeFz+fTJEy5fIrLoR7CsgBkmKik37Vb6O6oHU8tIPIjvz2wN6LTMVPLLN7zlBT50/Y8M7QMTDTOpmxBu8W0wEAJZD5MmoSSLveujuw8F9H4oftzIDulzgLnfTS+dsrxm6u17KI+4WjrwrXTOYQyu+OBejjTZH9laUt+za236h4JuZ9k1HFRUIOIW22lDJTb4axmVrRsY9vDKzORygvaDfag4bCjL0qbetlwAgERk7gyrM1w7jkdmmAv3P10OuJRimch1rEFHDij1gsBmSs9aqrQT6RTNiSMgYBaI0nxz/ljv1bAseIm494+Ck81bMpkjRiqWHyZU/CYUkiktVO2ptPtQrljG8ZSe41S/HZ9hPGqKLZSz+DzjkS6K5wWmVw52LUzGJZISqsJyLyDWegpvitQd/HJLSGXVGqso8CdzX4yCUd6deW5iPOKYjqmKM/iygCyvWawoZ6lvTSrYY0rcO40VKh8C0CFNrVF1NEtYvWIV9+fHoFayih4WTr5w3nyYkw== workgrid-deploy-20260316"

echo "$PUB_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
echo "SSH Key added successfully!"

# ============================================
# 2. INSTALL DOCKER
# ============================================
echo ""
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed!"
else
    echo "Docker already installed!"
fi

# ============================================
# 3. INSTALL DOCKER COMPOSE
# ============================================
echo ""
echo "[3/6] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "Docker Compose installed!"
else
    echo "Docker Compose already installed!"
fi

# ============================================
# 4. SETUP PROJECT DIRECTORY
# ============================================
echo ""
echo "[4/6] Setting up project directory..."
mkdir -p /opt/workgrid
chmod 755 /opt/workgrid
cd /opt/workgrid

# Create environment file
cat > .env << 'EOF'
# ============================================
# Docker Environment Configuration
# ============================================
DB_PASSWORD=WorkGridDB@Secure2024!
DB_PORT=5432
JWT_SECRET=WG_SecretKey_2024_Random_Ch4r4ct3rs_F0r_S3cur1ty!@#$%^&*()
FRONTEND_URL=http://workgrid.homeku.net
NODE_ENV=production
ALLOWED_ORIGINS=http://workgrid.homeku.net,https://workgrid.homeku.net,http://152.42.242.180,https://152.42.242.180
VAPID_PUBLIC_KEY=BKlTzkEfOlZTNmGlIOYUYFhKqVirXvVXmDDlRIkpgWpGK3Vc1O6YgQz8I8C1QMr6OfdQXcSKd5gAl6pBO_75130
VAPID_PRIVATE_KEY=gfNAVZ4EixhnANxAp4xahC_WEZ_EW4UA-8cpMNHfDoQ
VAPID_SUBJECT=mailto:admin@workgrid.app
EOF

echo "Environment file created!"

# ============================================
# 5. WAIT FOR USER - DEPLOY FILES
# ============================================
echo ""
echo "[5/6] Ready for deployment!"
echo ""
echo "============================================"
echo "  IMPORTANT: Upload files via SFTP now!"
echo "============================================"
echo ""
echo "Please upload these files to VPS:"
echo ""
echo "1. Upload folder 'app/dist' to:"
echo "   /opt/workgrid/app/dist/"
echo ""
echo "2. Upload folder 'server/uploads' to:"
echo "   /opt/workgrid/server/uploads/"
echo ""
echo "3. Upload files:"
echo "   - docker-compose.vps.yml -> /opt/workgrid/"
echo "   - nginx/nginx.conf -> /opt/workgrid/nginx/"
echo ""
echo "============================================"
echo ""

# Create directories
mkdir -p /opt/workgrid/app/dist
mkdir -p /opt/workgrid/server/uploads
mkdir -p /opt/workgrid/nginx

echo "Directories created. Waiting for files..."
echo ""
read -p "Press ENTER after uploading all files..."

# ============================================
# 6. DEPLOY
# ============================================
echo ""
echo "[6/6] Deploying WorkGrid..."
cd /opt/workgrid

# Stop existing containers
docker-compose -f docker-compose.vps.yml down 2>/dev/null || true

# Start containers
docker-compose -f docker-compose.vps.yml up -d

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Health check
echo ""
echo "Health Check:"
curl -s http://localhost/api/health | head -1 || echo "Health check failed"

echo ""
echo "============================================"
echo "  SETUP COMPLETED!"
echo "============================================"
echo ""
echo "Access your app:"
echo "  - http://$(curl -s ifconfig.me)"
echo "  - http://workgrid.homeku.net (after DNS setup)"
echo ""
echo "Check logs:"
echo "  docker-compose -f docker-compose.vps.yml logs -f"
echo ""
echo "============================================"
