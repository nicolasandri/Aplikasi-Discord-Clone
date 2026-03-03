import { useEffect, useRef, useState } from 'react';
import { Hash, Volume2, Users, Phone, Video, Pin, Search, Inbox, HelpCircle, Reply, Trash2, FileText, RefreshCw } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { UserProfilePopup } from './UserProfilePopup';
import { Lightbox } from './Lightbox';
import { MessageContent } from './MessageContent';
import { MessageContextMenu } from './MessageContextMenu';
import { VoiceChannelPanel } from './VoiceChannelPanel';
import { ReactionTooltip } from './ReactionTooltip';
import { ForwardModal } from './ForwardModal';
import type { Channel, Message, User, Server } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || '/api');

// Get base URL for backend (without /api)
const BASE_URL = (() => {
  if (API_URL.startsWith('http')) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  // For relative API URL in dev mode, use localhost:3001
  return 'http://localhost:3001';
})();

// Helper to get full file URL
const getFileUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  // Ensure url starts with /
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
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
  dmChannels?: import('@/types').DMChannel[];
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
  
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
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
  
  // Format time in Asia/Jakarta
  const timeStr = date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
  
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

// Format tooltip timestamp (full datetime with Asia/Jakarta timezone)
function formatTooltipTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleDateString('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }) + ' pukul ' + date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
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
  onPin?: (messageId: string) => void;
  isMobile?: boolean;
  avatarVersion?: number;
  userMap?: Map<string, string>;
  // Edit mode props
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  editInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}


function MessageItem({ message, showHeader, currentUser, userPermissions, onReply, onReaction, onDelete, onEdit, onUserClick, onAttachmentClick, onForward, onCopy, onPin, isMobile = false, avatarVersion = 0, userMap = new Map(), isEditing = false, editContent = '', onEditContentChange, onEditSave, onEditCancel, editInputRef }: MessageItemProps) {

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
      const avatarUrl = currentUser.avatar.startsWith('http') 
        ? currentUser.avatar 
        : `${BASE_URL}${currentUser.avatar}`;
      return `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${avatarVersion}`;
    }
    // For other users, use the avatar from message data
    const otherAvatar = message.user?.avatar;
    if (!otherAvatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.username || 'user'}`;
    }
    return otherAvatar.startsWith('http') 
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
    onReaction(message.id, emoji);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, isOpen: true });
  };

  return (
    <div
      className={`flex gap-3 group hover:bg-[#2f3136] ${isMobile ? 'px-2 py-1' : 'px-4 py-0.5'}`}
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
            className="text-[10px] text-[#72767d] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block cursor-default"
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
              className="text-white font-medium hover:underline cursor-pointer text-sm bg-transparent border-none p-0"
            >
              {isOwnMessage 
                ? (currentUser?.displayName || currentUser?.username || 'You')
                : (message.user?.displayName || message.user?.username)}
            </button>
            <span 
              className="text-[11px] text-[#72767d] cursor-default hover:underline"
              title={formatTooltipTimestamp(timestamp)}
            >
              {formatDiscordTimestamp(timestamp)}
            </span>
            {message.editedAt && (
              <span className="text-[11px] text-[#72767d]">(edited)</span>
            )}
            {!message.timestamp && !(message as any).createdAt && (
              <span className="text-[11px] text-[#72767d]">(sending...)</span>
            )}
          </div>
        )}
        
        {/* Reply reference */}
        {message.replyTo && (
          <div className="flex items-start gap-2 mb-2 p-2 rounded-md bg-[#2f3136]/50 border-l-2 border-[#5865f2]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                {message.replyTo?.user?.avatar ? (
                  <img 
                    src={message.replyTo.user.avatar.startsWith('http') ? message.replyTo.user.avatar : `${BASE_URL}${message.replyTo.user.avatar}`}
                    alt={message.replyTo.user?.displayName || message.replyTo.user?.username || 'User'}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.replyTo?.user?.username || 'User'}`;
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#5865f2] flex items-center justify-center text-[8px] text-white font-bold">
                    {(message.replyTo.user?.displayName || message.replyTo.user?.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[#5865f2] font-medium">{message.replyTo.user?.displayName || message.replyTo.user?.username}</span>
              </div>
              <p className="text-[#b9bbbe] text-xs mt-0.5 truncate">
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
              className="w-full bg-[#40444b] text-white text-sm rounded px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              rows={2}
              style={{ minHeight: '44px' }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={onEditSave}
                className="px-3 py-1.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-xs font-medium rounded transition-colors"
              >
                Simpan
              </button>
              <button
                onClick={onEditCancel}
                className="px-3 py-1.5 bg-transparent hover:bg-[#40444b] text-[#b9bbbe] hover:text-white text-xs font-medium rounded transition-colors"
              >
                Batal
              </button>
              <span className="text-[#72767d] text-xs ml-2">
                Tekan Enter untuk menyimpan, Escape untuk membatalkan
              </span>
            </div>
          </div>
        ) : (
          <MessageContent content={message.content} />
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
            {message.attachments.map((file, index) => (
              <div 
                key={index}
                className={`cursor-pointer ${isMobile ? 'w-full' : ''}`}
                onClick={() => onAttachmentClick?.(message, index)}
              >
                {file.mimetype.startsWith('image/') ? (
                  <div className={`block ${isMobile ? 'w-full' : 'max-w-md'}`}>
                    <img 
                      src={getFileUrl(file.url)} 
                      alt={file.originalName}
                      className={`w-full rounded-lg hover:opacity-90 transition-opacity object-contain bg-[#2f3136] ${
                        isMobile ? 'max-h-[200px]' : 'max-h-[300px]'
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image failed to load:', getFileUrl(file.url));
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : file.mimetype.startsWith('video/') ? (
                  <div className={`relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center ${isMobile ? 'w-full' : 'max-w-md'}`}>
                    <video
                      src={getFileUrl(file.url)}
                      className={`w-full ${isMobile ? 'max-h-[150px]' : 'max-h-[200px]'}`}
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 bg-[#2f3136] hover:bg-[#36393f] rounded-lg p-2 transition-colors ${isMobile ? 'w-full' : 'p-3 max-w-md'}`}>
                    <div className={`bg-[#5865f2] rounded-lg flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                      <FileText className={`text-white ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.originalName}</p>
                      <p className="text-[#72767d] text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
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
                    onClick={() => handleReaction(reaction.emoji)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-sm transition-all ${
                      hasReacted
                        ? 'bg-[#5865f2]/20 border border-[#5865f2] hover:bg-[#5865f2]/30'
                        : 'bg-[#2f3136] border border-[#40444b] hover:border-[#5865f2]/50 hover:bg-[#40444b]'
                    }`}
                  >
                    <span 
                      className="text-base leading-none"
                      style={{ fontFamily: '"Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Apple Color Emoji", sans-serif' }}
                    >
                      {reaction.emoji}
                    </span>
                    <span className={`text-xs font-semibold ${hasReacted ? 'text-[#5865f2]' : 'text-[#b9bbbe]'}`}>
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
        <div className="absolute right-4 -top-3 flex items-center bg-[#36393f] border border-[#202225] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onReply(message)}
            className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] rounded-l-lg"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>
          <div className="relative group/emoji">
            <div className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] cursor-pointer">
              <EmojiPicker onEmojiSelect={handleReaction} />
            </div>
          </div>
          {canDelete && (
            <>
              <button
                onClick={() => onDelete(message.id)}
                className="p-2 text-[#b9bbbe] hover:text-[#ed4245] hover:bg-[#4f545c] rounded-r-lg"
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
        onPin={canPin && onPin ? () => onPin(message.id) : undefined}

        canDelete={canDelete}
        canPin={canPin}
        canEdit={canEdit}
        onReaction={(emoji) => onReaction(message.id, emoji)}
        isOwnMessage={isOwnMessage}
      />

    </div>
  );
}

export function ChatArea({ channel, messages, typingUsers, currentUser, onReply, serverId, onRefresh, isMobile = false, onStartDM, onOpenSearch, servers = [], dmChannels = [] }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  // Forward message state
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);


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

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // BUG-018: Smart auto-scroll - only scroll if user is near bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Always scroll to bottom on initial load/refresh (use 'auto' for instant scroll)
    if (isInitialLoad && messages.length > 0) {
      scrollToBottom('auto');
      setIsInitialLoad(false);
      return;
    }
    
    // Only auto-scroll if user is near bottom (within 100px) or not manually scrolling
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (!isUserScrolling || isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isUserScrolling, isInitialLoad]);

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

  // Fetch pinned messages when channel changes
  useEffect(() => {
    if (channel?.id) {
      fetchPinnedMessages();
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

  const handlePinMessage = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Pinning message:', messageId, 'API_URL:', API_URL);
      const response = await fetch(`${API_URL}/messages/${messageId}/pin`, {
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
    
    // Build forward content
    let content = message.content || '';
    if (comment) {
      content = `${comment}\n\n> Forwarded from ${message.user?.username}:\n> ${content}`;
    } else {
      content = `> Forwarded from ${message.user?.username}:\n> ${content}`;
    }
    
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
          content,
          attachments: message.attachments,
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
    console.log('handleReaction called:', messageId, emoji);
    const token = localStorage.getItem('token');
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.log('Message not found:', messageId);
      return;
    }
    
    const hasReacted = message.reactions?.some(r => 
      r.emoji === emoji && r.users.includes(currentUser?.id || '')
    );
    
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
        method: hasReacted ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Reaction success:', data);
        // Refresh messages to show updated reactions
        onRefresh?.();
      } else {
        console.error('Reaction failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
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

  const handleUserClick = (userId: string) => {
    console.log('User clicked:', userId, 'ServerId:', serverId);
    if (serverId) {
      setSelectedUserId(userId);
      setIsProfileOpen(true);
      console.log('Opening profile popup for user:', userId);
    } else {
      console.log('Cannot open profile: serverId is missing');
    }
  };

  const handleAttachmentClick = (message: Message, index: number) => {
    if (!message.attachments || message.attachments.length === 0) return;
    
    // Convert attachments to Lightbox format
    const attachments = message.attachments.map((att, i) => ({
      id: `${message.id}-${i}`,
      url: att.url.startsWith('http') ? att.url : `${BASE_URL}${att.url}`,
      filename: att.originalName || `file-${i}`,
      mimetype: att.mimetype || 'application/octet-stream',
      size: att.size || 0
    }));
    
    setLightboxAttachments(attachments);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (!channel) {
    return (
      <div className="flex-1 bg-[#36393f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#5865f2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-12 h-12 text-[#5865f2]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang!</h2>
          <p className="text-[#b9bbbe]">Pilih channel untuk mulai chatting</p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);
  console.log('Messages count:', messages.length, 'Grouped:', groupedMessages.length);
  const channelTypingUsers = typingUsers.filter(u => u.channelId === channel.id);

  // Voice channel view
  if (channel.type === 'voice') {
    return (
      <div className="flex-1 bg-[#36393f] flex flex-col min-h-0">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-[#8e9297]" />
            <h2 className="text-white font-semibold">{channel.name}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenSearch}
              className="relative flex items-center bg-[#202225] hover:bg-[#2f3136] text-[#72767d] hover:text-white text-sm rounded-md px-3 py-1.5 w-36 transition-all group"
              title="Cari pesan (Ctrl+K)"
            >
              <Search className="w-4 h-4 mr-2" />
              <span>Cari</span>
              <kbd className="ml-auto text-xs bg-[#36393f] px-1.5 py-0.5 rounded text-[#72767d] group-hover:text-[#b9bbbe]">Ctrl+K</kbd>
            </button>
          </div>
        </div>
        
        {/* Voice Channel Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <VoiceChannelPanel 
              channelId={channel.id} 
              channelName={channel.name} 
            />
          </div>
        </div>
      </div>
    );
  }

  // Text channel view
  return (
    <div className="flex-1 bg-[#36393f] flex flex-col min-h-0">
      {/* Header - Simplified for mobile */}
      <div className={`${isMobile ? 'h-11 px-3' : 'h-12 px-4'} flex items-center justify-between shadow-md bg-[#36393f] border-b border-[#202225] flex-shrink-0`}>
        <div className="flex items-center gap-2 min-w-0">
          <Hash className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-[#8e9297] flex-shrink-0`} />
          <h2 className="text-white font-semibold truncate">{channel.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isMobile && (
            <>
              <button className="text-[#b9bbbe] hover:text-white transition-colors p-1">
                <Phone className="w-5 h-5" />
              </button>
              <button className="text-[#b9bbbe] hover:text-white transition-colors p-1">
                <Video className="w-5 h-5" />
              </button>
              <button className="text-[#b9bbbe] hover:text-white transition-colors p-1">
                <Pin className="w-5 h-5" />
              </button>
              <button className="text-[#b9bbbe] hover:text-white transition-colors p-1">
                <Users className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={onOpenSearch}
            className={`relative flex items-center bg-[#202225] hover:bg-[#2f3136] text-[#72767d] hover:text-white text-sm rounded-md transition-all group ${isMobile ? 'px-2 py-1.5 w-28' : 'px-3 py-1.5 w-36'}`}
            title="Cari pesan (Ctrl+K)"
          >
            <Search className="w-4 h-4 mr-2" />
            <span className={isMobile ? 'hidden' : ''}>Cari</span>
            {!isMobile && <kbd className="ml-auto text-xs bg-[#36393f] px-1.5 py-0.5 rounded text-[#72767d] group-hover:text-[#b9bbbe]">Ctrl+K</kbd>}
          </button>
          {!isMobile && (
            <>
              <button className="text-[#b9bbbe] hover:text-white transition-colors p-1">
                <Inbox className="w-5 h-5" />
              </button>
              <button className="text-[#b9bbbe] hover:text-white transition-colors p-1">
                <HelpCircle className="w-5 h-5" />
              </button>
            </>
          )}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="text-[#b9bbbe] hover:text-white transition-colors p-1"
              title="Refresh"
            >
              <RefreshCw className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Pinned Messages Banner */}
      {showPinnedBanner && pinnedMessages.length > 0 && (
        <div className="bg-[#2f3136] border-b border-[#202225] px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-[#b9bbbe]" />
              <span className="text-sm text-[#b9bbbe]">
                {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowPinnedBanner(!showPinnedBanner)}
              className="text-xs text-[#5865f2] hover:underline"
            >
              {showPinnedBanner ? 'Hide' : 'Show'}
            </button>
          </div>
          {showPinnedBanner && (
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
              {pinnedMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2 p-2 bg-[#36393f] rounded text-sm">
                  <img
                    src={msg.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user?.username || 'user'}`}
                    alt={msg.user?.username}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{msg.user?.displayName || msg.user?.username}</span>
                      <span 
                        className="text-xs text-[#72767d] cursor-default hover:underline"
                        title={formatTooltipTimestamp(msg.timestamp || (msg as any).createdAt)}
                      >
                        {formatDiscordTimestamp(msg.timestamp || (msg as any).createdAt)}
                      </span>
                    </div>
                    <p className="text-[#b9bbbe] truncate">{msg.content}</p>
                  </div>
                  {userPermissions?.canManageMessages && (
                    <button
                      onClick={() => handleUnpinMessage(msg.id)}
                      className="text-[#72767d] hover:text-[#ed4245] p-1"
                      title="Unpin message"
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto ${isMobile ? 'px-2 py-2 pb-20' : 'px-2 py-4'}`}
        onScroll={handleScroll}
      >
        {groupedMessages.length === 0 ? (

          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#5865f2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hash className="w-8 h-8 text-[#5865f2]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Selamat datang di #{channel.name}!
            </h3>
            <p className="text-[#b9bbbe]">Ini adalah awal dari channel #{channel.name}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Divider */}
                <div className="flex items-center justify-center mb-4">
                  <div className="h-[1px] bg-[#40444b] flex-1" />
                  <span className="px-4 text-xs text-[#72767d] font-medium">{group.date}</span>
                  <div className="h-[1px] bg-[#40444b] flex-1" />
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

                    return (
                      <div key={message.id} className={`relative ${compactClass}`}>
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
                          onPin={handlePinMessage}
                          onForward={openForwardModal}
                          onCopy={handleCopy}
                          isMobile={isMobile}
                          avatarVersion={avatarVersion}
                          userMap={userMap}
                          isEditing={editingMessageId === message.id}
                          editContent={editContent}
                          onEditContentChange={setEditContent}
                          onEditSave={handleSaveEdit}
                          onEditCancel={handleCancelEdit}
                          editInputRef={editInputRef}
                        />

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
          <div className="flex items-center gap-2 px-4 py-2 text-[#b9bbbe] text-sm">
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
      <UserProfilePopup
        userId={selectedUserId || ''}
        serverId={serverId || ''}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onStartDM={onStartDM}
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
    </div>
  );
}
