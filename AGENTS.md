# WorkGrid (Discord Clone) - Agent Development Guide

## Project Overview

**WorkGrid** (also known as ChatCord) is a real-time team collaboration platform inspired by Discord, supporting multi-platform deployment: web, mobile (Android via Capacitor), and desktop (Electron). The application is built with React + TypeScript on the frontend and Node.js + Express on the backend.

**UI Language:** Bahasa Indonesia for user-facing text.

### Key Features
- JWT Authentication (7-day expiration)
- Server and channel management (text & voice channels)
- Real-time messaging with Socket.IO
- File sharing (max 10MB)
- Message reactions, replies, edit/delete messages
- Pin messages (requires MANAGE_MESSAGES permission)
- Direct Messages (DM) between users (1-on-1 and group)
- Voice channels with WebRTC
- Custom roles with Discord-like permission system
- Friend system with friend requests, block user
- Push notifications with VAPID
- Typing indicators
- Message search
- Audit logging for servers
- Server invites with invite codes
- Transfer server ownership
- Mention system (@user, @role, @everyone, @here)
- Responsive UI for mobile, tablet, and desktop
- Auto-update for desktop Electron app

---

## Technology Stack

### Frontend (`/app`)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework with TypeScript |
| Vite | 7.2.4 | Build tool and dev server |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| shadcn/ui | - | UI component library (53+ components) |
| Radix UI | Various | Headless UI primitives |
| Lucide React | 0.562.0 | Icons |
| Socket.IO Client | 4.8.3 | Real-time communication |
| Simple-Peer | 9.11.1 | WebRTC for voice chat |
| Zod | 4.3.5 | Schema validation |
| React Hook Form | 7.70.0 | Form handling |
| TipTap | 3.20.0 | Rich text editor |
| Recharts | 2.15.4 | Data visualization |
| Capacitor | 8.1.0 | Mobile (Android) builds |
| Electron | 40.6.0 | Desktop application |
| electron-updater | 6.8.3 | Auto-update mechanism |

### Backend (`/server`)
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18.2 | Web framework |
| Socket.IO | 4.7.2 | Real-time WebSocket |
| PostgreSQL | 15+ | Primary database (production) |
| SQLite3 | 5.1.7 | Development database |
| JWT | 9.0.3 | Authentication (7-day expiration) |
| bcryptjs | 3.0.3 | Password hashing (12 salt rounds) |
| Multer | 2.0.2 | File uploads (10MB limit) |
| CORS | 2.8.5 | Cross-origin requests |
| express-rate-limit | 8.2.1 | Rate limiting |
| express-validator | 7.3.1 | Input validation |
| pg | 8.13.3 | PostgreSQL driver |
| web-push | 3.6.7 | Push notifications |
| Redis | 5.11.0 | Session store, rate limiting |
| cheerio | 1.2.0 | HTML parsing for link previews |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Nginx | Reverse proxy, load balancer |
| Redis | Session store, rate limiting |
| PostgreSQL | Primary database |

---

## Project Structure

```
/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ui/              # shadcn/ui components (53+)
│   │   │   ├── ChatLayout.tsx   # Main chat interface
│   │   │   ├── ChatArea.tsx     # Message display area
│   │   │   ├── ChannelList.tsx  # Server channels sidebar
│   │   │   ├── ServerList.tsx   # Server list sidebar
│   │   │   ├── MemberList.tsx   # Server members display
│   │   │   ├── MessageInput.tsx # Message input with rich text
│   │   │   ├── MessageContent.tsx # Render message content
│   │   │   ├── EmojiPicker.tsx  # Emoji selection
│   │   │   ├── ImageViewer.tsx  # Image preview modal
│   │   │   ├── Lightbox.tsx     # Full-screen image viewer
│   │   │   ├── SettingsModal.tsx # User settings
│   │   │   ├── MessageContextMenu.tsx # Right-click menu
│   │   │   ├── UserProfilePopup.tsx # User profile popup
│   │   │   ├── UserProfileButton.tsx # User avatar button
│   │   │   ├── TitleBar.tsx     # Electron custom title bar
│   │   │   ├── Login.tsx        # Login page
│   │   │   ├── Register.tsx     # Registration
│   │   │   ├── DMList.tsx       # Direct message channels
│   │   │   ├── DMChatArea.tsx   # DM chat interface
│   │   │   ├── MobileHeader.tsx # Mobile navigation header
│   │   │   ├── MobileBottomNav.tsx # Mobile bottom navigation
│   │   │   ├── MobileDrawer.tsx # Mobile drawers
│   │   │   ├── VoiceChannelPanel.tsx # Voice channel UI
│   │   │   ├── CategoryItem.tsx # Channel category
│   │   │   ├── CreateCategoryModal.tsx
│   │   │   ├── RenameCategoryModal.tsx
│   │   │   ├── InviteModal.tsx  # Server invite modal
│   │   │   ├── SearchModal.tsx  # Global search
│   │   │   ├── RoleManagerModal.tsx # Role management
│   │   │   ├── ServerSettingsModal.tsx # Server settings
│   │   │   ├── ServerAuditLog.tsx # Audit logging
│   │   │   ├── NotificationSettings.tsx # Notification preferences
│   │   │   ├── ServerInvites.tsx # Server invite management
│   │   │   ├── ServerMembers.tsx # Server member management
│   │   │   ├── ServerRoles.tsx  # Server roles configuration
│   │   │   ├── ServerSettingsPage.tsx # Server settings page
│   │   │   ├── ForwardModal.tsx # Message forwarding
│   │   │   ├── GroupDMModal.tsx # Group DM creation
│   │   │   ├── AddMemberToGroupModal.tsx
│   │   │   ├── MemberProfilePanel.tsx # Member profile sidebar
│   │   │   ├── ReactionTooltip.tsx # Reaction display
│   │   │   ├── RichTextEditor.tsx # TipTap editor wrapper
│   │   │   ├── EmojiStickerGIFPicker.tsx
│   │   │   ├── GIFPicker.tsx
│   │   │   └── UpdateButton.tsx # Electron update button
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Authentication state
│   │   ├── hooks/
│   │   │   ├── useSocket.ts     # Socket.IO connection
│   │   │   ├── useVoiceChannel.ts # WebRTC voice hook
│   │   │   ├── use-mobile.ts    # Mobile detection
│   │   │   ├── useBreakpoint.ts # Responsive breakpoints
│   │   │   ├── useNotification.ts # Browser notifications
│   │   │   └── usePush.ts       # Push notifications
│   │   ├── types/
│   │   │   ├── index.ts         # TypeScript interfaces
│   │   │   ├── voice.ts         # Voice-related types
│   │   │   ├── electron.d.ts    # Electron type definitions
│   │   │   └── simple-peer.d.ts # SimplePeer types
│   │   ├── lib/
│   │   │   └── utils.ts         # Utility functions (cn helper)
│   │   ├── pages/
│   │   │   ├── InvitePage.tsx   # Invite acceptance page
│   │   │   └── FriendsPage.tsx  # Friends management page
│   │   ├── services/
│   │   │   └── auth.service.ts  # Authentication service
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Global styles (Cyberpunk theme)
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
│   ├── tsconfig.app.json        # App TypeScript config
│   ├── tsconfig.node.json       # Node TypeScript config
│   ├── nginx.conf               # Nginx config for Docker
│   ├── Dockerfile               # Frontend Docker image
│   └── package.json             # Dependencies
│
├── server/                      # Backend Express server
│   ├── server.js                # Main server file
│   ├── database.js              # SQLite database module
│   ├── database-postgres.js     # PostgreSQL database module
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection pool
│   │   ├── push.js              # Push notification config
│   │   └── redis.js             # Redis configuration
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication middleware
│   │   └── permissions.js       # RBAC middleware
│   ├── services/
│   │   └── token.service.js     # Token management service
│   ├── migrations/              # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_migrate_sqlite_to_postgres.js
│   │   ├── 007_add_emoji_stickers.sql
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

# Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@workgrid.app
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

# Redis
REDIS_URL=redis://localhost:6379

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

### Frontend Environment
Development (`app/.env`):
```env
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
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
- **Path aliases:** Use `@/` prefix for imports

### Component Structure
- Functional components with TypeScript interfaces
- Props interfaces defined inline or in `types/index.ts`
- shadcn/ui components follow: `src/components/ui/[component].tsx`

### Styling
- **Primary:** Tailwind CSS utility classes
- **Custom:** CSS variables in `index.css` (Cyberpunk color scheme)
- **Variants:** Use `class-variance-authority` (cva)
- **Utility:** Use `cn()` helper from `@/lib/utils`

### Naming Conventions
- Components: PascalCase (e.g., `ChatLayout.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useSocket.ts`)
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
| POST | `/api/auth/refresh` | Refresh access token | Yes |
| POST | `/api/auth/logout` | Logout user | Yes |

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
| POST | `/api/servers/:id/channels` | Create channel | Yes (Manage Channels) |
| GET | `/api/servers/:id/members` | Get members | Yes |
| POST | `/api/servers/:id/categories` | Create category | Yes |
| PUT | `/api/servers/:id/categories/reorder` | Reorder categories | Yes |
| GET | `/api/servers/:serverId/roles` | Get server roles | Yes |
| POST | `/api/servers/:serverId/roles` | Create role | Yes (Manage Roles) |
| PUT | `/api/servers/:serverId/roles/:roleId` | Update role | Yes (Manage Roles) |
| DELETE | `/api/servers/:serverId/roles/:roleId` | Delete role | Yes (Manage Roles) |
| GET | `/api/servers/:id/invites` | Get server invites | Yes |
| POST | `/api/servers/:id/invites` | Create invite | Yes |
| GET | `/api/servers/:serverId/audit-logs` | Get audit logs | Yes (Manage Server) |
| POST | `/api/servers/:serverId/transfer-ownership` | Transfer ownership | Yes (Owner) |

#### Channels & Messages
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| DELETE | `/api/channels/:id` | Delete channel | Yes |
| GET | `/api/channels/:id/messages` | Get messages | Yes |
| POST | `/api/channels/:channelId/pins` | Get pinned messages | Yes |
| POST | `/api/messages/:id/reactions` | Add reaction | Yes |
| DELETE | `/api/messages/:id/reactions` | Remove reaction | Yes |
| POST | `/api/messages/:messageId/pin` | Pin message | Yes (Manage Messages) |
| POST | `/api/messages/:messageId/unpin` | Unpin message | Yes (Manage Messages) |
| GET | `/api/messages/search` | Search messages | Yes |

#### Friends & DMs
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/friends` | Get friends | Yes |
| GET | `/api/friends/requests` | Get pending requests | Yes |
| POST | `/api/friends/request` | Send friend request | Yes |
| POST | `/api/friends/requests/:id/accept` | Accept request | Yes |
| POST | `/api/friends/requests/:id/reject` | Reject request | Yes |
| DELETE | `/api/friends/:id` | Remove friend | Yes |
| POST | `/api/friends/:id/block` | Block user | Yes |
| GET | `/api/dm/channels` | Get DM channels | Yes |
| POST | `/api/dm/channels` | Create DM channel | Yes |
| GET | `/api/dm/channels/:id/messages` | Get DM messages | Yes |
| POST | `/api/dm/channels/:id/messages` | Send DM message | Yes |
| DELETE | `/api/dm/channels/:id` | Delete DM channel | Yes |
| POST | `/api/dm/channels/:id/members` | Add member to group | Yes (Creator) |
| DELETE | `/api/dm/channels/:id/members/:userId` | Remove member | Yes (Creator) |

#### Files
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/upload` | Upload file (10MB limit) | Yes |

#### Permissions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/servers/:serverId/permissions` | Get user permissions | Yes |
| PUT | `/api/servers/:serverId/members/:userId/role` | Update member role | Yes |
| PUT | `/api/servers/:serverId/members/:userId/custom-role` | Assign custom role | Yes |
| DELETE | `/api/servers/:serverId/members/:userId` | Kick member | Yes |
| POST | `/api/servers/:serverId/bans/:userId` | Ban member | Yes |

#### Push Notifications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/push/subscribe` | Subscribe to push | Yes |
| POST | `/api/push/unsubscribe` | Unsubscribe | Yes |
| POST | `/api/push/test` | Test push notification | Yes |
| GET | `/api/push/vapid-public-key` | Get VAPID public key | No |

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
| `message_pinned` | `{ messageId, channelId }` | Message pinned |
| `message_unpinned` | `{ messageId, channelId }` | Message unpinned |
| `ownership_transferred` | `{ serverId, newOwnerId }` | Ownership transferred |
| `voice-channel-joined` | `{ channelId, participants }` | Joined voice |
| `user-joined-voice` | `{ userId, socketId }` | User joined voice |
| `user-left-voice` | `{ userId, socketId }` | User left voice |
| `signal` | `{ from, signal }` | WebRTC signal |
| `user_status_changed` | `{ userId, status }` | User status change |
| `friend_request_received` | `{ request }` | Friend request received |
| `friend_request_accepted` | `{ friend }` | Friend request accepted |
| `member_joined` | `{ userId, serverId, username, ... }` | New member joined |

---

## Database Schema

### PostgreSQL/SQLite Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts (id, username, email, password, avatar, status, token_version) |
| `servers` | Discord-like servers (id, name, icon, owner_id) |
| `server_members` | Server membership (server_id, user_id, role, role_id, joined_at) |
| `categories` | Channel categories (server_id, name, position) |
| `channels` | Text/voice channels (server_id, category_id, type, position) |
| `messages` | Channel messages (channel_id, user_id, content, reply_to_id, is_pinned, pinned_at, pinned_by) |
| `reactions` | Message reactions (message_id, user_id, emoji) |
| `friendships` | Friend relationships (user_id, friend_id, status, created_at) |
| `friend_requests` | Pending friend requests (sender_id, receiver_id, status) |
| `dm_channels` | DM channels between users (type: direct/group, creator_id) |
| `dm_channel_members` | DM channel participants |
| `dm_messages` | DM messages |
| `invites` | Server invite codes (code, server_id, created_by, expires_at, max_uses) |
| `bans` | Server bans (server_id, user_id, reason, created_at) |
| `voice_participants` | Voice channel participants |
| `roles` | Custom server roles with permissions (server_id, name, color, permissions, position) |
| `audit_logs` | Server audit logs (server_id, action, user_id, target_id, details, created_at) |
| `push_subscriptions` | Push notification subscriptions |

### Role Hierarchy
```
owner > admin > moderator > member > custom
```

### Permissions Bitfield (Discord-like)
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

**No test framework is currently configured.** Consider adding:
- Vitest for unit testing
- React Testing Library for component tests
- Playwright or Cypress for E2E testing

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
- [ ] Pin/unpin messages
- [ ] Add friend dan accept request
- [ ] Send DMs (1-on-1 dan group)
- [ ] Create channel categories
- [ ] Create dan assign custom roles
- [ ] Test voice channels
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
- **Token Versioning:** Mendukung force logout dengan token_version di database
- **Password Hashing:** bcryptjs dengan 12 salt rounds
- **File Uploads:** Limited to 10MB, MIME type filtering
- **CORS:** Strict origin checking dengan ALLOWED_ORIGINS
- **Rate Limiting:** express-rate-limit (10 req/15min auth, 100 req/min API)
- **XSS Prevention:** Input sanitization untuk HTML tags
- **Role-based Permissions:** Discord-like permission bitfield
- **Input Validation:** express-validator

### File Upload Restrictions
Allowed MIME types:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Other: `text/plain`, `application/zip`

### Nginx Security Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()

### Production Recommendations
1. Change default JWT secret ke secure random string (64+ chars)
2. Implement HTTPS dengan valid SSL certificate
3. Use environment-specific CORS origins
4. Enable PostgreSQL SSL connections
5. Add file upload virus scanning
6. Implement audit logging
7. Add request signing untuk sensitive endpoints

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

### Mobile Detection
```typescript
import { useIsMobile } from '@/hooks/use-mobile';
const isMobile = useIsMobile(); // true untuk screens < 768px
```

### Electron Auto-Update
Aplikasi Electron menggunakan `electron-updater` untuk auto-update. Update server dikonfigurasi di `package.json`:
```json
"publish": {
  "provider": "generic",
  "url": "http://your-update-server:8080",
  "channel": "latest"
}
```

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

## Troubleshooting

### Common Issues

1. **Database connection errors:**
   - Check `.env` configuration
   - Ensure PostgreSQL container running: `docker-compose ps`
   - Check logs: `docker-compose logs db`

2. **Socket.IO connection issues:**
   - Verify `VITE_SOCKET_URL` environment variable
   - Check firewall settings untuk port 3001
   - Check CORS origins di server

3. **File upload failures:**
   - Ensure `uploads` directory memiliki proper permissions
   - Check file size limits (10MB default)

4. **Electron build issues:**
   - Ensure `dist` folder exists: `npm run build`
   - Check electron-builder configuration di `package.json`

5. **Voice channel not working:**
   - Check WebRTC STUN/TURN servers
   - Verify browser permissions untuk microphone
   - Check signaling server logs

6. **TypeScript errors:**
   - Run `npm run build` di app directory untuk check errors
   - Check `typescript-errors.log` untuk detail

7. **Auto-update not working (Electron):**
   - Verify update server URL di `package.json`
   - Check `latest.yml` dan `WorkGrid-setup.exe` tersedia di update server
   - Review logs di `%APPDATA%/WorkGrid/logs/`

### Getting Help
- Check `docs/BUG_REPORT.md` untuk known issues
- Review Docker logs: `docker-compose logs -f`
- Check server logs di `server/` directory

---

## Documentation Files

- `README.md` - User-facing documentation (Indonesian)
- `docs/BUG_REPORT.md` - Detailed bug tracking
- `docs/CHANGELOG.md` - Version history
- `DOCKER_DEPLOYMENT_GUIDE.md` - Docker deployment instructions
- `DEPLOY_VPS_GUIDE.md` - VPS deployment guide
- `AUTO_UPDATE_GUIDE.md` - Electron auto-update setup
- `TODO.md` - Bug fix checklist dan feature status
- `AGENTS.md` - This file
- `server/MIGRATION_GUIDE.md` - Database migration guide
