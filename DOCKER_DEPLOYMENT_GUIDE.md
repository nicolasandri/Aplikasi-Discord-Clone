# Docker Deployment Guide - Discord Clone

Panduan lengkap untuk containerize dan deploy Discord Clone ke Proxmox VPS menggunakan Docker.

## 📋 Prerequisites

- Proxmox VPS dengan minimal:
  - **CPU**: 2 cores
  - **RAM**: 4GB
  - **Storage**: 50GB
- **Docker** & **Docker Compose** terinstall
- **Domain** (opsional, untuk HTTPS)
- **SSH access** ke VPS

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/discord-clone.git
cd discord-clone
```

### 2. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Minimal .env configuration:**
```env
DB_PASSWORD=your_secure_password_min_16_chars
JWT_SECRET=your_jwt_secret_min_32_chars
FRONTEND_URL=http://your-vps-ip
```

### 3. Deploy

```bash
# Deploy dengan script
npm run deploy

# Atau manual
docker-compose up --build -d
```

### 4. Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost:3001/health
```

## 📁 Docker Structure

```
.
├── docker-compose.yml              # Development compose
├── docker-compose.prod.yml         # Production compose
├── .env                            # Environment variables
├── .dockerignore                   # Docker ignore rules
├── Dockerfile (root)              # Optional combined Dockerfile
│
├── server/
│   ├── Dockerfile                  # Backend Dockerfile
│   └── .dockerignore
│
├── app/
│   ├── Dockerfile                  # Frontend Dockerfile
│   ├── nginx.conf                  # Nginx config for frontend
│   └── .dockerignore
│
├── nginx/
│   └── nginx.conf                  # Production Nginx config
│
└── scripts/
    ├── deploy.sh                   # Deployment script
    ├── backup.sh                   # Backup script
    ├── restore.sh                  # Restore script
    └── update.sh                   # Update script
```

## 🔧 Services Overview

| Service | Description | Port | Image |
|---------|-------------|------|-------|
| `db` | PostgreSQL database | 5432 | postgres:15-alpine |
| `redis` | Redis cache | 6379 | redis:7-alpine |
| `backend` | Node.js API server | 3001 | Built from source |
| `frontend` | React + Nginx | 80 | Built from source |
| `nginx` | Reverse proxy (prod) | 80, 443 | nginx:alpine |

## 🛠️ Useful Commands

### Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f db

# Restart service
docker-compose restart backend

# Stop all
docker-compose down

# Clean up (include volumes)
docker-compose down -v
```

### Production

```bash
# Deploy production
docker-compose -f docker-compose.prod.yml up -d

# Scale backend replicas
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Update deployment
./scripts/update.sh
```

### Database

```bash
# Backup database
./scripts/backup.sh

# Restore database
./scripts/restore.sh backups/20240115_120000.tar.gz

# Access database console
docker-compose exec db psql -U discord_user -d discord_clone

# Run migration
docker-compose exec backend npm run migrate
```

### Troubleshooting

```bash
# Check container resource usage
docker stats

# Enter container shell
docker-compose exec backend sh
docker-compose exec db sh

# Check network
docker-compose exec backend ping db

# Reset everything (WARNING: data loss)
docker-compose down -v --remove-orphans
docker system prune -a
```

## 🔐 Security Considerations

### 1. Environment Variables

- **Jangan commit** file `.env` ke Git
- Gunakan **strong passwords** (minimal 16 karakter)
- Generate JWT secret yang kuat:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

### 2. Database

- Database hanya bisa diakses dari internal network (tidak di-expose di production)
- PostgreSQL menggunakan non-root user
- Enable SSL untuk production

### 3. Network

- Semua services berada di Docker network isolated
- Hanya port 80/443 dan 3001 yang di-expose
- Rate limiting enabled pada Nginx

### 4. Container Security

- Backend container menggunakan non-root user (`nodejs`)
- Images menggunakan Alpine Linux (minimal surface)
- No unused packages installed

## 📈 Performance Tuning

### Untuk 110 Concurrent Users

**PostgreSQL Configuration (sudah di-set di docker-compose):**
```yaml
command: >
  postgres
  -c max_connections=200
  -c shared_buffers=256MB
  -c effective_cache_size=768MB
  -c max_worker_processes=4
```

**Nginx Configuration:**
- Keepalive connections enabled
- Gzip compression enabled
- Static file caching (1 year)
- Rate limiting (10 req/s API, 5 req/m login)

**Backend Configuration:**
- Connection pool: 25 connections
- 2 replicas untuk load balancing (production)

### Monitoring

```bash
# Real-time stats
docker stats

# Container logs dengan timestamp
docker-compose logs -f --timestamps backend

# Database connections
docker-compose exec db psql -U discord_user -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🔄 Update Deployment

### Method 1: Using Update Script

```bash
./scripts/update.sh
```

### Method 2: Manual Update

```bash
# Pull latest code
git pull origin main

# Backup first
./scripts/backup.sh

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Zero-Downtime Update (Production)

```bash
# Rolling update dengan Docker Swarm
docker stack deploy -c docker-compose.prod.yml discord_clone

# Atau manual rolling:
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
```

## 💾 Backup & Restore

### Automatic Backups (Cron)

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * cd /path/to/discord-clone && ./scripts/backup.sh >> /var/log/discord-backup.log 2>&1

# Weekly cleanup (keep 30 days)
0 3 * * 0 find /path/to/discord-clone/backups -name "*.tar.gz" -mtime +30 -delete
```

### Manual Backup

```bash
# Create backup
./scripts/backup.sh

# Backup file location: backups/YYYYMMDD_HHMMSS.tar.gz
```

### Restore

```bash
# List available backups
ls -lh backups/

# Restore from backup
./scripts/restore.sh backups/20240115_120000.tar.gz
```

## 🌐 Proxmox VPS Deployment

### 1. Create Container/VM di Proxmox

**Recommended specs:**
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 50GB SSD

### 2. Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Add user to docker group
usermod -aG docker $USER
newgrp docker
```

### 3. Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/discord-clone.git
cd discord-clone

# Setup environment
cp .env.example .env
nano .env  # Edit configuration

# Deploy
npm run deploy
```

### 4. Setup Firewall (UFW)

```bash
# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

### 5. Setup Domain (Opsional)

Jika menggunakan domain, tambahkan DNS record:
- Type: A
- Name: @ (atau subdomain)
- Value: Your_VPS_IP

## 🔍 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs service_name

# Check disk space
df -h

# Check memory
free -h
```

### Database connection failed

```bash
# Check if DB is healthy
docker-compose ps

# Check DB logs
docker-compose logs db

# Verify environment variables
docker-compose exec backend env | grep DB_
```

### Port already in use

```bash
# Find process using port
sudo lsof -i :3001
sudo lsof -i :80

# Kill process atau ubah port di docker-compose.yml
```

### Permission denied (uploads)

```bash
# Fix uploads permissions
docker-compose exec backend chmod -R 777 /app/uploads
```

## 📊 Load Testing

Test dengan 110 concurrent users:

```bash
# Install Artillery
npm install -g artillery

# Create test script
cat > load-test.yml << EOF
config:
  target: 'http://your-vps-ip'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Peak load"
    - duration: 60
      arrivalRate: 10
      name: "Cool down"

scenarios:
  - name: "API Requests"
    requests:
      - get:
          url: "/api/servers"
EOF

# Run test
artillery run load-test.yml
```

## 📚 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Proxmox Documentation](https://pve.proxmox.com/wiki/Main_Page)

---

**Siap Deploy! 🚀**

Jika ada masalah, check logs dengan `docker-compose logs -f` dan pastikan environment variables sudah benar.
