# WorkGrid - Discord Clone

Aplikasi chat real-time seperti Discord dengan fitur lengkap untuk kolaborasi tim.

## 🌐 Web App Online

**URL**: https://xoqeprkp54f74.ok.kimi.link

## ✨ Fitur

### Core Features
- 🔐 **Autentikasi**: Login dan Register dengan JWT
- 💬 **Real-time Chat**: Menggunakan Socket.IO
- 🏢 **Servers**: Buat dan kelola server
- 📢 **Channels**: Text channels dengan categories
- 👥 **User Management**: Avatar, status online/offline
- 🤝 **Friend System**: Add friends, kirim request, block user
- 💌 **Direct Messages**: Chat pribadi antar user
- 📱 **Responsive**: Works on mobile, tablet, and desktop
- 🎨 **Discord-like UI**: Interface mirip Discord

### Advanced Features
- 📝 **Message Features**: Edit, delete, reply, reactions
- 📎 **File Sharing**: Upload dan share files
- 🏷️ **Channel Categories**: Organize channels dalam categories
- 🔒 **Role & Permissions**: Role-based access control
- 🔔 **Notifications**: Real-time friend request notifications
- ⌨️ **Typing Indicators**: Lihat siapa yang sedang mengetik

## 🚀 Tech Stack

### Frontend
- React 19 + TypeScript 5
- Tailwind CSS
- Socket.IO Client 4.8
- shadcn/ui components
- Vite 7
- Lucide React Icons

### Backend
- Node.js + Express 4
- Socket.IO 4.7
- SQLite3 (persistent database)
- JWT Authentication
- bcryptjs (password hashing)
- Multer (file uploads)

## 📁 Struktur Project

```
/Users/PC/Downloads/PROJECT TEAMCHAT/Aplikasi Discord Clone/
├── app/                    # Frontend React
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # AuthContext
│   │   ├── hooks/          # useSocket, useBreakpoint
│   │   ├── types/          # TypeScript types
│   │   └── pages/          # Page components
│   ├── dist/               # Build output
│   └── android/            # Capacitor Android project
│
├── server/                 # Backend Express
│   ├── server.js           # Main server file
│   ├── database.js         # SQLite operations
│   ├── uploads/            # File upload directory
│   └── workgrid.db         # SQLite database
│
└── docs/                   # Documentation
    ├── BUG_REPORT.md       # Bug tracking
    └── CHANGELOG.md        # Version history
```

## 🛠️ Cara Menjalankan

### Prerequisites
- Node.js 18+
- npm atau yarn

### 1. Jalankan Backend Server

```bash
cd server
npm install
npm start
```

Server akan berjalan di `http://localhost:3001`

### 2. Jalankan Frontend (Development)

```bash
cd app
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 3. Build untuk Production

```bash
cd app
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
cd app

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

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user baru |
| POST | `/api/auth/login` | Login user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user |
| PUT | `/api/users/profile` | Update profile |
| POST | `/api/users/avatar` | Upload avatar |

### Servers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/servers` | Get semua server user |
| POST | `/api/servers` | Buat server baru |
| GET | `/api/servers/:serverId/channels` | Get channels dalam server |
| GET | `/api/servers/:serverId/members` | Get server members |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/servers/:serverId/channels` | Create channel |
| GET | `/api/channels/:channelId/messages` | Get messages |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | Get friend list |
| POST | `/api/friends/request` | Send friend request |
| PUT | `/api/friends/requests/:id/accept` | Accept request |

### Direct Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dm/channels` | Get DM channels |
| POST | `/api/dm/channels` | Create DM channel |
| GET | `/api/dm/channels/:id/messages` | Get DM messages |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/servers/:id/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |

## 🔒 Environment Variables

### Server (`server/.env`)
```env
PORT=3001
JWT_SECRET=your-secret-key-here
```

### Frontend (`app/.env`)
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
```

### Production (`app/.env.production`)
```env
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

## 📖 Documentation

- [Bug Report](docs/BUG_REPORT.md) - Daftar bug dan status fix
- [Changelog](docs/CHANGELOG.md) - Riwayat perubahan

## 🧪 Testing

### Manual Testing Checklist
- [ ] Register dengan email valid
- [ ] Login dengan kredensial benar
- [ ] Create server baru
- [ ] Create channel (text & voice)
- [ ] Kirim pesan text
- [ ] Upload file attachment
- [ ] Edit dan delete message
- [ ] Add reaction emoji
- [ ] Reply ke message
- [ ] Add friend dan accept request
- [ ] Kirim DM
- [ ] Create channel category
- [ ] Test di mobile viewport

### Test Real-time (2 Browser)
1. Buka http://localhost:5173 di Chrome
2. Buka http://localhost:5173 di Firefox/Chrome Incognito
3. Login dengan 2 akun berbeda
4. Kirim pesan dan verify real-time update

## 🐛 Known Issues

Lihat [BUG_REPORT.md](docs/BUG_REPORT.md) untuk daftar lengkap bug dan status perbaikan.

### Critical Issues (Open)
- No rate limiting on API endpoints
- Socket events need better authorization checks

### Recent Fixes (2026-02-23)
- ✅ JWT tokens now expire in 7 days
- ✅ Username uniqueness validation
- ✅ Fixed user status with multiple tabs
- ✅ Fixed typing indicator timeout
- ✅ Fixed memory leak in useSocket
- ✅ Fixed avatar infinite loop

## 📝 Development Notes

### Database
- Menggunakan SQLite3 (file-based)
- Database file: `server/workgrid.db`
- Auto-create tables saat pertama kali run

### Socket.IO Events

**Client → Server:**
- `authenticate` - Auth dengan JWT
- `join_channel` - Join room
- `send_message` - Kirim pesan
- `typing` - Typing indicator
- `add_reaction` - Tambah reaction

**Server → Client:**
- `new_message` - Pesan baru
- `user_typing` - User sedang ngetik
- `user_status_changed` - Status online/offline
- `friend_request_received` - Friend request masuk

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License

## 👨‍💻 Author

Developed as a learning project for Discord-like real-time chat application.
