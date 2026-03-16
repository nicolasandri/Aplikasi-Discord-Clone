# 3 Versi Desain Permission Bot

## Versi 1: Embed Message di Chat (Seperti Discord)
Laporan izin muncul sebagai pesan di channel chat dengan format embed.

**Keunggulan:**
- Mirip dengan Discord
- Ada histori permanen di chat
- Mudah dilihat semua member

**Tampilan:**
```
🤖 SECURITY BOT [APP]
┌─ ✅ IZIN DIMULAI ──────────────┐
│ Staff: @username               │
│ Tipe: wc                       │
│ Maks: 5 menit                  │
│ Mulai: 6:01:07 AM              │
└────────────────────────────────┘
```

## Versi 2: Panel Laporan Terpisah (Current)
Panel laporan muncul di atas/bawah PermissionBot sebagai daftar.

**Keunggulan:**
- Terorganisir rapi
- Real-time update
- Tidak memenuhi chat

**Tampilan:**
```
┌─ Staff yang Sedang Izin (2) ───┐
│ ┌─ IZIN AKTIF ─────────────┐  │
│ │ Staff: @user1             │  │
│ │ Tipe: wc | Waktu: 2m 30d  │  │
│ └───────────────────────────┘  │
│ ┌─ IZIN AKTIF ─────────────┐  │
│ │ Staff: @user2 (TERLAMBAT) │  │
│ │ Penalty: 3m 20d           │  │
│ └───────────────────────────┘  │
└────────────────────────────────┘
```

## Versi 3: Minimalis + Pop-up Notifikasi
Hanya menampilkan izin aktif user sendiri dengan notifikasi pop-up saat ada update.

**Keunggulan:**
- Clean & simple
- Tidak mengganggu tampilan
- Notifikasi fokus pada yang penting

**Tampilan:**
```
┌─ Bot Izin Keluar ──────────────┐
│ [Input izin] [IZIN]            │
│                                │
│ 🔔 2 staff sedang izin         │
│ Klik untuk detail →            │
└────────────────────────────────┘

[Pop-up saat klik]
┌─ Detail Izin ──────────────────┐
│ @user1: wc (2m/5m) ✅          │
│ @user2: kamar (TERLAMBAT) ⚠️   │
└────────────────────────────────┘
```

---

Silakan pilih versi mana yang diinginkan:
- **Reply "1"** untuk Versi 1 (Embed Chat)
- **Reply "2"** untuk Versi 2 (Panel Terpisah - Current)
- **Reply "3"** untuk Versi 3 (Minimalis + Pop-up)
