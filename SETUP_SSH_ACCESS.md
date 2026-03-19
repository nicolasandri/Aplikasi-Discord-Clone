# Setup SSH Access ke Multi-VPS WorkGrid

## SSH Key Baru Sudah Dibuat

📁 **Private Key**: `C:\Users\PC\.ssh\workgrid_vps_access`
📁 **Public Key**: `C:\Users\PC\.ssh\workgrid_vps_access.pub`

### Isi Public Key:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFkqF4F/1dUxVJs480h3jkFKGsztK0Y5TSkSQ1Ri0w5d workgrid-access@local
```

---

## VPS Target

| VPS | IP Address | Purpose |
|-----|------------|---------|
| Frontend | 165.22.63.51 | Nginx + Static Files |
| Backend | 152.42.229.212 | Node.js API + Database |

---

## Cara 1: Add SSH Key via DigitalOcean Console (Rekomendasi)

### Langkah-langkah:

1. **Login ke DigitalOcean Panel**
   - Buka https://cloud.digitalocean.com
   - Login dengan akun Anda

2. **Akses Console VPS Frontend (165.22.63.51)**
   - Klik Droplet "Frontend"
   - Klik "Console" (akan membuka console di browser)
   - Login sebagai `root`

3. **Add SSH Key ke VPS Frontend**
   ```bash
   # Buat direktori .ssh jika belum ada
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   
   # Tambahkan public key
   echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFkqF4F/1dUxVJs480h3jkFKGsztK0Y5TSkSQ1Ri0w5d workgrid-access@local" >> ~/.ssh/authorized_keys
   
   # Set permission
   chmod 600 ~/.ssh/authorized_keys
   
   # Restart SSH service
   systemctl restart ssh
   ```

4. **Ulangi untuk VPS Backend (152.42.229.212)**
   - Lakukan langkah yang sama untuk VPS Backend

5. **Test Koneksi dari Local**
   ```powershell
   ssh -i "$env:USERPROFILE\.ssh\workgrid_vps_access" root@165.22.63.51 "hostname"
   ssh -i "$env:USERPROFILE\.ssh\workgrid_vps_access" root@152.42.229.212 "hostname"
   ```

---

## Cara 2: Manual Copy Paste (Jika sudah punya akses SSH)

Jika Anda sudah punya akses SSH dengan key lain:

```powershell
# Copy public key ke VPS
$pubKey = Get-Content "$env:USERPROFILE\.ssh\workgrid_vps_access.pub"
ssh root@165.22.63.51 "echo '$pubKey' >> ~/.ssh/authorized_keys"
ssh root@152.42.229.212 "echo '$pubKey' >> ~/.ssh/authorized_keys"
```

---

## Cara 3: Using DigitalOcean API (Advanced)

Tambahkan SSH key ke DigitalOcean account:

```powershell
# Install doctl CLI atau gunakan API
# https://docs.digitalocean.com/reference/doctl/how-to/install/

doctl auth init
doctl compute ssh-key create workgrid-access --public-key "$(Get-Content ~/.ssh/workgrid_vps_access.pub)"
```

---

## Setelah SSH Berhasil

### 1. Fix Nginx WebSocket (Frontend VPS)

```bash
ssh -i ~/.ssh/workgrid_vps_access root@165.22.63.51

# Edit nginx config
cat > /etc/nginx/sites-available/workgrid << 'EOF'
server {
    listen 80;
    server_name _;
    
    root /var/www/workgrid;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://152.42.229.212:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    }
    
    location /socket.io {
        proxy_pass http://152.42.229.212:3001/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    location /uploads {
        proxy_pass http://152.42.229.212:3001/uploads;
        add_header 'Access-Control-Allow-Origin' '*' always;
    }
}
EOF

nginx -t && systemctl reload nginx
```

### 2. Deploy Frontend Baru

```bash
# Di local machine
scp -i ~/.ssh/workgrid_vps_access frontend-deploy.tar.gz root@165.22.63.51:/tmp/

# Di VPS Frontend
ssh -i ~/.ssh/workgrid_vps_access root@165.22.63.51 "cd /tmp && tar -xzf frontend-deploy.tar.gz -C /var/www/workgrid --strip-components=1 && rm frontend-deploy.tar.gz"
```

### 3. Deploy Backend Baru (jika perlu)

```bash
scp -i ~/.ssh/workgrid_vps_access backend-deploy.tar.gz root@152.42.229.212:/tmp/
ssh -i ~/.ssh/workgrid_vps_access root@152.42.229.212 "cd /opt/workgrid && tar -xzf /tmp/backend-deploy.tar.gz --strip-components=1 && docker-compose restart backend"
```

---

## Troubleshooting

### SSH Permission Denied
```bash
# Di VPS, periksa permission
ls -la ~/.ssh/
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R root:root ~/.ssh
```

### SSH Key Format Error
Pastikan public key dalam satu baris tanpa newline:
```bash
# Hapus authorized_keys yang rusak
rm ~/.ssh/authorized_keys

# Tambahkan lagi dengan benar
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFkqF4F/1dUxVJs480h3jkFKGsztK0Y5TSkSQ1Ri0w5d workgrid-access@local" > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Test SSH dari Windows
```powershell
# Verbose mode untuk debugging
ssh -v -i "$env:USERPROFILE\.ssh\workgrid_vps_access" root@165.22.63.51
```

---

## Status

| Task | Status |
|------|--------|
| SSH Key Generated | ✅ Done |
| Add Key to Frontend VPS | ⏳ Pending |
| Add Key to Backend VPS | ⏳ Pending |
| Test SSH Connection | ⏳ Pending |
| Fix Nginx WebSocket | ⏳ Pending |
| Deploy Frontend | ⏳ Pending |
