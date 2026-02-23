# 🤖 Kimi Agent - Discord Clone Development Guide

> **Project:** ChatCord - Aplikasi Discord Clone  
> **Tech Stack:** React + TypeScript + Vite + Node.js + WebSocket + Capacitor  
> **Last Updated:** 2026-02-23

---

## 📋 Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Tech Stack Guidelines](#2-tech-stack-guidelines)
3. [Coding Standards](#3-coding-standards)
4. [Frontend Best Practices](#4-frontend-best-practices)
5. [Backend Best Practices](#5-backend-best-practices)
6. [Discord Clone Specific Patterns](#6-discord-clone-specific-patterns)
7. [Database Schema Guidelines](#7-database-schema-guidelines)
8. [WebSocket & Real-time Patterns](#8-websocket--real-time-patterns)
9. [Mobile/Capacitor Guidelines](#9-mobilecapacitor-guidelines)
10. [Security Best Practices](#10-security-best-practices)
11. [Development Commands](#11-development-commands)

---

## 1. Project Architecture

```
chatcord/
├── app/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── chat/            # Chat-specific components
│   │   │   ├── channel/         # Channel components
│   │   │   └── server/          # Server components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── contexts/            # React Context providers
│   │   ├── stores/              # Zustand stores
│   │   ├── services/            # API services
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Utility functions
│   │   └── lib/                 # Library configurations
│   ├── public/
│   └── .env
├── server/                       # Backend (Node.js + Express + Socket.io)
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── services/            # Business logic
│   │   ├── models/              # Database models
│   │   ├── routes/              # API routes
│   │   ├── middleware/          # Express middleware
│   │   ├── socket/              # Socket.io handlers
│   │   ├── utils/               # Utility functions
│   │   └── types/               # TypeScript types
│   └── .env
├── android/                      # Capacitor Android project
└── shared/                       # Shared types between frontend & backend
```

---

## 2. Tech Stack Guidelines

### Frontend Stack
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand (global) + React Query (server state)
- **Routing:** React Router v6
- **Real-time:** Socket.io-client
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

### Backend Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Real-time:** Socket.io
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **File Upload:** Multer (local) / Cloudinary (production)

### Mobile Stack
- **Framework:** Capacitor 6+
- **Platform:** Android (primary)
- **Plugins:** Camera, File System, Push Notifications

---

## 3. Coding Standards

### TypeScript Configuration
```typescript
// Strict mode must be enabled
type StrictConfig = {
  strict: true;
  noImplicitAny: true;
  strictNullChecks: true;
  strictFunctionTypes: true;
  noUnusedLocals: true;
  noUnusedParameters: true;
}
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ChannelList.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts` |
| Utils | camelCase | `formatMessage.ts` |
| Types/Interfaces | PascalCase with descriptive names | `ChannelType`, `UserProfile` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
| API Routes | kebab-case | `/api/channels/join` |

### File Organization Rules
1. **One component per file** - Keep components focused and reusable
2. **Co-locate related files** - Keep tests, styles, and types near the component
3. **Index exports** - Use `index.ts` for clean imports from folders
4. **Barrel pattern** for shared exports:
   ```typescript
   // components/index.ts
   export { ChannelList } from './ChannelList';
   export { MessageInput } from './MessageInput';
   export { UserAvatar } from './UserAvatar';
   ```

---

## 4. Frontend Best Practices

### Component Patterns

#### Functional Components Only
```typescript
// ✅ GOOD
interface ChannelListProps {
  serverId: string;
  onChannelSelect?: (channelId: string) => void;
}

export function ChannelList({ serverId, onChannelSelect }: ChannelListProps) {
  const { channels, isLoading } = useChannels(serverId);
  
  if (isLoading) return <ChannelListSkeleton />;
  
  return (
    <div className="space-y-1">
      {channels.map(channel => (
        <ChannelItem 
          key={channel.id} 
          channel={channel}
          onClick={() => onChannelSelect?.(channel.id)}
        />
      ))}
    </div>
  );
}

// ❌ BAD - Class components, avoid them
class ChannelList extends React.Component { ... }
```

#### Custom Hooks Pattern
```typescript
// hooks/useChannels.ts
export function useChannels(serverId: string) {
  const queryClient = useQueryClient();
  
  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', serverId],
    queryFn: () => channelApi.getByServer(serverId),
    enabled: !!serverId,
  });

  const createChannel = useMutation({
    mutationFn: channelApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverId] });
    },
  });

  return { channels, isLoading, createChannel };
}
```

### State Management

#### Zustand Store Pattern
```typescript
// stores/userStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'user-storage' }
  )
);
```

### Styling Guidelines

#### Tailwind + shadcn/ui Pattern
```typescript
// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  className?: string;
}

export function MessageBubble({ message, isOwn, className }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        // Base styles
        "flex gap-3 p-3 rounded-lg",
        // Conditional styles
        isOwn ? "bg-primary/10 ml-auto" : "bg-muted",
        // Hover states
        "hover:bg-opacity-80 transition-colors",
        // Custom overrides
        className
      )}
    >
      <UserAvatar user={message.author} size="sm" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{message.author.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  );
}
```

---

## 5. Backend Best Practices

### Express Route Structure
```typescript
// routes/channels.ts
import { Router } from 'express';
import { ChannelController } from '../controllers/ChannelController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createChannelSchema } from '../schemas/channel';

const router = Router();
const controller = new ChannelController();

// All routes require authentication
router.use(authenticate);

router.get('/', controller.getChannels);
router.post('/', validate(createChannelSchema), controller.createChannel);
router.get('/:id', controller.getChannelById);
router.patch('/:id', controller.updateChannel);
router.delete('/:id', controller.deleteChannel);
router.post('/:id/join', controller.joinChannel);
router.post('/:id/leave', controller.leaveChannel);

export default router;
```

### Controller Pattern
```typescript
// controllers/ChannelController.ts
import { Request, Response, NextFunction } from 'express';
import { ChannelService } from '../services/ChannelService';
import { AppError } from '../utils/AppError';

export class ChannelController {
  private service = new ChannelService();

  getChannels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serverId } = req.query;
      const channels = await this.service.findByServer(serverId as string);
      res.json({ success: true, data: channels });
    } catch (error) {
      next(error);
    }
  };

  createChannel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = await this.service.create({
        ...req.body,
        createdBy: req.user.id,
      });
      res.status(201).json({ success: true, data: channel });
    } catch (error) {
      next(error);
    }
  };
}
```

### Service Layer Pattern
```typescript
// services/ChannelService.ts
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';

const prisma = new PrismaClient();

interface CreateChannelInput {
  name: string;
  serverId: string;
  type?: 'TEXT' | 'VOICE';
  createdBy: string;
}

export class ChannelService {
  async findByServer(serverId: string) {
    return prisma.channel.findMany({
      where: { serverId },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(input: CreateChannelInput) {
    // Validate channel name
    if (!this.isValidChannelName(input.name)) {
      throw new AppError('Invalid channel name', 400);
    }

    // Check if user is member of server
    const membership = await prisma.serverMember.findFirst({
      where: {
        serverId: input.serverId,
        userId: input.createdBy,
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this server', 403);
    }

    return prisma.channel.create({
      data: {
        name: input.name.toLowerCase().replace(/\s+/g, '-'),
        type: input.type || 'TEXT',
        serverId: input.serverId,
      },
    });
  }

  private isValidChannelName(name: string): boolean {
    return /^[a-z0-9-]{2,32}$/i.test(name);
  }
}
```

### Error Handling
```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
```

---

## 6. Discord Clone Specific Patterns

### Message Component Architecture
```typescript
// components/chat/MessageList.tsx
interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const { messages, hasMore, loadMore } = useMessages(channelId);
  const { user } = useUserStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group messages by date and author
  const groupedMessages = useMemo(() => {
    return groupMessagesByDate(messages);
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {hasMore && (
        <Button variant="ghost" onClick={loadMore} className="w-full">
          Load more messages
        </Button>
      )}
      {groupedMessages.map((group) => (
        <MessageGroup 
          key={group.date} 
          group={group}
          currentUserId={user?.id}
        />
      ))}
    </div>
  );
}

// Group consecutive messages from same author
function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt).toDateString();
    
    if (!currentGroup || currentGroup.date !== messageDate) {
      currentGroup = {
        date: messageDate,
        messages: [message],
      };
      groups.push(currentGroup);
    } else if (
      currentGroup.messages[currentGroup.messages.length - 1].author.id === 
      message.author.id &&
      isWithin5Minutes(
        currentGroup.messages[currentGroup.messages.length - 1].createdAt,
        message.createdAt
      )
    ) {
      currentGroup.messages.push(message);
    } else {
      currentGroup = {
        date: messageDate,
        messages: [message],
      };
      groups.push(currentGroup);
    }
  });

  return groups;
}
```

### Channel Sidebar Pattern
```typescript
// components/channel/ChannelSidebar.tsx
interface ChannelSidebarProps {
  serverId: string;
}

export function ChannelSidebar({ serverId }: ChannelSidebarProps) {
  const { channels, categories } = useChannels(serverId);
  const { selectedChannelId, setSelectedChannel } = useChannelStore();

  // Group channels by category
  const channelsByCategory = useMemo(() => {
    const grouped = new Map<string, Channel[]>();
    
    categories.forEach(category => {
      grouped.set(
        category.id, 
        channels.filter(c => c.categoryId === category.id)
      );
    });

    // Add uncategorized channels
    const uncategorized = channels.filter(c => !c.categoryId);
    if (uncategorized.length > 0) {
      grouped.set('uncategorized', uncategorized);
    }

    return grouped;
  }, [channels, categories]);

  return (
    <div className="w-60 bg-muted/50 flex flex-col">
      <ServerHeader serverId={serverId} />
      <ScrollArea className="flex-1">
        {Array.from(channelsByCategory.entries()).map(([categoryId, categoryChannels]) => (
          <ChannelCategory
            key={categoryId}
            categoryId={categoryId}
            channels={categoryChannels}
            selectedChannelId={selectedChannelId}
            onChannelSelect={setSelectedChannel}
          />
        ))}
      </ScrollArea>
      <UserPanel />
    </div>
  );
}
```

### Voice Channel Pattern
```typescript
// hooks/useVoiceChannel.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface VoiceChannelState {
  isConnected: boolean;
  participants: VoiceParticipant[];
  localStream: MediaStream | null;
}

export function useVoiceChannel(channelId: string) {
  const [state, setState] = useState<VoiceChannelState>({
    isConnected: false,
    participants: [],
    localStream: null,
  });
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    if (!channelId) return;

    const socket = io(process.env.VITE_SOCKET_URL!, {
      query: { channelId, type: 'voice' },
    });
    socketRef.current = socket;

    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.disconnect();
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [channelId]);

  const joinVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      
      setState(prev => ({ ...prev, localStream: stream }));
      socketRef.current?.emit('join-voice', { channelId });
    } catch (error) {
      console.error('Failed to access microphone:', error);
    }
  };

  const leaveVoice = () => {
    state.localStream?.getTracks().forEach(track => track.stop());
    socketRef.current?.emit('leave-voice', { channelId });
    setState({
      isConnected: false,
      participants: [],
      localStream: null,
    });
  };

  return {
    ...state,
    joinVoice,
    leaveVoice,
  };
}
```

---

## 7. Database Schema Guidelines

### Prisma Schema Pattern
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  avatar    String?
  status    UserStatus @default(OFFLINE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  servers       ServerMember[]
  messages      Message[]
  ownedServers  Server[]
  friendships   Friendship[] @relation("UserFriendships")
  friendOf      Friendship[] @relation("FriendOf")

  @@map("users")
}

model Server {
  id          String   @id @default(uuid())
  name        String
  icon        String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  owner       User           @relation(fields: [ownerId], references: [id])
  members     ServerMember[]
  channels    Channel[]
  categories  Category[]

  @@map("servers")
}

model ServerMember {
  id       String @id @default(uuid())
  userId   String
  serverId String
  role     MemberRole @default(MEMBER)
  joinedAt DateTime @default(now())

  // Relations
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  server Server @relation(fields: [serverId], references: [id], onDelete: Cascade)

  @@unique([userId, serverId])
  @@map("server_members")
}

model Category {
  id       String @id @default(uuid())
  name     String
  serverId String
  position Int    @default(0)

  // Relations
  server   Server    @relation(fields: [serverId], references: [id], onDelete: Cascade)
  channels Channel[]

  @@map("categories")
}

model Channel {
  id         String      @id @default(uuid())
  name       String
  type       ChannelType @default(TEXT)
  serverId   String
  categoryId String?
  createdAt  DateTime    @default(now())

  // Relations
  server   Server    @relation(fields: [serverId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id])
  messages Message[]

  @@map("channels")
}

model Message {
  id        String   @id @default(uuid())
  content   String
  channelId String
  authorId  String
  replyToId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  channel   Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  author    User      @relation(fields: [authorId], references: [id])
  replyTo   Message?  @relation("Replies", fields: [replyToId], references: [id])
  replies   Message[] @relation("Replies")
  reactions Reaction[]
  attachments Attachment[]

  @@index([channelId, createdAt])
  @@map("messages")
}

model Reaction {
  id        String @id @default(uuid())
  emoji     String
  messageId String
  userId    String

  // Relations
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
  @@map("reactions")
}

model Attachment {
  id        String @id @default(uuid())
  url       String
  filename  String
  size      Int
  mimeType  String
  messageId String

  // Relations
  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@map("attachments")
}

model Friendship {
  id        String            @id @default(uuid())
  userId    String
  friendId  String
  status    FriendshipStatus  @default(PENDING)
  createdAt DateTime          @default(now())

  // Relations
  user   User @relation("UserFriendships", fields: [userId], references: [id])
  friend User @relation("FriendOf", fields: [friendId], references: [id])

  @@unique([userId, friendId])
  @@map("friendships")
}

// Enums
enum UserStatus {
  ONLINE
  IDLE
  DO_NOT_DISTURB
  OFFLINE
}

enum MemberRole {
  OWNER
  ADMIN
  MODERATOR
  MEMBER
}

enum ChannelType {
  TEXT
  VOICE
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  BLOCKED
}
```

---

## 8. WebSocket & Real-time Patterns

### Socket.io Event Structure
```typescript
// socket/events/messageEvents.ts
import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';

interface MessagePayload {
  channelId: string;
  content: string;
  replyToId?: string;
}

export function registerMessageEvents(io: Server, socket: Socket) {
  // Join channel room
  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel:${channelId}`);
    console.log(`Socket ${socket.id} joined channel ${channelId}`);
  });

  // Leave channel room
  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
    console.log(`Socket ${socket.id} left channel ${channelId}`);
  });

  // Send message
  socket.on('send-message', async (payload: MessagePayload, callback) => {
    try {
      const userId = socket.data.userId;
      
      // Validate user is member of channel
      const channel = await prisma.channel.findFirst({
        where: {
          id: payload.channelId,
          server: {
            members: {
              some: { userId }
            }
          }
        }
      });

      if (!channel) {
        return callback({ error: 'Not authorized to send messages in this channel' });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          content: payload.content,
          channelId: payload.channelId,
          authorId: userId,
          replyToId: payload.replyToId,
        },
        include: {
          author: {
            select: { id: true, username: true, avatar: true }
          },
          reactions: true,
          _count: { select: { replies: true } }
        }
      });

      // Broadcast to channel
      io.to(`channel:${payload.channelId}`).emit('new-message', message);
      
      callback({ success: true, data: message });
    } catch (error) {
      console.error('Error sending message:', error);
      callback({ error: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('typing', (channelId: string) => {
    const userId = socket.data.userId;
    socket.to(`channel:${channelId}`).emit('user-typing', {
      channelId,
      userId,
    });
  });

  // Stop typing
  socket.on('stop-typing', (channelId: string) => {
    const userId = socket.data.userId;
    socket.to(`channel:${channelId}`).emit('user-stop-typing', {
      channelId,
      userId,
    });
  });
}
```

### Presence System
```typescript
// socket/events/presenceEvents.ts
import { Server, Socket } from 'socket.io';
import { redis } from '../../lib/redis';

const PRESENCE_KEY = 'user:presence';
const USER_SOCKETS_KEY = 'user:sockets';

export function registerPresenceEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Update user status to online
  socket.on('connect', async () => {
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify({
      status: 'ONLINE',
      lastSeen: Date.now(),
    }));
    
    // Add socket to user's socket list
    await redis.sadd(`${USER_SOCKETS_KEY}:${userId}`, socket.id);
    
    // Broadcast status change to friends
    const friends = await getUserFriends(userId);
    friends.forEach(friendId => {
      io.to(`user:${friendId}`).emit('friend-status-change', {
        userId,
        status: 'ONLINE',
      });
    });
  });

  // Handle status change
  socket.on('status-change', async (status: UserStatus) => {
    await redis.hset(PRESENCE_KEY, userId, JSON.stringify({
      status,
      lastSeen: Date.now(),
    }));

    // Broadcast to friends
    const friends = await getUserFriends(userId);
    friends.forEach(friendId => {
      io.to(`user:${friendId}`).emit('friend-status-change', {
        userId,
        status,
      });
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    // Remove socket from user's socket list
    await redis.srem(`${USER_SOCKETS_KEY}:${userId}`, socket.id);
    
    // Check if user has any other active sockets
    const remainingSockets = await redis.scard(`${USER_SOCKETS_KEY}:${userId}`);
    
    if (remainingSockets === 0) {
      // User is fully offline
      await redis.hset(PRESENCE_KEY, userId, JSON.stringify({
        status: 'OFFLINE',
        lastSeen: Date.now(),
      }));

      // Broadcast offline status
      const friends = await getUserFriends(userId);
      friends.forEach(friendId => {
        io.to(`user:${friendId}`).emit('friend-status-change', {
          userId,
          status: 'OFFLINE',
        });
      });
    }
  });
}

async function getUserFriends(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { userId, status: 'ACCEPTED' },
        { friendId: userId, status: 'ACCEPTED' },
      ],
    },
  });

  return friendships.map(f => 
    f.userId === userId ? f.friendId : f.userId
  );
}
```

---

## 9. Mobile/Capacitor Guidelines

### Capacitor Configuration
```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatcord.app',
  appName: 'ChatCord',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#5865F2',
    },
  },
};

export default config;
```

### Mobile-Specific Components
```typescript
// hooks/useMobile.ts
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

export function useMobile() {
  const [isNative, setIsNative] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (Capacitor.isNativePlatform()) {
      Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardHeight(info.keyboardHeight);
      });

      Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardHeight(0);
      });
    }

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  return { isNative, keyboardHeight };
}

// components/mobile/MobileMessageInput.tsx
export function MobileMessageInput() {
  const { isNative, keyboardHeight } = useMobile();
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) return;
    
    sendMessage(message);
    setMessage('');
    
    // Hide keyboard on mobile after sending
    if (isNative) {
      Keyboard.hide();
    }
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-background border-t"
      style={{ paddingBottom: isNative ? keyboardHeight : 0 }}
    >
      <div className="flex items-center gap-2 p-3">
        <Button variant="ghost" size="icon">
          <Plus className="h-5 w-5" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Message..."
          className="flex-1"
        />
        <Button 
          size="icon" 
          onClick={handleSubmit}
          disabled={!message.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
```

### Push Notifications
```typescript
// services/pushNotification.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initializePushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  // Request permission
  const result = await PushNotifications.requestPermissions();
  if (result.receive === 'granted') {
    await PushNotifications.register();
  }

  // Listen for registration token
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration token:', token.value);
    // Send token to server
    api.registerPushToken(token.value);
  });

  // Listen for notifications
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
    // Handle notification (e.g., show in-app notification)
  });

  // Handle notification action
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push action performed:', action);
    // Navigate to relevant screen
    const { channelId } = action.notification.data;
    if (channelId) {
      navigateToChannel(channelId);
    }
  });
}
```

---

## 10. Security Best Practices

### Authentication Middleware
```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Rate limiting for auth endpoints
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again later',
});
```

### Input Validation
```typescript
// schemas/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// middleware/validate.ts
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
```

### CORS & Security Headers
```typescript
// app.ts
import cors from 'cors';
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.VITE_SOCKET_URL!],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

---

## 11. Development Commands

### Setup Project
```bash
# Clone and install dependencies
git clone <repo-url>
cd chatcord

# Install frontend dependencies
cd app
npm install

# Install backend dependencies
cd ../server
npm install

# Setup database
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### Development
```bash
# Start frontend (app folder)
cd app
npm run dev
# → http://localhost:5173

# Start backend (server folder)
cd server
npm run dev
# → http://localhost:3001

# Start both (from root)
npm run dev:all
```

### Database Operations
```bash
# Generate migration
npx prisma migrate dev --name <migration-name>

# Deploy migration (production)
npx prisma migrate deploy

# Reset database (DANGER!)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### Mobile Build (Android)
```bash
# Build web assets
cd app
npm run build

# Sync with Capacitor
npx cap sync android

# Open Android Studio
npx cap open android

# Or build APK directly
cd android
./gradlew assembleDebug
# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Testing
```bash
# Run frontend tests
cd app
npm test

# Run backend tests
cd server
npm test

# Run all tests
npm test:all

# E2E tests
npm run test:e2e
```

### Linting & Formatting
```bash
# Lint frontend
cd app
npm run lint
npm run lint:fix

# Lint backend
cd server
npm run lint
npm run lint:fix

# Format code
npm run format
```

---

## 📚 Reference Links

- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Capacitor Docs](https://capacitorjs.com/docs)

---

## 🎯 Quick Reference for Kimi Agent

When working on this project, always:

1. **Check existing code patterns** before creating new components
2. **Use TypeScript strictly** - no `any` types
3. **Follow the folder structure** - keep related files together
4. **Use custom hooks** for reusable logic
5. **Handle errors gracefully** - always have fallback UI
6. **Consider mobile users** - test on mobile view
7. **Write clean code** - readable and well-commented
8. **Test your changes** - manually and with automated tests

---

> **Note:** This guide is a living document. Update it as the project evolves and new patterns emerge.
