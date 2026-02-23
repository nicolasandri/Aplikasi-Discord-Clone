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
- **Database**: SQLite3 5.1.7 (persistent file-based at `server/workgrid.db`)
- **Authentication**: JWT (jsonwebtoken 9.0.3) + bcryptjs for password hashing
- **File Uploads**: Multer 2.0.2
- **CORS**: Enabled for all origins

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
│   │   │   └── Register.tsx     # Registration page
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Authentication state management
│   │   ├── hooks/
│   │   │   ├── useSocket.ts     # Socket.IO connection hook
│   │   │   ├── use-mobile.ts    # Mobile detection hook
│   │   │   └── useNotification.ts # Notification hook
│   │   ├── types/
│   │   │   ├── index.ts         # TypeScript interfaces
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
└── server/                      # Backend Express server
    ├── server.js                # Main server file
    ├── database.js              # SQLite database operations
    ├── uploads/                 # File upload directory
    ├── workgrid.db              # SQLite database file
    └── package.json             # Server dependencies
```

---

## Build and Development Commands

### Frontend (`/app`)

```bash
cd app

# Install dependencies
npm install

# Development server (runs on http://localhost:3000)
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
| GET | `/api/servers/:serverId/users/:userId` | Get user profile with role | Yes |
| PUT | `/api/servers/:serverId/members/:userId/role` | Update user role (owner only) | Yes |

#### Servers
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/servers` | Get all servers for user | Yes |
| POST | `/api/servers` | Create new server | Yes |
| GET | `/api/servers/:serverId/channels` | Get channels in server | Yes |
| GET | `/api/servers/:serverId/members` | Get server members | Yes |

#### Invites
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/servers/:serverId/invites` | Create invite link | Yes |
| POST | `/api/invites/:code/join` | Join server with invite | Yes |

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
| `error` | `{ message, error? }` | Error message |

---

## Database Schema (SQLite)

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

**channels**
- `id` (TEXT PRIMARY KEY)
- `server_id` (TEXT NOT NULL, FOREIGN KEY)
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

**direct_messages**
- `id` (TEXT PRIMARY KEY)
- `sender_id` (TEXT NOT NULL, FOREIGN KEY)
- `receiver_id` (TEXT NOT NULL, FOREIGN KEY)
- `content` (TEXT)
- `attachments` (TEXT)
- `is_read` (BOOLEAN DEFAULT 0)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**friendships**
- `id` (TEXT PRIMARY KEY)
- `user_id` (TEXT NOT NULL, FOREIGN KEY)
- `friend_id` (TEXT NOT NULL, FOREIGN KEY)
- `status` (TEXT DEFAULT 'pending')
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

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  serverId: string;
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
  role: 'owner' | 'admin' | 'member';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
```

---

## Testing Strategy

⚠️ **No test framework is currently configured**. Consider adding:
- Vitest for unit testing
- React Testing Library for component tests
- Playwright or Cypress for E2E testing

---

## Security Considerations

### Current Implementation
- **Authentication**: JWT with Bearer token stored in localStorage
- **Password Hashing**: bcryptjs with 10 salt rounds
- **File Uploads**: Limited to 10MB, filtered by MIME type
- **CORS**: Enabled for all origins (development-friendly, review for production)

### File Upload Restrictions
Allowed MIME types:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Other: `text/plain`, `application/zip`

### Recommendations for Production
1. Change default JWT secret to a secure random string
2. Implement HTTPS for production
3. Add rate limiting (express-rate-limit)
4. Review CORS policy for specific origins only
5. Add input validation middleware (zod or joi)
6. Implement file upload virus scanning
7. Add database connection pooling for better performance

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

## Known Issues & TODOs

1. **Tests**: No testing framework configured
2. **Rate Limiting**: Not implemented (consider adding for production)
3. **Input Validation**: Could be strengthened with schema validation
4. **File Security**: No virus scanning for uploads
5. **Database**: SQLite is suitable for small deployments; consider PostgreSQL for scale

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
