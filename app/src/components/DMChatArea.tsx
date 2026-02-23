import { useEffect, useRef, useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { ImageViewer } from './ImageViewer';
import type { DMChannel, DMMessage, User } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface DMChatAreaProps {
  channel: DMChannel | null;
  currentUser: User | null;
  onBack?: () => void;
}

const statusColors = {
  online: 'bg-[#3ba55d]',
  offline: 'bg-[#747f8d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
};

const statusLabels = {
  online: 'Online',
  offline: 'Offline',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
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
  if (!timestamp) return '';
  const date = new Date(timestamp);
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

function groupMessagesByDate(messages: DMMessage[]): { date: string; messages: DMMessage[] }[] {
  const groups: { [key: string]: DMMessage[] } = {};
  
  messages.forEach(message => {
    const timeField = message.createdAt;
    if (!timeField) return;
    
    const date = new Date(timeField);
    if (isNaN(date.getTime())) return;
    
    const dateKey = date.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });

  return Object.entries(groups).map(([, msgs]) => ({
    date: formatDate(msgs[0].createdAt),
    messages: msgs
  }));
}

export function DMChatArea({ channel, currentUser, onBack: _onBack }: DMChatAreaProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (channel) {
      fetchMessages();
      joinDMChannel();
    }
    return () => {
      if (channel) {
        leaveDMChannel();
      }
    };
  }, [channel?.id]);

  // Socket listeners
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket || !channel) return;

    const handleDMMessage = (data: { channelId: string; message: DMMessage }) => {
      if (data.channelId === channel.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        // Mark as read if message is from friend
        if (data.message.senderId !== currentUser?.id) {
          markAsRead(data.message.id);
        }
      }
    };

    const handleDMTyping = (data: { channelId: string; username: string }) => {
      if (data.channelId === channel.id) {
        setTypingUser(data.username);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser(null);
        }, 3000);
      }
    };

    socket.on('dm_message_received', handleDMMessage);
    socket.on('dm_typing', handleDMTyping);

    return () => {
      socket.off('dm_message_received', handleDMMessage);
      socket.off('dm_typing', handleDMTyping);
    };
  }, [channel?.id, currentUser?.id]);

  const fetchMessages = async () => {
    if (!channel) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/dm/channels/${channel.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch DM messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const joinDMChannel = () => {
    const socket = (window as any).socket;
    if (socket && channel) {
      socket.emit('join_dm_channel', channel.id);
    }
  };

  const leaveDMChannel = () => {
    const socket = (window as any).socket;
    if (socket && channel) {
      socket.emit('leave_dm_channel', channel.id);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`${API_URL}/dm/messages/${messageId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channel) return;

    const socket = (window as any).socket;
    if (socket) {
      socket.emit('send_dm_message', {
        channelId: channel.id,
        content: newMessage.trim()
      });
    }

    setNewMessage('');
  };

  const handleTyping = () => {
    const socket = (window as any).socket;
    if (socket && channel) {
      socket.emit('dm_typing', { channelId: channel.id });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const _handleReaction = (emoji: string) => {
    // DM reactions not implemented yet
    console.log('Reaction:', emoji);
  };

  if (!channel) {
    return (
      <div className="flex-1 bg-[#36393f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#5865f2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pesan Langsung</h2>
          <p className="text-[#b9bbbe]">Pilih teman untuk mulai mengobrol</p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col min-h-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-[#202225]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={channel.friend.avatar} 
              alt={channel.friend.username}
              className="w-8 h-8 rounded-full"
            />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[channel.friend.status]} rounded-full border-2 border-[#36393f]`} />
          </div>
          <div>
            <h3 className="text-white font-semibold">{channel.friend.username}</h3>
            <p className="text-xs text-[#b9bbbe]">{statusLabels[channel.friend.status]}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="text-[#b9bbbe] hover:text-white transition-colors">
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#5865f2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Ini adalah awal dari percakapan Anda dengan {channel.friend.username}
            </h3>
            <p className="text-[#b9bbbe]">Kirim pesan untuk memulai!</p>
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
                <div className="space-y-4">
                  {group.messages.map((message, idx) => {
                    const isOwn = message.senderId === currentUser?.id;
                    const showAvatar = idx === 0 || group.messages[idx - 1].senderId !== message.senderId;

                    return (
                      <div 
                        key={message.id} 
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        {showAvatar ? (
                          <img
                            src={isOwn ? currentUser?.avatar : channel.friend.avatar}
                            alt={message.sender_username}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 flex-shrink-0" />
                        )}
                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                          {showAvatar && (
                            <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <span className="text-white font-medium text-sm">
                                {isOwn ? currentUser?.username : channel.friend.username}
                              </span>
                              <span className="text-[11px] text-[#72767d]">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                          )}
                          <div className={`px-4 py-2 rounded-2xl ${
                            isOwn 
                              ? 'bg-[#5865f2] text-white rounded-br-md' 
                              : 'bg-[#40444b] text-[#dcddde] rounded-bl-md'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {typingUser && (
          <div className="flex items-center gap-2 px-4 py-2 text-[#b9bbbe] text-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-[#b9bbbe] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#b9bbbe] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[#b9bbbe] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUser} sedang mengetik...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-4">
        <div className="bg-[#40444b] rounded-lg flex items-end gap-2 p-2">
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] rounded-full transition-colors">
              <span className="text-xl">+</span>
            </button>
          </div>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTyping}
            placeholder={`Kirim pesan ke @${channel.friend.username}`}
            className="flex-1 bg-transparent text-white placeholder:text-[#72767d] resize-none outline-none min-h-[40px] max-h-[120px] py-2"
            rows={1}
            style={{ height: 'auto' }}
            onInputCapture={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] rounded-full transition-colors">
              <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
            </button>
          </div>
        </div>
      </div>

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
