# 🚀 Deploy WorkGrid dari GitHub ke VPS

Panduan deploy WorkGrid ke VPS menggunakan GitHub sebagai sumber kode.

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+ (Contoh: 167.172.72.73)
- SSH access ke VPS (root access)
- Repository GitHub: `https://github.com/nicolasandri/Aplikasi-Discord-Clone`

---

## 🚀 Quick Deploy (Satu Command)

SSH ke VPS Anda, lalu jalankan:

```bash
ssh root@167.172.72.73

# Jalankan script deploy (satu command saja!)
curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deployment/deploy-from-github.sh | bash
```

Atau dengan `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deployment/deploy-from-github.sh | bash
```

---

## 🔧 Deploy Manual (Step by Step)

Jika script otomatis tidak berhasil:

### Step 1: SSH ke VPS
```bash
ssh root@167.172.72.73
```

### Step 2: Install Docker & Docker Compose
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Enable Docker
systemctl enable docker
systemctl start docker
```

### Step 3: Clone Repository
```bash
cd /opt
git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git workgrid
cd workgrid
```

### Step 4: Setup Environment
```bash
# Create .env file
cat > .env << 'EOF'
DB_PASSWORD=WorkGridSecurePass123!
DB_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
FRONTEND_URL=http://167.172.72.73
NODE_ENV=production
VAPID_PUBLIC_KEY=BKlTzkEfOlZTNmGlIOYUYFhKqVirXvVXmDDlRIkpgWpGK3Vc1O6YgQz8I8C1QMr6OfdQXcSKd5gAl6pBO_75130
VAPID_PRIVATE_KEY=gfNAVZ4EixhnANxAp4xahC_WEZ_EW4UA-8cpMNHfDoQ
VAPID_SUBJECT=mailto:admin@workgrid.app
EOF

# Create frontend env
cat > app/.env.production << 'EOF'
VITE_API_URL=/api
VITE_SOCKET_URL=
EOF
```

### Step 5: Build & Run
```bash
docker-compose -f deployment/docker-compose.vps.yml up --build -d
```

---

## 🔄 Update Aplikasi

Untuk mengupdate aplikasi ke versi terbaru dari GitHub:

### Opsi 1: Pakai Script Update
```bash
ssh root@167.172.72.73
bash /opt/workgrid/deployment/update-from-github.sh
```

### Opsi 2: Manual Update
```bash
ssh root@167.172.72.73
cd /opt/workgrid

# Backup database
docker exec workgrid-db pg_dump -U workgrid workgrid > backup_$(date +%Y%m%d).sql

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f deployment/docker-compose.vps.yml down
docker-compose -f deployment/docker-compose.vps.yml up --build -d
```

---

## 🌐 Access URLs

Setelah deploy berhasil:

| Service | URL |
|---------|-----|
| **Web App** | http://167.172.72.73 |
| **API** | http://167.172.72.73/api |
| **Health Check** | http://167.172.72.73/api/health |
| **Socket.IO** | ws://167.172.72.73/socket.io |
| **Update Server** | http://167.172.72.73:8080 |

---

## 🔒 Setup SSL/HTTPS (Opsional)

Jika punya domain:

```bash
ssh root@167.172.72.73

# Install certbot
certbot --nginx -d your-domain.com

# Edit nginx config jika perlu
nano /opt/workgrid/nginx/nginx.vps.conf
```

---

## 📊 Monitoring & Maintenance

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
docker-compose -f deployment/docker-compose.vps.yml logs -f db
```

### Restart Services
```bash
docker-compose -f deployment/docker-compose.vps.yml restart
```

### Backup Database
```bash
docker exec workgrid-db pg_dump -U workgrid workgrid > backup_$(date +%Y%m%d).sql
```

---

## 🆘 Troubleshooting

### Container tidak jalan
```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml logs
```

### Port sudah digunakan
```bash
# Cek port
lsof -i :80
lsof -i :3001

# Kill process atau ubah port di docker-compose
```

### Database connection error
```bash
# Cek database container
docker logs workgrid-db

# Reset database (WARNING: data akan hilang!)
docker-compose -f deployment/docker-compose.vps.yml down -v
docker-compose -f deployment/docker-compose.vps.yml up -d
```

---

## 📁 Struktur File di VPS

```
/opt/workgrid/
├── .env                          # Environment variables
├── app/                          # Frontend React
├── server/                       # Backend Node.js
├── nginx/
│   └── nginx.vps.conf           # Nginx config
├── deployment/
│   ├── docker-compose.vps.yml   # Docker Compose config
│   ├── deploy-from-github.sh    # Deploy script
│   └── update-from-github.sh    # Update script
├── updates/                      # Auto-update files
└── backups/                      # Database backups
```

---

## ⚡ Ringkasan Command

```bash
# DEPLOY (pertama kali)
ssh root@167.172.72.73
curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deployment/deploy-from-github.sh | bash

# UPDATE
ssh root@167.172.72.73
bash /opt/workgrid/deployment/update-from-github.sh

# LOGS
ssh root@167.172.72.73
cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml logs -f

# RESTART
ssh root@167.172.72.73
cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart
```

---

**Siap Deploy! 🚀**

Jika ada masalah, cek logs dengan command di atas atau hubungi support.
