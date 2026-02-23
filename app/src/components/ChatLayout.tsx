import { useState, useEffect, useCallback, useRef } from 'react';
import { ServerList } from './ServerList';
import { ChannelList } from './ChannelList';
import { ChatArea } from './ChatArea';
import { MessageInput } from './MessageInput';
import { MemberList } from './MemberList';
import { SettingsModal } from './SettingsModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useNotification } from '@/hooks/useNotification';
import type { Server, Channel, Message, FileAttachment } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function ChatLayout() {
  const { user, token } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const messageInputRef = useRef<{ focus: () => void }>(null);

  // Notification hook
  const { notify, hasPermission } = useNotification({
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Will be requested on first user interaction via useNotification
      console.log('Notification permission will be requested on first interaction');
    }
  }, []);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
  }, [token]);

  // Fetch channels when server is selected
  useEffect(() => {
    if (selectedServerId && selectedServerId !== 'home') {
      fetchChannels(selectedServerId);
    }
  }, [selectedServerId]);

  // Fetch messages function defined before effects that use it
  const fetchMessages = useCallback(async (channelId: string, force = false) => {
    try {
      console.log('Fetching messages for channel:', channelId, 'Force:', force);
      const url = `${API_URL}/channels/${channelId}/messages${force ? '?t=' + Date.now() : ''}`;
      const response = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Messages fetched:', data.length, 'for channel:', channelId);
        setMessages(data);
      } else {
        console.error('Failed to fetch messages:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [token]);

  // Fetch messages when channel is selected
  useEffect(() => {
    if (selectedChannelId) {
      fetchMessages(selectedChannelId);
    }
  }, [selectedChannelId]);

  // Refresh messages periodically (every 5 seconds)
  useEffect(() => {
    if (!selectedChannelId) return;
    
    const interval = setInterval(() => {
      fetchMessages(selectedChannelId);
    }, 5000);
    
    return () => {
      clearInterval(interval);
      console.log('Cleaned up message polling interval for channel:', selectedChannelId);
    };
  }, [selectedChannelId, fetchMessages]);

  // Socket connection
  const handleNewMessage = useCallback((message: Message) => {
    console.log('📨 New message received:', message);
    
    // Check if we should notify
    const isOwnMessage = message.userId === user?.id;
    const isCurrentChannel = message.channelId === selectedChannelId;
    
    // Notify if:
    // 1. Not own message
    // 2. Either channel is different OR window is not focused
    if (!isOwnMessage) {
      const shouldNotify = !isCurrentChannel || document.visibilityState === 'hidden';
      
      if (shouldNotify) {
        const fromChannel = channels.find(c => c.id === message.channelId);
        notify({
          title: `${message.user?.username || 'Pesan Baru'}${fromChannel ? ` di #${fromChannel.name}` : ''}`,
          body: message.content || '📎 File terkirim',
          icon: message.user?.avatar,
          tag: `message-${message.channelId}`,
        });
      }
    }
    
    setMessages(prev => {
      // Check if message already exists by ID
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      // Remove optimistic messages from the same user with same content
      // and same channel to prevent duplicates
      const filtered = prev.filter(m => {
        if (!m.id.startsWith('temp-')) return true;
        // Keep temp messages that don't match this new message
        return !(m.userId === message.userId && 
                 m.content === message.content &&
                 m.channelId === message.channelId);
      });
      
      return [...filtered, message];
    });
  }, [user?.id, selectedChannelId, channels, notify]);

  // Handle reaction updates from socket
  const handleReactionUpdate = useCallback((data: { messageId: string; reactions: any[] }) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      )
    );
  }, []);

  // Handle message edits from socket
  const handleMessageEdit = useCallback((message: Message) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, content: message.content, editedAt: message.editedAt }
          : msg
      )
    );
  }, []);

  // Handle message deletions from socket
  const handleMessageDelete = useCallback((data: { messageId: string }) => {
    setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
  }, []);

  const { 
    isConnected, 
    joinChannel, 
    leaveChannel, 
    sendMessage, 
    sendTyping, 
    typingUsers 
  } = useSocket(handleNewMessage, handleReactionUpdate, handleMessageEdit, handleMessageDelete);

  // Join channel when selected
  useEffect(() => {
    if (selectedChannelId && isConnected) {
      joinChannel(selectedChannelId);
      return () => {
        leaveChannel(selectedChannelId);
      };
    }
  }, [selectedChannelId, isConnected, joinChannel, leaveChannel]);

  const fetchServers = async () => {
    try {
      const response = await fetch(`${API_URL}/servers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServers(data);
        if (data.length > 0 && !selectedServerId) {
          setSelectedServerId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (serverId: string) => {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannelId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleCreateServer = async (name: string, icon: string) => {
    try {
      const response = await fetch(`${API_URL}/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, icon }),
      });
      if (response.ok) {
        const newServer = await response.json();
        setServers(prev => [...prev, newServer]);
        setSelectedServerId(newServer.id);
      }
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const handleSendMessage = useCallback((content: string, replyToMessage?: Message | null, attachments?: FileAttachment[]) => {
    if (selectedChannelId) {
      // Send via socket - message will appear when server broadcasts back
      (sendMessage as any)(selectedChannelId, content, replyToMessage, attachments);
      setReplyTo(null);
    }
  }, [selectedChannelId, sendMessage]);

  const handleReply = useCallback((message: Message) => {
    console.log('Setting replyTo:', message);
    setReplyTo(message);
    // Focus the input after setting reply
    setTimeout(() => {
      messageInputRef.current?.focus();
      console.log('Called focus on messageInputRef');
    }, 100);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleTyping = useCallback(() => {
    if (selectedChannelId) {
      sendTyping(selectedChannelId);
    }
  }, [selectedChannelId, sendTyping]);

  const selectedServer = servers.find(s => s.id === selectedServerId) || null;
  const selectedChannel = channels.find(c => c.id === selectedChannelId) || null;

  if (loading) {
    return (
      <div className="h-screen bg-[#36393f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#b9bbbe]">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-[#36393f] overflow-hidden">
      {/* Server List */}
      <ServerList
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={setSelectedServerId}
        onCreateServer={handleCreateServer}
      />

      {/* Channel List */}
      <ChannelList
        server={selectedServer}
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea
          channel={selectedChannel}
          messages={messages}
          typingUsers={typingUsers}
          currentUser={user}
          onReply={handleReply}
          serverId={selectedServerId}
          onRefresh={() => selectedChannelId && fetchMessages(selectedChannelId, true)}
        />
        <MessageInput
          ref={messageInputRef}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!selectedChannelId}
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
        />
      </div>

      {/* Member List */}
      <MemberList serverId={selectedServerId} />

      {/* Connection Status */}
      <div className="fixed bottom-2 right-2 flex items-center gap-2 px-3 py-1.5 bg-[#18191c] rounded-full z-50">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3ba55d]' : 'bg-[#ed4245]'}`} />
        <span className="text-xs text-[#b9bbbe]">
          {isConnected ? 'Terhubung' : 'Memutuskan...'}
        </span>
        {!hasPermission && 'Notification' in window && Notification.permission !== 'granted' && (
          <button
            onClick={() => Notification.requestPermission()}
            className="ml-2 text-xs text-[#5865f2] hover:text-[#4752c4]"
          >
            Aktifkan Notifikasi
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
