export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
}

export interface Server {
  id: string;
  name: string;
  icon: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  serverId: string;
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
}

export interface ServerMember extends User {
  role: 'owner' | 'admin' | 'member';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
