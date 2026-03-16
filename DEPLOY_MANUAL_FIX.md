# WorkGrid - Manual Deployment Fix Guide

## Status: 16 Maret 2026

### Masalah yang Ditemukan

1. **CSP (Content Security Policy) Blocking**
   - Frontend masih menggunakan CSP lama yang hanya mengizinkan `localhost:3001` dan `152.42.242.180:3001`
   - Perlu update CSP untuk mengizinkan `workgrid.homeku.net`

2. **Missing Uploads**
   - 2 file uploads tidak ditemukan (404):
     - `file-1773528611546-967951381.jpg`
     - `file-1773526988381-971537826.jpg`
   - File ini ada di database tapi tidak di VPS uploads volume

3. **Frontend Belum Terupdate**
   - Build baru dengan CSP yang sudah diupdate belum terdeploy ke VPS

---

## Langkah Fix

### 1. Update CSP (SUDAH DIKERJAKAN)

File: `app/index.html`

**CSP Lama:**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: http: https:; connect-src 'self' http://localhost:3001 ws://localhost:3001;">
```

**CSP Baru:**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: http: https:; connect-src 'self' http://localhost:3001 ws://localhost:3001 http://152.42.242.180:3001 ws://152.42.242.180:3001 http://workgrid.homeku.net https://workgrid.homeku.net ws://workgrid.homeku.net wss://workgrid.homeku.net;">
```

### 2. Rebuild Frontend (SUDAH DIKERJAKAN)

```powershell
cd app
$env:VITE_API_URL = "/api"
$env:VITE_SOCKET_URL = ""
npm run build
```

### 3. Deploy ke VPS (PERLU DILAKUKAN MANUAL)

Karena koneksi SSH timeout, lakukan deployment manual:

#### Opsi A: FileZilla / SFTP

1. Connect ke VPS: `152.42.242.180` dengan user `root`
2. Upload folder `app/dist/*` ke `/opt/workgrid/app/dist/`
3. Upload folder `server/uploads/*` ke `/var/lib/docker/volumes/workgrid_uploads_data/_data/`

#### Opsi B: Terminal VPS Langsung

Login ke VPS via SSH/Console, lalu jalankan:

```bash
# Pull changes (if using git)
cd /opt/workgrid
git pull origin main

# Rebuild and restart
cd app
npm install
npm run build

# Copy uploads
mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
cp -r ../server/uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/
chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/

# Restart containers
cd /opt/workgrid
docker-compose -f docker-compose.vps.yml restart frontend backend
```

#### Opsi C: SCP Command (Jika SSH Normal)

Dari local machine:

```bash
# Copy dist
scp -r app/dist/* root@152.42.242.180:/tmp/workgrid-dist/

# Copy uploads
scp -r server/uploads/* root@152.42.242.180:/tmp/workgrid-uploads/

# SSH ke VPS untuk finalize
ssh root@152.42.242.180 << 'EOF'
  cp -r /tmp/workgrid-dist/* /opt/workgrid/app/dist/
  mkdir -p /var/lib/docker/volumes/workgrid_uploads_data/_data
  cp -r /tmp/workgrid-uploads/* /var/lib/docker/volumes/workgrid_uploads_data/_data/
  chown -R 1000:1000 /var/lib/docker/volumes/workgrid_uploads_data/_data/
  cd /opt/workgrid && docker-compose -f docker-compose.vps.yml restart frontend backend
  rm -rf /tmp/workgrid-dist /tmp/workgrid-uploads
EOF
```

### 4. Verifikasi Deployment

Setelah deploy, cek:

1. **CSP Headers:**
   ```bash
   curl -I http://152.42.242.180/
   ```
   Pastikan ada: `workgrid.homeku.net` di CSP

2. **Uploads:**
   ```bash
   curl -I http://152.42.242.180/uploads/file-1773528611546-967951381.jpg
   ```
   Harusnya return 200, bukan 404

3. **API Health:**
   ```bash
   curl http://152.42.242.180/api/health
   ```

---

## File yang Sudah Diupdate

1. ✅ `.env` - FRONTEND_URL dan ALLOWED_ORIGINS
2. ✅ `docker-compose.vps.yml` - Environment variables
3. ✅ `nginx/nginx.conf` - CORS headers untuk uploads
4. ✅ `app/index.html` - CSP policy
5. ✅ `app/dist/` - Rebuild dengan CSP baru

---

## Testing Checklist

Setelah deployment berhasil:

- [ ] Landing page load tanpa error CSP
- [ ] Login berfungsi
- [ ] Register berfungsi
- [ ] WebSocket connect tanpa error
- [ ] File uploads berfungsi
- [ ] Gambar/file attachments tampil
- [ ] DM channels load
- [ ] Friend list load
- [ ] Server list load
- [ ] Real-time messaging works

---

## DNS Configuration

Agar domain `workgrid.homeku.net` berfungsi:

1. Login ke DNS provider (homeku.net)
2. Tambahkan A record:
   - Name: `workgrid`
   - Type: `A`
   - Value: `152.42.242.180`
   - TTL: 300 (5 menit)

3. Tunggu propagasi DNS (5-30 menit)
4. Test: `curl http://workgrid.homeku.net/api/health`

---

## SSL Setup (Optional)

Untuk HTTPS:

```bash
# SSH ke VPS
ssh root@152.42.242.180

# Install certbot
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/www/certbot:/var/www/certbot" \
  certbot/certbot certonly \
  --standalone \
  -d workgrid.homeku.net

# Update nginx config untuk SSL
# ( Uncomment HTTPS section di nginx.conf )
```

---

## Contact

Jika ada masalah deployment, cek:
- Docker logs: `docker-compose -f docker-compose.vps.yml logs -f`
- Nginx logs: `docker logs discord_clone_frontend`
- Backend logs: `docker logs discord_clone_backend`
