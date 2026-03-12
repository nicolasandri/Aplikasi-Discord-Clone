# 🔒 SSL Setup Guide untuk WorkGrid

Panduan lengkap mengaktifkan HTTPS untuk WorkGrid di VPS Proxmox.

## 📋 Prerequisites

- Domain sudah pointing ke IP VPS (workgrid.homeku.net → 103.118.175.196)
- Akses SSH ke VM WorkGrid di Proxmox
- Port 80 dan 443 terbuka di firewall

---

## Opsi 1: Let's Encrypt SSL (Recommended)

### Step 1: Verifikasi Domain

Pastikan domain sudah resolve ke IP VPS:

```bash
# Dari local machine
nslookup workgrid.homeku.net
# Harus menunjuk ke: 103.118.175.196
```

### Step 2: Akses VM WorkGrid di Proxmox

```bash
# SSH ke Proxmox host dulu (jika perlu)
ssh root@151.242.116.149

# Lalu akses console VM WorkGrid (ID 103)
# Atau SSH langsung ke VM jika sudah di-setup:
ssh root@103.118.175.196
```

### Step 3: Install Certbot

```bash
# Update system
apt update && apt upgrade -y

# Install certbot dan nginx plugin
apt install -y certbot python3-certbot-nginx
```

### Step 4: Generate SSL Certificate

**Metode A: Using Certbot Standalone (Recommended untuk Docker)**

```bash
# Stop nginx container dulu supaya port 80 free
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml stop nginx

# Generate certificate
certbot certonly --standalone -d workgrid.homeku.net --agree-tos -m admin@workgrid.homeku.net --non-interactive

# Restart nginx container
docker-compose -f deployment/docker-compose.vps.yml start nginx
```

**Metode B: Using Certbot dengan Webroot**

```bash
# Buat direktori untuk certbot
mkdir -p /opt/workgrid/certbot/www

# Generate certificate dengan webroot
certbot certonly --webroot -w /opt/workgrid/certbot/www -d workgrid.homeku.net --agree-tos -m admin@workgrid.homeku.net --non-interactive
```

### Step 5: Copy Certificate ke Docker Volume

```bash
# Buat direktori untuk certbot di project
mkdir -p /opt/workgrid/certbot/conf
mkdir -p /opt/workgrid/certbot/www

# Copy sertifikat Let's Encrypt ke project directory
rsync -av /etc/letsencrypt/ /opt/workgrid/certbot/conf/

# Set permission
chmod -R 755 /opt/workgrid/certbot
```

### Step 6: Update Docker Compose

Gunakan docker-compose.ssl.yml yang sudah include certbot:

```bash
cd /opt/workgrid

# Stop services yang berjalan
docker-compose -f deployment/docker-compose.vps.yml down

# Jalankan dengan SSL compose
docker-compose -f deployment/docker-compose.ssl.yml up -d
```

### Step 7: Auto-Renewal Setup

Sertifikat Let's Encrypt berlaku 90 hari. Setup auto-renewal:

```bash
# Tambahkan ke crontab
crontab -e

# Tambahkan baris berikut (renew setiap hari jam 2 pagi)
0 2 * * * /usr/bin/certbot renew --quiet --deploy-hook "cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart nginx"

# Atau untuk docker-compose.ssl.yml:
0 2 * * * /usr/bin/certbot renew --quiet --deploy-hook "cd /opt/workgrid && docker-compose -f deployment/docker-compose.ssl.yml restart nginx"
```

---

## Opsi 2: Cloudflare SSL (Paling Mudah)

Jika menggunakan Cloudflare untuk DNS:

### Step 1: Setup Cloudflare

1. Login ke Cloudflare dashboard
2. Tambahkan domain `workgrid.homeku.net`
3. Change nameserver domain ke Cloudflare
4. Buat A record: `workgrid.homeku.net` → `103.118.175.196`

### Step 2: Enable SSL/TLS

1. Di Cloudflare dashboard, menu **SSL/TLS**
2. Pilih mode **Full (strict)** atau **Full**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

### Step 3: Generate Origin Certificate (Optional tapi Recommended)

1. Di Cloudflare, menu **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Pilih **Let Cloudflare generate a private key and a CSR**
4. Simpan certificate dan private key
5. Upload ke VPS:

```bash
# Buat direktori SSL
mkdir -p /opt/workgrid/ssl

# Copy certificate (save sebagai workgrid.pem)
nano /opt/workgrid/ssl/workgrid.pem
# Paste certificate dari Cloudflare

# Copy private key (save sebagai workgrid.key)
nano /opt/workgrid/ssl/workgrid.key
# Paste private key dari Cloudflare

# Set permission
chmod 600 /opt/workgrid/ssl/workgrid.key
chmod 644 /opt/workgrid/ssl/workgrid.pem
```

### Step 4: Update Nginx Config

Edit `/opt/workgrid/nginx/nginx.vps.conf`:

```nginx
ssl_certificate /etc/nginx/ssl/workgrid.pem;
ssl_certificate_key /etc/nginx/ssl/workgrid.key;
```

### Step 5: Update Docker Compose

Mount SSL directory di docker-compose:

```yaml
nginx:
  volumes:
    - ../nginx/nginx.vps.conf:/etc/nginx/conf.d/default.conf:ro
    - ../ssl:/etc/nginx/ssl:ro  # Tambahkan ini
```

### Step 6: Restart Services

```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml restart nginx
```

---

## Opsi 3: Self-Signed Certificate (Testing Only)

Untuk testing/internal use saja:

```bash
# Generate self-signed certificate
mkdir -p /opt/workgrid/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/workgrid/ssl/nginx.key \
  -out /opt/workgrid/ssl/nginx.crt \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=WorkGrid/CN=workgrid.homeku.net"

# Update nginx config untuk menggunakan self-signed
# Edit nginx/nginx.vps.conf dan ganti path sertifikat:
ssl_certificate /etc/nginx/ssl/nginx.crt;
ssl_certificate_key /etc/nginx/ssl/nginx.key;

# Update docker-compose untuk mount ssl directory
# Restart nginx container
```

---

## 🔧 Troubleshooting

### Error: "Could not bind to port 80"

```bash
# Cek apa yang menggunakan port 80
sudo lsof -i :80

# Stop nginx container dulu
docker-compose -f deployment/docker-compose.vps.yml stop nginx

# Coba lagi generate sertifikat
certbot certonly --standalone -d workgrid.homeku.net
```

### Error: "Domain not resolve"

```bash
# Cek DNS propagation
dig workgrid.homeku.net +short
nslookup workgrid.homeku.net

# Pastikan domain sudah pointing ke IP yang benar
```

### Error: "Permission denied" saat baca sertifikat

```bash
# Fix permission
chmod -R 755 /opt/workgrid/certbot
chmod 644 /opt/workgrid/certbot/conf/live/*/fullchain.pem
chmod 600 /opt/workgrid/certbot/conf/live/*/privkey.pem
```

### Sertifikat tidak auto-renew

```bash
# Test renewal dry-run
certbot renew --dry-run

# Cek crontab sudah benar
crontab -l

# Manual renew
certbot renew --force-renewal
```

### Nginx error setelah enable SSL

```bash
# Cek nginx config syntax
docker exec workgrid-nginx nginx -t

# Cek logs
docker-compose -f deployment/docker-compose.vps.yml logs nginx
```

---

## ✅ Verification

Setelah setup SSL berhasil:

1. **Akses HTTPS:** https://workgrid.homeku.net
2. **Check SSL:** https://www.ssllabs.com/ssltest/analyze.html?d=workgrid.homeku.net
3. **Auto-redirect HTTP ke HTTPS:** http://workgrid.homeku.net harus redirect ke HTTPS

---

## 📝 Catatan Penting

1. **Firewall:** Pastikan port 443 terbuka:
   ```bash
   ufw allow 443/tcp
   ufw allow 80/tcp
   ```

2. **Environment Variables:** Update `.env` file:
   ```env
   FRONTEND_URL=https://workgrid.homeku.net
   ALLOWED_ORIGINS=https://workgrid.homeku.net
   ```

3. **Restart setelah update env:**
   ```bash
   docker-compose -f deployment/docker-compose.vps.yml up -d --force-recreate
   ```

4. **Backup sertifikat:**
   ```bash
   tar -czvf ssl-backup.tar.gz /opt/workgrid/certbot/conf
   ```
