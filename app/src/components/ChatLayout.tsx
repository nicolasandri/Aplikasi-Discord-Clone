import { useState, useEffect, useCallback, useRef } from 'react';
import { ServerList } from './ServerList';
import { ChannelList } from './ChannelList';
import { ChatArea } from './ChatArea';
import { MessageInput } from './MessageInput';
import { MemberList } from './MemberList';
import { SettingsModal } from './SettingsModal';
import { ServerSettingsModal } from './ServerSettingsModal';
import { InviteModal } from './InviteModal';
import { SearchModal } from './SearchModal';
import { FriendsPage } from '@/pages/FriendsPage';
// import { InvitePage } from '@/pages/InvitePage';
import { DMList } from './DMList';
import { DMChatArea } from './DMChatArea';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDrawer } from './MobileDrawer';
import { MobileHeader } from './MobileHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useNotification } from '@/hooks/useNotification';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Server, Channel, Message, FileAttachment, DMChannel } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export type ViewMode = 'server' | 'channels' | 'chat' | 'friends' | 'settings' | 'dm';

export function ChatLayout() {
  const { user, token } = useAuth();
  const { isMobile } = useBreakpoint();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDMChannelId, setSelectedDMChannelId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [mobileView, setMobileView] = useState<ViewMode>('chat');
  const [dmUnreadCounts, setDMUnreadCounts] = useState<Record<string, number>>({});
  const [totalDMUnread, setTotalDMUnread] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  
  // Mobile drawer states
  const [isServerDrawerOpen, setIsServerDrawerOpen] = useState(false);
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  const [isMemberDrawerOpen, setIsMemberDrawerOpen] = useState(false);
  
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
      console.log('Notification permission will be requested on first interaction');
    }
  }, []);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
    fetchDMChannels();
    fetchDMUnreadCount();
  }, [token]);

  // Auto-select last visited server & channel
  useEffect(() => {
    if (servers.length > 0 && !selectedServerId && !selectedChannelId) {
      const lastVisited = localStorage.getItem('lastVisited');
      if (lastVisited) {
        try {
          const { serverId, channelId } = JSON.parse(lastVisited);
          // Check if server still exists
          const serverExists = servers.find(s => s.id === serverId);
          if (serverExists) {
            console.log('🔄 Restoring last visited:', serverId, channelId);
            setSelectedServerId(serverId);
            setViewMode('server');
            // Channel will be selected after channels are fetched
            if (channelId) {
              // Store temporarily and select after channels load
              setPendingChannelId(channelId);
            }
          }
        } catch (e) {
          console.error('Failed to parse lastVisited:', e);
        }
      }
    }
  }, [servers, selectedServerId, selectedChannelId]);

  // Select pending channel after channels are loaded
  useEffect(() => {
    if (pendingChannelId && channels.length > 0) {
      const channelExists = channels.find(c => c.id === pendingChannelId);
      if (channelExists) {
        console.log('🔄 Selecting pending channel:', pendingChannelId);
        setSelectedChannelId(pendingChannelId);
        setPendingChannelId(null);
      }
    }
  }, [channels, pendingChannelId]);

  // Fetch channels when server is selected
  useEffect(() => {
    if (selectedServerId && viewMode === 'server') {
      fetchChannels(selectedServerId);
    }
  }, [selectedServerId, viewMode]);

  // Save last visited server & channel
  useEffect(() => {
    if (selectedServerId && viewMode === 'server') {
      const data = {
        serverId: selectedServerId,
        channelId: selectedChannelId,
        timestamp: Date.now()
      };
      localStorage.setItem('lastVisited', JSON.stringify(data));
      console.log('💾 Saved lastVisited:', data);
    }
  }, [selectedServerId, selectedChannelId, viewMode]);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Close search with Escape
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Jump to message handler
  useEffect(() => {
    const handleJumpToMessage = (e: CustomEvent) => {
      const { messageId, channelId } = e.detail;
      
      // Navigate to channel if different
      if (channelId !== selectedChannelId) {
        setSelectedChannelId(channelId);
        setJumpToMessageId(messageId);
      } else {
        // Same channel, just scroll
        setTimeout(() => {
          const element = document.getElementById(`message-${messageId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-message');
            setTimeout(() => element.classList.remove('highlight-message'), 2000);
          }
        }, 100);
      }
    };
    
    window.addEventListener('jumpToMessage', handleJumpToMessage as EventListener);
    return () => window.removeEventListener('jumpToMessage', handleJumpToMessage as EventListener);
  }, [selectedChannelId]);

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
    if (selectedChannelId && viewMode === 'server') {
      fetchMessages(selectedChannelId);
    }
  }, [selectedChannelId, viewMode]);

  // Handle jumping to message after messages are loaded
  useEffect(() => {
    if (jumpToMessageId && messages.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`message-${jumpToMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-message');
          setTimeout(() => element.classList.remove('highlight-message'), 2000);
        }
        setJumpToMessageId(null);
      }, 100);
    }
  }, [messages, jumpToMessageId]);

  // Fetch DM channels
  const fetchDMChannels = async () => {
    try {
      const response = await fetch(`${API_URL}/dm/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // API returns nested friend object, use it directly
        const mappedChannels: DMChannel[] = data.map((row: any) => ({
          id: row.id,
          friend: row.friend || {
            // Fallback if API returns flat format
            id: row.friend_id,
            username: row.friend_username,
            avatar: row.friend_avatar,
            status: row.friend_status || 'offline',
            email: '',
          },
          lastMessage: row.last_message,
          lastMessageAt: row.last_message_at,
          unreadCount: row.unread_count || 0,
          updatedAt: row.updated_at || row.last_message_at,
        }));
        setDmChannels(mappedChannels);
      }
    } catch (error) {
      console.error('Failed to fetch DM channels:', error);
    }
  };

  // Fetch DM unread count
  const fetchDMUnreadCount = async () => {
    try {
      const response = await fetch(`${API_URL}/dm/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDMUnreadCounts(data.perChannel || {});
        setTotalDMUnread(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch DM unread count:', error);
    }
  };

  // BUG-019: Socket Event Listeners Re-registration - Use ref pattern
  const dmHandlersRef = useRef({
    handleDMMessageReceived: (data: { channelId: string }) => {
      fetchDMUnreadCount();
      if (data.channelId === selectedDMChannelId) {
        // Messages will be updated via socket event in DMChatArea
      }
      if (viewMode !== 'dm' || selectedDMChannelId !== data.channelId) {
        const channel = dmChannels.find(c => c.id === data.channelId);
        if (channel) {
          notify({
            title: channel.friend.username,
            body: 'Pesan baru',
            icon: channel.friend.avatar,
            tag: `dm-${data.channelId}`,
          });
        }
      }
    },
    fetchDMUnreadCount
  });

  // Update ref when dependencies change
  useEffect(() => {
    dmHandlersRef.current.handleDMMessageReceived = (data: { channelId: string }) => {
      fetchDMUnreadCount();
      if (data.channelId === selectedDMChannelId) {
        // Messages will be updated via socket event in DMChatArea
      }
      if (viewMode !== 'dm' || selectedDMChannelId !== data.channelId) {
        const channel = dmChannels.find(c => c.id === data.channelId);
        if (channel) {
          notify({
            title: channel.friend.username,
            body: 'Pesan baru',
            icon: channel.friend.avatar,
            tag: `dm-${data.channelId}`,
          });
        }
      }
    };
    dmHandlersRef.current.fetchDMUnreadCount = fetchDMUnreadCount;
  }, [viewMode, selectedDMChannelId, dmChannels, notify, fetchDMUnreadCount]);

  // Stable effect that only runs once for socket registration
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const wrappedHandlers = {
      dm_message_received: (data: { channelId: string }) => dmHandlersRef.current.handleDMMessageReceived(data),
      dm_channel_updated: () => dmHandlersRef.current.fetchDMUnreadCount(),
    };

    // Register listeners
    Object.entries(wrappedHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(wrappedHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, []); // ✅ Only run once on mount

  // Socket connection
  const handleNewMessage = useCallback((message: Message) => {
    console.log('📨 New message received:', message);
    
    const isOwnMessage = message.userId === user?.id;
    const isCurrentChannel = message.channelId === selectedChannelId;
    
    if (!isOwnMessage) {
      const shouldNotify = !isCurrentChannel || document.visibilityState === 'hidden';
      
      if (shouldNotify && viewMode === 'server') {
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
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      const filtered = prev.filter(m => {
        if (!m.id.startsWith('temp-')) return true;
        return !(m.userId === message.userId && 
                 m.content === message.content &&
                 m.channelId === message.channelId);
      });
      
      return [...filtered, message];
    });
  }, [user?.id, selectedChannelId, channels, notify, viewMode]);

  const handleReactionUpdate = useCallback((data: { messageId: string; reactions: any[] }) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      )
    );
  }, []);

  const handleMessageEdit = useCallback((message: Message) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, content: message.content, editedAt: message.editedAt }
          : msg
      )
    );
  }, []);

  const handleMessageDelete = useCallback((data: { messageId: string }) => {
    setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
  }, []);

  const { 
    isConnected, 
    joinChannel, 
    leaveChannel, 
    sendMessage, 
    sendTyping, 
    typingUsers,
    userStatuses
  } = useSocket(handleNewMessage, handleReactionUpdate, handleMessageEdit, handleMessageDelete);

  useEffect(() => {
    if (selectedChannelId && isConnected && viewMode === 'server') {
      joinChannel(selectedChannelId);
      return () => {
        leaveChannel(selectedChannelId);
      };
    }
  }, [selectedChannelId, isConnected, joinChannel, leaveChannel, viewMode]);

  const fetchServers = async () => {
    try {
      const response = await fetch(`${API_URL}/servers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServers(data);
        if (data.length > 0 && !selectedServerId && viewMode === 'server') {
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
        setViewMode('server');
      }
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const handleSendMessage = useCallback((content: string, replyToMessage?: Message | null, attachments?: FileAttachment[]) => {
    if (selectedChannelId) {
      (sendMessage as any)(selectedChannelId, content, replyToMessage, attachments);
      setReplyTo(null);
    }
  }, [selectedChannelId, sendMessage]);

  const handleReply = useCallback((message: Message) => {
    console.log('Setting replyTo:', message);
    setReplyTo(message);
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

  // Mobile navigation handlers
  const handleMobileViewChange = (view: ViewMode) => {
    setMobileView(view);
    
    switch (view) {
      case 'server':
        setIsServerDrawerOpen(true);
        break;
      case 'channels':
        setIsChannelDrawerOpen(true);
        break;
      case 'friends':
        setViewMode('friends');
        break;
      case 'chat':
        setViewMode(selectedDMChannelId ? 'dm' : 'server');
        break;
      case 'settings':
        setIsSettingsOpen(true);
        break;
    }
  };

  const handleSelectServer = (serverId: string | null) => {
    if (serverId === 'home') {
      setViewMode('friends');
      setSelectedDMChannelId(null);
    } else if (serverId) {
      setViewMode('server');
      setSelectedServerId(serverId);
      setSelectedDMChannelId(null);
    }
    setIsServerDrawerOpen(false);
    if (isMobile) {
      setIsChannelDrawerOpen(true);
    }
  };

  const handleSelectChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    setIsChannelDrawerOpen(false);
    setMobileView('chat');
  };

  const handleSelectDMChannel = (channelId: string) => {
    setSelectedDMChannelId(channelId);
    setViewMode('dm');
    setDMUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
  };

  const handleStartDM = async (friend: any) => {
    try {
      const existingChannel = dmChannels.find(c => c.friend?.id === friend.id);
      if (existingChannel) {
        setSelectedDMChannelId(existingChannel.id);
        setViewMode('dm');
        return;
      }

      const response = await fetch(`${API_URL}/dm/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId: friend.id }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📨 Created DM channel:', data);
        // API returns nested friend object
        const newChannel: DMChannel = {
          id: data.id,
          friend: data.friend || {
            id: friend.id,
            username: friend.username,
            avatar: friend.avatar,
            status: friend.status || 'offline',
            email: friend.email || '',
          },
          lastMessage: data.last_message,
          lastMessageAt: data.last_message_at,
          unreadCount: data.unread_count || 0,
          updatedAt: data.updated_at || new Date().toISOString(),
        };
        setDmChannels(prev => [...prev, newChannel]);
        setSelectedDMChannelId(newChannel.id);
        setViewMode('dm');
      }
    } catch (error) {
      console.error('Failed to start DM:', error);
    }
  };

  // Handle start DM from user profile (used by UserProfilePopup)
  const handleStartDMFromProfile = async (user: { id: string; username: string; avatar?: string; status?: string; email?: string }) => {
    await handleStartDM(user);
  };

  const handleBackFromDM = () => {
    setSelectedDMChannelId(null);
    setViewMode('friends');
  };

  const selectedServer = servers.find(s => s.id === selectedServerId) || null;
  const selectedChannel = channels.find(c => c.id === selectedChannelId) || null;
  const selectedDMChannel = dmChannels.find(c => c.id === selectedDMChannelId) || null;
  
  // Debug log
  console.log('📊 selectedDMChannel:', selectedDMChannel);
  console.log('📊 dmChannels:', dmChannels);

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

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-[#36393f] overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {viewMode === 'friends' ? (
            <FriendsPage 
              onClose={() => setViewMode('dm')}
              onStartDM={handleStartDM}
            />
          ) : viewMode === 'dm' && selectedDMChannel ? (
            <>
              <MobileHeader
                dmChannel={selectedDMChannel}
                onBack={handleBackFromDM}
                onOpenServers={() => setIsServerDrawerOpen(true)}
                onOpenChannels={() => {}}
                onOpenMembers={() => {}}
                showBack={true}
              />
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <DMChatArea
                  channel={selectedDMChannel}
                  currentUser={user}
                />
              </div>
            </>
          ) : (
            <>
              <MobileHeader
                server={selectedServer}
                channel={selectedChannel}
                onOpenServers={() => setIsServerDrawerOpen(true)}
                onOpenChannels={() => setIsChannelDrawerOpen(!isChannelDrawerOpen)}
                onOpenMembers={() => setIsMemberDrawerOpen(true)}
                isChannelsOpen={isChannelDrawerOpen}
              />
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                <ChatArea
                  channel={selectedChannel}
                  messages={messages}
                  typingUsers={typingUsers}
                  currentUser={user}
                  onReply={handleReply}
                  serverId={selectedServerId}
                  onRefresh={() => selectedChannelId && fetchMessages(selectedChannelId, true)}
                  isMobile={true}
                  onStartDM={handleStartDMFromProfile}
                  onOpenSearch={() => setIsSearchOpen(true)}
                />
                <MessageInput
                  ref={messageInputRef}
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  disabled={!selectedChannelId}
                  replyTo={replyTo}
                  onCancelReply={handleCancelReply}
                  isMobile={true}
                  serverId={selectedServerId || undefined}
                  channelId={selectedChannelId || undefined}
                />
              </div>
            </>
          )}
        </div>

        {/* Bottom Navigation - Fixed at bottom */}
        <div className="h-[60px] bg-[#202225] border-t border-[#1a1a1a] flex-shrink-0 z-50">
          <MobileBottomNav
            currentView={mobileView}
            onViewChange={handleMobileViewChange}
            unreadDMCount={totalDMUnread}
          />
        </div>

        {/* Mobile Drawers */}
        <MobileDrawer
          isOpen={isServerDrawerOpen}
          onClose={() => setIsServerDrawerOpen(false)}
          title="Servers"
        >
          <div className="p-2">
            <ServerList
              servers={servers}
              selectedServerId={selectedServerId}
              onSelectServer={handleSelectServer}
              onCreateServer={handleCreateServer}
              onOpenFriends={() => {
                setViewMode('friends');
                setIsServerDrawerOpen(false);
              }}
              isFriendsOpen={viewMode === 'friends'}
              isMobile={true}
            />
          </div>
        </MobileDrawer>

        <MobileDrawer
          isOpen={isChannelDrawerOpen}
          onClose={() => setIsChannelDrawerOpen(false)}
          title={selectedServer?.name || 'Channels'}
        >
          <ChannelList
            server={selectedServer}
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleSelectChannel}
            onOpenSettings={() => setIsServerSettingsOpen(true)}
            onOpenInvite={() => setIsInviteOpen(true)}
            isMobile={true}
            onClose={() => setIsChannelDrawerOpen(false)}
          />
        </MobileDrawer>

        <MobileDrawer
          isOpen={isMemberDrawerOpen}
          onClose={() => setIsMemberDrawerOpen(false)}
          title="Members"
          side="right"
        >
          <MemberList 
            serverId={selectedServerId} 
            isMobile={true}
          />
        </MobileDrawer>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Server Settings Modal */}
        {selectedServer && (
          <ServerSettingsModal
            isOpen={isServerSettingsOpen}
            onClose={() => setIsServerSettingsOpen(false)}
            server={selectedServer}
          />
        )}

        {/* Invite Modal */}
        {selectedServer && (
          <InviteModal
            serverId={selectedServer.id}
            serverName={selectedServer.name}
            isOpen={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
          />
        )}

        {/* Connection Status */}
        <div className="fixed top-16 right-2 flex items-center gap-2 px-3 py-1.5 bg-[#18191c] rounded-full z-40">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3ba55d]' : 'bg-[#ed4245]'}`} />
          <span className="text-xs text-[#b9bbbe]">
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="h-full flex bg-[#36393f] overflow-hidden">
      {/* Server List */}
      <ServerList
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={handleCreateServer}
        onOpenFriends={() => setViewMode('friends')}
        isFriendsOpen={viewMode === 'friends'}
      />

      {/* Left Sidebar */}
      {viewMode === 'server' && (
        <ChannelList
          server={selectedServer}
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onOpenSettings={() => setIsServerSettingsOpen(true)}
          onOpenInvite={() => setIsInviteOpen(true)}
        />
      )}
      
      {(viewMode === 'dm' || viewMode === 'friends') && (
        <DMList
          selectedChannelId={selectedDMChannelId}
          onSelectChannel={handleSelectDMChannel}
          onOpenFriends={() => setViewMode('friends')}
          onOpenSettings={() => setIsServerSettingsOpen(true)}
          unreadCounts={dmUnreadCounts}
        />
      )}

      {/* Main Content */}
      {viewMode === 'friends' ? (
        <FriendsPage 
          onClose={() => setViewMode('dm')}
          onStartDM={handleStartDM}
        />
      ) : viewMode === 'dm' ? (
        <DMChatArea
          channel={selectedDMChannel}
          currentUser={user}
        />
      ) : (
        <>
          <div className="flex-1 flex flex-col min-w-0">
            <ChatArea
              channel={selectedChannel}
              messages={messages}
              typingUsers={typingUsers}
              currentUser={user}
              onReply={handleReply}
              serverId={selectedServerId}
              onRefresh={() => selectedChannelId && fetchMessages(selectedChannelId, true)}
              onStartDM={handleStartDMFromProfile}
              onOpenSearch={() => setIsSearchOpen(true)}
            />
            <MessageInput
              ref={messageInputRef}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={!selectedChannelId}
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
              serverId={selectedServerId || undefined}
              channelId={selectedChannelId || undefined}
            />
          </div>

          <MemberList serverId={selectedServerId} userStatuses={userStatuses} />
        </>
      )}

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

      {/* Server Settings Modal */}
      {selectedServer && (
        <ServerSettingsModal
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          server={selectedServer}
        />
      )}

      {/* Invite Modal */}
      {selectedServer && (
        <InviteModal
          serverId={selectedServer.id}
          serverName={selectedServer.name}
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        serverId={selectedServerId || undefined}
        channelId={selectedChannelId || undefined}
      />
    </div>
  );
}
