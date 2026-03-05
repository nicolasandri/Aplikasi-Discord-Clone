# 🔄 WorkGrid Auto-Update System

Sistem auto-update untuk WorkGrid Desktop App menggunakan Electron Auto Updater.

## 📋 Cara Kerja

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│ latest.yml  │
│  (Electron) │     │  (Backend)  │     │  (Update)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                           │
       │◀──────── Download Update ────────────────│
       │                                           │
       │◀──────── Install & Restart ──────────────│
```

## 🚀 Alur Update

1. **Aplikasi Cek Update** - Saat startup, aplikasi otomatis cek versi terbaru dari server
2. **Notifikasi Update** - Jika ada update, tombol update berubah warna (hijau pulse)
3. **Download Update** - User klik tombol → download otomatis dengan progress bar
4. **Install Update** - Setelah download selesai, aplikasi restart dengan versi baru

## 📁 Struktur File Update

```
app/release/
├── WorkGrid Setup 1.0.0.exe      # Installer terbaru
├── WorkGrid Setup 1.0.0.exe.blockmap
├── latest.yml                    # Metadata update (auto-generated)
└── win-unpacked/                 # Folder build
```

## 🔧 Cara Release Update Baru

### 1. Update Version
Edit `app/package.json`:
```json
{
  "version": "1.0.1"  // Update versi
}
```

### 2. Build Aplikasi
```bash
cd app
npm run build
npx electron-builder --win
```

### 3. Generate latest.yml
```bash
cd ..
node scripts/generate-latest-yml.js
```

### 4. Restart Backend
```bash
cd server
npm start
```

## 🌐 Endpoint Update

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /updates/version` | Info versi current & latest |
| `GET /updates/latest.yml` | Metadata update untuk Electron |
| `GET /updates/:filename` | Download file update |

## 🎨 UI Update Button

Tombol update ada di bagian bawah server list:

- **🔄 Normal** - Cek update manual
- **🟢 Pulse** - Update tersedia, klik untuk download
- **📊 Progress** - Sedang mendownload (show %)
- **✅ Hijau** - Update siap, klik untuk install
- **⚠️ Merah** - Error saat cek/download

## 📝 Konfigurasi

### Publish Config (app/package.json)
```json
"publish": {
  "provider": "generic",
  "url": "http://localhost:3001/updates",
  "channel": "latest"
}
```

### Production URL
Ubah URL ke domain production:
```json
"publish": {
  "provider": "generic",
  "url": "https://your-domain.com/updates",
  "channel": "latest"
}
```

## 🔐 Keamanan

- Hanya file dengan extension yang diizinkan bisa di-download:
  - `.exe`, `.yml`, `.yaml`, `.blockmap`
  - `.zip`, `.dmg`, `.AppImage`, `.deb`, `.rpm`
  - `.nupkg`, `.json`, `.sig`
- File di-serve dari folder `app/release/`
- Hash SHA512 dicek sebelum install

## 🧪 Testing Update (Development)

### Simulasi Update Tersedia
1. Build aplikasi dengan versi lama (e.g., 1.0.0)
2. Install aplikasi
3. Update `app/package.json` ke versi baru (e.g., 1.0.1)
4. Build ulang & generate latest.yml
5. Restart backend
6. Buka aplikasi yang terinstall → akan muncul notifikasi update

### Force Check Update
Di aplikasi Electron yang terinstall, buka DevTools dan jalankan:
```javascript
window.electronAPI.checkForUpdates()
```

## 📱 Platform Support

| Platform | Support |
|----------|---------|
| Windows (NSIS) | ✅ Full Support |
| macOS (DMG) | ✅ Full Support |
| Linux (AppImage) | ✅ Full Support |

## ⚠️ Troubleshooting

### Update Tidak Terdeteksi
- Cek endpoint `/updates/version` di browser
- Pastikan `latest.yml` ada di folder `app/release/`
- Restart backend setelah generate latest.yml

### Download Gagal
- Cek koneksi internet
- Pastikan firewall tidak memblokir port 3001
- Cek log backend untuk error

### Install Gagal
- Pastikan aplikasi tidak dijalankan sebagai Administrator (Windows)
- Cek antivirus tidak memblokir installer
- Restart aplikasi dan coba lagi

## 🎯 Tips

1. **Auto-check**: Aplikasi otomatis cek update saat startup (5 detik delay)
2. **Manual Check**: User bisa klik tombol kapan saja untuk cek update
3. **Silent Download**: Update bisa di-download di background
4. **Prompt Install**: User diminta konfirmasi sebelum install & restart
