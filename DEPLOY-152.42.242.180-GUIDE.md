# 🚀 Deploy WorkGrid ke VPS 152.42.242.180

Panduan lengkap deploy WorkGrid (Discord Clone) ke VPS baru Anda.

## 📋 Informasi VPS

| Property | Value |
|----------|-------|
| IP Address | `152.42.242.180` |
| Username | `root` |
| Password | `%0\|F?H@f!berhO3e` |
| Install Dir | `/opt/workgrid` |

---

## ⚡ CARA 1: Deploy Otomatis (Cepat)

### Step 1: Jalankan Script Deploy

Buka **PowerShell sebagai Administrator** di folder project:

```powershell
cd "C:\Users\PC\Downloads\PROJECT TEAMCHAT\Aplikasi Discord Clone"
```

Lalu jalankan:

```powershell
# Jika punya sshpass (install via Git Bash: pacman -S sshpass)
bash deploy-master.sh
```

Atau gunakan batch file:

```powershell
.\DEPLOY-152.42.242.180.bat
```

---

## 🔧 CARA 2: Deploy Manual (Lebih Kontrol)

### Step 1: SSH ke VPS

Gunakan **PuTTY** atau **PowerShell**:

```powershell
ssh root@152.42.242.180
# Password: %0|F?H@f!berhO3e
```

### Step 2: Setup VPS (Install Docker)

```bash
# Update system
apt-get update -qq

# Install Docker dan Docker Compose
apt-get install -y -qq docker.io docker-compose-v2 git curl openssl

# Enable Docker
systemctl enable docker
systemctl start docker

# Verify
docker --version
docker compose version
```

### Step 3: Buat Directory Structure

```bash
mkdir -p /opt/workgrid
cd /opt/workgrid
```

### Step 4: Buat Environment File

```bash
cat > /opt/workgrid/.env << 'EOF'
DB_PASSWORD=WorkGrid2024SecurePass!
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
FRONTEND_URL=http://152.42.242.180
NODE_ENV=production
ALLOWED_ORIGINS=http://152.42.242.180
EOF
```

### Step 5: Copy Project Files

#### Opsi A: Menggunakan WinSCP
1. Download WinSCP: https://winscp.net/
2. Connect ke `152.42.242.180` dengan user `root`
3. Copy semua file project ke `/opt/workgrid/`

#### Opsi B: Menggunakan rsync (Git Bash/WSL)

```bash
# Di Git Bash/WSL
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' ./ root@152.42.242.180:/opt/workgrid/
```

#### Opsi C: Menggunakan SCP (PowerShell)

```powershell
# Archive files terlebih dahulu
tar -czf workgrid-deploy.tar.gz --exclude='node_modules' --exclude='.git' --exclude='app/dist' --exclude='app/release' .

# Copy ke VPS
scp workgrid-deploy.tar.gz root@152.42.242.180:/tmp/

# SSH ke VPS dan extract
ssh root@152.42.242.180 "cd /opt/workgrid && tar -xzf /tmp/workgrid-deploy.tar.gz"
```

### Step 6: Copy Docker Compose File

```bash
# Pastikan file docker-compose.vps.yml ada di VPS
cp /opt/workgrid/docker-compose.vps.yml /opt/workgrid/docker-compose.yml
```

### Step 7: Build dan Jalankan

```bash
cd /opt/workgrid

# Stop containers jika ada
docker compose down 2>/dev/null || true

# Build containers (akan memakan waktu 5-10 menit)
docker compose build --no-cache

# Start containers
docker compose up -d

# Check status
docker compose ps
```

### Step 8: Verifikasi Deployment

```bash
# Check logs
docker compose logs -f

# Check health endpoint
curl http://localhost:3001/health
```

---

## 🌐 Akses Aplikasi

Setelah deploy berhasil:

| Service | URL |
|---------|-----|
| **Web App** | http://152.42.242.180 |
| **API** | http://152.42.242.180/api |
| **Health Check** | http://152.42.242.180/api/health |

### Default Login

| Role | Email | Password |
|------|-------|----------|
| Master Admin | `admin@workgrid.com` | `admin123` |

---

## 📋 Command Berguna

### Check Status
```bash
cd /opt/workgrid && docker compose ps
```

### View Logs
```bash
# Semua services
cd /opt/workgrid && docker compose logs -f

# Service tertentu
cd /opt/workgrid && docker compose logs -f backend
cd /opt/workgrid && docker compose logs -f db
```

### Restart Services
```bash
cd /opt/workgrid && docker compose restart
```

### Stop Services
```bash
cd /opt/workgrid && docker compose down
```

### Rebuild Setelah Update Code
```bash
cd /opt/workgrid
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Backup Database
```bash
docker exec discord_clone_db pg_dump -U discord_user discord_clone > /opt/workgrid/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
docker exec -i discord_clone_db psql -U discord_user discord_clone < backup_file.sql
```

---

## 🔧 Troubleshooting

### Port 80 Sudah Digunakan
```bash
# Check apa yang pakai port 80
netstat -tlnp | grep :80

# Stop service yang menggunakan port 80
systemctl stop apache2  # jika pakai apache
systemctl stop nginx    # jika pakai nginx standalone

# Atau ganti port di docker-compose.yml
# ports:
#   - "8080:80"  # Akses via port 8080
```

### Docker Permission Denied
```bash
usermod -aG docker root
newgrp docker
```

### Database Connection Failed
```bash
# Check database logs
docker logs discord_clone_db

# Reset database (WARNING: data akan hilang!)
docker compose down -v
docker compose up -d
```

### CORS Errors
Edit `/opt/workgrid/server/server.js` dan tambahkan IP VPS ke allowed origins:
```javascript
const ALLOWED_ORIGINS = [
  'http://152.42.242.180',
  'http://localhost:5173',
  // ...
];
```
Kemudian restart: `docker compose restart backend`

### Out of Memory saat Build
```bash
# Tambahkan swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Build ulang
cd /opt/workgrid && docker compose build --no-cache
```

---

## 🔒 Setup SSL (HTTPS) - Optional

### Dengan Let's Encrypt (Butuh Domain)

```bash
# Install certbot
apt-get install -y certbot

# Generate certificate (ganti dengan domain Anda)
certbot certonly --standalone -d yourdomain.com

# Copy certificates
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/workgrid/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/workgrid/ssl/key.pem
```

Edit `docker-compose.yml` dan uncomment bagian SSL di nginx config.

---

## 📁 Struktur File di VPS

```
/opt/workgrid/
├── app/                      # Frontend React
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── server/                   # Backend Node.js
│   ├── *.js
│   ├── package.json
│   ├── Dockerfile
│   └── uploads/             # File uploads
├── docker-compose.yml       # Docker Compose config
├── docker-compose.vps.yml   # Template
└── .env                     # Environment variables
```

---

## 🆘 Butuh Bantuan?

Jika ada masalah:

1. **Check logs**: `docker compose logs -f --tail=100`
2. **Check disk space**: `df -h`
3. **Check memory**: `free -m`
4. **Check running containers**: `docker ps`

---

**Selamat mencoba! 🎉**
