# ChatCord - Discord Clone

Aplikasi chat real-time seperti Discord dengan fitur lengkap.

## 🌐 Web App Online

**URL**: https://xoqeprkp54f74.ok.kimi.link

## ✨ Fitur

- 🔐 **Autentikasi**: Login dan Register
- 💬 **Real-time Chat**: Menggunakan Socket.IO
- 🏢 **Servers**: Buat dan kelola server
- 📢 **Channels**: Text channels dalam server
- 👥 **User Management**: Avatar, status online
- 📱 **Responsive**: Works on mobile and desktop
- 🎨 **Discord-like UI**: Interface mirip Discord

## 🚀 Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Socket.IO Client
- shadcn/ui components
- Vite

### Backend
- Node.js + Express
- Socket.IO
- In-memory database (untuk development)

## 📁 Struktur Project

```
/mnt/okcomputer/output/
├── app/                    # Frontend React
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # AuthContext
│   │   ├── hooks/          # useSocket
│   │   ├── types/          # TypeScript types
│   │   └── ...
│   ├── dist/               # Build output
│   └── android/            # Capacitor Android project
│
└── server/                 # Backend Express
    ├── server.js           # Main server file
    └── package.json
```

## 🛠️ Cara Menjalankan

### 1. Jalankan Backend Server

```bash
cd /mnt/okcomputer/output/server
npm install
npm start
```

Server akan berjalan di `http://localhost:3001`

### 2. Jalankan Frontend (Development)

```bash
cd /mnt/okcomputer/output/app
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

### 3. Build untuk Production

```bash
cd /mnt/okcomputer/output/app
npm run build
```

Build output ada di folder `dist/`.

## 📱 Build APK Android

### Persyaratan
- Android Studio
- Android SDK
- Java JDK 17+

### Langkah Build APK

```bash
cd /mnt/okcomputer/output/app

# Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# Initialize Capacitor
npx cap init "ChatCord" "com.chatcord.app" --web-dir "dist"

# Add Android platform
npx cap add android

# Sync web assets
npx cap sync

# Build APK
cd android
./gradlew assembleDebug
```

APK akan tersedia di:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Build dengan Android Studio

1. Buka folder `android/` di Android Studio
2. Tunggu Gradle sync selesai
3. Pilih menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. APK akan tersedia di `app/build/outputs/apk/debug/`

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user

### Servers
- `GET /api/servers` - Get semua server user
- `POST /api/servers` - Buat server baru
- `GET /api/servers/:serverId/channels` - Get channels dalam server

### Messages
- `GET /api/channels/:channelId/messages` - Get messages dalam channel

### WebSocket Events
- `authenticate` - Autentikasi socket
- `join_channel` - Join channel
- `leave_channel` - Leave channel
- `send_message` - Kirim message
- `typing` - Typing indicator
- `new_message` - Receive new message
- `user_typing` - User typing notification

## 🎨 Customization

### Environment Variables

Buat file `.env` di folder `app/`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### Theming

Edit `src/index.css` untuk mengubah warna tema.

## 📝 Catatan

- Data disimpan di memory (akan hilang saat server restart)
- Untuk production, gunakan database seperti PostgreSQL atau MongoDB
- Tambahkan JWT secret dan hashing password untuk keamanan

## 📄 License

MIT License
