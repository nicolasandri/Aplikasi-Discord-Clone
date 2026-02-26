# WorkGrid - Agent Development Guide

## Project Overview

**WorkGrid** adalah platform kolaborasi tim real-time mirip Discord dengan dukungan multi-platform: web, mobile (Android), dan desktop (Electron). Aplikasi ini memiliki fitur autentikasi JWT, manajemen server/channel, messaging real-time dengan Socket.IO, file sharing, reaksi pesan, reply, edit/hapus pesan, direct messages, voice channels dengan WebRTC, dan UI yang terinspirasi dari Discord.

**Bahasa UI:** Bahasa Indonesia untuk teks yang ditampilkan ke pengguna.

---

## Technology Stack

### Frontend (`/app`)
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| React | 19.2.0 | UI framework dengan TypeScript |
| Vite | 7.2.4 | Build tool dan dev server |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| shadcn/ui | - | UI component library (style: New York) |
| Radix UI | Various | Headless UI primitives |
| Lucide React | 0.562.0 | Icons |
| Socket.IO Client | 4.8.3 | Real-time communication |
| Simple-Peer | 9.11.1 | WebRTC untuk voice |
| Zod | 4.3.5 | Schema validation |
| React Hook Form | 7.70.0 | Form handling |
| Capacitor | 8.1.0 | Mobile (Android) builds |
| Electron | 40.6.0 | Desktop application |
| Recharts | 2.15.4 | Data visualization |

### Backend (`/server`)
| Teknologi | Versi | Tujuan |
|-----------|-------|--------|
| Node.js | 18+ | Runtime |
| Express | 4.18.2 | Web framework |
| Socket.IO | 4.7.2 | Real-time WebSocket |
| PostgreSQL | 15+ | Database utama (production) |
| SQLite3 | 5.1.7 | Database development |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 3.0.3 | Password hashing |
| Multer | 2.0.2 | File uploads |
| CORS | 2.8.5 | Cross-origin requests |
| pg | 8.13.3 | PostgreSQL driver |

### Infrastructure
| Teknologi | Tujuan |
|-----------|--------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Nginx | Reverse proxy, load balancer |
| Redis | Session store, rate limiting |

---

## Project Structure

```
/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ui/              # shadcn/ui components (53+)
│   │   │   ├── ChatLayout.tsx   # Main chat interface
│   │   │   ├── ChatArea.tsx     # Message display
│   │   │   ├── ChannelList.tsx  # Server channels sidebar
│   │   │   ├── ServerList.tsx   # Server list sidebar
│   │   │   ├── MemberList.tsx   # Server members display
│   │   │   ├── MessageInput.tsx # Message input
│   │   │   ├── EmojiPicker.tsx  # Emoji selection
│   │   │   ├── ImageViewer.tsx  # Image preview modal
│   │   │   ├── SettingsModal.tsx # User settings
│   │   │   ├── MessageContextMenu.tsx # Right-click menu
│   │   │   ├── UserProfilePopup.tsx # User profile
│   │   │   ├── TitleBar.tsx     # Electron custom title bar
│   │   │   ├── Login.tsx        # Login page
│   │   │   ├── Register.tsx     # Registration
│   │   │   ├── DMList.tsx       # Direct message channels
│   │   │   ├── DMChatArea.tsx   # DM chat interface
│   │   │   ├── MobileHeader.tsx # Mobile navigation
│   │   │   ├── MobileBottomNav.tsx # Mobile bottom nav
│   │   │   ├── MobileDrawer.tsx # Mobile drawers
│   │   │   ├── VoiceChannelPanel.tsx # Voice channel UI
│   │   │   ├── CategoryItem.tsx # Channel category
│   │   │   ├── CreateCategoryModal.tsx
│   │   │   └── RenameCategoryModal.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Authentication state
│   │   ├── hooks/
│   │   │   ├── useSocket.ts     # Socket.IO connection
│   │   │   ├── useVoiceChannel.ts # WebRTC voice hook
│   │   │   ├── use-mobile.ts    # Mobile detection
│   │   │   ├── useBreakpoint.ts # Responsive breakpoints
│   │   │   └── useNotification.ts # Notifications
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── lib/
│   │   │   └── utils.ts         # Utility functions (cn helper)
│   │   ├── pages/
│   │   │   └── InvitePage.tsx   # Invite acceptance page
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   ├── index.css            # Global styles (Discord theme)
│   │   └── App.css              # Component styles
│   ├── electron/                # Electron desktop app
│   │   ├── main.cjs             # Main process
│   │   └── preload.cjs          # Preload script
│   ├── android/                 # Capacitor Android project
│   ├── dist/                    # Build output (deployment)
│   ├── public/                  # Static assets
│   ├── components.json          # shadcn/ui config
│   ├── capacitor.config.ts      # Mobile config
│   ├── tailwind.config.js       # Tailwind CSS config
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript config
│   ├── Dockerfile               # Frontend Docker image
│   └── package.json             # Dependencies
│
├── server/                      # Backend Express server
│   ├── server.js                # Main server file
│   ├── database.js              # SQLite database module
│   ├── database-postgres.js     # PostgreSQL database module
│   ├── database-sqlite-backup.js
│   ├── config/
│   │   └── database.js          # PostgreSQL connection pool
│   ├── middleware/
│   │   └── permissions.js       # RBAC middleware
│   ├── webrtc/
│   │   └── signaling.js         # Voice signaling server
│   ├── migrations/              # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_migrate_sqlite_to_postgres.js
│   │   └── setup-postgres.js
│   ├── uploads/                 # File upload directory
│   ├── Dockerfile               # Backend Docker image
│   └── package.json
│
├── nginx/                       # Nginx configuration
│   └── nginx.conf               # Production Nginx config
│
├── scripts/                     # Deployment scripts
│   ├── deploy.sh                # Deploy script
│   ├── backup.sh                # Backup script
│   ├── restore.sh               # Restore script
│   └── update.sh                # Update script
│
├── docker-compose.yml           # Docker Compose (dev)
├── docker-compose.prod.yml      # Docker Compose (production)
├── .env                         # Environment variables
├── .env.example                 # Environment template
└── docs/                        # Documentation
    ├── BUG_REPORT.md
    └── CHANGELOG.md
```

---

## Build and Development Commands

### Root Project (Docker Operations)

```bash
# Docker development
npm run docker:up          # Start containers
npm run docker:down        # Stop containers
npm run docker:build       # Build images
npm run docker:logs        # View logs
npm run docker:ps          # Container status
npm run docker:restart     # Restart containers
npm run docker:clean       # Clean up volumes

# Deployment
npm run deploy             # Full deployment
npm run backup             # Backup database
npm run restore            # Restore database
npm run update             # Update deployment
npm run health             # Check health endpoint
```

### Frontend (`/app`)

```bash
cd app

# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Electron development
npm run electron:dev

# Build Electron for current platform
npm run electron:build

# Build Electron for specific platforms
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux

# Output: app/release/
```

### Backend (`/server`)

```bash
cd server

# Install dependencies
npm install

# Start server (http://localhost:3001)
npm start

# Development with auto-reload (requires nodemon)
npm run dev

# PostgreSQL setup
npm run setup:postgres         # Setup PostgreSQL database
npm run migrate               # Migrate data from SQLite
```

### Docker Deployment

```bash
# Development
docker-compose up --build -d

# Production (with load balancing)
docker-compose -f docker-compose.prod.yml up -d
```

### Android APK Build

```bash
cd app

# Sync web assets to Android
npx cap sync

# Build debug APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Environment Variables

### Root `.env` (Docker Environment)
```env
# Database
DB_PASSWORD=your_secure_postgres_password_min_16_chars
DB_PORT=5432

# JWT (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost

# Node Environment
NODE_ENV=production
```

### Server `.env`
```env
PORT=3001
JWT_SECRET=your-secret-key-here
USE_POSTGRES=false  # Set to true for PostgreSQL

# PostgreSQL Connection (when USE_POSTGRES=true)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_clone
DB_USER=discord_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# Or use DATABASE_URL
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Frontend Environment
Development (`app/.env`):
```env
VITE_API_URL=/api
VITE_SOCKET_URL=
```

Production (`app/.env.production`):
```env
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

---

## Code Style Guidelines

### TypeScript
- **Target:** ES2022
- **Strict mode:** Enabled
- **Path aliases:** Use `@/` prefix untuk imports

### Component Structure
- Functional components dengan TypeScript interfaces
- Props interfaces didefinisikan inline atau di `types/index.ts`
- shadcn/ui components mengikuti: `src/components/ui/[component].tsx`

### Styling
- **Primary:** Tailwind CSS utility classes
- **Custom:** CSS variables di `index.css` (Discord color scheme)
- **Variants:** Use `class-variance-authority` (cva)
- **Utility:** Use `cn()` helper dari `@/lib/utils`

### Naming Conventions
- Components: PascalCase (e.g., `ChatLayout.tsx`)
- Hooks: camelCase dengan `use` prefix (e.g., `useSocket.ts`)
- Utilities: camelCase (e.g., `utils.ts`)
- Types/Interfaces: PascalCase (e.g., `User`, `Message`)

### Import Order
1. React imports
2. Third-party libraries
3. Local components (`@/components`)
4. Hooks (`@/hooks`)
5. Contexts (`@/contexts`)
6. Types (`@/types`)
7. Utilities (`@/lib`)

---

## API & WebSocket Specification

### REST API Endpoints

#### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |

#### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/users/me` | Get current user | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| PUT | `/api/users/password` | Change password | Yes |
| POST | `/api/users/avatar` | Upload avatar | Yes |
| GET | `/api/users/search` | Search users | Yes |

#### Servers
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/servers` | Get user servers | Yes |
| POST | `/api/servers` | Create server | Yes |
| DELETE | `/api/servers/:id` | Delete server | Yes (Owner) |
| GET | `/api/servers/:id/channels` | Get channels | Yes |
| POST | `/api/servers/:id/channels` | Create channel | Yes |
| GET | `/api/servers/:id/members` | Get members | Yes |
| POST | `/api/servers/:id/categories` | Create category | Yes |
| PUT | `/api/servers/:id/categories/reorder` | Reorder categories | Yes |

#### Channels & Messages
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| DELETE | `/api/channels/:id` | Delete channel | Yes |
| GET | `/api/channels/:id/messages` | Get messages | Yes |
| POST | `/api/messages/:id/reactions` | Add reaction | Yes |
| DELETE | `/api/messages/:id/reactions` | Remove reaction | Yes |

#### Friends & DMs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/friends` | Get friends | Yes |
| POST | `/api/friends/request` | Send friend request | Yes |
| POST | `/api/friends/:id/accept` | Accept request | Yes |
| GET | `/api/dm/channels` | Get DM channels | Yes |
| POST | `/api/dm/channels` | Create DM channel | Yes |
| GET | `/api/dm/channels/:id/messages` | Get DM messages | Yes |

#### Files
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/upload` | Upload file (10MB limit) | Yes |

### WebSocket Events

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `token: string` | Authenticate socket |
| `join_channel` | `channelId: string` | Join channel room |
| `leave_channel` | `channelId: string` | Leave channel room |
| `send_message` | `{ channelId, content, replyTo?, attachments? }` | Send message |
| `typing` | `{ channelId }` | Typing indicator |
| `add_reaction` | `{ messageId, emoji }` | Add reaction |
| `remove_reaction` | `{ messageId, emoji }` | Remove reaction |
| `edit_message` | `{ messageId, content }` | Edit message |
| `delete_message` | `{ messageId }` | Delete message |
| `join-voice-channel` | `{ channelId }` | Join voice channel |
| `leave-voice-channel` | `{ channelId }` | Leave voice channel |
| `signal` | `{ to, signal }` | WebRTC signaling |
| `voice-state-change` | `{ isMuted, isDeafened }` | Update voice state |

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `authenticated` | `{ success, userId }` | Auth confirmed |
| `new_message` | `Message` | New message |
| `user_typing` | `{ userId, username, channelId }` | Typing notification |
| `reaction_added` | `{ messageId, reactions }` | Reaction added |
| `reaction_removed` | `{ messageId, reactions }` | Reaction removed |
| `message_edited` | `Message` | Message edited |
| `message_deleted` | `{ messageId }` | Message deleted |
| `voice-channel-joined` | `{ channelId, participants }` | Joined voice |
| `user-joined-voice` | `{ userId, socketId }` | User joined voice |
| `user-left-voice` | `{ userId, socketId }` | User left voice |
| `signal` | `{ from, signal }` | WebRTC signal |

---

## Database Schema

### PostgreSQL Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts (id, username, email, password, avatar, status) |
| `servers` | Discord-like servers (id, name, icon, owner_id) |
| `server_members` | Server membership (server_id, user_id, role) |
| `categories` | Channel categories (server_id, name, position) |
| `channels` | Text/voice channels (server_id, category_id, type) |
| `messages` | Channel messages (channel_id, user_id, content, reply_to_id) |
| `reactions` | Message reactions (message_id, user_id, emoji) |
| `friendships` | Friend relationships (user_id, friend_id, status) |
| `dm_channels` | DM channels between users |
| `dm_messages` | DM messages |
| `invites` | Server invite codes |
| `bans` | Server bans |
| `voice_participants` | Voice channel participants |

### Role Hierarchy
```
owner > admin > moderator > member
```

### Permissions Bitfield
```javascript
const Permissions = {
  VIEW_CHANNEL: 1 << 0,
  SEND_MESSAGES: 1 << 1,
  CONNECT: 1 << 2,
  SPEAK: 1 << 3,
  KICK_MEMBERS: 1 << 4,
  BAN_MEMBERS: 1 << 5,
  MANAGE_MESSAGES: 1 << 6,
  MANAGE_CHANNELS: 1 << 7,
  MANAGE_ROLES: 1 << 8,
  MANAGE_SERVER: 1 << 9,
  ADMINISTRATOR: 1 << 10,
  MODERATE_MEMBERS: 1 << 11,
};
```

---

## Testing Strategy

⚠️ **Belum ada test framework yang dikonfigurasi**. Pertimbangkan untuk menambahkan:
- Vitest untuk unit testing
- React Testing Library untuk component tests
- Playwright atau Cypress untuk E2E testing

### Manual Testing Checklist
- [ ] Register dengan email valid
- [ ] Login dengan kredensial benar
- [ ] Create new server
- [ ] Create channels (text & voice)
- [ ] Send text messages
- [ ] Upload file attachments
- [ ] Edit dan delete messages
- [ ] Add emoji reactions
- [ ] Reply to messages
- [ ] Add friend dan accept request
- [ ] Send DMs
- [ ] Create channel categories
- [ ] Test mobile viewport

### Test Real-time (2 Browser Test)
1. Open http://localhost:5173 in Chrome
2. Open http://localhost:5173 in Firefox/Chrome Incognito
3. Login dengan 2 akun berbeda
4. Send messages dan verify real-time updates

---

## Security Considerations

### Current Implementation
- **Authentication:** JWT dengan Bearer token disimpan di localStorage (expires in 7 days)
- **Password Hashing:** bcryptjs dengan 10 salt rounds
- **File Uploads:** Limited to 10MB, MIME type filtering
- **CORS:** Enabled untuk semua origins (development-friendly)
- **Role-based Permissions:** Discord-like permission bitfield
- **Input Validation:** Username (3-30 chars, alphanumeric + underscore), email format, password min 6 chars

### File Upload Restrictions
Allowed MIME types:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Other: `text/plain`, `application/zip`

### Known Security Issues (Lihat docs/BUG_REPORT.md)

**Critical (Open):**
- No rate limiting on API endpoints (brute force vulnerable)
- Socket join channel needs auth check
- Socket send message needs channel verification
- Socket remove reaction needs ownership check

**Medium Priority:**
- CORS allows all origins
- No input sanitization (XSS risk)

### Production Recommendations
1. Change default JWT secret ke secure random string
2. Implement HTTPS
3. Add rate limiting (express-rate-limit)
4. Review CORS policy untuk specific origins
5. Add input validation middleware (zod atau joi)
6. Add file upload virus scanning
7. Add socket event authorization checks

---

## shadcn/ui Components

Project ini memiliki 53+ shadcn/ui components di `app/src/components/ui/`:

### Available Components
- **Layout:** accordion, card, collapsible, resizable, scroll-area, separator, sheet, sidebar
- **Forms:** button, checkbox, input, input-otp, radio-group, select, slider, switch, textarea
- **Feedback:** alert, alert-dialog, progress, skeleton, sonner, spinner
- **Navigation:** breadcrumb, command, context-menu, dropdown-menu, menubar, navigation-menu, pagination, tabs
- **Overlays:** dialog, drawer, hover-card, popover, tooltip
- **Data Display:** aspect-ratio, avatar, badge, calendar, carousel, chart, table
- **Utilities:** button-group, empty, field, form, input-group, item, kbd, label, toggle, toggle-group

### Adding New Components
```bash
cd app
npx shadcn@latest add [component-name]
```

---

## Multi-Platform Notes

### Electron Detection
```typescript
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
```

### API URL Resolution
- **Web:** Uses relative URLs atau `VITE_API_URL` env var
- **Electron:** Uses absolute URL `http://localhost:3001/api`

Pattern ini digunakan di `AuthContext.tsx`, `useSocket.ts`, dan `ChatLayout.tsx`.

---

## Deployment

### Production Deployment

1. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env dengan production values
   ```

2. **Run deployment script:**
   ```bash
   npm run deploy
   ```

3. **Or manual Docker deployment:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Health Check Endpoints
- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost/`

### Backup and Restore
```bash
# Create backup
npm run backup

# Restore from backup
npm run restore
```

---

## Default Seed Data

Pada server pertama kali start, data berikut akan dibuat:
- **Admin User:** `admin@workgrid.com` / `admin123`
- **Default Server:** "WorkGrid Official"
- **Default Channels:**
  - `selamat-datang` (text)
  - `umum` (text)
  - `bantuan` (text)
  - `Suara Umum` (voice)

---

## Documentation Files

- `README.md` - User-facing documentation (Indonesian)
- `docs/BUG_REPORT.md` - Detailed bug tracking
- `docs/CHANGELOG.md` - Version history
- `DOCKER_DEPLOYMENT_GUIDE.md` - Docker deployment instructions
- `AGENTS.md` - This file

---

## Troubleshooting

### Common Issues

1. **Database connection errors:**
   - Check `.env` configuration
   - Ensure PostgreSQL container running: `docker-compose ps`
   - Check logs: `docker-compose logs db`

2. **Socket.IO connection issues:**
   - Verify `VITE_SOCKET_URL` environment variable
   - Check firewall settings untuk port 3001

3. **File upload failures:**
   - Ensure `uploads` directory memiliki proper permissions
   - Check file size limits (10MB default)

4. **Electron build issues:**
   - Ensure `dist` folder exists: `npm run build`
   - Check electron-builder configuration di `package.json`

### Getting Help
- Check `docs/BUG_REPORT.md` untuk known issues
- Review Docker logs: `docker-compose logs -f`
- Check server logs di `server/` directory
