# 🔒 Let's Encrypt SSL Setup - WorkGrid

Panduan lengkap setup SSL gratis dari Let's Encrypt untuk WorkGrid.

## 📋 Prerequisites Check

Pastikan semua ini sudah siap sebelum mulai:

- [x] Domain `workgrid.homeku.net` sudah pointing ke IP `103.118.175.196`
- [x] Akses SSH ke VM WorkGrid (103.118.175.196)
- [x] Port 80 dan 443 terbuka di firewall
- [x] Docker dan Docker Compose sudah terinstall
- [x] WorkGrid sudah berjalan di VPS

---

## 🚀 Langkah 1: Verifikasi Domain

### 1.1 Check Domain Resolution

Dari komputer Anda (Windows), buka CMD/PowerShell:

```cmd
nslookup workgrid.homeku.net
```

**Output yang benar:**
```
Server:  your-dns-server
Address:  your-dns-ip

Name:    workgrid.homeku.net
Address:  103.118.175.196
```

Jika belum resolve, tunggu beberapa menit (DNS propagation bisa 5-30 menit).

---

## 🚀 Langkah 2: Akses VM WorkGrid

### 2.1 SSH ke Proxmox Host (jika perlu console)

```bash
ssh root@151.242.116.149
```

### 2.2 Atau SSH Langsung ke VM WorkGrid

```bash
ssh root@103.118.175.196
```

**Default password biasanya:** `root` atau password yang Anda set saat setup VM.

---

## 🚀 Langkah 3: Install Certbot

Di dalam VM WorkGrid, jalankan:

```bash
# Update system
apt update && apt upgrade -y

# Install certbot
apt install -y certbot

# Verify certbot installed
certbot --version
# Output: certbot x.x.x
```

---

## 🚀 Langkah 4: Generate SSL Certificate

### 4.1 Masuk ke Direktori Project

```bash
cd /opt/workgrid
```

### 4.2 Stop Nginx Container (Supaya Port 80 Free)

```bash
docker-compose -f deployment/docker-compose.vps.yml stop nginx
```

**Verify port 80 is free:**
```bash
lsof -i :80
# Harusnya tidak ada output (kosong)
```

### 4.3 Generate Certificate dengan Certbot

```bash
certbot certonly --standalone \
  -d workgrid.homeku.net \
  --agree-tos \
  -m admin@workgrid.homeku.net \
  --non-interactive
```

**Output yang sukses:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/workgrid.homeku.net/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/workgrid.homeku.net/privkey.pem
```

### 4.4 Copy Certificate ke Project Directory

```bash
# Buat direktori untuk certbot
mkdir -p /opt/workgrid/certbot/conf
mkdir -p /opt/workgrid/certbot/www

# Copy sertifikat
rsync -av /etc/letsencrypt/ /opt/workgrid/certbot/conf/ \
  --exclude=archive \
  --exclude=keys \
  --exclude=renewal-hooks

# Set permission
chmod -R 755 /opt/workgrid/certbot
```

### 4.5 Start Nginx Container Kembali

```bash
docker-compose -f deployment/docker-compose.vps.yml start nginx
```

---

## 🚀 Langkah 5: Setup Auto-Renewal

Sertifikat Let's Encrypt berlaku 90 hari, tapi kita setup auto-renewal.

### 5.1 Edit Crontab

```bash
crontab -e
```

### 5.2 Tambahkan Baris Berikut

```cron
# Let's Encrypt auto-renewal setiap hari jam 2 pagi
0 2 * * * /usr/bin/certbot renew --quiet --deploy-hook "cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart nginx"
```

**Save:** Tekan `Ctrl+O`, lalu `Enter`, lalu `Ctrl+X` untuk keluar.

### 5.3 Verify Cron Job

```bash
crontab -l
```

---

## 🚀 Langkah 6: Test HTTPS

### 6.1 Test dari VPS

```bash
curl -I https://workgrid.homeku.net
```

**Output yang benar:**
```
HTTP/2 200
server: nginx
...
```

### 6.2 Test dari Browser

Buka browser dan akses: **https://workgrid.homeku.net**

Seharusnya sudah ada ikon gembok (🔒) dan tidak ada warning "Not Secure".

### 6.3 Test SSL Grade

Buka: https://www.ssllabs.com/ssltest/analyze.html?d=workgrid.homeku.net

Target: **Grade A+**

---

## 🚀 Langkah 7: Update Environment Variables

### 7.1 Edit .env File

```bash
nano /opt/workgrid/.env
```

### 7.2 Update Variabel Berikut

```env
# Ganti dari HTTP ke HTTPS
FRONTEND_URL=https://workgrid.homeku.net

# Update allowed origins
ALLOWED_ORIGINS=https://workgrid.homeku.net,http://workgrid.homeku.net
```

### 7.3 Restart Backend

```bash
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml restart backend
```

---

## 🛠️ Troubleshooting

### Error: "Could not bind to port 80"

**Penyebab:** Ada service lain menggunakan port 80

**Solusi:**
```bash
# Cek apa yang pakai port 80
sudo lsof -i :80

# Kill process jika perlu
sudo kill -9 <PID>

# Atau stop semua container
docker-compose -f deployment/docker-compose.vps.yml down

# Generate cert
certbot certonly --standalone -d workgrid.homeku.net --agree-tos -m admin@workgrid.homeku.net --non-interactive

# Start container lagi
docker-compose -f deployment/docker-compose.vps.yml up -d
```

### Error: "Domain: workgrid.homeku.net - The client lacks sufficient authorization"

**Penyebab:** Domain belum resolve ke IP VPS

**Solusi:**
```bash
# Check DNS
nslookup workgrid.homeku.net

# Pastikan hasilnya: 103.118.175.196

# Jika belum, tunggu 5-30 menit untuk DNS propagation
# Atau check konfigurasi DNS di domain registrar
```

### Error: "Certificate not found" di Nginx

**Penyebab:** Path sertifikat salah

**Solusi:**
```bash
# Verify sertifikat ada
ls -la /etc/letsencrypt/live/workgrid.homeku.net/

# Copy ulang ke project
cp -r /etc/letsencrypt/live/workgrid.homeku.net /opt/workgrid/certbot/conf/

# Restart nginx
docker-compose -f deployment/docker-compose.vps.yml restart nginx
```

### Error: "Permission denied" saat baca sertifikat

**Solusi:**
```bash
# Fix permission
chmod -R 755 /opt/workgrid/certbot
chmod 644 /opt/workgrid/certbot/conf/live/*/fullchain.pem
chmod 600 /opt/workgrid/certbot/conf/live/*/privkey.pem

# Restart nginx
docker-compose -f deployment/docker-compose.vps.yml restart nginx
```

### HTTPS Tidak Bisa Diakses

**Check firewall:**
```bash
# Check UFW
ufw status

# Jika 443 tidak ALLOW, tambahkan:
ufw allow 443/tcp
ufw allow 80/tcp
ufw reload
```

**Check nginx config:**
```bash
# Test nginx config
docker exec workgrid-nginx nginx -t

# Check nginx logs
docker-compose -f deployment/docker-compose.vps.yml logs nginx --tail=50
```

---

## 📋 Perintah yang Berguna

### Manual Renew Certificate

```bash
certbot renew --force-renewal
cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart nginx
```

### Check Certificate Info

```bash
openssl x509 -in /opt/workgrid/certbot/conf/live/workgrid.homeku.net/cert.pem -text -noout
```

### Check Certificate Expiry

```bash
echo | openssl s_client -servername workgrid.homeku.net -connect workgrid.homeku.net:443 2>/dev/null | openssl x509 -noout -dates
```

### Backup Sertifikat

```bash
tar -czvf ssl-backup-$(date +%Y%m%d).tar.gz /opt/workgrid/certbot/conf
```

### Restore Sertifikat

```bash
tar -xzvf ssl-backup-YYYYMMDD.tar.gz -C /
```

---

## ✅ Checklist Selesai

- [ ] Domain resolve ke IP VPS
- [ ] Certbot terinstall
- [ ] Sertifikat berhasil digenerate
- [ ] Auto-renewal di-setup
- [ ] HTTPS bisa diakses
- [ ] Environment variables diupdate
- [ ] Backend direstart
- [ ] SSL Grade A atau A+

---

## 🎯 Selanjutnya

Setelah SSL aktif:
1. Update URL di aplikasi Electron (if applicable)
2. Test WebSocket connection (Socket.IO)
3. Update VAPID keys jika perlu
4. Test upload file
5. Monitor logs selama 24 jam pertama
