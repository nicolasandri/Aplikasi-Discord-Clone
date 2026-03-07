# 🚀 WorkGrid VPS Deployment Guide

Deploy WorkGrid ke VPS Anda (167.172.72.73) dengan Docker.

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+ (sudah punya: 167.172.72.73)
- SSH access ke VPS
- Domain (optional, bisa pakai IP langsung)

## 🚀 Quick Deploy (Otomatis)

### Step 1: Jalankan Script Deploy

Dari folder project WorkGrid di Windows, buka PowerShell/CMD:

```powershell
cd "C:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone"

# Copy deployment files ke VPS (butuh Git Bash atau WSL)
scp -r deployment root@167.172.72.73:/opt/workgrid/

# Atau pakai Git Bash:
bash deployment/deploy-to-vps.sh root@167.172.72.73
```

### Step 2: Manual Deploy (Jika script tidak jalan)

SSH ke VPS:
```bash
ssh root@167.172.72.73
```

Setup VPS:
```bash
cd /opt/workgrid
chmod +x deployment/setup-vps.sh
bash deployment/setup-vps.sh
```

### Step 3: Copy Project Files

Dari Windows (PowerShell):
```powershell
# Install rsync via Git Bash atau WSL
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' . root@167.172.72.73:/opt/workgrid/
```

Atau manual dengan WinSCP/SCP satu folder.

### Step 4: Start Services

```bash
ssh root@167.172.72.73
cd /opt/workgrid

# Buat environment file
cat > .env << 'EOF'
DB_PASSWORD=WorkGridSecurePass123!
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://167.172.72.73
NODE_ENV=production
EOF

# Build dan jalankan
docker-compose -f deployment/docker-compose.vps.yml up --build -d
```

## 📊 Monitoring

### Check Status
```bash
ssh root@167.172.72.73
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml ps
```

### View Logs
```bash
# All services
docker-compose -f deployment/docker-compose.vps.yml logs -f

# Specific service
docker-compose -f deployment/docker-compose.vps.yml logs -f backend
docker-compose -f deployment/docker-compose.vps.yml logs -f nginx
```

### Restart Services
```bash
docker-compose -f deployment/docker-compose.vps.yml restart
```

## 🔧 Auto-Update Setup

### 1. Setup Update Server

```bash
ssh root@167.172.72.73
bash /opt/workgrid/deployment/setup-auto-update.sh
```

### 2. Publish New Version

Setelah build aplikasi Electron baru:

```bash
# Di Windows, build dulu
cd app
npm run electron:build:win

# Upload ke VPS
scp "release/WorkGrid Setup 1.0.1.exe" root@167.172.72.73:/opt/workgrid/

# SSH ke VPS dan publish
ssh root@167.172.72.73
/opt/workgrid/update-release.sh "/opt/workgrid/WorkGrid Setup 1.0.1.exe" "1.0.1"
```

### 3. Update URL di App

Pastikan `app/package.json` publish URL sudah benar:
```json
"publish": {
  "provider": "generic",
  "url": "http://167.172.72.73:8080",
  "channel": "latest"
}
```

## 🔒 SSL Setup (HTTPS)

### Dengan Domain

Jika punya domain (contoh: workgrid.yourdomain.com):

```bash
ssh root@167.172.72.73

# Install certbot
certbot --nginx -d workgrid.yourdomain.com

# Auto-renewal sudah otomatis
```

Edit `deployment/nginx.vps.conf`, uncomment bagian HTTPS server.

### Tanpa Domain (Self-Signed)

```bash
ssh root@167.172.72.73

# Generate self-signed certificate
mkdir -p /opt/workgrid/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/workgrid/ssl/nginx.key \
  -out /opt/workgrid/ssl/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=167.172.72.73"
```

## 🌐 Access URLs

Setelah deploy berhasil:

| Service | URL |
|---------|-----|
| Web App | http://167.172.72.73 |
| API | http://167.172.72.73/api |
| Socket.IO | ws://167.172.72.73/socket.io |
| Update Server | http://167.172.72.73:8080/latest.yml |

## 🔧 Troubleshooting

### Port 3001 not accessible
```bash
# Check firewall
ufw status

# Open port if needed
ufw allow 3001/tcp
```

### Docker permission denied
```bash
usermod -aG docker root
newgrp docker
```

### Database connection failed
```bash
# Check database container
docker-compose -f deployment/docker-compose.vps.yml logs db

# Reset database (WARNING: data akan hilang!)
docker-compose -f deployment/docker-compose.vps.yml down -v
docker-compose -f deployment/docker-compose.vps.yml up -d
```

### CORS errors
Edit `server/server.js` dan tambahkan IP VPS ke allowed origins:
```javascript
const ALLOWED_ORIGINS = [
  'http://167.172.72.73',
  'http://localhost:5173',
  // ...
];
```

## 📁 File Structure di VPS

```
/opt/workgrid/
├── app/                    # Frontend React
├── server/                 # Backend Node.js
├── nginx/
│   └── nginx.vps.conf     # Nginx config
├── deployment/
│   ├── docker-compose.vps.yml
│   ├── setup-vps.sh
│   └── setup-auto-update.sh
├── updates/               # Auto-update files
│   ├── latest.yml
│   └── latest/
│       └── WorkGrid Setup X.X.X.exe
└── .env                   # Environment variables
```

## 🔄 Backup & Restore

### Backup Database
```bash
ssh root@167.172.72.73
docker exec workgrid-db pg_dump -U workgrid workgrid > /opt/workgrid/backup.sql
```

### Restore Database
```bash
ssh root@167.172.72.73
docker exec -i workgrid-db psql -U workgrid workgrid < /opt/workgrid/backup.sql
```

## 📞 Support

Jika ada masalah, cek logs:
```bash
docker-compose -f deployment/docker-compose.vps.yml logs -f --tail=100
```
