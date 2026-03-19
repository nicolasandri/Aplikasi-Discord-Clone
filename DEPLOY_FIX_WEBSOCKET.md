# Fix WebSocket (Socket.IO) untuk Multi-VPS Setup

## Status Saat Ini (18 Maret 2026)
✅ **LOGIN BERHASIL!** User bisa login dan masuk ke dashboard.

## Masalah
❌ WebSocket connection error 400 - Socket.IO tidak terhubung ke backend VPS

## Root Cause
Nginx di Frontend VPS (165.22.63.51) belum mengarahkan `/socket.io` ke Backend VPS (152.42.229.212:3001)

## Solusi

### 1. SSH ke Frontend VPS
```bash
ssh -i ~/.ssh/workgrid_deploy_key root@165.22.63.51
```

### 2. Update Nginx Config
Edit file `/etc/nginx/sites-available/workgrid`:

```nginx
server {
    listen 80;
    server_name _;
    
    root /var/www/workgrid;
    index index.html;
    
    # Main app
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy to Backend VPS
    location /api {
        proxy_pass http://152.42.229.212:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # Socket.IO WebSocket to Backend VPS
    location /socket.io {
        proxy_pass http://152.42.229.212:3001/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    
    # Uploads
    location /uploads {
        proxy_pass http://152.42.229.212:3001/uploads;
        proxy_set_header Host $host;
        add_header 'Access-Control-Allow-Origin' '*' always;
    }
}
```

### 3. Test Config dan Reload
```bash
nginx -t
systemctl reload nginx
```

### 4. Test WebSocket
Buka browser console dan jalankan:
```javascript
const socket = io('http://165.22.63.51', {
  transports: ['websocket', 'polling']
});
socket.on('connect', () => console.log('Connected!'));
socket.on('connect_error', (err) => console.log('Error:', err));
```

## File yang Sudah Dibuat

| File | Deskripsi |
|------|-----------|
| `nginx-frontend-vps.conf` | Konfigurasi Nginx lengkap untuk Frontend VPS |
| `deploy-multi-vps.ps1` | Script PowerShell untuk deploy otomatis |
| `frontend-deploy.tar.gz` | Build frontend terbaru (sudah dengan URL backend) |
| `backend-deploy.tar.gz` | Backend code terbaru |

## Update Environment Variables

File `app/.env.production` sudah diupdate:
```
VITE_API_URL=http://152.42.229.212:3001/api
VITE_SOCKET_URL=http://152.42.229.212:3001
```

## Langkah Deploy Manual (jika SSH tidak tersedia)

### Frontend VPS (165.22.63.51)
1. Upload `frontend-deploy.tar.gz` ke VPS
2. Extract ke `/var/www/workgrid`
3. Update Nginx config seperti di atas
4. Reload Nginx

### Backend VPS (152.42.229.212)
1. Upload `backend-deploy.tar.gz` ke VPS
2. Extract ke `/opt/workgrid/server`
3. Restart Docker container: `docker-compose restart backend`

## Test URL
- **Frontend**: http://165.22.63.51/login
- **Backend API**: http://152.42.229.212:3001/api/auth/login
- **Credentials**: admin@workgrid.com / admin123

## Screenshot
Lihat `login-success-18mar2026.png` untuk bukti login berhasil.
