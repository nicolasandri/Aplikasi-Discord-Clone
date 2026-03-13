# 🔒 SSL Setup Quick Guide

Domain: `workgrid.homeku.net`  
IP VPS: `165.245.187.155`

## Step 1: Upload Files ke VPS

Upload file-file ini ke VPS di folder `/opt/workgrid/`:
- `deployment/docker-compose.ssl.yml`
- `nginx/nginx.ssl.conf`
- `scripts/setup-ssl.sh`
- `scripts/setup-auto-renew.sh`

## Step 2: Jalankan Script SSL (Di VPS)

```bash
# SSH ke VPS
ssh root@165.245.187.155

# Masuk ke project directory
cd /opt/workgrid

# Beri permission execute pada script
chmod +x scripts/setup-ssl.sh
chmod +x scripts/setup-auto-renew.sh

# Jalankan script SSL
./scripts/setup-ssl.sh
```

Script akan:
1. Install Certbot (jika belum ada)
2. Generate SSL certificate untuk domain
3. Update environment variables untuk HTTPS
4. Restart services dengan SSL configuration

## Step 3: Setup Auto-Renewal (Opsional tapi Recommended)

```bash
./scripts/setup-auto-renew.sh
```

Ini akan:
- Buat script auto-renewal
- Tambahkan cron job untuk renew setiap hari jam 2 pagi

## Step 4: Verifikasi

1. Buka browser: https://workgrid.homeku.net
2. Cek SSL certificate: https://www.ssllabs.com/ssltest/analyze.html?d=workgrid.homeku.net
3. Test HTTP redirect: http://workgrid.homeku.net harus redirect ke HTTPS

## Troubleshooting

### Port 80 sudah digunakan
```bash
# Cek apa yang pakai port 80
lsof -i :80

# Stop semua container dulu
cd /opt/workgrid && docker-compose down

# Coba lagi
./scripts/setup-ssl.sh
```

### Domain belum resolve
```bash
# Cek DNS
dig workgrid.homeku.net +short
nslookup workgrid.homeku.net

# Pastikan mengarah ke 165.245.187.155
```

### Renew manual
```bash
# Stop nginx
docker stop discord_clone_nginx

# Renew
certbot renew

# Copy sertifikat
rsync -av /etc/letsencrypt/ /opt/workgrid/certbot/conf/

# Restart
cd /opt/workgrid && docker-compose -f deployment/docker-compose.ssl.yml restart nginx
```

## Catatan

- Sertifikat Let's Encrypt berlaku 90 hari
- Auto-renewal sudah diatur (jika jalankan Step 3)
- Email untuk notifikasi: admin@workgrid.homeku.net (bisa diganti)
