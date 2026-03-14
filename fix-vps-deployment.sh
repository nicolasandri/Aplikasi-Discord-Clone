#!/bin/bash

# ============================================
# WorkGrid VPS Deployment Fix Script
# Memperbaiki masalah deployment di VPS
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_IP="103.118.175.196"
VPS_USER="root"
PROJECT_DIR="/opt/workgrid"

echo -e "${BLUE}🚀 WorkGrid VPS Deployment Fix Script${NC}"
echo -e "${BLUE}======================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if we can connect to VPS
check_vps_connection() {
    print_status "Checking VPS connection..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $VPS_USER@$VPS_IP exit 2>/dev/null; then
        print_status "✅ VPS connection successful"
        return 0
    else
        print_error "❌ Cannot connect to VPS. Please check:"
        echo "  - VPS IP: $VPS_IP"
        echo "  - SSH key is configured"
        echo "  - VPS is running"
        return 1
    fi
}

# Function to check Docker on VPS
check_docker() {
    print_status "Checking Docker installation on VPS..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        if command -v docker &> /dev/null; then
            echo "✅ Docker is installed"
            docker --version
        else
            echo "❌ Docker not found. Installing Docker..."
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
            echo "✅ Docker installed successfully"
        fi
        
        if command -v docker-compose &> /dev/null; then
            echo "✅ Docker Compose is installed"
            docker-compose --version
        else
            echo "❌ Docker Compose not found. Installing..."
            apt update
            apt install -y docker-compose-plugin
            echo "✅ Docker Compose installed successfully"
        fi
EOF
}

# Function to create project directory
setup_project_directory() {
    print_status "Setting up project directory on VPS..."
    
    ssh $VPS_USER@$VPS_IP << EOF
        # Create project directory
        mkdir -p $PROJECT_DIR
        cd $PROJECT_DIR
        
        # Set proper permissions
        chown -R root:root $PROJECT_DIR
        chmod -R 755 $PROJECT_DIR
        
        echo "✅ Project directory created: $PROJECT_DIR"
EOF
}

# Function to copy project files to VPS
copy_project_files() {
    print_status "Copying project files to VPS..."
    
    # Create temporary directory for clean files
    TEMP_DIR=$(mktemp -d)
    
    # Copy project files excluding unnecessary directories
    rsync -av --progress \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='app/dist' \
        --exclude='app/release' \
        --exclude='app/android' \
        --exclude='app/electron' \
        --exclude='server/uploads' \
        --exclude='*.log' \
        --exclude='*.pid' \
        --exclude='*.tar' \
        --exclude='*.tar.gz' \
        ./ $TEMP_DIR/
    
    # Copy to VPS
    rsync -av --progress $TEMP_DIR/ $VPS_USER@$VPS_IP:$PROJECT_DIR/
    
    # Cleanup
    rm -rf $TEMP_DIR
    
    print_status "✅ Project files copied successfully"
}

# Function to setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    ssh $VPS_USER@$VPS_IP << EOF
        cd $PROJECT_DIR
        
        # Create .env file if not exists
        if [ ! -f .env ]; then
            cat > .env << 'ENVEOF'
# Database Configuration
DB_PASSWORD=WorkGridSecurePass123!
DB_HOST=db
DB_PORT=5432
DB_NAME=discord_clone
DB_USER=discord_user
DB_SSL=false
USE_POSTGRES=true

# JWT Configuration
JWT_SECRET=\$(openssl rand -base64 64 | tr -d '\n')

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://$VPS_IP
REDIS_URL=redis://redis:6379

# CORS Origins
CORS_ORIGIN=http://$VPS_IP,http://localhost:5173
ENVEOF
            echo "✅ Environment file created"
        else
            echo "✅ Environment file already exists"
        fi
        
        # Set proper permissions
        chmod 600 .env
EOF
}

# Function to fix Docker Compose configuration
fix_docker_compose() {
    print_status "Fixing Docker Compose configuration..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/workgrid
        
        # Use VPS-specific docker-compose file if exists
        if [ -f "deployment/docker-compose.vps.yml" ]; then
            COMPOSE_FILE="deployment/docker-compose.vps.yml"
            echo "✅ Using VPS-specific compose file"
        else
            COMPOSE_FILE="docker-compose.yml"
            echo "✅ Using default compose file"
        fi
        
        # Stop any running containers
        docker-compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
        
        # Remove old images
        docker system prune -f
        
        echo "✅ Docker environment cleaned"
EOF
}

# Function to build and start services
start_services() {
    print_status "Building and starting services..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        cd /opt/workgrid
        
        # Determine compose file
        if [ -f "deployment/docker-compose.vps.yml" ]; then
            COMPOSE_FILE="deployment/docker-compose.vps.yml"
        else
            COMPOSE_FILE="docker-compose.yml"
        fi
        
        echo "Using compose file: $COMPOSE_FILE"
        
        # Build and start services
        docker-compose -f $COMPOSE_FILE build --no-cache
        docker-compose -f $COMPOSE_FILE up -d
        
        echo "✅ Services started"
        
        # Wait for services to be ready
        echo "Waiting for services to start..."
        sleep 30
        
        # Check service status
        docker-compose -f $COMPOSE_FILE ps
EOF
}

# Function to check service health
check_services() {
    print_status "Checking service health..."
    
    ssh $VPS_USER@$VPS_IP << EOF
        cd $PROJECT_DIR
        
        # Determine compose file
        if [ -f "deployment/docker-compose.vps.yml" ]; then
            COMPOSE_FILE="deployment/docker-compose.vps.yml"
        else
            COMPOSE_FILE="docker-compose.yml"
        fi
        
        echo "=== Container Status ==="
        docker-compose -f \$COMPOSE_FILE ps
        
        echo -e "\n=== Service Logs (last 10 lines) ==="
        docker-compose -f \$COMPOSE_FILE logs --tail=10
        
        echo -e "\n=== Health Checks ==="
        
        # Check backend health
        if curl -f http://localhost:3001/health 2>/dev/null; then
            echo "✅ Backend is healthy"
        else
            echo "❌ Backend health check failed"
        fi
        
        # Check frontend
        if curl -f http://localhost/ 2>/dev/null; then
            echo "✅ Frontend is accessible"
        else
            echo "❌ Frontend not accessible"
        fi
        
        # Check database
        if docker-compose -f \$COMPOSE_FILE exec -T db pg_isready -U discord_user 2>/dev/null; then
            echo "✅ Database is ready"
        else
            echo "❌ Database not ready"
        fi
EOF
}

# Function to setup firewall
setup_firewall() {
    print_status "Setting up firewall..."
    
    ssh $VPS_USER@$VPS_IP << 'EOF'
        # Install ufw if not installed
        if ! command -v ufw &> /dev/null; then
            apt update
            apt install -y ufw
        fi
        
        # Reset firewall rules
        ufw --force reset
        
        # Allow SSH
        ufw allow 22/tcp
        
        # Allow HTTP/HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # Allow backend port (for direct API access)
        ufw allow 3001/tcp
        
        # Enable firewall
        ufw --force enable
        
        echo "✅ Firewall configured"
        ufw status
EOF
}

# Function to show final status
show_final_status() {
    print_status "Deployment completed! 🎉"
    echo ""
    echo -e "${GREEN}=== Access URLs ===${NC}"
    echo -e "Web App:     ${BLUE}http://$VPS_IP${NC}"
    echo -e "API:         ${BLUE}http://$VPS_IP/api${NC}"
    echo -e "Direct API:  ${BLUE}http://$VPS_IP:3001${NC}"
    echo ""
    echo -e "${GREEN}=== Useful Commands ===${NC}"
    echo -e "SSH to VPS:  ${YELLOW}ssh $VPS_USER@$VPS_IP${NC}"
    echo -e "Check logs:  ${YELLOW}docker-compose logs -f${NC}"
    echo -e "Restart:     ${YELLOW}docker-compose restart${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}Starting VPS deployment fix...${NC}"
    echo ""
    
    # Check if we can connect to VPS
    if ! check_vps_connection; then
        exit 1
    fi
    
    # Execute deployment steps
    check_docker
    setup_project_directory
    copy_project_files
    setup_environment
    fix_docker_compose
    start_services
    setup_firewall
    check_services
    show_final_status
    
    print_status "✅ VPS deployment fix completed successfully!"
}

# Run main function
main "$@"