# 🚀 WorkGrid Deployment Guide - VPS 152.42.242.180

## Info VPS
- **IP**: 152.42.242.180
- **User**: root
- **Pass**: `%0|F?H@f!berhO3e`

---

## Metode 1: Deploy Otomatis dengan PowerShell

### Step 1: Jalankan Script Deploy

Buka PowerShell di folder project:

```powershell
cd "C:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone"
.\deploy-vps-new.ps1
```

Ikuti instruksi yang muncul.

---

## Metode 2: Deploy Manual (Lebih Reliable)

### Step 1: Setup VPS (SSH ke VPS)

Buka terminal/command prompt dan SSH ke VPS:

```bash
ssh root@152.42.242.180
# Password: %0|F?H@f!berhO3e
```

Jalankan script setup di VPS:

```bash
# Update system
apt-get update -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker root
systemctl enable docker
systemctl start docker
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create directories
mkdir -p /opt/workgrid
mkdir -p /opt/workgrid/updates
mkdir -p /opt/workgrid/certbot/www

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw allow 8080/tcp
ufw --force enable
```

### Step 2: Copy Project Files dari Windows

Di **Windows PowerShell** (bukan di VPS), jalankan:

```powershell
cd "C:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone"

# Create archive
tar -czf $env:TEMP\workgrid.tar.gz --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' --exclude='*.log' .

# Copy to VPS (akan diminta password)
scp $env:TEMP\workgrid.tar.gz root@152.42.242.180:/tmp/

# Cleanup
Remove-Item $env:TEMP\workgrid.tar.gz
```

### Step 3: Extract dan Setup di VPS

Kembali ke **SSH session VPS**, jalankan:

```bash
# Extract files
cd /opt/workgrid
tar -xzf /tmp/workgrid.tar.gz
rm /tmp/workgrid.tar.gz

# Create .env file
cat > .env << 'EOF'
# Database
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432

# JWT Secret (random 48 chars)
JWT_SECRET=YourSuperSecretJWTKeyForProduction123456

# Frontend URL
FRONTEND_URL=http://152.42.242.180

# Node Environment
NODE_ENV=production

# VAPID Keys (optional)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@workgrid.app

# Allowed Origins
ALLOWED_ORIGINS=http://152.42.242.180,http://localhost:5173
EOF
```

### Step 4: Deploy dengan Docker Compose

```bash
cd /opt/workgrid

# Stop existing containers (if any)
docker-compose -f deployment/docker-compose.vps.yml down 2>/dev/null || true

# Build and start
docker-compose -f deployment/docker-compose.vps.yml up --build -d

# Wait for services
sleep 15

# Check status
docker-compose -f deployment/docker-compose.vps.yml ps
```

### Step 5: Verifikasi Deployment

```bash
# Check logs
docker-compose -f deployment/docker-compose.vps.yml logs --tail=50

# Check if services are running
curl http://localhost:3001/health
```

---

## 🌐 Akses Setelah Deploy

| Service | URL |
|---------|-----|
| Web App | http://152.42.242.180 |
| API | http://152.42.242.180/api |
| Socket.IO | ws://152.42.242.180/socket.io |
| Update Server | http://152.42.242.180:8080 |

---

## 🔧 Perintah Berguna

### Melihat Logs
```bash
ssh root@152.42.242.180
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml logs -f
```

### Restart Services
```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml restart
```

### Stop Services
```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml stop
```

### Update Deployment (setelah ada perubahan code)
```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml down
docker-compose -f deployment/docker-compose.vps.yml up --build -d
```

### Backup Database
```bash
docker exec workgrid-db pg_dump -U workgrid workgrid > /opt/workgrid/backup_$(date +%Y%m%d).sql
```

---

## 🛠️ Troubleshooting

### Port 80 sudah digunakan
```bash
# Cek apa yang pakai port 80
ss -tlnp | grep :80

# Stop nginx lokal jika ada
systemctl stop nginx
systemctl disable nginx
```

### Docker permission denied
```bash
usermod -aG docker root
newgrp docker
```

### Database connection error
```bash
# Reset database (WARNING: data hilang!)
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml down -v
docker-compose -f deployment/docker-compose.vps.yml up -d
```

### CORS Error
Edit file `server/server.js` dan tambahkan IP VPS ke allowed origins:
```javascript
const ALLOWED_ORIGINS = [
  'http://152.42.242.180',
  'http://localhost:5173',
  // ...
];
```

Kemudian rebuild:
```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml restart backend
```

---

## 📞 Support

Jika ada masalah, cek logs:
```bash
docker-compose -f deployment/docker-compose.vps.yml logs -f --tail=100
```
