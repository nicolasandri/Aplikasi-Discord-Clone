#!/bin/bash
# WorkGrid VPS Setup Script
# Run this on your fresh VPS (Ubuntu 20.04+)

set -e

echo "🚀 Setting up WorkGrid on VPS..."

# Update system
echo "📦 Updating system packages..."
apt-get update && apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx \
    nginx

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Setup firewall
echo "🔥 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp  # Backend API
ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /opt/workgrid
mkdir -p /opt/workgrid/updates
mkdir -p /var/www/workgrid

# Setup fail2ban
echo "🛡️  Configuring fail2ban..."
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
EOF

systemctl restart fail2ban
systemctl enable fail2ban

echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your project to /opt/workgrid"
echo "2. Run: cd /opt/workgrid && docker-compose -f docker-compose.prod.yml up -d"
echo "3. Setup SSL with: certbot --nginx -d your-domain.com"
