# 🔒 WorkGrid SSL/HTTPS Setup Guide

Panduan lengkap setup SSL/HTTPS untuk WorkGrid menggunakan Let's Encrypt.

---

## 📋 Prerequisites

1. **Domain name** yang sudah diarahkan ke VPS Anda
   - Contoh: `workgrid.yourdomain.com`
   - DNS A record pointing ke IP VPS: `167.172.72.73`
   
2. **WorkGrid sudah terdeploy** (tanpa SSL)
   - Akses http://167.172.72.73 sudah berfungsi

3. **Port 80 dan 443 terbuka**
   - Firewall sudah allow port 80 dan 443

---

## 🚀 Quick Setup SSL (Satu Command)

Jika WorkGrid sudah terdeploy, SSH ke VPS dan jalankan:

```bash
ssh root@167.172.72.73

# Setup SSL untuk domain Anda
bash /opt/workgrid/deployment/setup-ssl.sh workgrid.yourdomain.com
```

Ganti `workgrid.yourdomain.com` dengan domain Anda.

---

## 📖 Step-by-Step Setup SSL

### Step 1: Persiapan DNS

Pastikan domain Anda sudah diarahkan ke VPS:

```bash
# Cek DNS propagation
dig workgrid.yourdomain.com +short
# atau
nslookup workgrid.yourdomain.com
```

Pastikan output menunjukkan IP VPS: `167.172.72.73`

---

### Step 2: Setup SSL

**Opsi A: Pakai Script Otomatis**

```bash
ssh root@167.172.72.73
bash /opt/workgrid/deployment/setup-ssl.sh your-domain.com
```

**Opsi B: Manual Setup**

```bash
ssh root@167.172.72.73

# 1. Install certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 2. Stop nginx container sementara
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml stop nginx

# 3. Obtain SSL certificate
certbot certonly --standalone \
    -d your-domain.com \
    --agree-tos \
    --non-interactive \
    --email your-email@example.com

# 4. Update nginx config dengan SSL
# Edit file nginx/nginx.vps.conf
# (Copy dari deployment/nginx.ssl.template.conf dan ganti {{DOMAIN}})

# 5. Start nginx
docker-compose -f deployment/docker-compose.vps.yml start nginx

# 6. Setup auto-renewal
echo "0 3 * * * certbot renew --quiet" | crontab -
```

---

## 🔧 Deploy dengan SSL (Fresh Install)

Jika deploy dari awal dengan SSL:

```bash
ssh root@167.172.72.73

# 1. Deploy aplikasi dulu
curl -fsSL https://raw.githubusercontent.com/nicolasandri/Aplikasi-Discord-Clone/main/deployment/deploy-from-github.sh | bash

# 2. Setup SSL
bash /opt/workgrid/deployment/setup-ssl.sh your-domain.com
```

---

## ✅ Verifikasi SSL

### Check Certificate
```bash
# Cek certbot certificates
certbot certificates

# Test SSL connection
curl -I https://your-domain.com

# Check SSL grade (dari VPS)
curl -s https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

### Browser Test
1. Buka: `https://your-domain.com`
2. Pastikan ada 🔒 di address bar
3. Klik 🔒 > Certificate > Valid

---

## 🔄 Auto-Renewal

SSL Let's Encrypt berlaku 90 hari. Auto-renewal sudah di-setup otomatis.

### Verifikasi Auto-Renewal
```bash
# Test renewal (dry run)
certbot renew --dry-run

# View cron jobs
crontab -l

# Manual renew
certbot renew
```

### Log Auto-Renewal
```bash
# View letsencrypt logs
tail -f /var/log/letsencrypt/letsencrypt.log
```

---

## 🛠️ Troubleshooting

### Error: "Could not bind to port 80"
```bash
# Stop nginx container dulu
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml stop nginx

# Run certbot again
certbot certonly --standalone -d your-domain.com

# Start nginx
docker-compose -f deployment/docker-compose.vps.yml start nginx
```

### Error: "DNS problem: NXDOMAIN"
- Pastikan DNS sudah benar
- Tunggu DNS propagation (bisa sampai 24-48 jam)
- Cek dengan: `dig your-domain.com +short`

### Error: "Certificate not found"
```bash
# Check certificate location
ls -la /etc/letsencrypt/live/your-domain.com/

# Re-create certificate
certbot delete --cert-name your-domain.com
certbot certonly --standalone -d your-domain.com
```

### Nginx error setelah SSL
```bash
# Check nginx config
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml exec nginx nginx -t

# View nginx logs
docker-compose -f deployment/docker-compose.vps.yml logs nginx
```

### HTTPS tidak jalan
```bash
# Check firewall
ufw status

# Open port 443 if needed
ufw allow 443/tcp
ufw reload

# Restart services
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml restart
```

---

## 🔐 Advanced: Wildcard SSL

Untuk wildcard certificate (`*.yourdomain.com`):

```bash
# Requires DNS challenge
certbot certonly \
    --manual \
    --preferred-challenges dns \
    -d "*.yourdomain.com" \
    -d "yourdomain.com"
```

Ikuti instruksi untuk menambahkan TXT record di DNS.

---

## 🔐 Advanced: Multiple Domains

Untuk menambahkan domain tambahan:

```bash
# Expand existing certificate
certbot certonly --expand \
    -d your-domain.com \
    -d www.your-domain.com \
    -d app.your-domain.com

# Update nginx config untuk semua domain
# Edit: /opt/workgrid/nginx/nginx.vps.conf

# Reload nginx
cd /opt/workgrid
docker-compose -f deployment/docker-compose.vps.yml exec nginx nginx -s reload
```

---

## 🔒 Security Headers

Konfigurasi SSL sudah include security headers:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=63072000" always;
```

---

## 📊 SSL Test

Test SSL Anda di:
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [SSL Checker](https://www.sslchecker.com/)

Target: **Grade A+**

---

## 📝 Command Reference

```bash
# SSH ke VPS
ssh root@167.172.72.73

# Setup SSL
bash /opt/workgrid/deployment/setup-ssl.sh your-domain.com

# View certificates
certbot certificates

# Renew certificates
certbot renew

# Test renewal
certbot renew --dry-run

# Delete certificate
certbot delete --cert-name your-domain.com

# View logs
tail -f /var/log/letsencrypt/letsencrypt.log

# Restart nginx
cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml restart nginx

# Check nginx config
cd /opt/workgrid && docker-compose -f deployment/docker-compose.vps.yml exec nginx nginx -t
```

---

## 🆘 Support

Jika ada masalah dengan SSL:

1. Cek logs: `tail -f /var/log/letsencrypt/letsencrypt.log`
2. Cek status: `certbot certificates`
3. Restart nginx: `docker-compose -f deployment/docker-compose.vps.yml restart nginx`
4. Re-run setup: `bash /opt/workgrid/deployment/setup-ssl.sh your-domain.com`

---

**Selamat! 🎉 Aplikasi Anda sekarang aman dengan HTTPS!**
