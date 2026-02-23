# WorkGrid - Agent Development Guide

## Project Overview

WorkGrid is a Discord-like real-time team collaboration platform with web, mobile (Android), and desktop (Electron) support. The application features user authentication, server/channel management, real-time messaging with Socket.IO, file sharing, message reactions, reply functionality, message editing/deletion, and a Discord-inspired UI.

**Deployed URL**: https://xoqeprkp54f74.ok.kimi.link

**Language**: Project UI uses Indonesian (Bahasa Indonesia) for user-facing text.

---

## Technology Stack

### Frontend (`/app`)
- **Framework**: React 19.2.0 with TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 3.4.19 with CSS variables
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Icons**: Lucide React
- **State Management**: React Context API (`AuthContext`)
- **HTTP Client**: Fetch API
- **Real-time**: Socket.IO Client 4.8.3
- **Mobile**: Capacitor 8.1.0 for Android builds
- **Desktop**: Electron 40.6.0 with electron-builder

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express 4.18.2
- **Real-time**: Socket.IO 4.7.2
- **Database**: 
  - SQLite3 5.1.7 (development, file-based at `server/workgrid.db`)
  - PostgreSQL 12+ (production, supports 110+ concurrent users)
- **Authentication**: JWT (jsonwebtoken 9.0.3) + bcryptjs for password hashing
- **File Uploads**: Multer 2.0.2
- **CORS**: Enabled for all origins

### Deployment
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (reverse proxy, load balancer)
- **Cache**: Redis (session store, rate limiting)
- **SSL**: Let's Encrypt (optional)

### Voice (WebRTC)
- **Library**: Simple-Peer (WebRTC wrapper)
- **Transport**: Socket.IO for signaling
- **STUN**: Google STUN servers (free)
- **TURN**: Coturn (optional, for production)

---

## Project Structure

```
/
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── ui/              # shadcn/ui components (50+ components)
│   │   │   ├── ChatLayout.tsx   # Main chat interface layout
│   │   │   ├── ChatArea.tsx     # Message display area
│   │   │   ├── ChannelList.tsx  # Server channels sidebar
│   │   │   ├── ServerList.tsx   # Server list sidebar
│   │   │   ├── MemberList.tsx   # Server members display
│   │   │   ├── MessageInput.tsx # Message input component
│   │   │   ├── EmojiPicker.tsx  # Emoji selection component
│   │   │   ├── ImageViewer.tsx  # Image preview modal
│   │   │   ├── SettingsModal.tsx # User settings modal
│   │   │   ├── MessageContextMenu.tsx # Right-click message menu
│   │   │   ├── UserProfilePopup.tsx # User profile popup
│   │   │   ├── TitleBar.tsx     # Electron custom title bar
│   │   │   ├── Login.tsx        # Login page
│   │   │   ├── Register.tsx     # Registration page
│   │   │   ├── FriendsPage.tsx  # Friends management page
│   │   │   ├── DMList.tsx       # Direct message channels list
│   │   │   ├── DMChatArea.tsx   # DM chat interface
│   │   │   ├── MobileHeader.tsx # Mobile navigation header
│   │   │   ├── MobileBottomNav.tsx # Mobile bottom navigation
│   │   │   ├── MobileDrawer.tsx # Mobile sidebar drawers
│   │   │   ├── VoiceChannelPanel.tsx # Voice channel UI
│   │   │   ├── CategoryItem.tsx # Channel category component
│   │   │   ├── CreateCategoryModal.tsx # Create category dialog
│   │   │   └── RenameCategoryModal.tsx # Rename category dialog
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Authentication state management
│   │   ├── hooks/
│   │   │   ├── useSocket.ts     # Socket.IO connection hook
│   │   │   ├── useVoiceChannel.ts # WebRTC voice channel hook
│   │   │   ├── use-mobile.ts    # Mobile detection hook
│   │   │   ├── useBreakpoint.ts # Responsive breakpoint hook
│   │   │   └── useNotification.ts # Notification hook
│   │   ├── types/
│   │   │   ├── index.ts         # TypeScript interfaces
│   │   │   ├── voice.ts         # Voice channel types
│   │   │   └── electron.d.ts    # Electron type declarations
│   │   ├── lib/
│   │   │   └── utils.ts         # Utility functions (cn helper)
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   ├── App.css              # Component-specific styles
│   │   └── index.css            # Global styles (Discord theme)
│   ├── electron/                # Electron desktop app
│   │   ├── main.cjs             # Main Electron process
│   │   └── preload.cjs          # Preload script
│   ├── dist/                    # Build output (for deployment)
│   ├── android/                 # Capacitor Android project
│   ├── public/                  # Static assets
│   ├── capacitor.config.ts      # Capacitor mobile config
│   ├── components.json          # shadcn/ui configuration
│   ├── eslint.config.js         # ESLint configuration
│   ├── package.json             # Dependencies and scripts
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── tsconfig.json            # TypeScript configuration
│   ├── tsconfig.app.json        # TypeScript app config
│   ├── tsconfig.node.json       # TypeScript node config
│   └── vite.config.ts           # Vite configuration
│
├── server/                      # Backend Express server
│   ├── server.js                # Main server file
│   ├── database.js              # SQLite database module
│   ├── database-postgres.js     # PostgreSQL database module
│   ├── database-sqlite-backup.js # SQLite backup
│   ├── Dockerfile               # Backend Docker image
│   ├── .dockerignore            # Docker ignore rules
│   ├── config/
│   │   └── database.js          # PostgreSQL connection config
│   ├── webrtc/                  # WebRTC voice signaling
│   │   └── signaling.js         # Voice signaling server
│   ├── migrations/              # Database migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_migrate_sqlite_to_postgres.js
│   │   └── setup-postgres.js
│   ├── scripts/                 # Migration scripts
│   │   ├── backup-sqlite.ps1
│   │   ├── switch-to-postgres.ps1
│   │   └── rollback-to-sqlite.ps1
│   ├── MIGRATION_GUIDE.md       # PostgreSQL migration guide
│   ├── uploads/                 # File upload directory
│   ├── workgrid.db              # SQLite database file
│   └── package.json             # Server dependencies
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
├── docker-compose.yml           # Docker Compose (dev/prod)
├── docker-compose.prod.yml      # Docker Compose (production)
├── .env                         # Environment variables
├── .env.example                 # Environment example
├── .dockerignore                # Docker ignore
└── DOCKER_DEPLOYMENT_GUIDE.md   # Docker deployment guide
│
└── docs/                        # Documentation
    ├── BUG_REPORT.md            # Bug tracking and status
    └── CHANGELOG.md             # Version history
```

---

## Build and Development Commands

### Frontend (`/app`)

```bash
cd app

# Install dependencies
npm install

# Development server (runs on http://localhost:5173)
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Backend (`/server`)

```bash
cd server

# Install dependencies
npm install

# Start server (runs on http://localhost:3001)
npm start

# Development with auto-reload (requires nodemon)
npm run dev

# PostgreSQL Migration
npm run setup:postgres         # Setup PostgreSQL database
npm run migrate               # Migrate data from SQLite

# Or use PowerShell scripts
cd scripts
.\switch-to-postgres.ps1     # Switch to PostgreSQL
.\rollback-to-sqlite.ps1     # Rollback to SQLite
.\backup-sqlite.ps1          # Backup SQLite database
```

### Docker Deployment

```bash
# Root project folder

# Development
docker-compose up --build -d

# Production (with load balancing)
docker-compose -f docker-compose.prod.yml up -d

# Using npm scripts
npm run docker:up          # Start containers
npm run docker:down        # Stop containers
npm run docker:logs        # View logs
npm run deploy             # Full deployment
npm run backup             # Backup database
npm run restore            # Restore database
```

### Desktop (Electron)

```bash
cd app

# Run in development mode
npm run electron:dev

# Build for current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:win    # Windows
npm run electron:build:mac    # macOS
npm run electron:build:linux  # Linux

# Output directory: app/release/
```

### Android APK Build

```bash
cd app

# Sync web assets to Android project
npx cap sync

# Build debug APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

Or build with Android Studio:
1. Open folder `android/` in Android Studio
2. Wait for Gradle sync to complete
3. Select menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**

---

## Environment Variables

### Development (`app/.env`)
```env
VITE_API_URL=/api
VITE_SOCKET_URL=
```

### Production (`app/.env.production`)
```env
VITE_API_URL=https://xoqeprkp54f74.ok.kimi.link/api
VITE_SOCKET_URL=https://xoqeprkp54f74.ok.kimi.link
```

### Server Environment Variables
The server uses these environment variables (with defaults):
- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - JWT signing secret (default: 'workgrid-secret-key-change-in-production')
- `USE_POSTGRES` - Use PostgreSQL instead of SQLite (default: false)

Create a `.env` file in the `server/` directory:

**SQLite (Default):**
```env
PORT=3001
JWT_SECRET=your-secret-key-here
USE_POSTGRES=false
```

**PostgreSQL (Production):**
```env
PORT=3001
JWT_SECRET=your-secret-key-here
USE_POSTGRES=true

# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=discord_clone
DB_USER=discord_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# Or use DATABASE_URL
DATABASE_URL=postgresql://user:password@host:5432/database
```

**Docker Environment (Root `.env`):**
```env
# Database
DB_PASSWORD=your_secure_password
DB_PORT=5432

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL (untuk CORS)
FRONTEND_URL=http://localhost

# Node Environment
NODE_ENV=production
```

---

## API & WebSocket Specification

### REST API Endpoints

#### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |

#### Users
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get current user | Yes |
| PUT | `/api/users/profile` | Update profile | Yes |
| PUT | `/api/users/password` | Change password | Yes |
| POST | `/api/users/avatar` | Upload avatar | Yes |
| GET | `/api/users/search` | Search users by username/email | Yes |
| GET | `/api/users/by-username/:username` | Get user by username | Yes |
| GET | `/api/servers/:serverId/users/:userId` | Get user profile with role | Yes |
| PUT | `/api/servers/:serverId/members/:userId/role` | Update user role (owner only) | Yes |
| DELETE | `/api/servers/:serverId/members/:userId` | Kick member from server | Yes |
| POST | `/api/servers/:serverId/bans/:userId` | Ban member from server | Yes |
| GET | `/api/servers/:serverId/permissions` | Get user's permissions in server | Yes |

#### Servers
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/servers` | Get all servers for user | Yes |
| POST | `/api/servers` | Create new server | Yes |
| DELETE | `/api/servers/:serverId` | Delete server (owner only) | Yes |
| GET | `/api/servers/:serverId/channels` | Get channels in server | Yes |
| POST | `/api/servers/:serverId/channels` | Create channel | Yes |
| GET | `/api/servers/:serverId/members` | Get server members | Yes |
| POST | `/api/servers/:serverId/categories` | Create channel category | Yes |
| GET | `/api/servers/:serverId/categories` | Get categories with channels | Yes |
| PUT | `/api/servers/:serverId/categories/reorder` | Reorder categories | Yes |
| PUT | `/api/servers/:serverId/channels/reorder` | Reorder channels | Yes |

#### Channels
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| DELETE | `/api/channels/:channelId` | Delete channel | Yes |
| GET | `/api/channels/:channelId/messages` | Get messages in channel | Yes |
| PUT | `/api/channels/:channelId/move` | Move channel to category | Yes |

#### Categories
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PUT | `/api/categories/:categoryId` | Update category | Yes |
| DELETE | `/api/categories/:categoryId` | Delete category | Yes |

#### Invites
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/servers/:serverId/invites` | Create invite link | Yes |
| POST | `/api/invites/:code/join` | Join server with invite | Yes |

#### Friends
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/friends` | Get friend list | Yes |
| GET | `/api/friends/pending` | Get pending friend requests | Yes |
| GET | `/api/friends/blocked` | Get blocked users | Yes |
| POST | `/api/friends/request` | Send friend request | Yes |
| POST | `/api/friends/:requestId/accept` | Accept friend request | Yes |
| POST | `/api/friends/:requestId/reject` | Reject friend request | Yes |
| DELETE | `/api/friends/:requestId/cancel` | Cancel outgoing request | Yes |
| DELETE | `/api/friends/:friendId` | Remove friend | Yes |
| POST | `/api/friends/:userId/block` | Block user | Yes |
| POST | `/api/friends/:userId/unblock` | Unblock user | Yes |
| GET | `/api/friends/status/:userId` | Check friendship status | Yes |

#### Direct Messages
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/dm/channels` | Get DM channels | Yes |
| POST | `/api/dm/channels` | Create DM channel with friend | Yes |
| GET | `/api/dm/channels/:channelId/messages` | Get DM messages | Yes |
| POST | `/api/dm/channels/:channelId/messages` | Send DM message | Yes |
| POST | `/api/dm/messages/:messageId/read` | Mark DM message as read | Yes |
| GET | `/api/dm/unread-count` | Get total unread DM count | Yes |
| DELETE | `/api/dm/channels/:channelId` | Delete DM channel | Yes |

#### Voice Channels
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| WS | `join-voice-channel` | Join voice channel | Yes |
| WS | `leave-voice-channel` | Leave voice channel | Yes |
| WS | `voice-state-change` | Update mute/deafen state | Yes |
| WS | `signal` | WebRTC signaling (SDP/ICE) | Yes |

#### Messages
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/channels/:channelId/messages` | Get messages in channel | Yes |
| POST | `/api/messages/:messageId/reactions` | Add reaction to message | Yes |
| DELETE | `/api/messages/:messageId/reactions` | Remove reaction from message | Yes |

#### Files
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/upload` | Upload file (10MB limit) | Yes |

### WebSocket Events

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `token: string` | Authenticate socket connection |
| `join_channel` | `channelId: string` | Join a channel room |
| `leave_channel` | `channelId: string` | Leave a channel room |
| `send_message` | `{ channelId, content, replyTo?, attachments? }` | Send a message |
| `typing` | `{ channelId }` | Typing indicator |
| `add_reaction` | `{ messageId, emoji }` | Add reaction to message |
| `remove_reaction` | `{ messageId, emoji }` | Remove reaction from message |
| `edit_message` | `{ messageId, content }` | Edit a message |
| `delete_message` | `{ messageId }` | Delete a message |
| `send_friend_request` | `{ friendId }` | Send friend request |
| `accept_friend_request` | `{ requestId }` | Accept friend request |
| `reject_friend_request` | `{ requestId }` | Reject friend request |
| `remove_friend` | `{ friendId }` | Remove friend |
| `block_user` | `{ userId }` | Block user |
| `unblock_user` | `{ userId }` | Unblock user |
| `join_dm_channel` | `channelId: string` | Join DM channel |
| `leave_dm_channel` | `channelId: string` | Leave DM channel |
| `send_dm_message` | `{ channelId, content, attachments? }` | Send DM message |
| `dm_typing` | `{ channelId }` | DM typing indicator |
| `create_category` | `{ serverId, name, position }` | Create category |
| `delete_category` | `{ categoryId }` | Delete category |
| `move_channel` | `{ channelId, categoryId, position }` | Move channel |

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `authenticated` | `{ success, userId }` | Authentication confirmed |
| `auth_error` | `error: string` | Authentication failed |
| `new_message` | `Message` | New message in channel |
| `user_typing` | `{ userId, username, channelId }` | User typing notification |
| `user_status_changed` | `{ userId, status }` | User status update |
| `reaction_added` | `{ messageId, reactions, userId, emoji }` | Reaction added |
| `reaction_removed` | `{ messageId, reactions, userId, emoji }` | Reaction removed |
| `message_edited` | `Message` | Message was edited |
| `message_deleted` | `{ messageId }` | Message was deleted |
| `friend_request_received` | `{ requestId, userId, username, avatar }` | Friend request received |
| `friend_request_accepted` | `{ friendId, username, avatar }` | Friend request accepted |
| `friend_removed` | `{ friendId }` | Friend removed |
| `blocked_by_user` | `{ blockedById }` | Blocked by another user |
| `dm_message_received` | `{ channelId, message, sender }` | DM message received |
| `dm_channel_updated` | `{ channelId, lastMessage, unreadCount }` | DM channel updated |
| `dm_typing` | `{ channelId, userId, username }` | DM typing indicator |
| `category_created` | `{ serverId, category }` | Category created |
| `category_updated` | `{ categoryId, updates, serverId }` | Category updated |
| `category_deleted` | `{ categoryId, serverId }` | Category deleted |
| `channel_moved` | `{ channelId, categoryId, position, serverId }` | Channel moved |
| `categories_reordered` | `{ serverId, categoryIds }` | Categories reordered |
| `channels_reordered` | `{ serverId, channels }` | Channels reordered |
| `voice-channel-joined` | `{ channelId, participants, isMuted, isDeafened }` | Successfully joined voice channel |
| `user-joined-voice` | `{ userId, socketId, username, avatar, isMuted, isDeafened }` | User joined voice channel |
| `user-left-voice` | `{ userId, socketId }` | User left voice channel |
| `voice-state-changed` | `{ userId, isMuted, isDeafened }` | User mute/deafen state changed |
| `signal` | `{ from, userId, username, signal, channelId }` | WebRTC signaling data |
| `voice-error` | `{ message }` | Voice channel error |
| `error` | `{ message, error? }` | Error message |

---

## Database Support

The application supports both **SQLite** (default) and **PostgreSQL** (for production/concurrent users).

### SQLite (Default - Development)
- **File**: `server/workgrid.db`
- **Use case**: Development, single-user testing
- **Max concurrent**: ~10-20 users
- **Zero configuration**

### PostgreSQL (Production - 110+ Users)
- **Connection**: Configurable via environment variables
- **Use case**: Production, 110+ concurrent users
- **Connection pool**: 25 connections
- **Features**: Full ACID transactions, better concurrency

See `server/MIGRATION_GUIDE.md` for detailed migration instructions.

---

## Database Schema (SQLite/PostgreSQL)

### Tables

**users**
- `id` (TEXT PRIMARY KEY)
- `username` (TEXT UNIQUE NOT NULL)
- `email` (TEXT UNIQUE NOT NULL)
- `password` (TEXT NOT NULL)
- `avatar` (TEXT)
- `status` (TEXT DEFAULT 'offline')
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**servers**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `icon` (TEXT)
- `owner_id` (TEXT NOT NULL, FOREIGN KEY)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**server_members**
- `id` (TEXT PRIMARY KEY)
- `server_id` (TEXT NOT NULL, FOREIGN KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `role` (TEXT DEFAULT 'member')
- `joined_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**categories**
- `id` (TEXT PRIMARY KEY)
- `server_id` (TEXT NOT NULL, FOREIGN KEY)
- `name` (TEXT NOT NULL)
- `position` (INTEGER DEFAULT 0)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**channels**
- `id` (TEXT PRIMARY KEY)
- `server_id` (TEXT NOT NULL, FOREIGN KEY)
- `category_id` (TEXT, FOREIGN KEY)
- `name` (TEXT NOT NULL)
- `type` (TEXT DEFAULT 'text')
- `position` (INTEGER DEFAULT 0)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**messages**
- `id` (TEXT PRIMARY KEY)
- `channel_id` (TEXT NOT NULL, FOREIGN KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `content` (TEXT)
- `reply_to_id` (TEXT, FOREIGN KEY)
- `attachments` (TEXT - JSON string)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `edited_at` (DATETIME)

**reactions**
- `id` (TEXT PRIMARY KEY)
- `message_id` (TEXT NOT NULL, FOREIGN KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `emoji` (TEXT NOT NULL)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**invites**
- `id` (TEXT PRIMARY KEY)
- `server_id` (TEXT NOT NULL, FOREIGN KEY)
- `code` (TEXT UNIQUE NOT NULL)
- `created_by` (TEXT NOT NULL, FOREIGN KEY)
- `expires_at` (DATETIME)
- `max_uses` (INTEGER)
- `uses` (INTEGER DEFAULT 0)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**friendships**
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `friend_id` (TEXT NOT NULL, FOREIGN KEY)
- `status` (TEXT DEFAULT 'pending')
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- UNIQUE(user_id, friend_id)

**dm_channels**
- `id` (TEXT PRIMARY KEY)
- `user1_id` (TEXT NOT NULL, FOREIGN KEY)
- `user2_id` (TEXT NOT NULL, FOREIGN KEY)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- UNIQUE(user1_id, user2_id)

**dm_messages**
- `id` (TEXT PRIMARY KEY)
- `channel_id` (TEXT NOT NULL, FOREIGN KEY)
- `sender_id` (TEXT NOT NULL, FOREIGN KEY)
- `content` (TEXT)
- `attachments` (TEXT)
- `is_read` (BOOLEAN DEFAULT 0)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `edited_at` (DATETIME)

**bans**
- `id` (TEXT PRIMARY KEY)
- `server_id` (TEXT NOT NULL, FOREIGN KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `reason` (TEXT)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- UNIQUE(server_id, user_id)

**voice_participants** (PostgreSQL: UUID PRIMARY KEY DEFAULT uuid_generate_v4())
- `id` (TEXT PRIMARY KEY)
- `channel_id` (TEXT NOT NULL, FOREIGN KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `is_muted` (BOOLEAN DEFAULT 0)
- `is_deafened` (BOOLEAN DEFAULT 0)
- `joined_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- UNIQUE(channel_id, user_id)

**voice_signaling_logs**
- `id` (TEXT PRIMARY KEY)
- `channel_id` (TEXT NOT NULL)
- `user_id` (TEXT NOT NULL)
- `event_type` (TEXT NOT NULL)
- `data` (JSON - optional, for debugging)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

---

## Code Style Guidelines

### TypeScript
- **Target**: ES2022
- **Strict mode**: Enabled
- **No unused locals/parameters**: Enforced
- **Path aliases**: Use `@/` prefix for imports (e.g., `@/components/ui/button`)

### Component Structure
- Functional components with TypeScript interfaces
- Props interfaces defined inline or in `types/index.ts`
- shadcn/ui components follow the pattern: `src/components/ui/[component].tsx`

### Styling
- **Primary method**: Tailwind CSS utility classes
- **Custom styles**: CSS variables in `index.css` (Discord color scheme)
- **Component variants**: Use `class-variance-authority` (cva) for variant management
- **Utility**: Use `cn()` helper from `@/lib/utils` for conditional class merging

### Naming Conventions
- Components: PascalCase (e.g., `ChatLayout.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useSocket.ts`)
- Utilities: camelCase (e.g., `utils.ts`)
- Types/Interfaces: PascalCase (e.g., `User`, `Message`)

### Import Order
1. React imports
2. Third-party libraries
3. Local components (@/components)
4. Hooks (@/hooks)
5. Contexts (@/contexts)
6. Types (@/types)
7. Utilities (@/lib)

---

## Type Definitions

Key interfaces defined in `app/src/types/index.ts`:

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
}

interface Server {
  id: string;
  name: string;
  icon: string;
}

interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
  channels?: Channel[];
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  serverId: string;
  categoryId?: string | null;
  position: number;
}

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface FileAttachment {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: string;
  user: User;
  replyTo?: Message | null;
  reactions?: Reaction[];
  editedAt?: string;
  attachments?: FileAttachment[];
}

interface ServerMember extends User {
  role: 'owner' | 'admin' | 'moderator' | 'member';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface DMChannel {
  id: string;
  friend: User;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  updatedAt: string;
}

interface DMMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  sender_username?: string;
  sender_avatar?: string;
  attachments?: FileAttachment[];
  isRead: boolean;
  createdAt: string;
  editedAt?: string;
}
```

---

## Testing Strategy

⚠️ **No test framework is currently configured**. Consider adding:
- Vitest for unit testing
- React Testing Library for component tests
- Playwright or Cypress for E2E testing

### Manual Testing Checklist
- [ ] Register with email valid
- [ ] Login with kredensial benar
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

---

## Security Considerations

### Current Implementation
- **Authentication**: JWT with Bearer token stored in localStorage (expires in 7 days)
- **Password Hashing**: bcryptjs with 10 salt rounds
- **File Uploads**: Limited to 10MB, filtered by MIME type
- **CORS**: Enabled for all origins (development-friendly, review for production)
- **Role-based Permissions**: Discord-like permission bitfield system

### Permission System
Roles hierarchy: owner > admin > moderator > member

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

### File Upload Restrictions
Allowed MIME types:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Other: `text/plain`, `application/zip`

### Known Security Issues (See docs/BUG_REPORT.md)
**Critical (Open)**:
- BUG-003: No rate limiting on API endpoints (brute force vulnerable)
- BUG-004: Socket join channel no auth check
- BUG-005: Socket send message no channel verification
- BUG-010: Socket remove reaction no ownership check

**Medium Priority**:
- BUG-013: CORS allows all origins
- BUG-014: No input sanitization (XSS risk)

### Recommendations for Production
1. Change default JWT secret to a secure random string
2. Implement HTTPS for production
3. Add rate limiting (express-rate-limit)
4. Review CORS policy for specific origins only
5. Add input validation middleware (zod or joi)
6. Implement file upload virus scanning
7. Add database connection pooling for better performance
8. Add socket event authorization checks
9. Sanitize user input before storage/display

---

## shadcn/ui Components Available

The project has 50+ shadcn/ui components installed in `app/src/components/ui/`:

- **Layout**: accordion, card, collapsible, resizable, scroll-area, separator, sheet, sidebar
- **Forms**: button, checkbox, input, input-otp, radio-group, select, slider, switch, textarea
- **Feedback**: alert, alert-dialog, progress, skeleton, sonner, spinner
- **Navigation**: breadcrumb, command, context-menu, dropdown-menu, menubar, navigation-menu, pagination, tabs
- **Overlays**: dialog, drawer, hover-card, popover, tooltip
- **Data Display**: aspect-ratio, avatar, badge, calendar, carousel, chart, table
- **Utilities**: button-group, empty, field, form, input-group, item, kbd, label, toggle, toggle-group

To add a new shadcn/ui component:
```bash
cd app
npx shadcn@latest add [component-name]
```

---

## Deployment

### Web Deployment
- Build output is in `app/dist/`
- Currently deployed at: https://xoqeprkp54f74.ok.kimi.link
- Uses environment variables from `.env.production`

### Mobile Deployment
- Android project configured in `app/android/`
- App ID: `com.chatcord.app`
- App Name: `ChatCord`
- Requires Android Studio for APK generation

### Desktop Deployment
- Electron builds for Windows, macOS, and Linux
- Output directory: `app/release/`
- App ID: `com.workgrid.app`
- Product Name: `WorkGrid`

---

## Default Seed Data

On first server start, the following seed data is created:
- **Admin User**: `admin@workgrid.com` / `admin123`
- **Default Server**: "WorkGrid Official"
- **Default Channels**: `selamat-datang`, `umum`, `bantuan` (text), `Suara Umum` (voice)

---

## Multi-Platform Notes

### Electron Detection
The app detects Electron runtime using:
```typescript
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
```

### API URL Resolution
- **Web**: Uses relative URLs or `VITE_API_URL` env var
- **Electron**: Uses absolute URL `http://localhost:3001/api`

This pattern is used in `AuthContext.tsx`, `useSocket.ts`, and `ChatLayout.tsx`.

### Environment Variable Handling
- Vite handles env vars with `import.meta.env.VITE_*` prefix
- Default values fallback to localhost for development
- Production values should be set in `.env.production`

---

## Documentation Files

- `README.md` - User-facing documentation (Indonesian language)
- `docs/BUG_REPORT.md` - Detailed bug tracking with severity levels
- `docs/CHANGELOG.md` - Version history and feature list
- `AGENTS.md` - This file - Agent development guide

---

## Known Issues & TODOs

See `docs/BUG_REPORT.md` for complete bug tracking.

### Critical Issues (6 Fixed, 4 Open)
- ✅ JWT tokens now expire in 7 days
- ✅ Username uniqueness validation
- ✅ Fixed user status with multiple tabs
- ✅ Fixed typing indicator timeout
- ✅ Fixed memory leak in useSocket
- ✅ Fixed avatar infinite loop
- ⏳ No rate limiting on API endpoints
- ⏳ Socket events need better authorization checks

### Feature TODOs
1. **Tests**: No testing framework configured
2. **Rate Limiting**: Not implemented
3. **Input Validation**: Could be strengthened with schema validation
4. **File Security**: No virus scanning for uploads
5. **Database**: SQLite is suitable for small deployments; consider PostgreSQL for scale
6. **Voice Chat**: Not yet implemented
7. **Message Search**: Not yet implemented
