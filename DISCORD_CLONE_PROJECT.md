# 🚀 DISCORD CLONE - PROJECT BLUEPRINT
## Full-Featured Real-Time Communication Platform

---

## 📋 DAFTAR FITUR LENGKAP (Discord Feature Parity)

### ✅ CORE FEATURES (MUST HAVE)

#### 1. Authentication & User Management
- [ ] User Registration (Email/Password)
- [ ] User Login/Logout
- [ ] JWT Token Authentication
- [ ] Refresh Token Mechanism
- [ ] Email Verification
- [ ] Forgot Password/Reset Password
- [ ] Two-Factor Authentication (2FA)
- [ ] OAuth2 Integration (Google, GitHub, Discord)
- [ ] User Profile Management
  - [ ] Avatar upload
  - [ ] Username/Display name
  - [ ] Bio/About me
  - [ ] Custom status
  - [ ] Profile banner

#### 2. Server (Guild) Management
- [ ] Create Server
- [ ] Delete Server
- [ ] Server Settings
  - [ ] Server name & icon
  - [ ] Server description
  - [ ] Server region
  - [ ] AFK channel & timeout
  - [ ] System messages channel
- [ ] Server Boost (simulation)
- [ ] Server Insights/Analytics
- [ ] Server Template
- [ ] Invite Management
  - [ ] Create invite links
  - [ ] Set expiration
  - [ ] Set max uses
  - [ ] Revoke invites
- [ ] Ban/Kick/Mute members
- [ ] Audit Logs

#### 3. Channel Management
- [ ] Create Text Channel
- [ ] Create Voice Channel
- [ ] Create Category
- [ ] Create Announcement Channel
- [ ] Create Stage Channel
- [ ] Channel Settings
  - [ ] Channel name
  - [ ] Topic/description
  - [ ] Slow mode
  - [ ] Age restriction
  - [ ] NSFW toggle
- [ ] Channel Permissions
  - [ ] Role-based permissions
  - [ ] User-specific permissions
  - [ ] Sync with category
- [ ] Delete/Archive Channel
- [ ] Reorder channels (drag & drop)

#### 4. Role & Permission System
- [ ] Create Roles
- [ ] Delete Roles
- [ ] Role Hierarchy
- [ ] Role Colors
- [ ] Role Icons
- [ ] Permission System (bitfield)
  - [ ] Administrator
  - [ ] Manage Server
  - [ ] Manage Channels
  - [ ] Manage Roles
  - [ ] Manage Messages
  - [ ] View Audit Log
  - [ ] Kick Members
  - [ ] Ban Members
  - [ ] Send Messages
  - [ ] Connect (voice)
  - [ ] Speak (voice)
  - [ ] Video
  - [ ] Mute Members
  - [ ] Deafen Members
  - [ ] Move Members
  - [ ] And more...

#### 5. Real-Time Text Messaging
- [ ] Send Text Messages
- [ ] Edit Messages
- [ ] Delete Messages (soft delete)
- [ ] Reply to Messages
- [ ] Thread Creation
- [ ] Message Reactions (Emoji)
  - [ ] Unicode emoji
  - [ ] Custom emoji
  - [ ] Animated emoji
- [ ] Message Attachments
  - [ ] Images (PNG, JPG, GIF, WebP)
  - [ ] Videos (MP4, WebM)
  - [ ] Audio (MP3, WAV, OGG)
  - [ ] Documents (PDF, DOC, etc.)
  - [ ] File size limits (25MB default)
- [ ] Embed Support
  - [ ] Link previews
  - [ ] Image embeds
  - [ ] Video embeds
- [ ] Markdown Support
  - [ ] Bold, Italic, Underline, Strikethrough
  - [ ] Code blocks (inline & multi-line)
  - [ ] Syntax highlighting
  - [ ] Blockquotes
  - [ ] Spoilers
  - [ ] Mentions (@user, @role, @everyone, @here)
- [ ] Typing Indicators
- [ ] Read Receipts
- [ ] Message History/Pagination
- [ ] Message Search
  - [ ] By content
  - [ ] By author
  - [ ] By date range
  - [ ] By mentions
  - [ ] By attachments
- [ ] Pin Messages
- [ ] Message Actions
  - [ ] Copy message ID
  - [ ] Copy message link
  - [ ] Mark unread
  - [ ] Copy text

#### 6. Voice & Video Communication
- [ ] Join Voice Channel
- [ ] Leave Voice Channel
- [ ] Mute/Unmute
- [ ] Deafen/Undeafen
- [ ] Video On/Off
- [ ] Screen Sharing
  - [ ] Share entire screen
  - [ ] Share specific window
  - [ ] Share browser tab
- [ ] Camera Background (virtual background)
- [ ] Noise Suppression
- [ ] Echo Cancellation
- [ ] Push to Talk
- [ ] Voice Activity Detection
- [ ] Volume Control (per user)
- [ ] Server Deafen/Server Mute (admin)
- [ ] Move users between channels
- [ ] Voice Region Selection
- [ ] Bitrate Configuration

#### 7. Direct Messages (DM)
- [ ] One-on-one DM
- [ ] Group DM (up to 10 users)
- [ ] DM Settings
  - [ ] Block user
  - [ ] Mute notifications
  - [ ] Delete conversation
- [ ] Call in DM
- [ ] Video call in DM

#### 8. Friend System
- [ ] Send Friend Request
- [ ] Accept/Reject Friend Request
- [ ] Remove Friend
- [ ] Block User
- [ ] Friend List
  - [ ] Online friends
  - [ ] All friends
  - [ ] Pending requests
  - [ ] Blocked users
- [ ] Mutual Servers
- [ ] Mutual Friends

#### 9. Notifications
- [ ] Push Notifications
  - [ ] Desktop notifications
  - [ ] Mobile push notifications
- [ ] Notification Settings (per server)
  - [ ] All messages
  - [ ] Only @mentions
  - [ ] Nothing
- [ ] Notification Settings (per channel)
- [ ] Email Notifications
  - [ ] Missed messages
  - [ ] Friend requests
- [ ] Do Not Disturb mode
- [ ] Mention Badge Counter

#### 10. User Presence & Status
- [ ] Online Status
- [ ] Idle Status (auto)
- [ ] Do Not Disturb Status
- [ ] Invisible Status
- [ ] Custom Status
  - [ ] Text
  - [ ] Emoji
  - [ ] Clear after time
- [ ] Activity Status
  - [ ] Playing game
  - [ ] Listening to Spotify
  - [ ] Custom activity
- [ ] Last Seen/Online indicator

### 🎨 ADVANCED FEATURES (NICE TO HAVE)

#### 11. Server Discovery
- [ ] Public Server Directory
- [ ] Server Categories
- [ ] Server Search
- [ ] Server Tags
- [ ] Featured Servers

#### 12. Integrations & Bots
- [ ] Bot Framework
- [ ] Webhook Support
- [ ] Slash Commands
- [ ] Custom Emojis/Stickers
  - [ ] Upload custom emoji
  - [ ] Animated emoji
  - [ ] Emoji packs
- [ ] Soundboard

#### 13. Content Moderation
- [ ] Auto-moderation
  - [ ] Spam detection
  - [ ] Bad word filter
  - [ ] Link filtering
  - [ ] Mention spam protection
- [ ] Content Scanning
  - [ ] NSFW image detection
  - [ ] Malware scanning
- [ ] Timeout Users
- [ ] Quarantine System

#### 14. Analytics & Insights
- [ ] Server Analytics Dashboard
- [ ] Member Growth Charts
- [ ] Message Activity Stats
- [ ] Voice Activity Stats
- [ ] Peak Activity Times

#### 15. Monetization (Optional)
- [ ] Server Boosting System
- [ ] Premium Tiers
- [ ] Subscription System

---

## 🏗️ ARSITEKTUR TEKNOLOGI

### Tech Stack Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + TypeScript)             │
├─────────────────────────────────────────────────────────────────┤
│  • React 18+ with TypeScript                                    │
│  • State: Zustand + React Query                                 │
│  • Styling: Tailwind CSS + Headless UI                          │
│  • Real-time: Socket.io Client                                  │
│  • WebRTC: Mediasoup Client                                     │
│  • Routing: React Router v6                                     │
│  • Build: Vite                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js + NestJS)                │
├─────────────────────────────────────────────────────────────────┤
│  • Framework: NestJS (TypeScript)                               │
│  • Database: PostgreSQL (Prisma ORM)                            │
│  • Cache: Redis                                                 │
│  • Message Queue: Bull Queue + Kafka                            │
│  • Real-time: Socket.io + Redis Adapter                         │
│  • File Storage: Cloudflare R2 / AWS S3                         │
│  • Search: Meilisearch                                          │
│  • Auth: JWT + Passport.js                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────────────┤
│  • WebSocket Gateway: Socket.io                                 │
│  • Media Server: Mediasoup (SFU)                                │
│  • TURN Server: Coturn                                          │
│  • Signaling: Socket.io                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema (Simplified)

```prisma
// User & Authentication
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  email         String    @unique
  passwordHash  String
  avatar        String?
  banner        String?
  bio           String?
  status        String    @default("offline")
  customStatus  String?
  is2FAEnabled  Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  servers       ServerMember[]
  messages      Message[]
  friends       Friendship[]
  sessions      UserSession[]
}

// Server (Guild)
model Server {
  id          String   @id @default(uuid())
  name        String
  icon        String?
  banner      String?
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  
  owner       User           @relation(fields: [ownerId], references: [id])
  members     ServerMember[]
  channels    Channel[]
  roles       Role[]
  invites     Invite[]
}

// Channels
model Channel {
  id          String      @id @default(uuid())
  serverId    String
  name        String
  type        ChannelType @default(TEXT)
  topic       String?
  position    Int         @default(0)
  parentId    String?
  createdAt   DateTime    @default(now())
  
  server      Server      @relation(fields: [serverId], references: [id])
  messages    Message[]
}

// Messages
model Message {
  id          String   @id @default(uuid())
  channelId   String
  authorId    String
  content     String?
  isEdited    Boolean  @default(false)
  replyToId   String?
  isPinned    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  channel     Channel      @relation(fields: [channelId], references: [id])
  author      User         @relation(fields: [authorId], references: [id])
  attachments Attachment[]
  reactions   Reaction[]
}

// Add more models as needed...
```

---

## 📁 STRUKTUR FOLDER PROJECT

```
discord-clone/
├── 📁 apps/
│   ├── 📁 web/                          # Frontend React App
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/
│   │   │   │   ├── 📁 ui/              # Reusable UI components
│   │   │   │   ├── 📁 layout/          # Layout components
│   │   │   │   ├── 📁 server/          # Server-related components
│   │   │   │   ├── 📁 channel/         # Channel components
│   │   │   │   ├── 📁 chat/            # Chat components
│   │   │   │   ├── 📁 voice/           # Voice/video components
│   │   │   │   └── 📁 modals/          # Modal components
│   │   │   ├── 📁 hooks/               # Custom React hooks
│   │   │   ├── 📁 stores/              # Zustand stores
│   │   │   ├── 📁 lib/                 # Utilities & services
│   │   │   ├── 📁 types/               # TypeScript types
│   │   │   ├── 📁 api/                 # API functions
│   │   │   └── 📁 styles/              # Global styles
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   │
│   ├── 📁 api/                          # Backend API (NestJS)
│   │   ├── 📁 src/
│   │   │   ├── 📁 auth/                # Authentication module
│   │   │   ├── 📁 users/               # User management
│   │   │   ├── 📁 servers/             # Server operations
│   │   │   ├── 📁 channels/            # Channel management
│   │   │   ├── 📁 messages/            # Messaging system
│   │   │   ├── 📁 roles/               # Role & permissions
│   │   │   ├── 📁 friends/             # Friend system
│   │   │   ├── 📁 voice/               # Voice/video signaling
│   │   │   ├── 📁 gateway/             # WebSocket gateway
│   │   │   ├── 📁 common/              # Shared utilities
│   │   │   └── 📁 database/            # Prisma schema & migrations
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── 📁 websocket/                    # WebSocket Server
│   │   ├── 📁 src/
│   │   │   ├── 📁 events/              # Socket event handlers
│   │   │   ├── 📁 rooms/               # Room management
│   │   │   └── 📁 middleware/          # Auth middleware
│   │   └── package.json
│   │
│   └── 📁 mediasoup/                    # Media Server (SFU)
│       ├── 📁 src/
│       │   ├── 📁 workers/             # Mediasoup workers
│       │   ├── 📁 rooms/               # Voice/video rooms
│       │   └── 📁 config/              # Mediasoup config
│       └── package.json
│
├── 📁 packages/
│   ├── 📁 shared/                       # Shared types & utilities
│   ├── 📁 ui/                           # Shared UI components
│   └── 📁 config/                       # Shared configs (ESLint, TS)
│
├── 📁 infrastructure/
│   ├── 📁 docker/                       # Docker configurations
│   ├── 📁 k8s/                          # Kubernetes manifests
│   ├── 📁 terraform/                    # Infrastructure as Code
│   └── 📁 scripts/                      # Deployment scripts
│
├── 📁 docs/                             # Documentation
├── docker-compose.yml                   # Local development
├── turbo.json                           # Monorepo config
└── package.json                         # Root package.json
```

---

## 🎯 ROADMAP PENGEMBANGAN (12 Minggu)

### Minggu 1-2: Foundation & Setup
**Sprint Goal: Project setup dan authentication system**

#### Tasks:
- [ ] Setup monorepo structure (Turborepo)
- [ ] Setup Docker untuk development
- [ ] Setup PostgreSQL & Redis dengan Docker Compose
- [ ] Setup backend NestJS project
- [ ] Setup frontend React + Vite project
- [ ] Setup Prisma ORM
- [ ] Create database schema (users, sessions)
- [ ] Implement user registration API
- [ ] Implement user login API
- [ ] Implement JWT authentication
- [ ] Implement refresh token
- [ ] Create login page UI
- [ ] Create register page UI
- [ ] Setup React Router
- [ ] Setup Zustand untuk auth state
- [ ] Connect frontend dengan backend auth
- [ ] Implement protected routes
- [ ] Implement logout functionality

**Deliverable:** User bisa register, login, logout

---

### Minggu 3-4: Server Management
**Sprint Goal: Server CRUD dan member management**

#### Tasks:
- [ ] Create Server model & API
- [ ] Implement create server endpoint
- [ ] Implement delete server endpoint
- [ ] Implement update server settings
- [ ] Implement get server by ID
- [ ] Implement list user servers
- [ ] Create ServerMember model
- [ ] Implement join server via invite
- [ ] Implement leave server
- [ ] Implement kick member
- [ ] Implement ban member
- [ ] Create server list sidebar UI
- [ ] Create server creation modal
- [ ] Create server settings page
- [ ] Implement server icon upload
- [ ] Create member list component
- [ ] Implement invite link generation

**Deliverable:** User bisa create, join, manage servers

---

### Minggu 5-6: Channel & Role System
**Sprint Goal: Channel management dan role-based permissions**

#### Tasks:
- [ ] Create Channel model & API
- [ ] Implement create channel endpoint
- [ ] Implement delete channel endpoint
- [ ] Implement update channel settings
- [ ] Implement channel reordering
- [ ] Create Category model
- [ ] Implement category management
- [ ] Create Role model
- [ ] Implement create role endpoint
- [ ] Implement delete role endpoint
- [ ] Implement update role permissions
- [ ] Implement role assignment
- [ ] Implement permission checking middleware
- [ ] Create channel list UI
- [ ] Create channel settings modal
- [ ] Create role management UI
- [ ] Implement drag & drop channels
- [ ] Create permission UI

**Deliverable:** Server dengan channels dan roles yang functional

---

### Minggu 7-8: Real-Time Messaging
**Sprint Goal: Text chat dengan real-time updates**

#### Tasks:
- [ ] Setup Socket.io server
- [ ] Setup Redis adapter untuk scaling
- [ ] Implement socket authentication
- [ ] Create Message model
- [ ] Implement send message endpoint
- [ ] Implement edit message endpoint
- [ ] Implement delete message endpoint
- [ ] Implement message history API dengan pagination
- [ ] Implement socket events untuk messages
- [ ] Create chat input component
- [ ] Create message list component
- [ ] Create message bubble component
- [ ] Implement message reactions
- [ ] Implement reply to message
- [ ] Implement message editing UI
- [ ] Implement message deletion UI
- [ ] Implement typing indicators
- [ ] Implement infinite scroll untuk messages
- [ ] Implement markdown rendering
- [ ] Implement emoji picker
- [ ] Implement mention highlighting

**Deliverable:** Real-time chat yang functional

---

### Minggu 9-10: Voice & Video
**Sprint Goal: Voice channels dengan WebRTC**

#### Tasks:
- [ ] Setup Mediasoup server
- [ ] Configure Mediasoup workers
- [ ] Implement signaling server (Socket.io)
- [ ] Setup Coturn TURN server
- [ ] Implement join voice channel
- [ ] Implement leave voice channel
- [ ] Implement WebRTC producer/consumer
- [ ] Implement mute/unmute
- [ ] Implement deafen/undeafen
- [ ] Implement video on/off
- [ ] Implement screen sharing
- [ ] Create voice channel UI
- [ ] Create voice controls component
- [ ] Create video grid component
- [ ] Implement voice activity detection
- [ ] Implement volume control
- [ ] Handle network disruptions

**Deliverable:** Voice & video chat yang functional

---

### Minggu 11: Direct Messages & Friends
**Sprint Goal: DM system dan friend management**

#### Tasks:
- [ ] Create Friendship model
- [ ] Implement send friend request
- [ ] Implement accept/reject friend request
- [ ] Implement remove friend
- [ ] Implement block user
- [ ] Create DM channel model
- [ ] Implement DM creation
- [ ] Implement DM messaging (reuse chat system)
- [ ] Create friends list UI
- [ ] Create friend requests UI
- [ ] Create DM list UI
- [ ] Implement user search
- [ ] Implement user profile modal

**Deliverable:** Friend system dan DM yang functional

---

### Minggu 12: Polish & Production
**Sprint Goal: Final polish dan production readiness**

#### Tasks:
- [ ] Implement notifications
- [ ] Implement user presence (online/idle/dnd)
- [ ] Implement custom status
- [ ] Implement message search
- [ ] Implement file upload dengan progress
- [ ] Implement image previews
- [ ] Implement mobile responsive
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add toast notifications
- [ ] Optimize performance
- [ ] Setup production Docker
- [ ] Setup CI/CD pipeline
- [ ] Write documentation
- [ ] Final testing & bug fixes

**Deliverable:** Production-ready Discord clone

---

## 🛠️ PROMPT UNTUK AI ASSISTANT (COPY & PASTE)

### Prompt #1: Project Setup
```
Saya ingin membuat Discord clone full-featured dengan tech stack berikut:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Query
- Backend: NestJS + PostgreSQL + Prisma + Redis
- Real-time: Socket.io + Redis Adapter
- Voice/Video: Mediasoup (SFU)
- File Storage: AWS S3 / Cloudflare R2

Buatkan saya:
1. Struktur folder monorepo lengkap dengan Turborepo
2. Docker Compose untuk development (PostgreSQL, Redis, MinIO)
3. Setup awal untuk setiap app (web, api, websocket, mediasoup)
4. Konfigurasi dasar (ESLint, Prettier, TypeScript, Tailwind)
5. README dengan cara menjalankan project

Pastikan struktur mengikuti best practices dan scalable.
```

### Prompt #2: Database Schema
```
Buatkan database schema lengkap dengan Prisma untuk Discord clone dengan model:

1. User (authentication, profile, settings)
2. Server (guilds, settings, invites)
3. ServerMember (membership, roles, bans)
4. Channel (text, voice, category, settings)
5. Message (content, replies, pins, edits)
6. Attachment (files, images, metadata)
7. Reaction (emoji reactions)
8. Role (permissions, colors, hierarchy)
9. Friendship (friend requests, blocks)
10. DMChannel (direct messages)
11. VoiceSession (active voice connections)
12. ReadReceipt (read message tracking)
13. AuditLog (server actions log)

Sertakan:
- Semua relations
- Indexes untuk performance
- Enum types
- Default values
- Constraints

Juga buatkan seed data untuk testing.
```

### Prompt #3: Authentication System
```
Implementasikan authentication system lengkap untuk Discord clone backend:

Backend (NestJS):
1. User registration endpoint dengan validation
2. User login dengan JWT access & refresh tokens
3. JWT strategy dengan Passport
4. Refresh token rotation
5. Logout dengan token blacklist (Redis)
6. Email verification (simulated atau dengan nodemailer)
7. Forgot password/reset password
8. Get current user endpoint
9. Update profile endpoint
10. Upload avatar endpoint (multer + S3)

Frontend (React):
1. Login page dengan form validation (React Hook Form + Zod)
2. Register page
3. Auth store dengan Zustand (persist token)
4. Protected route component
5. Axios instance dengan automatic token refresh
6. User profile dropdown di sidebar
7. Settings page untuk profile

Pastikan:
- Password di-hash dengan bcrypt
- JWT secret aman
- Error handling proper
- Loading states
- TypeScript types lengkap
```

### Prompt #4: Server Management
```
Buatkan Server Management feature untuk Discord clone:

Backend:
1. Create server endpoint (dengan default channels)
2. Delete server (owner only)
3. Update server settings (name, icon, description)
4. Get server by ID (dengan channels & members)
5. List user's servers
6. Generate invite link (dengan expiration & max uses)
7. Join server via invite
8. Leave server
9. Kick member (with permission check)
10. Ban member (with permission check)
11. Get server members dengan pagination

Frontend:
1. Server list sidebar (kiri)
2. Create server modal (dengan template)
3. Server header dengan dropdown menu
4. Server settings page
5. Member list (kanan)
6. Invite modal dengan copy link
7. Context menu untuk members (kick, ban, roles)

Gunakan Socket.io untuk real-time updates saat:
- Member join/leave
- Server settings updated
- Member banned

Pastikan semua endpoints check permissions.
```

### Prompt #5: Channel & Role System
```
Implementasikan Channel dan Role Management:

Backend:
1. Create channel (text/voice/category)
2. Delete channel
3. Update channel settings (name, topic, slowmode)
4. Reorder channels (update positions)
5. Create category
6. Move channel to category
7. Create role dengan permissions
8. Update role permissions
9. Delete role
10. Assign role to member
11. Remove role from member
12. Check permission middleware

Frontend:
1. Channel list dengan categories
2. Create channel modal
3. Channel settings modal
4. Delete channel confirmation
5. Drag & drop untuk reorder channels (dnd-kit)
6. Role management page
7. Role permissions UI (checkbox list)
8. Member role assignment UI
9. Permission-based UI (hide/show berdasarkan permissions)

Permissions yang diimplementasikan:
- VIEW_CHANNEL
- SEND_MESSAGES
- CONNECT (voice)
- SPEAK (voice)
- MANAGE_CHANNELS
- MANAGE_ROLES
- KICK_MEMBERS
- BAN_MEMBERS
- ADMINISTRATOR
```

### Prompt #6: Real-Time Messaging
```
Buatkan Real-Time Messaging system lengkap:

Backend (Socket.io):
1. Socket authentication dengan JWT
2. Join/Leave room (channel)
3. Send message event
4. Edit message event
5. Delete message event
6. Typing indicator event
7. Reaction add/remove event
8. Reply message support
9. Message history API (REST) dengan cursor pagination
10. Pin/Unpin message

Frontend:
1. Chat layout (sidebar + chat area + member list)
2. Message input dengan markdown support
3. Message list dengan virtual scrolling (react-virtuoso)
4. Message bubble component
   - Text dengan markdown
   - Attachments (image, video, file)
   - Embeds (link previews)
   - Reactions
   - Reply reference
   - Edit history
5. Context menu untuk message (edit, delete, reply, pin, copy)
6. Typing indicator
7. Emoji picker (emoji-picker-react)
8. File upload dengan drag & drop (react-dropzone)
9. Image preview modal
10. Infinite scroll untuk load history

Fitur:
- Optimistic updates
- Message grouping (by user & time)
- @mentions highlighting
- Link auto-embed
- Code syntax highlighting
```

### Prompt #7: Voice & Video (WebRTC)
```
Implementasikan Voice & Video Chat dengan Mediasoup:

Backend (Mediasoup):
1. Setup Mediasoup worker
2. Create router per voice channel
3. WebRTC transport untuk producer
4. WebRTC transport untuk consumer
5. Signaling dengan Socket.io:
   - getRouterRtpCapabilities
   - createProducerTransport
   - createConsumerTransport
   - connectTransport
   - produce (publish audio/video)
   - consume (subscribe to peers)
   - joinVoiceChannel
   - leaveVoiceChannel
   - screen share events
6. Handle peer disconnect cleanup

Frontend:
1. Voice channel UI di sidebar
2. Join/Leave voice channel
3. Voice controls component:
   - Mute/Unmute button
   - Deafen/Undeafen button
   - Video On/Off button
   - Screen Share button
   - Disconnect button
4. Voice participants list (avatars dengan speaking indicator)
5. Video grid (untuk video calls)
6. Screen share view
7. Volume slider per user
8. Push to Talk (optional)

Gunakan Mediasoup Client untuk:
- Device initialization
- Transport creation
- Producer/Consumer management

Pastikan:
- Handle network changes
- Error recovery
- Permission handling (microphone/camera)
```

### Prompt #8: Direct Messages & Friends
```
Buatkan Direct Message dan Friend System:

Backend:
1. Send friend request
2. Accept friend request
3. Reject friend request
4. Cancel friend request
5. Remove friend
6. Block user
7. Unblock user
8. Get friends list (dengan status online)
9. Get pending requests
10. Get blocked users
11. Create DM channel (1-on-1 dan group)
12. Get DM channels list
13. DM messaging (gunakan existing message system)
14. Search users

Frontend:
1. Friends page dengan tabs:
   - Online friends
   - All friends
   - Pending (sent/received)
   - Blocked
   - Add Friend
2. Friend item component (avatar, name, status, actions)
3. Add friend input (search by username#tag)
4. DM list di sidebar
5. DM chat (reuse channel chat component)
6. Group DM creation
7. User profile modal
8. User context menu (message, call, add friend, block)

Real-time:
- Friend request notifications
- Online status updates
- Typing indicators di DM
```

### Prompt #9: Notifications & Polish
```
Polish aplikasi dengan notifications dan fitur tambahan:

Backend:
1. Notification system
   - Push notifications (Firebase Cloud Messaging)
   - Email notifications (optional)
   - In-app notifications
2. User presence system (online/idle/dnd/invisible)
3. Custom status
4. Message search API (Meilisearch)
5. File upload endpoint dengan progress
6. Image compression (Sharp)
7. Read receipts

Frontend:
1. Notification system
   - Toast notifications (react-hot-toast)
   - Browser notifications
   - Notification settings
2. User status selector (online/idle/dnd/invisible)
3. Custom status input (emoji + text)
4. Search modal (Ctrl+K)
   - Search messages
   - Search channels
   - Search users
5. File upload dengan progress bar
6. Image lightbox untuk preview
7. Keyboard shortcuts
8. Unread message badges
9. @mention badges
10. Mobile responsive layout

Performance:
- Code splitting
- Lazy loading
- Image optimization
- Virtual scrolling
```

### Prompt #10: Production Deployment
```
Prepare Discord clone untuk production deployment:

1. Docker Setup:
   - Multi-stage Dockerfile untuk setiap service
   - Docker Compose untuk production
   - Health checks

2. Kubernetes:
   - Deployment manifests
   - Service definitions
   - Ingress configuration
   - ConfigMaps & Secrets
   - Horizontal Pod Autoscaler

3. CI/CD Pipeline (GitHub Actions):
   - Run tests on PR
   - Build Docker images
   - Push to registry
   - Deploy to staging
   - Deploy to production

4. Monitoring:
   - Prometheus metrics
   - Grafana dashboards
   - Loki untuk logging
   - Alerting rules

5. Security:
   - Rate limiting
   - CORS configuration
   - Helmet.js
   - Input sanitization
   - File upload restrictions

6. Optimization:
   - Database indexing
   - Redis caching strategy
   - CDN untuk static assets
   - Connection pooling

Buatkan semua konfigurasi file lengkap.
```

---

## 🔧 DEVELOPMENT WORKFLOW

### Daily Development Routine

```bash
# 1. Start development environment
cd discord-clone
docker-compose up -d

# 2. Start backend API
cd apps/api
npm run start:dev

# 3. Start WebSocket server (terminal baru)
cd apps/websocket
npm run start:dev

# 4. Start Mediasoup server (terminal baru)
cd apps/mediasoup
npm start

# 5. Start frontend (terminal baru)
cd apps/web
npm run dev

# 6. Open browser
goto http://localhost:5173
```

### Database Migrations

```bash
# Create migration
cd apps/api
npx prisma migrate dev --name add_feature_name

# Apply migration
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

### Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run linter
npm run lint

# Type check
npm run type-check
```

---

## 📚 RESOURCES & REFERENCES

### Documentation
- [React Docs](https://react.dev/)
- [NestJS Docs](https://docs.nestjs.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Socket.io Docs](https://socket.io/docs/)
- [Mediasoup Docs](https://mediasoup.org/documentation/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Query Docs](https://tanstack.com/query/latest)

### Discord API Reference (untuk inspirasi)
- [Discord Developer Portal](https://discord.com/developers/docs/intro)

### Tools
- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [Postman](https://www.postman.com/) - API Testing
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) - Browser Extension
- [Redis Insight](https://redis.com/redis-enterprise/redis-insight/) - Redis GUI

---

## 🎯 SUCCESS CRITERIA

Project dianggap **selesai** ketika:

### Functional Requirements ✅
- [ ] User bisa register, login, logout
- [ ] User bisa create, join, leave server
- [ ] User bisa create, delete, manage channels
- [ ] User bisa kirim, edit, delete pesan real-time
- [ ] User bisa join voice channel dan berbicara
- [ ] User bisa video call dan screen share
- [ ] User bisa add friends dan DM
- [ ] Role dan permission system berfungsi
- [ ] File upload dan sharing berfungsi
- [ ] Notifications berfungsi

### Non-Functional Requirements ✅
- [ ] Response time < 200ms untuk API
- [ ] Message delivery < 100ms (WebSocket)
- [ ] Voice latency < 200ms
- [ ] Support 1000+ concurrent users
- [ ] Mobile responsive
- [ ] 99.9% uptime

### Code Quality ✅
- [ ] TypeScript strict mode
- [ ] 80%+ test coverage
- [ ] ESLint & Prettier passing
- [ ] Proper error handling
- [ ] Clean code architecture

---

## 💡 TIPS DEVELOPMENT CEPAT

### 1. Gunakan AI Assistant Secara Efektif
- Berikan prompt yang spesifik dan terstruktur
- Break down tasks menjadi kecil
- Review code yang dihasilkan AI
- Jangan copy-paste tanpa paham

### 2. Prioritaskan Fitur Core
- Fokus pada messaging dan voice dulu
- UI polish bisa di akhir
- Jangan perfectionism di awal

### 3. Test Secara Berkala
- Test setelah selesai fitur
- Jangan tunggu akhir untuk test
- Gunakan automated testing

### 4. Commit Secara Teratur
- Commit setiap selesai task kecil
- Write meaningful commit messages
- Gunakan branching strategy

### 5. Dokumentasikan
- Comment complex logic
- Update README
- Document API endpoints
- Buat troubleshooting guide

---

## 🚨 COMMON PITFALLS TO AVOID

1. **Jangan optimize terlalu awal** - Fokus functionality dulu
2. **Jangan skip testing** - Bug akan menumpuk
3. **Jangan hardcode values** - Gunakan environment variables
4. **Jangan lupa error handling** - User experience penting
5. **Jangan ignore TypeScript errors** - Fix sebelum commit
6. **Jangan commit secrets** - Gunakan .env
7. **Jangan lupa security** - Sanitize inputs, validate data
8. **Jangan over-engineering** - Keep it simple

---

## 🎉 FINAL CHECKLIST

Sebelum launch, pastikan:

- [ ] Semua fitur core berfungsi
- [ ] Tidak ada console errors
- [ ] Mobile responsive
- [ ] Performance optimized
- [ ] Security checked
- [ ] Documentation complete
- [ ] Tests passing
- [ ] CI/CD pipeline working
- [ ] Monitoring setup
- [ ] Backup strategy

---

**🚀 SIAP MEMBANGUN DISCORD CLONE!**

Copy prompt di atas dan paste ke AI Assistant (ChatGPT, Claude, GitHub Copilot, dll) satu per satu. Kerjakan secara berurutan dan jangan skip steps.

**Estimasi waktu:** 12 minggu untuk 1-2 developers full-time.

**Good luck! 💪**
