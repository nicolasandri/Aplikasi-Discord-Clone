import { useEffect, useRef, useState } from 'react';
import { Phone, Video, Users, UserPlus, MoreVertical, LogOut, Plus, X, FileText } from 'lucide-react';
import { EmojiStickerGIFPicker } from './EmojiStickerGIFPicker';
import { ImageViewer } from './ImageViewer';
import { UserProfilePopup } from './UserProfilePopup';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DMChannel, DMMessage, User, FileAttachment } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Base URL for assets (images, uploads) - always use absolute URL for images
const BASE_URL = isElectron 
  ? 'http://localhost:3001' 
  : 'http://localhost:3001';
console.log('[DMChatArea] API_URL:', API_URL, 'BASE_URL:', BASE_URL);

interface DMChatAreaProps {
  channel: DMChannel | null;
  currentUser: User | null;
  onBack?: () => void;
  onAddMember?: (channelId: string) => void;
  onLeaveGroup?: (channelId: string) => void;
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

// Helper to format time
function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  // Format: 11:28:30 PM
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
  return `${displayHours}:${minutes}:${seconds} ${ampm}`;
}

function formatDate(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
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
  // Format: Selasa, 27 Januari 2026
  return date.toLocaleDateString('id-ID', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
}

function formatShortDate(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  // Format: 27/1/2026 (Indonesian format)
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'numeric', 
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
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

export function DMChatArea({ channel, currentUser, onBack: _onBack, onAddMember, onLeaveGroup }: DMChatAreaProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = localStorage.getItem('token');
  // Track scroll state for smart auto-scroll
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update avatar version when currentUser changes
  useEffect(() => {
    setAvatarVersion(Date.now());
  }, [currentUser?.avatar]);

  // Check socket availability periodically
  useEffect(() => {
    const checkSocket = () => {
      const socket = (window as any).socket;
      if (socket && socket.connected) {
        setSocketReady(true);
      } else {
        setSocketReady(false);
      }
    };
    
    checkSocket();
    const interval = setInterval(checkSocket, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Smart auto-scroll - only scroll if user is near bottom or initial load
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Always scroll to bottom on initial load/refresh
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

  // Fetch messages when channel changes
  useEffect(() => {
    if (channel) {
      setIsInitialLoad(true);
      setIsUserScrolling(false);
      fetchMessages();
    }
  }, [channel?.id]);

  // Handle scroll event to detect user scrolling
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsUserScrolling(!isNearBottom);
  };

  // Join/Leave DM channel when channel or socket changes
  useEffect(() => {
    if (channel && socketReady) {
      console.log('✅ Joining DM channel:', channel.id, 'Friend:', channel.friend?.username, 'Avatar:', channel.friend?.avatar);
      joinDMChannel();
      return () => {
        console.log('👋 Leaving DM channel:', channel.id);
        leaveDMChannel();
      };
    }
  }, [channel?.id, socketReady]);

  // Socket listeners - using ref to always have latest channel id
  const channelIdRef = useRef(channel?.id);
  channelIdRef.current = channel?.id;
  const currentUserIdRef = useRef(currentUser?.id);
  currentUserIdRef.current = currentUser?.id;

  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) {
      console.log('❌ No socket available for DM listeners');
      return;
    }

    console.log('🔌 Attaching DM socket listeners. Socket connected:', socket.connected);

    const handleDMMessage = (data: { channelId: string; message: any; sender?: any }) => {
      console.log('📨 new-dm-message received:', JSON.stringify(data, null, 2));
      console.log('📨 Current channel id ref:', channelIdRef.current);
      
      if (data.channelId === channelIdRef.current) {
        console.log('✅ Message is for current channel');
        // Map message from socket to DMMessage interface
        const mappedMessage: DMMessage = {
          id: data.message.id,
          channelId: data.message.channel_id || data.message.channelId,
          senderId: data.message.sender_id || data.message.senderId,
          content: data.message.content,
          sender_username: data.message.sender_username || data.sender?.username,
          sender_display_name: data.message.sender_display_name || data.sender?.displayName,
          sender_avatar: data.message.sender_avatar || data.sender?.avatar,
          attachments: data.message.attachments,
          isRead: data.message.is_read === 1 || data.message.is_read === true || data.message.isRead === true,
          createdAt: data.message.created_at || data.message.createdAt,
          editedAt: data.message.edited_at || data.message.editedAt,
        };
        
        setMessages(prev => {
          // Check if this is a response to optimistic message (same sender and content)
          const existingIndex = prev.findIndex(m => 
            m.senderId === mappedMessage.senderId && 
            m.content === mappedMessage.content &&
            m.id.startsWith('temp-')
          );
          
          if (existingIndex !== -1) {
            // Replace optimistic message with real one
            console.log('Replacing optimistic message with real message');
            const newMessages = [...prev];
            newMessages[existingIndex] = mappedMessage;
            return newMessages;
          }
          
          // Check if message already exists (by id)
          if (prev.some(m => m.id === mappedMessage.id)) {
            console.log('Message already exists, skipping');
            return prev;
          }
          
          console.log('Adding new message to state');
          return [...prev, mappedMessage];
        });
        
        // Mark as read if message is from friend (not current user)
        if (mappedMessage.senderId !== currentUserIdRef.current) {
          markAsRead(mappedMessage.id);
        }
      } else {
        console.log('❌ Message is NOT for current channel. Received:', data.channelId, 'Current:', channelIdRef.current);
      }
    };

    const handleDMTyping = (data: { channelId: string; username: string }) => {
      console.log('⌨️ dm-typing received:', data);
      if (data.channelId === channelIdRef.current) {
        setTypingUser(data.username);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUser(null);
        }, 3000);
      }
    };

    const handleDMError = (data: { error: string }) => {
      console.error('❌ DM error received:', data);
    };

    socket.on('new-dm-message', handleDMMessage);
    socket.on('dm-typing', handleDMTyping);
    socket.on('dm-error', handleDMError);

    return () => {
      console.log('🔌 Detaching DM socket listeners');
      socket.off('new-dm-message', handleDMMessage);
      socket.off('dm-typing', handleDMTyping);
      socket.off('dm-error', handleDMError);
    };
  }, []); // Only run once on mount

  const fetchMessages = async () => {
    if (!channel) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/dm/channels/${channel.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Map database response to DMMessage interface
        const mappedMessages: DMMessage[] = data.map((row: any) => ({
          id: row.id,
          channelId: row.channel_id,
          senderId: row.sender_id,
          content: row.content,
          sender_username: row.sender_username,
          sender_display_name: row.sender_display_name,
          sender_avatar: row.sender_avatar,
          attachments: row.attachments,
          isRead: row.is_read === 1 || row.is_read === true,
          createdAt: row.created_at,
          editedAt: row.edited_at,
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch DM messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get member info for a sender
  const getMemberInfo = (senderId: string) => {
    if (!channel?.members) return null;
    return channel.members.find(m => m.id === senderId);
  };

  const joinDMChannel = () => {
    const socket = (window as any).socket;
    if (socket && socket.connected && channel) {
      console.log('📤 Emitting join-dm-channel for:', channel.id);
      socket.emit('join-dm-channel', channel.id);
      
      // Listen for confirmation
      socket.once('joined-dm-channel', (data: { channelId: string; success: boolean }) => {
        console.log('✅ Server confirmed join:', data);
      });
    } else {
      console.log('❌ Cannot join DM channel - socket:', !!socket, 'connected:', socket?.connected, 'channel:', !!channel);
    }
  };

  const leaveDMChannel = () => {
    const socket = (window as any).socket;
    if (socket && socket.connected && channel) {
      socket.emit('leave-dm-channel', channel.id);
      console.log('✅ Left DM channel:', channel.id);
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
    if ((!newMessage.trim() && attachments.length === 0) || !channel || !currentUser) return;

    const messageContent = newMessage.trim();
    const tempId = 'temp-' + Date.now();
    
    // Optimistic update - add message immediately to UI
    const optimisticMessage: DMMessage = {
      id: tempId,
      channelId: channel.id,
      senderId: currentUser.id,
      content: messageContent,
      sender_username: currentUser.username,
      sender_avatar: currentUser.avatar,
      attachments: attachments.length > 0 ? attachments : undefined,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    const socket = (window as any).socket;
    
    if (socket && socket.connected) {
      // Use socket for real-time messaging
      console.log('Sending via socket:', { channelId: channel.id, content: messageContent, attachments });
      socket.emit('send-dm-message', {
        channelId: channel.id,
        content: messageContent,
        attachments: attachments.length > 0 ? attachments : undefined
      });
      
      // Clear attachments after sending
      setAttachments([]);
      
      // Set timeout to confirm message was received (fallback if no response)
      setTimeout(() => {
        setMessages(prev => {
          const stillHasTemp = prev.some(m => m.id === tempId);
          if (stillHasTemp) {
            console.log('No socket response received, keeping optimistic message');
          }
          return prev;
        });
      }, 5000);
    } else {
      // Fallback: Use REST API
      console.log('Socket not connected, using REST API');
      try {
        const response = await fetch(`${API_URL}/dm/channels/${channel.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            content: messageContent,
            attachments: attachments.length > 0 ? attachments : undefined
          })
        });
        
        if (response.ok) {
          const message = await response.json();
          // Replace optimistic message with real one
          setMessages(prev => prev.map(m => m.id === tempId ? message : m));
          // Clear attachments after sending
          setAttachments([]);
        } else {
          console.error('Failed to send message:', await response.text());
          // Remove optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    }
  };

  const handleTyping = () => {
    const socket = (window as any).socket;
    if (socket && socket.connected && channel) {
      socket.emit('dm-typing', { channelId: channel.id });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          return {
            url: data.url,
            filename: data.filename,
            originalName: data.originalName,
            mimetype: data.mimetype,
            size: data.size,
          } as FileAttachment;
        } else {
          console.error('Upload failed:', await response.text());
          return null;
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        return null;
      }
    });

    const uploadedFiles = (await Promise.all(uploadPromises)).filter(Boolean) as FileAttachment[];
    setAttachments(prev => [...prev, ...uploadedFiles]);
    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleGIFSelect = (gif: { url: string; title: string }) => {
    // Add GIF as attachment
    const gifAttachment: FileAttachment = {
      url: gif.url,
      filename: `gif_${Date.now()}.gif`,
      originalName: gif.title || 'GIF',
      mimetype: 'image/gif',
      size: 0, // Size not available from Tenor
    };
    setAttachments(prev => [...prev, gifAttachment]);
    // Auto send message with GIF
    setTimeout(() => sendMessage(), 100);
  };

  /* _handleReaction = (emoji: string) => {
    // DM reactions not implemented yet
    console.log('Reaction:', emoji);
  } */

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
          {channel.type === 'group' ? (
            // Group DM Header
            <>
              <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {channel.name || `Grup (${channel.members?.length || 0})`}
                </h3>
                <p className="text-xs text-[#b9bbbe]">
                  {channel.members?.map(m => m.username).join(', ') || 'Grup'}
                </p>
              </div>
            </>
          ) : (
            // Direct DM Header
            <>
              <div className="relative">
                <img 
                  src={channel.friend?.avatar 
                    ? (channel.friend.avatar.startsWith('http') ? channel.friend.avatar : `${BASE_URL}${channel.friend.avatar}`)
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.friend?.username || 'user'}`} 
                  alt={channel.friend?.username || 'User'}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    console.log('[DMChatArea] Header avatar failed to load, using fallback');
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.friend?.username || 'user'}`;
                  }}
                />
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[channel.friend?.status || 'offline']} rounded-full border-2 border-[#36393f]`} />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {channel.friend?.displayName || channel.friend?.username || 'Unknown'}
                </h3>
                <p className="text-xs text-[#b9bbbe]">{statusLabels[channel.friend?.status || 'offline']}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {channel.type === 'group' && onAddMember && (
            <button 
              onClick={() => onAddMember(channel.id)}
              className="text-[#b9bbbe] hover:text-white transition-colors"
              title="Tambah Anggota"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          )}
          {channel.type === 'group' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-[#b9bbbe] hover:text-white transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#18191c] border-[#202225]">
                {onLeaveGroup && (
                  <DropdownMenuItem 
                    onClick={() => onLeaveGroup(channel.id)}
                    className="text-[#ed4245] focus:text-[#ed4245] focus:bg-[#ed4245]/10 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Tinggalkan Grup
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={handleScroll}
      >
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
              Ini adalah awal dari percakapan Anda dengan {channel.friend?.displayName || channel.friend?.username || 'Unknown'}
            </h3>
            <p className="text-[#b9bbbe]">Kirim pesan untuk memulai!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Divider - Discord Style */}
                <div className="flex items-center justify-center my-4">
                  <div className="h-[1px] bg-[#40444b] flex-1" />
                  <div className="mx-4 px-4 py-1 bg-[#2f3136] rounded-full">
                    <span className="text-xs text-[#b9bbbe] font-medium">{group.date}</span>
                  </div>
                  <div className="h-[1px] bg-[#40444b] flex-1" />
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  {group.messages.map((message, idx) => {
                    const isOwn = message.senderId === currentUser?.id;
                    const showAvatar = idx === 0 || group.messages[idx - 1].senderId !== message.senderId;
                    
                    // Get sender info (works for both direct and group DMs)
                    const senderInfo = channel.type === 'group' 
                      ? getMemberInfo(message.senderId)
                      : channel.friend;
                    const senderName = isOwn 
                      ? (currentUser?.displayName || currentUser?.username)
                      : (senderInfo?.displayName || message.sender_display_name || senderInfo?.username || message.sender_username || 'Unknown');
                    const senderAvatar = isOwn 
                      ? (currentUser?.avatar?.startsWith('http') 
                          ? currentUser.avatar 
                          : `${BASE_URL}${currentUser?.avatar}?v=${avatarVersion}`)
                      : (senderInfo?.avatar?.startsWith('http')
                          ? senderInfo.avatar
                          : `${BASE_URL}${senderInfo?.avatar || message.sender_avatar}`);
                    
                    return (
                      <div 
                        key={message.id} 
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        {showAvatar ? (
                          <img
                            src={senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName || 'user'}`}
                            alt={senderName}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName || 'user'}`;
                            }}
                          />
                        ) : (
                          <div className="w-10 flex-shrink-0" />
                        )}
                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                          {showAvatar && (
                            <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <span 
                                className="text-white font-medium text-sm hover:underline cursor-pointer"
                                onClick={() => {
                                  const userId = isOwn ? currentUser?.id : (channel?.friend?.id || channel?.members?.find(m => m.id !== currentUser?.id)?.id);
                                  if (userId) {
                                    setSelectedUserId(userId);
                                    setIsProfileOpen(true);
                                  }
                                }}
                              >
                                {senderName}
                              </span>
                              <span className="text-[11px] text-[#72767d]">
                                {formatShortDate(message.createdAt)} {formatTime(message.createdAt)}
                              </span>
                            </div>
                          )}
                          {/* Message content bubble */}
                          {(message.content || (message.attachments && message.attachments.some(f => !f.mimetype?.startsWith('image/')))) && (
                            <div className={`px-4 py-2 rounded-2xl ${
                              isOwn 
                                ? 'bg-[#5865f2] text-white rounded-br-md' 
                                : 'bg-[#40444b] text-[#dcddde] rounded-bl-md'
                            }`}>
                              {message.content && (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              )}
                              
                              {/* Non-image attachments */}
                              {message.attachments && message.attachments.filter(f => !f.mimetype?.startsWith('image/')).length > 0 && (
                                <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                                  {message.attachments
                                    .filter(f => !f.mimetype?.startsWith('image/'))
                                    .map((file, index) => (
                                      <div 
                                        key={index}
                                        className="flex items-center gap-2 p-2 bg-[#2f3136] rounded-lg"
                                      >
                                        <span className="text-2xl">📎</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm truncate">{file.originalName || file.filename}</p>
                                          <p className="text-xs text-[#72767d]">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Image attachments - outside bubble, no background */}
                          {message.attachments && message.attachments.filter(f => f.mimetype?.startsWith('image/')).length > 0 && (
                            <div className={`${
                              (message.content || message.attachments.some(f => !f.mimetype?.startsWith('image/'))) 
                                ? 'mt-1' 
                                : ''
                            } ${
                              message.attachments.filter(f => f.mimetype?.startsWith('image/')).length === 1 
                                ? 'space-y-1' 
                                : 'grid grid-cols-2 gap-1'
                            }`}>
                              {message.attachments
                                .filter(f => f.mimetype?.startsWith('image/'))
                                .map((file, index) => (
                                  <div 
                                    key={index}
                                    className="cursor-pointer"
                                    onClick={() => {
                                      const fullUrl = file.url?.startsWith('http') 
                                        ? file.url 
                                        : `${BASE_URL}${file.url}`;
                                      setViewerImage({ src: fullUrl, alt: file.originalName || 'Image' });
                                    }}
                                  >
                                    <img 
                                      src={file.url?.startsWith('http') ? file.url : `${BASE_URL}${file.url}`}
                                      alt={file.originalName || 'Attachment'}
                                      className="max-w-[200px] max-h-[200px] rounded-lg object-cover hover:opacity-90 transition-opacity"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ))}
                            </div>
                          )}
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
      <div className="px-3 pb-3 pt-2 bg-[#36393f]">
        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div key={index} className="relative bg-[#2f3136] rounded-lg p-2 flex items-center gap-2 max-w-[200px]">
                {file.mimetype?.startsWith('image/') ? (
                  <img 
                    src={file.url?.startsWith('http') ? file.url : `${BASE_URL}${file.url}`}
                    alt={file.originalName}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <FileText className="w-8 h-8 text-[#b9bbbe]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{file.originalName}</p>
                  <p className="text-[10px] text-[#72767d]">{(file.size ? (file.size / 1024).toFixed(1) : '?')} KB</p>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-1 hover:bg-[#ed4245]/20 rounded text-[#72767d] hover:text-[#ed4245]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="bg-[#40444b] rounded-lg flex items-end gap-2 p-2">
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] rounded-full transition-colors disabled:opacity-50"
              title="Tambah attachment"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-[#b9bbbe] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </button>
          </div>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleTyping}
            placeholder={channel.type === 'group' 
              ? `Kirim pesan ke grup`
              : `Kirim pesan ke @${channel.friend?.displayName || channel.friend?.username || 'Unknown'}`
            }
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
            <EmojiStickerGIFPicker 
              onSelectEmoji={(emoji) => setNewMessage(prev => prev + emoji)}
              onSelectSticker={(sticker) => {
                // Add sticker as attachment
                const stickerAttachment: FileAttachment = {
                  url: sticker.url,
                  filename: `sticker_${Date.now()}.png`,
                  originalName: sticker.name,
                  mimetype: 'image/png',
                  size: 0,
                };
                setAttachments(prev => [...prev, stickerAttachment]);
                setTimeout(() => sendMessage(), 100);
              }}
              onSelectGIF={(gif) => {
                // Add GIF as attachment
                const gifAttachment: FileAttachment = {
                  url: gif.url,
                  filename: `gif_${Date.now()}.gif`,
                  originalName: gif.title || 'GIF',
                  mimetype: 'image/gif',
                  size: 0,
                };
                setAttachments(prev => [...prev, gifAttachment]);
                setTimeout(() => sendMessage(), 100);
              }}
              serverId={null} // DM doesn't have serverId
            />
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

      {/* User Profile Popup */}
      <UserProfilePopup
        userId={selectedUserId || ''}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onStartDM={() => {
          // Already in DM, just close popup
          setIsProfileOpen(false);
        }}
      />
    </div>
  );
}
