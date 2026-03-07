# Master Admin Guide - WorkGrid

Panduan lengkap untuk menggunakan fitur Master Admin di WorkGrid.

## Fitur Master Admin

Master Admin memiliki akses penuh untuk:

1. **Melihat Statistik Platform**
   - Total pengguna
   - Total server
   - Total pesan
   - Total pertemanan
   - Pengguna online

2. **Melihat Semua Pengguna**
   - Username dan email
   - Password hash (untuk keperluan monitoring)
   - Jumlah server yang diikuti
   - Jumlah pesan yang dikirim
   - Tanggal bergabung

3. **Melihat Semua Server**
   - Nama server
   - Pemilik server
   - Jumlah anggota
   - Jumlah channel
   - Jumlah pesan

4. **Melihat Semua Pesan**
   - Pesan dari semua channel
   - DM messages
   - Filter berdasarkan server/channel

5. **Manajemen Pengguna**
   - Menambah/menghapus status Master Admin
   - Menghapus pengguna
   - Melihat aktivitas pengguna

6. **Manajemen Server**
   - Menghapus server
   - Melihat detail server

## Setup Master Admin

### Otomatis (Saat Seed Data)

Saat server pertama kali dijalankan, user `admin@workgrid.com` dengan password `admin123` akan otomatis menjadi Master Admin.

### Manual Setup

Jika Anda ingin setup Master Admin untuk user yang sudah ada:

#### Cara 1: Menggunakan Script

```bash
cd scripts
node setup-master-admin.js user@example.com
```

Atau dengan custom setup key:

```bash
node setup-master-admin.js user@example.com my-secret-key
```

#### Cara 2: Menggunakan API

```bash
curl -X POST http://localhost:3001/api/setup-master-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "secretKey": "workgrid-setup-2024"
  }'
```

#### Cara 3: Environment Variable

Set `MASTER_ADMIN_SETUP_KEY` di file `.env`:

```env
MASTER_ADMIN_SETUP_KEY=your-secret-key-here
```

Kemudian gunakan script atau API.

## Akses Dashboard Master Admin

1. Login dengan akun Master Admin
2. Klik avatar/profile di pojok kiri bawah
3. Pilih menu "Master Admin Dashboard"

Atau akses langsung: `http://localhost:5173/admin`

## API Endpoints Master Admin

Semua endpoints memerlukan:
- Header `Authorization: Bearer <token>`
- User dengan status Master Admin

### Statistik
```
GET /api/admin/stats
```

### Pengguna
```
GET /api/admin/users?limit=100&offset=0
PUT /api/admin/users/:userId/master-admin
DELETE /api/admin/users/:userId
```

### Server
```
GET /api/admin/servers?limit=100&offset=0
DELETE /api/admin/servers/:serverId
```

### Pesan
```
GET /api/admin/messages?limit=100&offset=0&serverId=&channelId=
GET /api/admin/channels/:channelId/messages
GET /api/admin/dm-messages
```

## Keamanan

1. **Password Hash**: Master Admin dapat melihat password hash untuk monitoring, namun tidak dapat melihat password plaintext.

2. **Setup Key**: Pastikan untuk mengubah default setup key di production.

3. **Self-Protection**: Master Admin tidak dapat:
   - Menghapus akun sendiri
   - Menghapus status Master Admin dari diri sendiri

4. **Token Security**: Semua endpoints Master Admin memerlukan valid JWT token.

## Troubleshooting

### Master Admin tidak bisa akses dashboard

1. Pastikan user sudah login ulang setelah di-set sebagai Master Admin
2. Cek response `/api/users/me` - field `isMasterAdmin` harus `true`
3. Clear browser cache dan localStorage

### Setup Master Admin gagal

1. Pastikan server berjalan
2. Cek apakah sudah ada Master Admin lain:
   ```bash
   curl http://localhost:3001/api/master-admin-status
   ```
3. Pastikan setup key benar

### Database migration error

Jika kolom `is_master_admin` tidak ada:

```bash
# Restart server, migration akan berjalan otomatis
# Atau jalankan manual:
cd server
node -e "const db = require('./database'); db.initDatabase();"
```

## Changelog

### v1.0.0
- Initial Master Admin feature
- Dashboard dengan statistik
- Manajemen pengguna dan server
- Monitoring pesan
