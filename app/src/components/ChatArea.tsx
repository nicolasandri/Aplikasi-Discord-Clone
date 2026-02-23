import { useEffect, useRef, useState } from 'react';
import { Hash, Volume2, Users, Phone, Video, Pin, Search, Inbox, HelpCircle, Reply, Trash2, FileText, RefreshCw } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { UserProfilePopup } from './UserProfilePopup';
import { ImageViewer } from './ImageViewer';
import { MessageContextMenu } from './MessageContextMenu';
import { VoiceChannelPanel } from './VoiceChannelPanel';
import type { Channel, Message, User } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface ChatAreaProps {
  channel: Channel | null;
  messages: Message[];
  typingUsers: { userId: string; username: string; channelId: string }[];
  currentUser: User | null;
  onReply?: (message: Message) => void;
  serverId?: string | null;
  onRefresh?: () => void;
  isMobile?: boolean;
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

function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatDate(timestamp: string): string {
  if (!timestamp) return 'Tanggal tidak diketahui';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Tanggal tidak valid';
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hari Ini';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Kemarin';
  }
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
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
  onUserClick?: (userId: string) => void;
  onImageClick?: (src: string, alt: string) => void;
  onForward?: (message: Message) => void;
  onCopy?: (content: string) => void;
  isMobile?: boolean;
}

function MessageItem({ message, showHeader, currentUser, userPermissions, onReply, onReaction, onDelete, onUserClick, onImageClick, onForward, onCopy, isMobile = false }: MessageItemProps) {
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
            src={message.user?.avatar?.startsWith('http') ? message.user?.avatar : `${API_URL.replace('/api', '')}${message.user?.avatar}`}
            alt={message.user?.username}
            className={`rounded-full mt-0.5 hover:opacity-80 transition-opacity object-cover ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Prevent infinite loop by checking if we've already tried fallback
              if (!target.dataset.fallbackApplied) {
                target.dataset.fallbackApplied = 'true';
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.username}`;
              }
            }}
          />
        </button>
      ) : (
        <div className={`flex-shrink-0 flex justify-end pt-1 ${isMobile ? 'w-8' : 'w-10'}`}>
          <span className="text-[10px] text-[#72767d] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
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
              {message.user?.username}
            </button>
            <span className="text-[11px] text-[#72767d]">
              {formatTime(timestamp)}
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
                    src={message.replyTo.user.avatar.startsWith('http') ? message.replyTo.user.avatar : `${API_URL.replace('/api', '')}${message.replyTo.user.avatar}`}
                    alt={message.replyTo.user?.username || 'User'}
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.replyTo?.user?.username || 'User'}`;
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[#5865f2] flex items-center justify-center text-[8px] text-white font-bold">
                    {(message.replyTo.user?.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[#5865f2] font-medium">{message.replyTo.user?.username}</span>
              </div>
              <p className="text-[#b9bbbe] text-xs mt-0.5 truncate">
                {message.replyTo.content}
              </p>
            </div>
          </div>
        )}
        
        <p 
          className="text-[#dcddde] break-words text-sm leading-relaxed message-content"
          style={{ fontFamily: '"Whitney", "Helvetica Neue", Helvetica, Arial, "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif' }}
          dangerouslySetInnerHTML={{ 
            __html: message.content
              .replace(/@(\w+)/g, '<span class="text-[#00a8fc] bg-[#00a8fc]/10 px-1 rounded font-medium hover:bg-[#00a8fc]/20 cursor-pointer">@$1</span>')
              .replace(/#(\w+)/g, '<span class="text-[#00a8fc] hover:underline cursor-pointer">#$1</span>')
          }}
        />
        
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((file, index) => (
              <div key={index}>
                {file.mimetype.startsWith('image/') ? (
                  <div 
                    className="block max-w-md cursor-pointer"
                    onClick={() => onImageClick?.(`${API_URL.replace('/api', '')}${file.url}`, file.originalName)}
                  >
                    <img 
                      src={`${API_URL.replace('/api', '')}${file.url}`} 
                      alt={file.originalName}
                      className="max-w-full max-h-[300px] rounded-lg hover:opacity-90 transition-opacity object-contain bg-[#2f3136]"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <a 
                    href={`${API_URL.replace('/api', '')}${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 bg-[#2f3136] hover:bg-[#36393f] rounded-lg p-3 max-w-md transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#5865f2] rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.originalName}</p>
                      <p className="text-[#72767d] text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </a>
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
              return (
                <button
                  key={`${reaction.emoji}-${index}`}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-sm transition-all ${
                    hasReacted
                      ? 'bg-[#5865f2]/20 border border-[#5865f2] hover:bg-[#5865f2]/30'
                      : 'bg-[#2f3136] border border-[#40444b] hover:border-[#5865f2]/50 hover:bg-[#40444b]'
                  }`}
                  title={`${count} reactions`}
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
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]">
              <EmojiPicker onEmojiSelect={handleReaction} />
            </button>
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
        onForward={() => (onForward || handleForward)(message)}
        onCopy={() => (onCopy || handleCopy)(message.content)}
        onCopyLink={() => handleCopy(`http://localhost:3001/message/${message.id}`)}
        onDelete={canDelete ? () => onDelete(message.id) : undefined}
        canDelete={canDelete}
        canPin={canPin}
        canEdit={canEdit}
        onReaction={(emoji) => onReaction(message.id, emoji)}
        isOwnMessage={isOwnMessage}
      />
    </div>
  );
}

export function ChatArea({ channel, messages, typingUsers, currentUser, onReply, serverId, onRefresh, isMobile = false }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch user permissions when server changes
  useEffect(() => {
    if (serverId) {
      fetchUserPermissions();
    }
  }, [serverId]);

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

  const handleImageClick = (src: string, alt: string) => {
    setViewerImage({ src, alt });
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
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Hash className="w-6 h-6 text-[#8e9297]" />
          <h2 className="text-white font-semibold">{channel.name}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Pin className="w-5 h-5" />
          </button>
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Users className="w-5 h-5" />
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#72767d]" />
            <input
              type="text"
              placeholder="Cari"
              className="bg-[#202225] text-white text-sm rounded-md pl-9 pr-3 py-1.5 w-36 focus:w-64 transition-all outline-none placeholder:text-[#72767d]"
            />
          </div>
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Inbox className="w-5 h-5" />
          </button>
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="text-[#b9bbbe] hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-4"
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
                          onUserClick={handleUserClick}
                          onImageClick={handleImageClick}
                          isMobile={isMobile}
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
        onStartDM={(userId) => console.log('Start DM with:', userId)}
      />

      {/* Image Viewer */}
      <ImageViewer
        src={viewerImage?.src || ''}
        alt={viewerImage?.alt || ''}
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
      />
    </div>
  );
}
