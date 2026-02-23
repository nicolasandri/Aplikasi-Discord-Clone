# Discord Clone - VPS Deployment Guide

Panduan lengkap untuk deploy Discord Clone ke Proxmox VPS dengan spesifikasi 4 CPU, 8GB RAM, 100GB SSD.

## 📋 Prerequisites

- Proxmox VPS dengan:
  - **OS**: Ubuntu 22.04 LTS
  - **CPU**: 4 cores
  - **RAM**: 8GB
  - **Disk**: 100GB SSD
  - **IP Publik**: Static IP
- **Domain** (opsional tapi direkomendasikan)
- **SSH Access** ke VPS

## 🚀 Quick Start

### 1. Initial VPS Setup (as root)

SSH ke VPS dan jalankan setup script:

```bash
# Download setup script
curl -fsSL https://raw.githubusercontent.com/nicolasandri/discord-clone/main/deployment/vps-setup.sh -o vps-setup.sh
chmod +x vps-setup.sh
sudo ./vps-setup.sh
```

Atau clone repo dan jalankan:

```bash
git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git
sudo ./Aplikasi-Discord-Clone/deployment/vps-setup.sh
```

### 2. Deploy Application (as deploy user)

```bash
# Switch to deploy user
su - deploy

# Clone repository
git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git
cd Aplikasi-Discord-Clone

# Setup environment
cp .env.example .env
nano .env

# Deploy
./deployment/deploy-to-vps.sh
```

### 3. Setup SSL (Optional tapi direkomendasikan)

Jika Anda memiliki domain:

```bash
sudo ./deployment/setup-ssl.sh
```

## 📁 Deployment Files

```
deployment/
├── README.md                    # This file
├── vps-setup.sh                 # Initial VPS setup
├── deploy-to-vps.sh             # Deploy application
├── setup-ssl.sh                 # SSL certificate setup
├── nginx-discord-clone.conf     # Nginx configuration
└── systemd/                     # Systemd service files (optional)
    └── discord-clone.service
```

## 🔧 Detailed Steps

### Step 1: Create VM di Proxmox

1. Login ke Proxmox Web UI
2. Create VM baru:
   - **Name**: discord-clone
   - **OS**: Ubuntu 22.04 LTS ISO
   - **CPU**: 4 cores
   - **Memory**: 8192 MB (8GB)
   - **Disk**: 100GB (SSD)
   - **Network**: Bridge (vmbr0)
3. Start VM dan install Ubuntu
4. Catat IP address yang diberikan

### Step 2: Initial Server Setup

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Run VPS setup script
./vps-setup.sh
```

Setup script akan:
- Update system
- Install Docker & Docker Compose
- Configure firewall (UFW)
- Install Fail2Ban (security)
- Install Nginx
- Optimize system for Docker
- Create deploy user

### Step 3: Configure Environment

```bash
su - deploy
cd ~/Aplikasi-Discord-Clone

# Copy environment template
cp .env.example .env

# Edit dengan nano atau vim
nano .env
```

**Minimal .env configuration:**

```env
# Database (gunakan password kuat!)
DB_PASSWORD=your_super_secure_password_32_chars_minimum

# JWT Secret (gunakan string random 64+ karakter)
JWT_SECRET=your_jwt_secret_key_64_chars_random_generate_this

# Frontend URL (IP VPS atau domain)
FRONTEND_URL=http://YOUR_VPS_IP
# Atau jika pakai domain:
# FRONTEND_URL=https://your-domain.com

# Node Environment
NODE_ENV=production
```

**Generate strong secrets:**

```bash
# Generate JWT secret
openssl rand -base64 48

# Atau pakai Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Deploy Application

```bash
# Deploy
./deployment/deploy-to-vps.sh

# Atau dengan pull latest code:
./deployment/deploy-to-vps.sh --pull
```

Deploy script akan:
1. Check prerequisites
2. Backup existing deployment
3. Stop old containers
4. Build new images
5. Start services
6. Run database migrations
7. Health checks
8. Setup Nginx

### Step 5: Verify Deployment

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resources
discord-monitor

# Test health endpoint
curl http://localhost:3001/health
```

Access your application:
- **Web**: http://YOUR_VPS_IP
- **API**: http://YOUR_VPS_IP:3001

### Step 6: Setup Domain & SSL (Recommended)

#### 6.1 Configure DNS

Di domain provider Anda, tambahkan DNS record:

```
Type: A
Name: @ (atau subdomain, e.g., discord)
Value: YOUR_VPS_IP
TTL: 3600
```

Tunggu 5-30 menit untuk DNS propagation.

#### 6.2 Update .env

```bash
nano .env
# Update FRONTEND_URL
FRONTEND_URL=https://your-domain.com
```

#### 6.3 Setup SSL

```bash
sudo ./deployment/setup-ssl.sh
```

Masukkan domain name ketika diminta.

## 📊 Resource Optimization untuk 110 Users

### Docker Resources (sudah dikonfigurasi di docker-compose.yml)

```yaml
services:
  db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
      replicas: 2  # Load balancing
  
  frontend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

### PostgreSQL Tuning (sudah dikonfigurasi)

```
max_connections = 200
shared_buffers = 512MB
effective_cache_size = 1536MB
work_mem = 8MB
```

### Nginx Rate Limiting

```nginx
# 10 requests per second untuk API
limit_req zone=api burst=20 nodelay;

# 5 requests per minute untuk login
limit_req zone=login burst=5 nodelay;
```

## 🔒 Security Checklist

- [ ] Firewall enabled (UFW)
- [ ] Fail2Ban configured
- [ ] Strong database password
- [ ] Strong JWT secret
- [ ] SSL certificate installed
- [ ] Nginx rate limiting enabled
- [ ] Docker containers running as non-root
- [ ] Automatic security updates enabled

Enable automatic updates:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 📈 Monitoring & Logging

### Real-time Monitor

```bash
# Built-in monitor script
discord-monitor

# Atau Docker stats
docker stats

# Atau Docker Compose logs
docker-compose logs -f
```

### Log Locations

```
# Application logs
docker-compose logs

# Nginx logs
/var/log/nginx/access.log
/var/log/nginx/error.log

# System logs
/var/log/syslog
```

### Setup Alerting (Opsional)

Install Grafana + Prometheus untuk monitoring visual:

```bash
# Tersedia di deployment/monitoring/
# Lihat README monitoring untuk detail
```

## 💾 Backup & Restore

### Manual Backup

```bash
cd ~/Aplikasi-Discord-Clone
./scripts/backup.sh
```

### Automatic Backup (Cron)

```bash
# Edit crontab
crontab -e

# Tambahkan:
# Backup harian jam 2 pagi
0 2 * * * cd ~/Aplikasi-Discord-Clone && ./scripts/backup.sh >> ~/backup.log 2>&1

# Cleanup backup lama (keep 7 days)
0 3 * * * find ~/Aplikasi-Discord-Clone/backups -name "*.tar.gz" -mtime +7 -delete
```

### Restore from Backup

```bash
# List available backups
ls -lh backups/

# Restore
./scripts/restore.sh backups/20240115_120000.tar.gz
```

## 🔄 Update Deployment

```bash
cd ~/Aplikasi-Discord-Clone

# Pull latest code
git pull origin main

# Deploy update
./deployment/deploy-to-vps.sh --pull
```

## 🐛 Troubleshooting

### Container tidak start

```bash
# Check logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]

# Rebuild specific service
docker-compose up -d --build [service-name]
```

### Database connection error

```bash
# Check database status
docker-compose ps db
docker-compose logs db

# Access database console
docker-compose exec db psql -U discord_user -d discord_clone
```

### Port sudah digunakan

```bash
# Cek port
sudo lsof -i :3001

# Kill process jika perlu
sudo kill -9 [PID]

# Atau ubah port di docker-compose.yml
```

### Out of memory

```bash
# Free memory
sudo sysctl -w vm.drop_caches=3

# Restart containers dengan memory limit
sudo docker-compose down
sudo docker-compose up -d
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Debug Nginx SSL
sudo nginx -t
sudo systemctl status nginx
```

## 🚀 Performance Tuning untuk 110 Concurrent Users

Jika perlu lebih banyak resources:

### Scale Backend

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

### Load Balancing dengan Nginx

```nginx
upstream backend_servers {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    keepalive 32;
}
```

### Database Connection Pool

Sudah dikonfigurasi di `server/config/database.js`:

```javascript
const pool = new Pool({
  max: 25,                    // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

## 📞 Support

Jika mengalami masalah:

1. Check logs: `docker-compose logs -f`
2. Check system resources: `htop` atau `free -h`
3. Check disk space: `df -h`
4. Check network: `netstat -tulpn`

## 📚 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Proxmox Documentation](https://pve.proxmox.com/)

---

**Selamat Deploying! 🚀**

Jika ada pertanyaan, check file `TROUBLESHOOTING.md` atau buka issue di repository.
