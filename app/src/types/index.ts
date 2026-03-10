export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  displayName?: string;
  role_color?: string; // Optional role color for message display
  isMasterAdmin?: boolean; // Master Admin flag
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  owner_id?: string;
  banner?: string;
}

export interface ServerRole {
  id: string;
  serverId: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
  channels?: Channel[];
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  serverId: string;
  categoryId?: string | null;
  position: number;
  serverName?: string;
  serverIcon?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface FileAttachment {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ForwardedFrom {
  messageId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  channelId: string;
  channelName: string;
  serverId?: string;
  serverName?: string;
  timestamp: string;
  content?: string;
}

export interface Message {
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
  type?: 'user' | 'system';
  isSystem?: boolean;
  forwardedFrom?: ForwardedFrom | null;
  newMember?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role_color?: string;
  };
}

export interface ServerMember extends User {
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'custom';
  role_id?: string | null;
  role_name?: string;
  role_color?: string;
  joinedAt?: string;
  joinMethod?: string;
  isBot?: boolean;
  createdAt?: string;
  roles?: Array<{ id: string; name: string; color: string }>;
  role_ids?: string[] | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface DMChannel {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  members: User[];
  friend?: User; // for 1-on-1 (backward compat)
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  updatedAt: string;
  creatorId?: string;
}

export interface DMMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  sender_username?: string;
  sender_display_name?: string;
  sender_avatar?: string;
  attachments?: FileAttachment[];
  isRead: boolean;
  createdAt: string;
  editedAt?: string;
}
