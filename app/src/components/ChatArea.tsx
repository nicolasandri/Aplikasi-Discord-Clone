import { useEffect, useRef, useState } from 'react';
import { Hash, Volume2, Users, Pin, Search, Inbox, HelpCircle, Reply, Trash2, FileText, RefreshCw, Keyboard, MessageCircle, Bell, AtSign, Phone, Video, X } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { ChannelNotificationSettings } from './ChannelNotificationSettings';
import { MemberProfilePopup } from './MemberProfilePopup';
import type { ServerMember } from '@/types';
import { Lightbox } from './Lightbox';
import { MessageContent } from './MessageContent';
import { ForwardedMessageDisplay } from './ForwardedMessageDisplay';
import { MessageContextMenu } from './MessageContextMenu';
import { VoiceChannelPanel } from './VoiceChannelPanel';
import { PermissionBot } from './PermissionBot';
import { ReactionTooltip } from './ReactionTooltip';
import { ForwardModal } from './ForwardModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Channel, Message, User, Server } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron
  ? 'http://localhost:3001/api'
  : (import.meta.env.VITE_API_URL || '/api');

// Get base URL for backend (without /api)
const BASE_URL = isElectron ? 'http://localhost:3001' : '';

// Helper to safely check if value is a string and starts with prefix
const safeStartsWith = (value: unknown, prefix: string): boolean => {
  return typeof value === 'string' && value.startsWith(prefix);
};

// Helper to safely check if value is a string and includes substring
const safeIncludes = (value: unknown, substring: string): boolean => {
  return typeof value === 'string' && value.includes(substring);
};

// Helper to safely check if array includes value
const safeArrayIncludes = (arr: unknown, value: string): boolean => {
  return Array.isArray(arr) && arr.includes(value);
};

// Helper to get full file URL
const getFileUrl = (url: unknown): string => {
  if (!url) return '';
  if (typeof url !== 'string') {
    console.error('getFileUrl: url is not a string:', url);
    return '';
  }
  if (safeStartsWith(url, 'http')) return url;
  // Ensure url starts with /
  const normalizedUrl = safeStartsWith(url, '/') ? url : `/${url}`;
  return `${BASE_URL}${normalizedUrl}`;
};

// Helper to get full avatar URL
const getAvatarUrl = (avatar: string | null, username: string): string => {
  if (!avatar) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  }
  if (safeStartsWith(avatar, 'http')) {
    return avatar;
  }
  // Relative URL - prepend base URL
  const normalizedUrl = safeStartsWith(avatar, '/') ? avatar : `/${avatar}`;
  return `${BASE_URL}${normalizedUrl}`;
};

interface ChatAreaProps {
  channel: Channel | null;
  messages: Message[];
  typingUsers: { userId: string; username: string; channelId: string }[];
  currentUser: User | null;
  onReply?: (message: Message) => void;
  serverId?: string | null;
  onRefresh?: () => void;
  isMobile?: boolean;
  onStartDM?: (user: { id: string; username: string; avatar?: string; status?: string; email?: string }) => void;
  onOpenSearch?: () => void;
  servers?: Server[];
  channels?: Channel[];
  dmChannels?: import('@/types').DMChannel[];
  onReaction?: (messageId: string, emoji: string, hasReacted: boolean) => void;
  onFocusInput?: () => void;
  showMemberList?: boolean;
  onToggleMemberList?: () => void;
}

// User permissions interface
interface UserPermissions {
  role: string;
  permissions: number;
  isOwner: boolean;
  canManageMessages: boolean;
  canManageChannels: boolean;
  canKickMembers: boolean;
  canBanMembers: boolean;
}

// Permission bitfield constants (must match server)
/* _Permissions = {
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
} */

function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  // Format manually to ensure HH:MM:SS format with colons
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
}

// Format timestamp like Discord (Asia/Jakarta timezone)
function formatDiscordTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const now = new Date();
  
  // Get date parts in Asia/Jakarta timezone
  const dateOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  };
  const todayParts = new Intl.DateTimeFormat('id-ID', dateOptions).formatToParts(now);
  const msgParts = new Intl.DateTimeFormat('id-ID', dateOptions).formatToParts(date);
  
  const today = new Date(
    parseInt(todayParts.find(p => p.type === 'year')?.value || '0'),
    parseInt(todayParts.find(p => p.type === 'month')?.value || '0') - 1,
    parseInt(todayParts.find(p => p.type === 'day')?.value || '0')
  );
  
  const messageDate = new Date(
    parseInt(msgParts.find(p => p.type === 'year')?.value || '0'),
    parseInt(msgParts.find(p => p.type === 'month')?.value || '0') - 1,
    parseInt(msgParts.find(p => p.type === 'day')?.value || '0')
  );
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format time manually to ensure HH:MM:SS format with colons
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;
  
  // Today - show only time
  if (messageDate.getTime() === today.getTime()) {
    return timeStr;
  }
  
  // Yesterday - show "Kemarin pukul XX:XX"
  if (messageDate.getTime() === yesterday.getTime()) {
    return `Kemarin pukul ${timeStr}`;
  }
  
  // Within last 7 days - show day name and time
  const daysDiff = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    const dayName = date.toLocaleDateString('id-ID', { 
      weekday: 'long',
      timeZone: 'Asia/Jakarta'
    });
    return `${dayName} pukul ${timeStr}`;
  }
  
  // Older - show full date and time
  const dateStr = date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
  return `${dateStr} pukul ${timeStr}`;
}

// Format tooltip timestamp (full datetime)
function formatTooltipTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return date.toLocaleDateString('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric'
  }) + ' pukul ' + `${hours}:${minutes}:${seconds}`;
}

function formatDate(timestamp: string): string {
  if (!timestamp) return 'Tanggal tidak diketahui';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Tanggal tidak valid';
  
  const now = new Date();
  
  // Get date parts in Asia/Jakarta timezone
  const dateOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  };
  const todayParts = new Intl.DateTimeFormat('id-ID', dateOptions).formatToParts(now);
  const msgParts = new Intl.DateTimeFormat('id-ID', dateOptions).formatToParts(date);
  
  const today = new Date(
    parseInt(todayParts.find(p => p.type === 'year')?.value || '0'),
    parseInt(todayParts.find(p => p.type === 'month')?.value || '0') - 1,
    parseInt(todayParts.find(p => p.type === 'day')?.value || '0')
  );
  
  const messageDate = new Date(
    parseInt(msgParts.find(p => p.type === 'year')?.value || '0'),
    parseInt(msgParts.find(p => p.type === 'month')?.value || '0') - 1,
    parseInt(msgParts.find(p => p.type === 'day')?.value || '0')
  );
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) {
    return 'Hari Ini';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Kemarin';
  }
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
}

// Welcome Message Component
interface WelcomeMessageProps {
  message: Message;
  onWave: () => void;
}

function WelcomeMessage({ message, onWave }: WelcomeMessageProps) {
  const timestamp = message.timestamp || (message as any).createdAt;
  const newMember = message.newMember;
  
  return (
    <div className="flex flex-col items-center my-4 px-4">
      {/* Join announcement */}
      <div className="flex items-center gap-2 text-[#96989d] text-sm">
        <span className="text-[#3ba55d]">→</span>
        <span>Everyone welcome</span>
        <span 
          className="font-semibold cursor-pointer hover:underline"
          style={{ color: newMember?.role_color || '#faa61a' }}
        >
          {newMember?.displayName || newMember?.username || 'New Member'}
        </span>
        <span className="text-[#6a6a7a] text-xs">
          {new Date(timestamp).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric' 
          })}
        </span>
        <span className="text-[#6a6a7a] text-xs">
          {(() => {
            const d = new Date(timestamp);
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes().toString().padStart(2, '0');
            const s = d.getSeconds().toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
          })()}
        </span>
      </div>
      
      {/* Wave button */}
      <button
        onClick={onWave}
        className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#12121a] hover:bg-[#0d0d14] border border-[#40444b] rounded-md transition-colors group"
      >
        <span className="text-xl">👋</span>
        <span className="text-[#a0a0b0] text-sm group-hover:text-white">Wave to say hi!</span>
      </button>
    </div>
  );
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { [key: string]: Message[] } = {};
  
  messages.forEach(message => {
    // Handle both timestamp and createdAt fields
    const timeField = message.timestamp || (message as any).createdAt;
    if (!timeField) return;
    
    const date = new Date(timeField);
    if (isNaN(date.getTime())) return;
    
    const dateKey = date.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  return Object.entries(groups).map(([, msgs]) => {
    const timeField = msgs[0].timestamp || (msgs[0] as any).createdAt;
    return {
      date: formatDate(timeField),
      messages: msgs
    };
  });
}

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
  currentUser: User | null;
  userPermissions: UserPermissions | null;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string) => void;
  onEdit?: (message: Message) => void;
  onUserClick?: (userId: string) => void;
  onAttachmentClick?: (message: Message, index: number) => void;
  onForward?: (message: Message) => void;
  onCopy?: (content: string) => void;
  onPin?: (message: Message) => void;
  onUnpin?: (messageId: string) => void;
  pinnedMessageIds?: Set<string>;
  isMobile?: boolean;
  avatarVersion?: number;
  userMap?: Map<string, string>;
  serverId?: string | null;
  memberRoleColors?: Map<string, string>;
  // Edit mode props
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  editInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}


function MessageItem({ message, showHeader, currentUser, userPermissions, onReply, onReaction, onDelete, onEdit, onUserClick, onAttachmentClick, onForward, onCopy, onPin, onUnpin, pinnedMessageIds, isMobile = false, avatarVersion = 0, userMap = new Map(), serverId = null, memberRoleColors = new Map(), isEditing = false, editContent = '', onEditContentChange, onEditSave, onEditCancel, editInputRef }: MessageItemProps) {

  const [showActions, setShowActions] = useState(false);
  
  // Default handlers
  const handleForward = (msg: Message) => {
    console.log('Forward message:', msg);
    // TODO: Open forward modal
  };
  
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean }>({ x: 0, y: 0, isOpen: false });
  const isOwnMessage = currentUser?.id === message.userId;
  
  // Use currentUser avatar for own messages (with cache busting)
  const getAvatarSrc = () => {
    if (isOwnMessage && currentUser?.avatar) {
      const avatarUrl = safeStartsWith(currentUser.avatar, 'http') 
        ? currentUser.avatar 
        : `${BASE_URL}${currentUser.avatar}`;
      return `${avatarUrl}${safeIncludes(avatarUrl, '?') ? '&' : '?'}v=${avatarVersion}`;
    }
    // For other users, use the avatar from message data
    const otherAvatar = message.user?.avatar;
    if (!otherAvatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.username || 'user'}`;
    }
    return safeStartsWith(otherAvatar, 'http') 
      ? otherAvatar 
      : `${BASE_URL}${otherAvatar}`;
  };
  
  // Get timestamp from either timestamp or createdAt field
  const timestamp = message.timestamp || (message as any).createdAt || new Date().toISOString();

  // Check permissions for this message
  const canDelete = isOwnMessage || userPermissions?.canManageMessages || false;
  const canPin = userPermissions?.canManageMessages || false;
  const canEdit = isOwnMessage;

  const handleReaction = (emoji: string) => {
    console.log('📦 MessageItem.handleReaction called:', message.id, emoji);
    onReaction(message.id, emoji);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, isOpen: true });
  };

  return (
    <div
      className={`flex gap-3 group hover:bg-[#12121a] ${isMobile ? 'px-2 py-1' : 'px-4 py-0.5'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onContextMenu={handleContextMenu}
    >
      {showHeader ? (
        <button 
          onClick={() => onUserClick?.(message.userId)}
          className="flex-shrink-0 bg-transparent border-none p-0 cursor-pointer"
        >
          <img
            src={getAvatarSrc()}
            alt={isOwnMessage 
              ? (currentUser?.displayName || currentUser?.username || 'You')
              : (message.user?.displayName || message.user?.username || 'User')}
            className={`rounded-full mt-0.5 hover:opacity-80 transition-opacity object-cover ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Prevent infinite loop by checking if we've already tried fallback
              if (!target.dataset.fallbackApplied) {
                target.dataset.fallbackApplied = 'true';
                const fallbackName = isOwnMessage 
                  ? (currentUser?.username || 'You')
                  : (message.user?.username || 'User');
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackName}`;
              }
            }}
          />
        </button>
      ) : (
        <div className={`flex-shrink-0 flex justify-end pt-1 ${isMobile ? 'w-8' : 'w-10'}`}>
          <span 
            className="text-[10px] text-[#6a6a7a] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block cursor-default"
            title={formatTooltipTimestamp(timestamp)}
          >
            {formatTime(timestamp)}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-center gap-2 mb-0.5">
            <button 
              onClick={() => onUserClick?.(message.userId)}
              className="font-bold hover:underline cursor-pointer text-sm bg-transparent border-none p-0"
              style={{ color: memberRoleColors.get(message.userId) || message.user?.role_color || '#dcddde' }}
            >
              {isOwnMessage 
                ? (currentUser?.displayName || currentUser?.username || 'You')
                : (message.user?.displayName || message.user?.username)}
            </button>
            {/* Badges */}
            {message.user?.badges?.includes('vip') && <span className="px-1.5 py-0.5 bg-[#00d4ff] text-white text-[10px] rounded font-semibold">VIP</span>}
            {message.user?.badges?.includes('crown') && <span className="text-sm">👑</span>}
            {message.user?.badges?.includes('verified') && <span className="text-[#43b581] text-sm">✓</span>}
            <span
              className="text-[11px] text-[#6a6a7a] cursor-default hover:underline"
              title={formatTooltipTimestamp(timestamp)}
            >
              {formatDiscordTimestamp(timestamp)}
            </span>
            {message.editedAt && (
              <span className="text-[11px] text-[#6a6a7a]">(edited)</span>
            )}
            {!message.timestamp && !(message as any).createdAt && (
              <span className="text-[11px] text-[#6a6a7a]">(sending...)</span>
            )}
          </div>
        )}
        
        {/* Reply reference */}
        {message.replyTo && (
          <div className="flex items-start gap-2 mb-2 p-2 rounded-md bg-[#12121a]/50 border-l-2 border-[#00d4ff]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                {message.replyTo?.user?.avatar ? (
                  <img 
                    src={safeStartsWith(message.replyTo.user.avatar, 'http') ? message.replyTo.user.avatar : `${BASE_URL}${message.replyTo.user.avatar}`}
                    alt={message.replyTo.user?.displayName || message.replyTo.user?.username || 'User'}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.replyTo?.user?.username || 'User'}`;
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#00d4ff] flex items-center justify-center text-[8px] text-white font-bold">
                    {(message.replyTo.user?.displayName || message.replyTo.user?.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span 
                  className="font-medium"
                  style={{ color: memberRoleColors.get(message.replyTo.userId || message.replyTo.user?.id || '') || message.replyTo.user?.role_color || '#00d4ff' }}
                >
                  {message.replyTo.user?.displayName || message.replyTo.user?.username}
                </span>
              </div>
              <p className="text-[#a0a0b0] text-xs mt-0.5 truncate">
                {message.replyTo.content}
              </p>
            </div>
          </div>
        )}
        
        {/* Message Content or Edit UI */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => onEditContentChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onEditSave?.();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onEditCancel?.();
                }
              }}
              className="w-full bg-[#2a2b3d] text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#00d4ff]"
              rows={2}
              style={{ minHeight: '44px' }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onEditSave}
                className="px-3 py-1.5 bg-[#00d4ff] hover:bg-[#00b8db] text-white text-xs font-medium rounded transition-colors"
              >
                Simpan
              </button>
              <button
                onClick={onEditCancel}
                className="px-3 py-1.5 bg-transparent hover:bg-[#2a2b3d] text-[#a0a0b0] hover:text-white text-xs font-medium rounded transition-colors"
              >
                Batal
              </button>
              <span className="text-[#6a6a7a] text-xs ml-2">
                Tekan Enter untuk menyimpan, Escape untuk membatalkan
              </span>
            </div>
          </div>
        ) : (
          <MessageContent content={message.content} serverId={serverId || undefined} />
        )}

        {/* Forwarded Message Display */}
        {message.forwardedFrom && (
          <ForwardedMessageDisplay forwardedFrom={message.forwardedFrom} />
        )}
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`mt-2 ${
            isMobile 
              ? message.attachments.length === 1 
                ? 'space-y-2' 
                : 'grid grid-cols-2 gap-1.5'
              : message.attachments.length === 1 
                ? 'space-y-2' :
                message.attachments.length === 2 
                  ? 'grid grid-cols-2 gap-2' 
                  : 'grid grid-cols-3 gap-2'
          }`}>
            {message.attachments.map((file, index) => {
              // Safety check - skip if file is null/undefined
              if (!file) return null;
              
              // Support both old format (type) and new format (mimetype)
              const mime = file.mimetype || file.type || 'application/octet-stream';
              const isImage = mime?.startsWith('image/') || false;
              const isVideo = mime?.startsWith('video/') || false;
              
              return (
              <div 
                key={index}
                className={`cursor-pointer ${isMobile ? 'w-full' : ''}`}
                onClick={() => onAttachmentClick?.(message, index)}
              >
                {isImage ? (
                  <div className={`block ${isMobile ? 'w-full' : 'max-w-2xl'}`} style={file.width ? { maxWidth: `${file.width}px` } : undefined}>
                    <img 
                      src={getFileUrl(file.url)} 
                      alt={file.originalName || file.name || 'Attachment'}
                      className={`w-full rounded-lg hover:opacity-90 transition-opacity object-contain bg-[#12121a] ${
                        isMobile ? 'max-h-[400px]' : 'max-h-[600px]'
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image failed to load:', getFileUrl(file.url));
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : isVideo ? (
                  <div className={`relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center ${isMobile ? 'w-full' : 'max-w-2xl'}`}>
                    <video
                      src={getFileUrl(file.url)}
                      className={`w-full ${isMobile ? 'max-h-[350px]' : 'max-h-[550px]'}`}
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 bg-[#12121a] hover:bg-[#0d0d14] rounded-lg p-2 transition-colors ${isMobile ? 'w-full' : 'p-3 max-w-2xl'}`}>
                    <div className={`bg-[#00d4ff] rounded-lg flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                      <FileText className={`text-white ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.originalName || file.name || 'Unknown file'}</p>
                      <p className="text-[#6a6a7a] text-xs">{file.size ? (file.size / 1024).toFixed(1) : '?'} KB</p>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.reactions.map((reaction, index) => {
              const hasReacted = reaction.users?.includes(currentUser?.id || '');
              const count = reaction.count || reaction.users?.length || 0;
              
              // Get usernames for tooltip using userMap
              const getUsernames = (): string[] => {
                if (!reaction.users || reaction.users.length === 0) return [];
                return reaction.users.map((userId: string) => {
                  // Check userMap first
                  const mappedName = userMap.get(userId);
                  if (mappedName) return mappedName;
                  
                  // Fallback to current user
                  if (userId === currentUser?.id) {
                    return currentUser?.displayName || currentUser?.username || 'You';
                  }
                  return 'User';
                });
              };
              
              return (
                <ReactionTooltip
                  key={`${reaction.emoji}-${index}`}
                  emoji={reaction.emoji}
                  usernames={getUsernames()}
                >
                  <button
                    onClick={(e) => {
                      console.log('👆 Reaction button clicked:', reaction.emoji, 'on message:', message.id);
                      e.stopPropagation();
                      handleReaction(reaction.emoji);
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-all ${
                      hasReacted
                        ? 'bg-[#00d4ff]/20 border border-[#00d4ff] hover:bg-[#00d4ff]/30'
                        : 'bg-[#12121a] border border-[#40444b] hover:border-[#00d4ff]/50 hover:bg-[#2a2b3d]'
                    }`}
                  >
                    <span 
                      className="text-lg leading-none"
                      style={{ fontFamily: '"Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Apple Color Emoji", sans-serif' }}
                    >
                      {reaction.emoji}
                    </span>
                    <span className={`text-sm font-semibold ${hasReacted ? 'text-[#00d4ff]' : 'text-[#a0a0b0]'}`}>
                      {count}
                    </span>
                  </button>
                </ReactionTooltip>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Message Actions */}
      {showActions && (
        <div className="absolute right-4 -top-3 flex items-center bg-[#0d0d14] border border-[#08080c] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onReply(message)}
            className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#4f545c] rounded-l-lg"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
          <div className="relative group/emoji">
            <div className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#4f545c] cursor-pointer">
              <EmojiPicker onEmojiSelect={handleReaction} />
            </div>
          </div>
          {canDelete && (
            <>
              <button
                onClick={() => onDelete(message.id)}
                className="p-2 text-[#a0a0b0] hover:text-[#ed4245] hover:bg-[#4f545c] rounded-r-lg"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Context Menu */}
      <MessageContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isOpen={contextMenu.isOpen}
        onClose={() => setContextMenu({ x: 0, y: 0, isOpen: false })}
        onReply={() => onReply(message)}
        onForward={() => onForward?.(message)}
        onCopy={() => onCopy ? onCopy(message.content) : handleCopy(message.content)}
        onCopyLink={() => handleCopy(`http://localhost:3001/message/${message.id}`)}
        onDelete={canDelete ? () => onDelete(message.id) : undefined}
        onEdit={canEdit && onEdit ? () => onEdit(message) : undefined}
        onPin={canPin && onPin ? () => onPin(message) : undefined}
        onUnpin={canPin && onUnpin ? () => onUnpin(message.id) : undefined}
        isPinned={pinnedMessageIds?.has(message.id) || false}

        canDelete={canDelete}
        canPin={canPin}
        canEdit={canEdit}
        onReaction={(emoji) => onReaction(message.id, emoji)}
        isOwnMessage={isOwnMessage}
      />

    </div>
  );
}

export function ChatArea({ channel, messages, typingUsers, currentUser, onReply, serverId, onRefresh, isMobile = false, onStartDM, onOpenSearch, servers = [], channels = [], dmChannels = [], onReaction, onFocusInput, showMemberList = true, onToggleMemberList }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<ServerMember | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxAttachments, setLightboxAttachments] = useState<Array<{id: string, url: string, filename: string, mimetype: string, size: number}>>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  // BUG-018: Track user scroll position
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  // Track initial load to always scroll to bottom on first load/refresh
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // User map for reaction usernames
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  // Pinned messages state
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedBanner, setShowPinnedBanner] = useState(false);
  // Refresh loading state
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  // Forward message state
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  // Help modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // Highlight message state (for jump to message from search)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  // Refs for message elements
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Pin confirmation modal state
  const [pinMessageConfirm, setPinMessageConfirm] = useState<Message | null>(null);
  // Pinned messages modal state
  const [isPinnedMessagesOpen, setIsPinnedMessagesOpen] = useState(false);
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean; message: Message | null }>({ x: 0, y: 0, isOpen: false, message: null });
  // Read status state
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const hasScrolledToUnreadRef = useRef(false);
  // Cache for member role colors
  const [memberRoleColors, setMemberRoleColors] = useState<Map<string, string>>(new Map());


  // Update avatar version when currentUser avatar changes
  useEffect(() => {
    setAvatarVersion(Date.now());
  }, [currentUser?.avatar]);

  // Listen for avatar updates from other components (e.g., SettingsModal)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        // Force update avatar version when user data in localStorage changes
        setAvatarVersion(Date.now());
      }
    };
    
    const handleAvatarUpdated = () => {
      // Force update avatar version when avatar is updated
      setAvatarVersion(Date.now());
    };
    
    const handleDisplayNameUpdated = () => {
      // Force re-render when display name is updated
      setAvatarVersion(Date.now()); // Using avatarVersion as a general refresh trigger
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('avatar-updated', handleAvatarUpdated as EventListener);
    window.addEventListener('displayname-updated', handleDisplayNameUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('avatar-updated', handleAvatarUpdated as EventListener);
      window.removeEventListener('displayname-updated', handleDisplayNameUpdated as EventListener);
    };
  }, []);

  // Listen for jumpToMessage event from search modal
  useEffect(() => {
    const handleJumpToMessage = (e: CustomEvent<{ messageId: string; channelId: string }>) => {
      const { messageId, channelId } = e.detail;
      
      // If message is in current channel, scroll to it
      if (channelId === channel?.id) {
        const messageElement = messageRefs.current.get(messageId);
        if (messageElement && scrollContainerRef.current) {
          // Scroll to message
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the message
          setHighlightedMessageId(messageId);
          // Remove highlight after 3 seconds
          setTimeout(() => setHighlightedMessageId(null), 3000);
        }
      }
    };
    
    window.addEventListener('jumpToMessage', handleJumpToMessage as EventListener);
    return () => {
      window.removeEventListener('jumpToMessage', handleJumpToMessage as EventListener);
    };
  }, [channel?.id]);


  // Build userMap from messages for reaction usernames
  useEffect(() => {
    const newUserMap = new Map<string, string>();
    
    // Add current user
    if (currentUser) {
      newUserMap.set(currentUser.id, currentUser.displayName || currentUser.username || 'You');
    }
    
    // Add users from messages
    messages.forEach(msg => {
      if (msg.userId && msg.user) {
        newUserMap.set(msg.userId, msg.user.displayName || msg.user.username || 'User');
      }
    });
    
    setUserMap(newUserMap);
  }, [messages, currentUser]);

  // Listen for socket events (message_edited, message_deleted)
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleMessageEdited = (_editedMessage: Message) => {
      // The parent component should handle updating the messages state
      // We just trigger a refresh to get the updated message
      onRefresh?.();
    };

    const handleMessageDeleted = (_data: { messageId: string }) => {
      // The parent component should handle updating the messages state
      // We just trigger a refresh to remove the deleted message
      onRefresh?.();
    };

    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [onRefresh]);

  // Function to fetch member role color from server
  const fetchMemberRoleColor = async (userId: string) => {
    if (!serverId || memberRoleColors.has(userId)) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Try to get member's roles first
      const rolesRes = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/roles`, { headers });
      if (rolesRes.ok) {
        const roles = await rolesRes.json();
        if (roles && roles.length > 0) {
          // Sort by position and get highest role color
          const sortedRoles = [...roles].sort((a: any, b: any) => (b.position || 0) - (a.position || 0));
          const color = sortedRoles[0]?.color || '#dcddde';
          setMemberRoleColors(prev => new Map(prev).set(userId, color));
          return;
        }
      }
      
      // Fallback to member role info
      const roleRes = await fetch(`${API_URL}/servers/${serverId}/member-role/${userId}`, { headers });
      if (roleRes.ok) {
        const roleData = await roleRes.json();
        const color = roleData?.role_color || '#dcddde';
        setMemberRoleColors(prev => new Map(prev).set(userId, color));
      }
    } catch (err) {
      console.error('Failed to fetch member role color:', err);
    }
  };

  // Function to get role color for a user
  const getRoleColor = (userId: string, defaultColor?: string) => {
    // Check cache first
    if (memberRoleColors.has(userId)) {
      return memberRoleColors.get(userId)!;
    }
    // Return default color and trigger fetch
    if (serverId) {
      fetchMemberRoleColor(userId);
    }
    return defaultColor || '#dcddde';
  };

  // Prefetch role colors for all users in messages
  useEffect(() => {
    if (!serverId || messages.length === 0) return;
    
    // Get unique user IDs from messages
    const userIds = new Set<string>();
    messages.forEach(msg => {
      if (msg.userId) userIds.add(msg.userId);
      if (msg.replyTo?.userId) userIds.add(msg.replyTo.userId);
    });
    
    // Fetch role colors for users not in cache
    userIds.forEach(userId => {
      if (!memberRoleColors.has(userId)) {
        fetchMemberRoleColor(userId);
      }
    });
  }, [messages, serverId]);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // BUG-018: Smart auto-scroll - only scroll if user is near bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // On initial load, scroll to first unread message or bottom
    if (isInitialLoad && messages.length > 0 && !hasScrolledToUnreadRef.current) {
      const lastMessageId = messages[messages.length - 1]?.id;
      
      // Check if lastReadMessageId exists in current messages
      const lastReadIndex = lastReadMessageId ? messages.findIndex(m => m.id === lastReadMessageId) : -1;
      const lastReadExists = lastReadIndex >= 0;
      
      console.log('[Scroll Debug]', {
        lastReadMessageId,
        lastReadExists,
        lastReadIndex,
        totalMessages: messages.length,
        lastMessageId
      });
      
      // If lastReadMessageId is not in current messages (too old), scroll to bottom
      if (lastReadMessageId && !lastReadExists) {
        console.log('[Scroll] Last read not in messages, scrolling to bottom');
        scrollToBottom('auto');
        hasScrolledToUnreadRef.current = true;
        setIsInitialLoad(false);
        return;
      }
      
      // If lastReadMessageId is the last message, all messages are read
      if (lastReadMessageId && lastReadIndex === messages.length - 1) {
        console.log('[Scroll] All messages read, scrolling to bottom');
        scrollToBottom('auto');
        hasScrolledToUnreadRef.current = true;
        setIsInitialLoad(false);
        return;
      }
      
      // If there are unread messages, scroll to first unread
      if (lastReadMessageId && lastReadIndex < messages.length - 1) {
        const firstUnreadIndex = lastReadIndex + 1;
        const firstUnreadMessage = messages[firstUnreadIndex];
        console.log('[Scroll] Scrolling to first unread:', firstUnreadMessage.id);
        const element = document.getElementById(`message-${firstUnreadMessage.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
          hasScrolledToUnreadRef.current = true;
          setIsInitialLoad(false);
          return;
        }
      }
      
      // Default: scroll to bottom
      console.log('[Scroll] Default scroll to bottom');
      scrollToBottom('auto');
      hasScrolledToUnreadRef.current = true;
      setIsInitialLoad(false);
      return;
    }
    
    // Only auto-scroll if user is near bottom (within 100px) or not manually scrolling
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (!isUserScrolling || isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isUserScrolling, isInitialLoad, lastReadMessageId]);

  // Mark last visible message as read when user scrolls near bottom
  useEffect(() => {
    if (!channel?.id || messages.length === 0 || isInitialLoad) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      if (isNearBottom) {
        // Mark last message as read when user scrolls to bottom
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.id !== lastReadMessageId) {
          markAsRead(lastMessage.id);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [channel?.id, messages, lastReadMessageId, isInitialLoad]);

  // BUG-018: Event listener untuk detect user scroll
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsUserScrolling(!isNearBottom);
  };

  // Fetch user permissions when server changes
  useEffect(() => {
    if (serverId) {
      fetchUserPermissions();
    }
  }, [serverId]);

  // Fetch pinned messages and read status when channel changes
  useEffect(() => {
    if (channel?.id) {
      fetchPinnedMessages();
      fetchReadStatus();
      hasScrolledToUnreadRef.current = false;
    }
  }, [channel?.id]);


  // Reset initial load state when channel changes (so it scrolls to bottom on new channel)
  useEffect(() => {
    setIsInitialLoad(true);
    setIsUserScrolling(false);
  }, [channel?.id]);

  const fetchUserPermissions = async () => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const fetchPinnedMessages = async () => {
    if (!channel?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/channels/${channel.id}/pins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPinnedMessages(data.messages || []);
        setShowPinnedBanner((data.messages || []).length > 0);
      }
    } catch (error) {
      console.error('Failed to fetch pinned messages:', error);
    }
  };

  const fetchReadStatus = async () => {
    if (!channel?.id) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/channels/${channel.id}/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLastReadMessageId(data.lastReadMessageId);
      }
    } catch (error) {
      console.error('Failed to fetch read status:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!channel?.id || messageId === lastReadMessageId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/channels/${channel.id}/read`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ messageId }),
      });
      setLastReadMessageId(messageId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Pinning message:', messageId, 'API_URL:', API_URL);
      // Force no-cache for API call
      const pinUrl = `${API_URL}/messages/${messageId}/pin`;
      console.log('Full pin URL:', pinUrl);
      const response = await fetch(pinUrl, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      console.log('Pin response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Pin success:', data);
        // Refresh pinned messages
        fetchPinnedMessages();
        // Close confirmation modal
        setPinMessageConfirm(null);
        // Show success notification
        console.log('Message pinned successfully');
      } else {
        const errorText = await response.text();
        console.error('Pin error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to pin message' };
        }
        alert(error.error || 'Failed to pin message');
      }
    } catch (error) {
      console.error('Failed to pin message:', error);
      alert('Failed to pin message: ' + (error instanceof Error ? error.message : 'Network error'));
    }
  };


  const handleUnpinMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/messages/${messageId}/unpin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        // Refresh pinned messages
        fetchPinnedMessages();
        console.log('Message unpinned successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to unpin message');
      }
    } catch (error) {
      console.error('Failed to unpin message:', error);
      alert('Failed to unpin message');
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleForwardMessage = async (message: Message, targetChannelId: string, comment?: string) => {
    const token = localStorage.getItem('token');
    
    // Get channel info for the source message
    const sourceChannel = channels.find(c => c.id === message.channelId);
    const sourceServer = servers?.find(s => s.id === sourceChannel?.serverId);
    
    // Build forward metadata
    const forwardedFrom = {
      messageId: message.id,
      userId: message.user.id,
      username: message.user.username,
      displayName: message.user.displayName,
      avatar: message.user.avatar,
      channelId: message.channelId,
      channelName: sourceChannel?.name || 'Unknown Channel',
      serverId: sourceServer?.id,
      serverName: sourceServer?.name,
      timestamp: message.timestamp,
      content: message.content || undefined,
    };
    
    // Check if target is a DM channel
    const isDM = dmChannels.some(dm => dm.id === targetChannelId);
    const endpoint = isDM 
      ? `${API_URL}/dm/channels/${targetChannelId}/messages`
      : `${API_URL}/channels/${targetChannelId}/messages`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: comment || '',
          attachments: message.attachments,
          forwardedFrom,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to forward message');
      }
      
      console.log('Message forwarded successfully');
    } catch (error) {
      console.error('Failed to forward message:', error);
      throw error;
    }
  };

  const openForwardModal = (message: Message) => {
    setForwardingMessage(message);
    setIsForwardModalOpen(true);
  };


  const handleReaction = async (messageId: string, emoji: string) => {
    console.log('🔥 ChatArea.handleReaction called:', messageId, emoji);
    console.log('🔥 Available messages:', messages.length);
    console.log('🔥 onReaction callback exists:', !!onReaction);
    
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.log('❌ Message not found:', messageId);
      return;
    }
    
    const hasReacted = message.reactions?.some(r => 
      r.emoji === emoji && safeArrayIncludes(r.users, currentUser?.id || '')
    ) ?? false;
    
    console.log('🔥 Has reacted:', hasReacted);
    console.log('🔥 Message reactions:', message.reactions);
    
    // Optimistic update - notify parent component (ChatLayout handles API call)
    console.log('🎨 Calling onReaction prop:', messageId, emoji, hasReacted);
    if (onReaction) {
      onReaction(messageId, emoji, hasReacted);
    } else {
      console.log('❌ onReaction prop is missing!');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) return;
    
    // Emit socket event for delete
    const socket = (window as any).socket;
    if (socket) {
      socket.emit('delete_message', { messageId });
    }
  };

  // Edit message handlers
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content || '');
    // Focus input after a short delay to ensure it's rendered
    setTimeout(() => {
      editInputRef.current?.focus();
      // Place cursor at the end
      editInputRef.current?.setSelectionRange(editContent.length, editContent.length);
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    
    const socket = (window as any).socket;
    if (socket) {
      socket.emit('edit_message', { messageId: editingMessageId, content: editContent.trim() });
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleUserClick = async (userId: string) => {
    if (!serverId) return;
    setSelectedUserId(userId);
    setIsProfileOpen(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const isElectron = !!(window as any).electronAPI;
      const apiUrl = isElectron ? 'http://localhost:3001/api' : (import.meta.env.VITE_API_URL || '/api');
      const baseUrl = isElectron ? 'http://localhost:3001' : '';

      const [userRes, roleRes, memberRolesRes] = await Promise.allSettled([
        fetch(`${apiUrl}/users/${userId}`, { headers }),
        fetch(`${apiUrl}/servers/${serverId}/member-role/${userId}`, { headers }),
        fetch(`${apiUrl}/servers/${serverId}/members/${userId}/roles`, { headers }),
      ]);

      let userData: any = null;
      let roleData: any = null;
      let memberRoles: any[] = [];

      if (userRes.status === 'fulfilled' && userRes.value.ok) {
        userData = await userRes.value.json();
      }
      if (roleRes.status === 'fulfilled' && roleRes.value.ok) {
        roleData = await roleRes.value.json();
      }
      if (memberRolesRes.status === 'fulfilled' && memberRolesRes.value.ok) {
        memberRoles = await memberRolesRes.value.json();
      }

      if (userData) {
        const member: ServerMember = {
          id: userData.id,
          username: userData.username,
          displayName: userData.display_name || userData.username,
          email: userData.email || '',
          avatar: userData.avatar,
          status: userData.status || 'offline',
          role: roleData?.role || userData.role || 'member',
          role_name: roleData?.role_name,
          role_color: roleData?.role_color,
          joinedAt: roleData?.joinedAt || userData.created_at,
          roles: memberRoles.length > 0 ? memberRoles : 
                 (roleData?.role_name ? [{ id: roleData.role_id || '', name: roleData.role_name, color: roleData.role_color || '#99aab5' }] : []),
        };
        setSelectedMemberProfile(member);
      }
    } catch (_) {}
  };

  const handleAttachmentClick = (message: Message, index: number) => {
    if (!message.attachments || message.attachments.length === 0) return;
    
    // Convert attachments to Lightbox format (filter out invalid attachments)
    const attachments = message.attachments
      .filter((att) => att?.url) // Only include attachments with valid URL
      .map((att, i) => ({
        id: `${message.id}-${i}`,
        url: safeStartsWith(att.url, 'http') ? att.url : `${BASE_URL}${att.url}`,
        filename: att.originalName || att.name || `file-${i}`,
        mimetype: att.mimetype || att.type || 'application/octet-stream',
        size: att.size || 0
      }));
    
    setLightboxAttachments(attachments);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (!channel) {
    return (
      <div className="flex-1 bg-[#0d0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#00d4ff]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-12 h-12 text-[#00d4ff]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang!</h2>
          <p className="text-[#a0a0b0]">Pilih channel untuk mulai chatting</p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);
  const channelTypingUsers = typingUsers.filter(u => u.channelId === channel.id);

  // Voice channel view
  if (channel.type === 'voice') {
    return (
      <div className="flex-1 bg-[#0d0d14] flex flex-col min-h-0">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-[#8e9297]" />
            <h2 className="text-white font-semibold">{channel.name}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenSearch}
              className="relative flex items-center bg-[#08080c] hover:bg-[#12121a] text-[#6a6a7a] hover:text-white text-sm rounded-md px-3 py-1.5 w-36 transition-all group"
              title="Cari pesan (Ctrl+K)"
            >
              <Search className="w-4 h-4 mr-2" />
              <span>Cari</span>
              <kbd className="ml-auto text-xs bg-[#0d0d14] px-1.5 py-0.5 rounded text-[#6a6a7a] group-hover:text-[#a0a0b0]">Ctrl+K</kbd>
            </button>
          </div>
        </div>
        
        {/* Voice Channel Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <VoiceChannelPanel 
              channelId={channel.id} 
              channelName={channel.name}
              serverId={serverId || channel.serverId}
            />
          </div>
        </div>
      </div>
    );
  }

  // Text channel view
  return (
    <div className="flex-1 bg-[#0d0d14] flex flex-col min-h-0">
      {/* Header - Simplified for mobile */}
      <div className={`${isMobile ? 'h-11 px-3' : 'h-12 px-4'} flex items-center justify-between shadow-md bg-[#0d0d14] border-b border-[#08080c] flex-shrink-0`}>
        <div className="flex items-center gap-2 min-w-0">
          <Hash className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-[#8e9297] flex-shrink-0`} />
          <h2 className="text-white font-semibold truncate">{channel.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <>
              {/* 1. Pin - Pinned Messages */}
              <button 
                onClick={() => setIsPinnedMessagesOpen(true)}
                className="relative text-[#a0a0b0] hover:text-[#00d4ff] transition-colors p-1" 
                title="Pinned Messages"
              >
                <Pin className="w-5 h-5" />
                {pinnedMessages.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ed4245] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pinnedMessages.length > 9 ? '9+' : pinnedMessages.length}
                  </span>
                )}
              </button>
              {/* 2. Notification Settings */}
              {channel?.id && serverId && (
                <ChannelNotificationSettings 
                  channelId={channel.id} 
                  serverId={serverId} 
                />
              )}
              {/* 3. File */}
              <button className="text-[#a0a0b0] hover:text-[#00d4ff] transition-colors p-1" title="File Attachment">
                <Inbox className="w-5 h-5" />
              </button>
            </>
          )}
          {/* 3. Search */}
          <button 
            onClick={onOpenSearch}
            className={`relative flex items-center bg-[#08080c] hover:bg-[#12121a] text-[#6a6a7a] hover:text-white text-sm rounded-md transition-all group ${isMobile ? 'px-2 py-1.5 w-28' : 'px-3 py-1.5 w-36'}`}
            title="Cari pesan (Ctrl+K)"
          >
            <Search className="w-4 h-4 mr-2" />
            <span className={isMobile ? 'hidden' : ''}>Cari</span>
            {!isMobile && <kbd className="ml-auto text-xs bg-[#0d0d14] px-1.5 py-0.5 rounded text-[#6a6a7a] group-hover:text-[#a0a0b0]">Ctrl+K</kbd>}
          </button>
          {!isMobile && (
            <>
              {/* 4. Help */}
              <button 
                onClick={() => setIsHelpOpen(true)}
                className="text-[#a0a0b0] hover:text-[#00d4ff] transition-colors p-1" 
                title="Bantuan"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </>
          )}
          {/* 5. Refresh */}
          {onRefresh && (
            <button 
              onClick={async () => {
                setIsRefreshing(true);
                await onRefresh();
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              disabled={isRefreshing}
              className="text-[#a0a0b0] hover:text-[#00d4ff] transition-colors p-1 disabled:opacity-50"
              title="Refresh pesan"
            >
              <RefreshCw className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {!isMobile && (
            /* 6. Users/Anggota - Toggle Member List */
            <button 
              onClick={onToggleMemberList}
              className={`transition-colors p-1 ${showMemberList ? 'text-[#00d4ff]' : 'text-[#a0a0b0] hover:text-[#00d4ff]'}`} 
              title={showMemberList ? 'Sembunyikan daftar anggota' : 'Tampilkan daftar anggota'}
            >
              <Users className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Permission Bot Panel - Only for text channels */}
      {channel.type === 'text' && serverId && (
        <div className={`${isMobile ? 'px-2 pt-2' : 'px-4 pt-4'}`}>
          <PermissionBot 
            channelId={channel.id} 
            serverId={serverId} 
            currentUserId={currentUser?.id || ''}
          />
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto ${isMobile ? 'px-2 py-2 pb-20' : 'px-2 py-4'}`}
        onScroll={handleScroll}
        onClick={(e) => {
          // Focus input when clicking on empty area (not on messages or buttons)
          if (e.target === e.currentTarget) {
            onFocusInput?.();
          }
        }}
      >
        {groupedMessages.length === 0 ? (

          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#00d4ff]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-[#00d4ff]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Selamat datang di #{channel.name}!
            </h3>
            <p className="text-[#a0a0b0]">Ini adalah awal dari channel #{channel.name}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Divider */}
                <div className="flex items-center justify-center mb-4">
                  <div className="h-[1px] bg-[#2a2b3d] flex-1" />
                  <span className="px-4 text-xs text-[#6a6a7a] font-medium">{group.date}</span>
                  <div className="h-[1px] bg-[#2a2b3d] flex-1" />
                </div>

                {/* Messages */}
                <div>
                  {group.messages.map((message, messageIndex) => {
                    const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                    const isSameUser = prevMessage && prevMessage.userId === message.userId;
                    const msgTime = message.timestamp || (message as any).createdAt;
                    const prevTime = prevMessage?.timestamp || (prevMessage as any)?.createdAt;
                    const timeDiff = prevTime && msgTime
                      ? new Date(msgTime).getTime() - new Date(prevTime).getTime()
                      : Infinity;
                    const showHeader = !isSameUser || timeDiff > 5 * 60 * 1000 || isNaN(timeDiff);
                    // Compact mode: reduce spacing for same user messages
                    const compactClass = isSameUser ? 'mt-0.5' : 'mt-4';

                    // Check if this is the first unread message
                    const msgIndex = messages.findIndex(m => m.id === message.id);
                    const lastReadIndex = lastReadMessageId ? messages.findIndex(m => m.id === lastReadMessageId) : -1;
                    const isFirstUnread = lastReadMessageId && 
                      msgIndex === lastReadIndex + 1 &&
                      msgIndex < messages.length;

                    // Render welcome message for system messages
                    if (message.isSystem || message.type === 'system') {
                      return (
                        <WelcomeMessage
                          key={message.id}
                          message={message}
                          onWave={() => handleReaction(message.id, '👋')}
                        />
                      );
                    }

                    const isHighlighted = highlightedMessageId === message.id;

                    return (
                      <div key={message.id}>
                        {/* Unread Messages Divider */}
                        {isFirstUnread && (
                          <div className="flex items-center gap-2 my-4 py-1">
                            <div className="h-[1px] bg-[#ed4245] flex-1" />
                            <span className="px-3 py-1 bg-[#ed4245] text-white text-xs font-semibold rounded">
                              Pesan Belum Dibaca
                            </span>
                            <div className="h-[1px] bg-[#ed4245] flex-1" />
                          </div>
                        )}
                        <div 
                          id={`message-${message.id}`}
                          ref={el => { if (el) messageRefs.current.set(message.id, el); }}
                          className={`relative ${compactClass} ${isHighlighted ? 'bg-[#00d4ff]/20 rounded-lg transition-colors duration-500' : ''}`}
                        >
                          <MessageItem
                            message={message}
                          showHeader={showHeader}
                          currentUser={currentUser}
                          userPermissions={userPermissions}
                          onReply={onReply || (() => {})}
                          onReaction={handleReaction}
                          onDelete={handleDelete}
                          onEdit={handleStartEdit}
                          onUserClick={handleUserClick}
                          onAttachmentClick={handleAttachmentClick}
                          onPin={(msg) => setPinMessageConfirm(msg)}
                          onUnpin={handleUnpinMessage}
                          pinnedMessageIds={new Set(pinnedMessages.map(m => m.id))}
                          onForward={openForwardModal}
                          onCopy={handleCopy}
                          isMobile={isMobile}
                          avatarVersion={avatarVersion}
                          userMap={userMap}
                          serverId={serverId}
                          memberRoleColors={memberRoleColors}
                          isEditing={editingMessageId === message.id}
                          editContent={editContent}
                          onEditContentChange={setEditContent}
                          onEditSave={handleSaveEdit}
                          onEditCancel={handleCancelEdit}
                          editInputRef={editInputRef}
                        />

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Typing Indicator */}
        {channelTypingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-[#a0a0b0] text-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-[#b9bbbe] rounded-full typing-dot" />
              <div className="w-2 h-2 bg-[#b9bbbe] rounded-full typing-dot" />
              <div className="w-2 h-2 bg-[#b9bbbe] rounded-full typing-dot" />
            </div>
            <span>
              {channelTypingUsers.length === 1
                ? `${channelTypingUsers[0].username} sedang mengetik...`
                : channelTypingUsers.length === 2
                ? `${channelTypingUsers[0].username} dan ${channelTypingUsers[1].username} sedang mengetik...`
                : `${channelTypingUsers.length} orang sedang mengetik...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* User Profile Popup */}
      <MemberProfilePopup
        member={selectedMemberProfile}
        isOpen={isProfileOpen}
        onClose={() => { setIsProfileOpen(false); setSelectedMemberProfile(null); }}
        onSendMessage={() => {
          if (onStartDM && selectedMemberProfile) {
            onStartDM({
              id: selectedMemberProfile.id,
              username: selectedMemberProfile.username,
              avatar: selectedMemberProfile.avatar,
              status: selectedMemberProfile.status,
            });
            setIsProfileOpen(false);
          }
        }}
        serverId={serverId}
      />

      {/* Lightbox */}
      <Lightbox
        attachments={lightboxAttachments}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      {/* Forward Modal */}
      <ForwardModal
        isOpen={isForwardModalOpen}
        onClose={() => setIsForwardModalOpen(false)}
        message={forwardingMessage}
        servers={servers}
        channels={[]}
        dmChannels={dmChannels}
        currentServerId={serverId ?? null}
        onForward={handleForwardMessage}
      />

      {/* Pin Confirmation Modal */}
      <Dialog open={!!pinMessageConfirm} onOpenChange={() => setPinMessageConfirm(null)}>
        <DialogContent className="bg-[#313338] border-[#232438] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pin className="w-6 h-6 text-[#00d4ff]" />
              Sematkan Pesan Ini?
            </DialogTitle>
          </DialogHeader>
          
          {pinMessageConfirm && (
            <div className="py-4">
              <p className="text-[#a0a0b0] mb-4">
                Pesan ini akan disematkan ke channel <span className="text-white font-medium">#{channel?.name}</span> agar mudah ditemukan oleh semua anggota.
              </p>
              
              {/* Message Preview */}
              <div className="bg-[#232438] rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="flex items-start gap-3">
                  <img
                    src={getAvatarUrl(pinMessageConfirm.user?.avatar || null, pinMessageConfirm.user?.username || 'user')}
                    alt={pinMessageConfirm.user?.username}
                    className="w-10 h-10 rounded-full bg-[#1a1b2e]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${pinMessageConfirm.user?.username || 'user'}`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {pinMessageConfirm.user?.displayName || pinMessageConfirm.user?.username}
                      </span>
                      <span className="text-xs text-[#6a6a7a]">
                        {new Date(pinMessageConfirm.timestamp || Date.now()).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-[#a0a0b0] mt-1 break-words">
                      {pinMessageConfirm.content}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setPinMessageConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-[#232438] hover:bg-[#2a2b3d] text-white rounded-md transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={() => pinMessageConfirm && handlePinMessage(pinMessageConfirm.id)}
                  className="flex-1 px-4 py-2.5 bg-[#00d4ff] hover:bg-[#00b8db] text-black rounded-md transition-colors font-medium"
                >
                  Ya, Sematkan
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pinned Messages Modal */}
      <Dialog open={isPinnedMessagesOpen} onOpenChange={setIsPinnedMessagesOpen}>
        <DialogContent className="bg-[#313338] border-[#232438] text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pin className="w-6 h-6 text-[#00d4ff]" />
              Pesan yang Disematkan
              {pinnedMessages.length > 0 && (
                <span className="text-sm font-normal text-[#6a6a7a]">({pinnedMessages.length})</span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="text-center py-12 text-[#6a6a7a]">
                <Pin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-white mb-2">Belum ada pesan yang disematkan</p>
                <p className="text-sm">Pesan yang disematkan akan muncul di sini</p>
              </div>
            ) : (
              pinnedMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="bg-[#232438] rounded-lg p-4 hover:bg-[#2a2b3d] transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={getAvatarUrl(msg.user?.avatar || null, msg.user?.username || 'user')}
                      alt={msg.user?.username}
                      className="w-10 h-10 rounded-full bg-[#1a1b2e]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user?.username || 'user'}`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {msg.user?.displayName || msg.user?.username}
                          </span>
                          <span className="text-xs text-[#6a6a7a]">
                            {new Date(msg.timestamp || Date.now()).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setIsPinnedMessagesOpen(false);
                              // Jump to message
                              const element = document.getElementById(`message-${msg.id}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                element.classList.add('highlight-message');
                                setTimeout(() => element.classList.remove('highlight-message'), 2000);
                              }
                            }}
                            className="p-1.5 text-[#a0a0b0] hover:text-[#00d4ff] hover:bg-[#1a1b2e] rounded transition-colors"
                            title="Lihat pesan"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {userPermissions?.canManageMessages && (
                            <button
                              onClick={() => handleUnpinMessage(msg.id)}
                              className="p-1.5 text-[#a0a0b0] hover:text-[#ed4245] hover:bg-[#1a1b2e] rounded transition-colors"
                              title="Hapus sematan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[#a0a0b0] mt-1 break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="bg-[#0d0d14] border-[#1a1a24] text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#00d4ff]" />
              Panduan Penggunaan WorkGrid
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Shortcut Keyboard */}
            <section>
              <h3 className="text-[#00d4ff] font-semibold mb-3 flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                Shortcut Keyboard
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between bg-[#08080c] p-2 rounded">
                  <span className="text-[#a0a0b0]">Cari pesan</span>
                  <kbd className="bg-[#1a1a24] px-2 py-0.5 rounded text-xs">Ctrl + K</kbd>
                </div>
                <div className="flex justify-between bg-[#08080c] p-2 rounded">
                  <span className="text-[#a0a0b0]">Kirim pesan</span>
                  <kbd className="bg-[#1a1a24] px-2 py-0.5 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between bg-[#08080c] p-2 rounded">
                  <span className="text-[#a0a0b0]">Baris baru</span>
                  <kbd className="bg-[#1a1a24] px-2 py-0.5 rounded text-xs">Shift + Enter</kbd>
                </div>
                <div className="flex justify-between bg-[#08080c] p-2 rounded">
                  <span className="text-[#a0a0b0]">Refresh</span>
                  <span className="text-[#6a6a7a] text-xs">Klik icon 🔄</span>
                </div>
              </div>
            </section>

            {/* Fitur Chat */}
            <section>
              <h3 className="text-[#00d4ff] font-semibold mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Fitur Chat
              </h3>
              <ul className="space-y-2 text-sm text-[#a0a0b0]">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">Kirim Pesan:</strong> Ketik di kotak input bawah dan tekan Enter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">Upload File:</strong> Klik icon + di sebelah kiri input</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">Emoji & GIF:</strong> Klik icon 😊 atau GIF di input</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">Reply:</strong> Klik kanan pada pesan → Balas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">Reaction:</strong> Klik kanan pada pesan → Tambah reaksi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">Edit/Hapus:</strong> Klik kanan pada pesan Anda</span>
                </li>
              </ul>
            </section>

            {/* Mention */}
            <section>
              <h3 className="text-[#00d4ff] font-semibold mb-3 flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                Mention/Menyebut
              </h3>
              <ul className="space-y-2 text-sm text-[#a0a0b0]">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">@nama</strong> - Sebut user tertentu</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">@everyone</strong> - Sebut semua anggota server</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff]">•</span>
                  <span><strong className="text-white">@here</strong> - Sebut yang online saja</span>
                </li>
              </ul>
            </section>

            {/* Toolbar Icon */}
            <section>
              <h3 className="text-[#00d4ff] font-semibold mb-3 flex items-center gap-2">
                <Pin className="w-4 h-4" />
                Icon Toolbar
              </h3>
              <ul className="space-y-2 text-sm text-[#a0a0b0]">
                <li className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-[#6a6a7a]" />
                  <span><strong className="text-white">Pin:</strong> Lihat pesan yang di-pin</span>
                </li>
                <li className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-[#6a6a7a]" />
                  <span><strong className="text-white">File:</strong> Lihat file attachment</span>
                </li>
                <li className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#6a6a7a]" />
                  <span><strong className="text-white">Cari:</strong> Cari pesan (Ctrl+K)</span>
                </li>
                <li className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#6a6a7a]" />
                  <span><strong className="text-white">Bantuan:</strong> Panduan ini</span>
                </li>
                <li className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#6a6a7a]" />
                  <span><strong className="text-white">Refresh:</strong> Muat ulang pesan</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#6a6a7a]" />
                  <span><strong className="text-white">Anggota:</strong> Lihat daftar member</span>
                </li>
              </ul>
            </section>

            {/* Status */}
            <section>
              <h3 className="text-[#00d4ff] font-semibold mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Status Online
              </h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#00d4ff] rounded-full"></div>
                  <span className="text-[#a0a0b0]">Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#faa81a] rounded-full"></div>
                  <span className="text-[#a0a0b0]">Idle</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#ed4245] rounded-full"></div>
                  <span className="text-[#a0a0b0]">DND</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#747f8d] rounded-full"></div>
                  <span className="text-[#a0a0b0]">Offline</span>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section className="bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg p-4">
              <h3 className="text-[#00d4ff] font-semibold mb-2">💡 Tips</h3>
              <p className="text-sm text-[#a0a0b0]">
                Klik kanan pada pesan untuk melihat menu aksi (Reply, Edit, Hapus, Forward, Pin, Reaction)
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

