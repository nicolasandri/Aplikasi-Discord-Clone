# 🚀 Deploy WorkGrid dari GitHub ke VPS

## Info
- **GitHub**: https://github.com/nicolasandri/Aplikasi-Discord-Clone
- **VPS**: 152.42.229.212
- **User**: root
- **Pass**: `%0|F?H@f!berhO3e`

---

## 🎯 Cara Deploy (Super Mudah!)

### Step 1: SSH ke VPS

```bash
ssh root@152.42.229.212
# Password: %0|F?H@f!berhO3e
```

### Step 2: Jalankan 1 Command Saja!

Copy-paste command ini di VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deploy-from-github.sh | bash
```

Atau manual step-by-step:

```bash
# 1. Clone repository
cd /opt
git clone https://github.com/nicolasandri/Aplikasi-Discord-Clone.git workgrid
cd workgrid

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
systemctl enable docker --now

# 3. Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. Setup firewall
ufw allow 22,80,443,3001,8080/tcp
ufw --force enable

# 5. Create .env file
cat > .env << 'EOF'
DB_PASSWORD=WorkGridSecurePass123!
JWT_SECRET=$(openssl rand -base64 48)
FRONTEND_URL=http://152.42.229.212
NODE_ENV=production
ALLOWED_ORIGINS=http://152.42.229.212,http://localhost:5173
EOF

# 6. Deploy!
docker-compose -f deployment/docker-compose.vps.yml up --build -d
```

---

## ✅ Verifikasi

```bash
# Cek status
docker-compose -f deployment/docker-compose.vps.yml ps

# Cek logs
docker-compose -f deployment/docker-compose.vps.yml logs -f

# Test API
curl http://localhost:3001/health
```

---

## 🌐 Akses

Setelah deploy berhasil:
- **Web**: http://152.42.229.212
- **API**: http://152.42.229.212/api

---

## 🔄 Update (Jika ada perubahan di GitHub)

```bash
cd /opt/workgrid
git pull
docker-compose -f deployment/docker-compose.vps.yml up --build -d
```

---

## 📋 Perintah Berguna

| Perintah | Fungsi |
|----------|--------|
| `docker-compose -f deployment/docker-compose.vps.yml logs -f` | Lihat logs |
| `docker-compose -f deployment/docker-compose.vps.yml restart` | Restart |
| `docker-compose -f deployment/docker-compose.vps.yml down` | Stop |
| `docker-compose -f deployment/docker-compose.vps.yml ps` | Status |
