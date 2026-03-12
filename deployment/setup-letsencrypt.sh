#!/bin/bash
#
# Let's Encrypt SSL Auto-Setup Script for WorkGrid
# Usage: sudo ./setup-letsencrypt.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="workgrid.homeku.net"
EMAIL="admin@workgrid.homeku.net"
PROJECT_DIR="/opt/workgrid"
COMPOSE_FILE="$PROJECT_DIR/deployment/docker-compose.vps.yml"

# Functions
print_header() {
    echo -e "${BLUE}========================================="
    echo -e "$1"
    echo -e "=========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "Please run as root or with sudo"
        exit 1
    fi
}

# Check domain resolution
check_domain() {
    print_header "Checking Domain Resolution"
    
    DOMAIN_IP=$(dig +short $DOMAIN | head -n 1)
    SERVER_IP=$(curl -s ifconfig.me)
    
    print_info "Domain: $DOMAIN"
    print_info "Domain resolves to: $DOMAIN_IP"
    print_info "Server IP: $SERVER_IP"
    
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        print_error "Domain $DOMAIN does not point to this server!"
        print_warning "Expected: $SERVER_IP"
        print_warning "Got: $DOMAIN_IP"
        print_info "Please update your DNS settings and wait for propagation (5-30 minutes)"
        
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Domain correctly points to this server"
    fi
}

# Install certbot
install_certbot() {
    print_header "Installing Certbot"
    
    if command -v certbot &> /dev/null; then
        print_success "Certbot already installed ($(certbot --version))"
    else
        print_info "Installing certbot..."
        apt update -qq
        apt install -y -qq certbot
        print_success "Certbot installed successfully"
    fi
}

# Check project directory
check_project() {
    print_header "Checking Project Directory"
    
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    print_success "Project directory found: $PROJECT_DIR"
    
    # Check if docker-compose exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    print_success "Docker compose file found"
}

# Create certbot directories
setup_certbot_dirs() {
    print_header "Setting up Certbot Directories"
    
    mkdir -p "$PROJECT_DIR/certbot/conf"
    mkdir -p "$PROJECT_DIR/certbot/www"
    
    print_success "Certbot directories created"
}

# Stop nginx container
stop_nginx() {
    print_header "Stopping Nginx Container"
    
    cd "$PROJECT_DIR"
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "workgrid-nginx"; then
        docker-compose -f "$COMPOSE_FILE" stop nginx
        print_success "Nginx container stopped"
        
        # Wait a moment to ensure port is free
        sleep 2
        
        # Verify port 80 is free
        if lsof -i :80 | grep -q LISTEN; then
            print_warning "Port 80 is still in use by another process"
            print_info "Killing process using port 80..."
            fuser -k 80/tcp || true
            sleep 1
        fi
    else
        print_warning "Nginx container not running, skipping stop"
    fi
}

# Generate certificate
generate_certificate() {
    print_header "Generating SSL Certificate"
    
    print_info "Requesting certificate from Let's Encrypt..."
    print_info "Domain: $DOMAIN"
    print_info "Email: $EMAIL"
    
    if certbot certonly --standalone \
        -d "$DOMAIN" \
        --agree-tos \
        -m "$EMAIL" \
        --non-interactive \
        --preferred-challenges http; then
        
        print_success "Certificate generated successfully!"
        print_info "Certificate path: /etc/letsencrypt/live/$DOMAIN/"
    else
        print_error "Failed to generate certificate"
        
        # Try to start nginx back
        start_nginx
        
        exit 1
    fi
}

# Copy certificates to project
copy_certificates() {
    print_header "Copying Certificates to Project"
    
    # Backup existing certs if any
    if [ -d "$PROJECT_DIR/certbot/conf/live" ]; then
        BACKUP_DIR="$PROJECT_DIR/certbot/backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r "$PROJECT_DIR/certbot/conf" "$BACKUP_DIR/"
        print_info "Existing certificates backed up to: $BACKUP_DIR"
    fi
    
    # Copy new certs
    rsync -av /etc/letsencrypt/ "$PROJECT_DIR/certbot/conf/" \
        --exclude=archive \
        --exclude=keys \
        --exclude=renewal-hooks
    
    # Set permissions
    chmod -R 755 "$PROJECT_DIR/certbot"
    chmod 644 "$PROJECT_DIR/certbot/conf/live"/*/fullchain.pem
    chmod 600 "$PROJECT_DIR/certbot/conf/live"/*/privkey.pem
    
    print_success "Certificates copied successfully"
}

# Start nginx container
start_nginx() {
    print_header "Starting Nginx Container"
    
    cd "$PROJECT_DIR"
    
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "workgrid-nginx"; then
        docker-compose -f "$COMPOSE_FILE" up -d nginx
        print_success "Nginx container started"
    else
        docker-compose -f "$COMPOSE_FILE" start nginx
        print_success "Nginx container resumed"
    fi
    
    # Wait for nginx to be ready
    sleep 3
}

# Setup auto-renewal
setup_autorenewal() {
    print_header "Setting up Auto-Renewal"
    
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "certbot renew" | crontab - 2>/dev/null || true
    
    # Add new cron job
    CRON_JOB="0 2 * * * /usr/bin/certbot renew --quiet --deploy-hook 'cd $PROJECT_DIR && docker-compose -f $COMPOSE_FILE restart nginx'"
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    
    print_success "Auto-renewal configured (daily at 2:00 AM)"
}

# Test HTTPS
test_https() {
    print_header "Testing HTTPS"
    
    print_info "Waiting for nginx to be ready..."
    sleep 5
    
    # Test from local
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" --insecure 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        print_success "HTTPS is working (HTTP $HTTP_CODE)"
    else
        print_warning "Could not verify HTTPS (HTTP $HTTP_CODE)"
        print_info "This might be normal if the app redirects to login"
    fi
    
    # Check SSL certificate
    CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo "")
    
    if [ -n "$CERT_INFO" ]; then
        print_success "SSL certificate is valid"
        print_info "$CERT_INFO"
    else
        print_warning "Could not verify SSL certificate"
    fi
}

# Update environment variables
update_env() {
    print_header "Updating Environment Variables"
    
    ENV_FILE="$PROJECT_DIR/.env"
    
    if [ -f "$ENV_FILE" ]; then
        # Backup original
        cp "$ENV_FILE" "$ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"
        
        # Update FRONTEND_URL
        if grep -q "^FRONTEND_URL=" "$ENV_FILE"; then
            sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$ENV_FILE"
        else
            echo "FRONTEND_URL=https://$DOMAIN" >> "$ENV_FILE"
        fi
        
        # Update ALLOWED_ORIGINS
        if grep -q "^ALLOWED_ORIGINS=" "$ENV_FILE"; then
            sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN|" "$ENV_FILE"
        else
            echo "ALLOWED_ORIGINS=https://$DOMAIN,http://$DOMAIN" >> "$ENV_FILE"
        fi
        
        print_success "Environment variables updated"
        
        # Restart backend
        print_info "Restarting backend container..."
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" restart backend
        print_success "Backend restarted"
    else
        print_warning ".env file not found, skipping environment update"
    fi
}

# Print final summary
print_summary() {
    print_header "SSL Setup Complete!"
    
    echo -e "${GREEN}========================================="
    echo -e "🎉 Let's Encrypt SSL Successfully Setup!"
    echo -e "=========================================${NC}"
    echo ""
    echo -e "${BLUE}📋 Summary:${NC}"
    echo -e "  Domain:    https://$DOMAIN"
    echo -e "  Certificate: /etc/letsencrypt/live/$DOMAIN/"
    echo -e "  Auto-renewal: Enabled (daily at 2:00 AM)"
    echo ""
    echo -e "${BLUE}📊 Certificate Info:${NC}"
    openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" -noout -subject -dates 2>/dev/null || true
    echo ""
    echo -e "${BLUE}🧪 Test Commands:${NC}"
    echo -e "  curl -I https://$DOMAIN"
    echo -e "  openssl s_client -connect $DOMAIN:443 </dev/null"
    echo ""
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "  Manual renew:     certbot renew --force-renewal"
    echo -e "  Test renew:       certbot renew --dry-run"
    echo -e "  Restart nginx:    docker-compose -f $COMPOSE_FILE restart nginx"
    echo -e "  View logs:        docker-compose -f $COMPOSE_FILE logs nginx"
    echo ""
    echo -e "${YELLOW}⚠️  Important:${NC}"
    echo -e "  - Make sure to test the site in your browser"
    echo -e "  - Check SSL grade at: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo -e "  - Backup your certificates regularly"
    echo ""
    echo -e "${GREEN}✅ Setup complete! Enjoy your secure WorkGrid instance!${NC}"
}

# Main function
main() {
    echo -e "${BLUE}"
    echo "██╗    ██╗███████╗██████╗  ██████╗ ██████╗ ██╗██████╗ "
    echo "██║    ██║██╔════╝██╔══██╗██╔════╝ ██╔══██╗██║██╔══██╗"
    echo "██║ █╗ ██║█████╗  ██████╔╝██║  ███╗██████╔╝██║██║  ██║"
    echo "██║███╗██║██╔══╝  ██╔══██╗██║   ██║██╔══██╗██║██║  ██║"
    echo "╚███╔███╔╝███████╗██║  ██║╚██████╔╝██║  ██║██║██████╔╝"
    echo " ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝ "
    echo -e "${NC}"
    echo "Let's Encrypt SSL Auto-Setup for WorkGrid"
    echo ""
    
    check_root
    check_domain
    install_certbot
    check_project
    setup_certbot_dirs
    stop_nginx
    generate_certificate
    copy_certificates
    start_nginx
    setup_autorenewal
    test_https
    update_env
    print_summary
}

# Run main function
main "$@"
