import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ServerList } from './ServerList';
import { ChannelList } from './ChannelList';
import { ChatArea } from './ChatArea';
import { MessageInput } from './MessageInput';
// Note: Using original ChatArea and MessageInput from project
import { MemberList } from './MemberList';
import { SettingsModal } from './SettingsModal';
import { ServerSettingsModal } from './ServerSettingsModal';
import { ServerSettingsPage } from './ServerSettingsPage';
import { InviteModal } from './InviteModal';
import { SearchModal } from './SearchModal';
import { FriendsPage } from '@/pages/FriendsPage';
// import { InvitePage } from '@/pages/InvitePage';
import { DMList } from './DMList';
import { DMChatArea } from './DMChatArea';
import { GroupDMModal } from './GroupDMModal';
import { AddMemberToGroupModal } from './AddMemberToGroupModal';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDrawer } from './MobileDrawer';
import { MobileHeader } from './MobileHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket, enableAudio, playBellSound } from '@/hooks/useSocket';
import { useNotification } from '@/hooks/useNotification';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Server, Channel, Message, FileAttachment, DMChannel, User } from '@/types';

// Notification Settings Interface
interface ServerNotificationSettings {
  notificationLevel: 'all' | 'mentions' | 'nothing';
  muted: boolean;
  mutedUntil: string | null;
  suppressEveryoneHere: boolean;
  suppressRoleMentions: boolean;
  suppressHighlights: boolean;
  pushNotifications: boolean;
  mobilePushNotifications: boolean;
}

interface ChannelNotificationOverride {
  channelId: string;
  notificationLevel: 'all' | 'mentions' | 'nothing' | 'default';
  muted: boolean;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = import.meta.env.VITE_API_URL;

export type ViewMode = 'server' | 'chat' | 'friends' | 'settings' | 'dm';

export function ChatLayout() {
  const { user, token } = useAuth();
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDMChannelId, setSelectedDMChannelId] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>('dm');
  
  // Wrapper untuk setViewMode dengan logging
  const setViewMode = useCallback((mode: ViewMode) => {
    console.log('[setViewMode] Changing from', viewMode, 'to', mode);
    setViewModeState(mode);
  }, [viewMode]);
  const [mobileView, setMobileView] = useState<ViewMode>('friends');
  const [dmUnreadCounts, setDMUnreadCounts] = useState<Record<string, number>>({});
  const [totalDMUnread, setTotalDMUnread] = useState(0);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, { count: number; hasMention: boolean }>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGroupDMModalOpen, setIsGroupDMModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [activeGroupChannelId, setActiveGroupChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);
  
  // Server notification settings cache
  const [serverNotificationSettings, setServerNotificationSettings] = useState<Record<string, ServerNotificationSettings>>({});
  const [channelNotificationOverrides, setChannelNotificationOverrides] = useState<Record<string, ChannelNotificationOverride>>({});
  
  // Track if initial routing has been handled
  const initialRouteHandled = useRef(false);
  
  // Mobile drawer states
  const [isServerDrawerOpen, setIsServerDrawerOpen] = useState(false);
  const [isChannelDrawerOpen, setIsChannelDrawerOpen] = useState(false);
  const [isMemberDrawerOpen, setIsMemberDrawerOpen] = useState(false);
  
  const messageInputRef = useRef<{ focus: () => void }>(null);
  const lastMessageTimeRef = useRef<number>(0);
  const MESSAGE_COOLDOWN_MS = 1000; // 1 second cooldown between messages
  
  // Debounce refs for API calls
  const dmUnreadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dmChannelsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notification hook
  const { notify, permission, requestPermission } = useNotification({
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
  });

  // Use refs to access current values in callbacks without triggering re-subscriptions
  const channelsRef = useRef(channels);
  const selectedChannelIdRef = useRef(selectedChannelId);
  const notifyRef = useRef(notify);
  
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);
  
  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);
  
  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // Request notification permission on mount
  useEffect(() => {
    // Request permission immediately on mount
    if ('Notification' in window) {
      console.log('🔔 Initial notification permission:', Notification.permission);
      if (Notification.permission === 'default') {
        // Request on first user interaction
        const requestOnInteraction = () => {
          requestPermission();
        };
        window.addEventListener('click', requestOnInteraction, { once: true });
        window.addEventListener('keydown', requestOnInteraction, { once: true });
      }
    }
  }, [requestPermission]);
  
  // Enable audio on first user interaction (required for browser autoplay policy)
  useEffect(() => {
    const enableAudioOnInteraction = () => {
      console.log('🔔 Enabling audio on user interaction...');
      enableAudio();
      // Also test play a silent sound to unlock audio context
      setTimeout(() => {
        playBellSound();
        console.log('🔔 Audio test played');
      }, 100);
    };
    
    window.addEventListener('click', enableAudioOnInteraction, { once: true });
    window.addEventListener('keydown', enableAudioOnInteraction, { once: true });
    
    return () => {
      window.removeEventListener('click', enableAudioOnInteraction);
      window.removeEventListener('keydown', enableAudioOnInteraction);
    };
  }, []);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
    fetchDMChannels();
    fetchDMUnreadCount();
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Refresh servers when window regains focus (for access control updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchServers();
      }
    };
    
    const handleFocus = () => {
      fetchServers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sync URL with view mode
  useEffect(() => {
    const path = location.pathname;
    console.log('[URL Parse] pathname:', path);
    
    // Parse URL and set initial view mode
    if (path === '/friends') {
      console.log('[URL Parse] Setting viewMode to friends');
      setViewMode('friends');
    } else if (path?.startsWith('/channels/')) {
      // URL format: /channels/:serverId/:channelId
      const parts = path.split('/');
      console.log('[URL Parse] parts:', parts);
      if (parts.length >= 4) {
        const serverId = parts[2];
        const channelId = parts[3];
        console.log('[URL Parse] Setting server:', serverId, 'channel:', channelId);
        setSelectedServerId(serverId);
        setSelectedChannelId(channelId);
        setViewMode('server');
      }
    } else if (path === '/' || path === '') {
      // Default to friends view if no specific path
      if (!selectedServerId && !selectedDMChannelId) {
        console.log('[URL Parse] Defaulting to friends');
        setViewMode('friends');
        navigate('/friends', { replace: true });
      }
    }
  }, [location.pathname]);

  // Update URL when view mode changes
  useEffect(() => {
    console.log('[URL Update] viewMode:', viewMode, 'pathname:', location.pathname);
    if (viewMode === 'friends') {
      if (location.pathname !== '/friends') {
        console.log('[URL Update] Navigating to /friends');
        navigate('/friends', { replace: true });
      }
    } else if (viewMode === 'server' && selectedServerId && selectedChannelId) {
      const newPath = `/channels/${selectedServerId}/${selectedChannelId}`;
      if (location.pathname !== newPath) {
        navigate(newPath, { replace: true });
      }
    }
  }, [viewMode, selectedServerId, selectedChannelId]);

  // Test notification function (for debugging)
  const testNotification = useCallback(() => {
    console.log('🧪 Testing notification...');
    notify({
      title: 'Test Notifikasi',
      body: 'Ini adalah pesan test',
      icon: '/workgrid_app_icon.png',
    });
  }, [notify]);

  // Auto-select last visited server & channel or DM (only run once on initial load)
  useEffect(() => {
    // Skip if already handled or if URL is already set
    if (initialRouteHandled.current || location.pathname !== '/') {
      return;
    }
    
    // Only run if nothing is selected yet
    if (!selectedServerId && !selectedChannelId && !selectedDMChannelId) {
      const lastVisited = localStorage.getItem('lastVisited');
      const lastVisitedDM = localStorage.getItem('lastVisitedDM');
      
      // Try to restore DM first if it exists
      if (lastVisitedDM) {
        try {
          const { dmChannelId } = JSON.parse(lastVisitedDM);
          if (dmChannelId && dmChannels.length > 0) {
            const dmExists = dmChannels.find(c => c.id === dmChannelId);
            if (dmExists) {
              console.log('🔄 Restoring last visited DM:', dmChannelId);
              setSelectedDMChannelId(dmChannelId);
              setViewMode('dm');
              initialRouteHandled.current = true;
              return;
            }
          }
        } catch (e) {
          console.error('Failed to parse lastVisitedDM:', e);
        }
      }
      
      // Otherwise try to restore server
      if (servers.length > 0 && lastVisited) {
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
            initialRouteHandled.current = true;
            return;
          }
        } catch (e) {
          console.error('Failed to parse lastVisited:', e);
        }
      }
      
      // Default to Friends/DM view if nothing was restored
      if (!selectedServerId && !selectedDMChannelId) {
        console.log('🔄 Defaulting to Friends view');
        setViewMode('friends');
        navigate('/friends', { replace: true });
        initialRouteHandled.current = true;
      }
    }
  }, [servers, dmChannels, selectedServerId, selectedChannelId, selectedDMChannelId, location.pathname, navigate]);

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
      fetchChannelUnreadCount(selectedServerId);
    }
  }, [selectedServerId, viewMode]);

  // Save last visited DM and clear server state
  useEffect(() => {
    if (selectedDMChannelId && viewMode === 'dm') {
      const data = {
        dmChannelId: selectedDMChannelId,
        timestamp: Date.now()
      };
      localStorage.setItem('lastVisitedDM', JSON.stringify(data));
      // Clear server last visited to avoid conflict
      localStorage.removeItem('lastVisited');
      console.log('💾 Saved lastVisitedDM:', data);
    }
  }, [selectedDMChannelId, viewMode]);

  // Save last visited server and clear DM state
  useEffect(() => {
    if (selectedServerId && viewMode === 'server') {
      const data = {
        serverId: selectedServerId,
        channelId: selectedChannelId,
        timestamp: Date.now()
      };
      localStorage.setItem('lastVisited', JSON.stringify(data));
      // Clear DM last visited to avoid conflict
      localStorage.removeItem('lastVisitedDM');
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
      // Give DOM time to render
      setTimeout(() => {
        const element = document.getElementById(`message-${jumpToMessageId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-message');
          setTimeout(() => element.classList.remove('highlight-message'), 2000);
        } else {
          // Message not found in current loaded messages
          // Could be older message - show notification
          console.warn('Message not found:', jumpToMessageId);
        }
        setJumpToMessageId(null);
      }, 300);
    }
  }, [messages, jumpToMessageId]);

  // Fetch DM channels with debounce
  const fetchDMChannels = useCallback(async () => {
    // Clear existing debounce
    if (dmChannelsDebounceRef.current) {
      clearTimeout(dmChannelsDebounceRef.current);
    }
    
    // Debounce for 500ms
    dmChannelsDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/dm/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          // API returns members array, find friend from members
          const mappedChannels: DMChannel[] = data.map((row: any) => {
            // Find friend (other user) from members array
            let friend = row.friend;
            if (!friend && row.members && Array.isArray(row.members)) {
              friend = row.members.find((m: any) => m.id !== user?.id);
              if (friend) {
                friend = {
                  ...friend,
                  displayName: friend.displayName || friend.display_name || friend.username,
                };
              }
            }
            
            return {
              id: row.id,
              name: row.name,
              type: row.type || 'direct',
              members: row.members || [],
              friend: friend ? {
                id: friend.id,
                username: friend.username,
                displayName: friend.displayName || friend.display_name || friend.username,
                avatar: friend.avatar,
                status: friend.status || 'offline',
                email: '',
              } : undefined,
              lastMessage: row.last_message || row.lastMessage,
              lastMessageAt: row.last_message_at || row.lastMessageAt,
              unreadCount: row.unread_count || row.unreadCount || 0,
              updatedAt: row.updated_at || row.updatedAt || row.last_message_at,
              creatorId: row.creator_id,
            };
          });
          setDmChannels(mappedChannels);
        }
      } catch (error) {
        console.error('Failed to fetch DM channels:', error);
      }
    }, 500);
  }, [token]);

  // Fetch DM unread count with debounce
  const fetchDMUnreadCount = useCallback(async () => {
    // Clear existing debounce
    if (dmUnreadDebounceRef.current) {
      clearTimeout(dmUnreadDebounceRef.current);
    }
    
    // Debounce for 500ms
    dmUnreadDebounceRef.current = setTimeout(async () => {
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
    }, 500);
  }, [token]);

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  }, [token]);

  // Calculate online friends count
  const onlineFriendsCount = useMemo(() => {
    return friends.filter(f => f.status === 'online').length;
  }, [friends]);

  // Fetch channel unread count for a server
  const fetchChannelUnreadCount = async (serverId: string) => {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setChannelUnreadCounts(data.unreadCounts || {});
      }
    } catch (error) {
      console.error('Failed to fetch channel unread count:', error);
    }
  };

  // Mark channel as read
  const markChannelAsRead = async (channelId: string, messageId?: string) => {
    try {
      await fetch(`${API_URL}/channels/${channelId}/read`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ messageId }),
      });
      // Update local state
      setChannelUnreadCounts(prev => ({
        ...prev,
        [channelId]: { count: 0, hasMention: false }
      }));
    } catch (error) {
      console.error('Failed to mark channel as read:', error);
    }
  };

  // BUG-019: Socket Event Listeners Re-registration - Use ref pattern
  const dmHandlersRef = useRef({
    handleDMMessageReceived: (data: { channelId: string; sender?: any; messageId?: string }) => {
      fetchDMUnreadCount();
      if (data.channelId === selectedDMChannelId) {
        // Messages will be updated via socket event in DMChatArea
      }
      
      // Show notification for ALL online users (like Discord)
      const channel = dmChannels.find(c => c.id === data.channelId);
      if (channel) {
        const senderName = data.sender?.displayName || data.sender?.username || channel.friend?.displayName || channel.friend?.username || channel.name || 'Pesan Baru';
        notify({
          title: channel.type === 'group' ? `${senderName} di ${channel.name || 'Grup'}` : senderName,
          body: 'Pesan baru',
          icon: data.sender?.avatar || channel.friend?.avatar,
          tag: `dm-${data.messageId || Date.now()}`, // Unique tag
        });
      }
    },
    handleGroupDMCreated: (data: { channelId: string; name?: string }) => {
      fetchDMChannels();
      notify({
        title: 'Grup Baru',
        body: `Anda ditambahkan ke grup "${data.name || 'Grup Baru'}"`,
        tag: `group-dm-${data.channelId}`,
      });
    },
    handleUserAddedToDM: (data: { channelId: string; channelName?: string }) => {
      fetchDMChannels();
      notify({
        title: 'Ditambahkan ke Grup',
        body: `Anda ditambahkan ke "${data.channelName || 'Grup'}"`,
        tag: `added-to-group-${data.channelId}`,
      });
    },
    fetchDMUnreadCount
  });

  // Update ref when dependencies change
  useEffect(() => {
    dmHandlersRef.current.handleDMMessageReceived = (data: { channelId: string; sender?: any; messageId?: string }) => {
      fetchDMUnreadCount();

      // Show notification for ALL online users (like Discord)
      const channel = dmChannels.find(c => c.id === data.channelId);
      const senderName = data.sender?.displayName || data.sender?.username || channel?.friend?.displayName || channel?.friend?.username || channel?.name || 'Pesan Baru';
      notify({
        title: channel?.type === 'group' ? `${senderName} di ${channel.name || 'Grup'}` : senderName,
        body: 'Pesan baru',
        icon: data.sender?.avatar || channel?.friend?.avatar,
        tag: `dm-${data.messageId || Date.now()}`,
      });
    };
    dmHandlersRef.current.fetchDMUnreadCount = fetchDMUnreadCount;
  }, [viewMode, selectedDMChannelId, dmChannels, notify, fetchDMUnreadCount]);

  // Stable effect that only runs once for socket registration
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const wrappedHandlers = {
      dm_message_received: (data: { channelId: string; sender?: any; messageId?: string }) => dmHandlersRef.current.handleDMMessageReceived(data),
      'new-dm-message': (data: { channelId: string; sender?: any; messageId?: string; message?: any }) => dmHandlersRef.current.handleDMMessageReceived({ channelId: data.channelId, sender: data.sender, messageId: data.message?.id }),
      dm_channel_updated: () => dmHandlersRef.current.fetchDMUnreadCount(),
      group_dm_created: (data: { channelId: string; name?: string }) => dmHandlersRef.current.handleGroupDMCreated(data),
      user_added_to_dm: (data: { channelId: string; channelName?: string }) => dmHandlersRef.current.handleUserAddedToDM(data),
      dm_member_added: () => dmHandlersRef.current.fetchDMUnreadCount(),
      dm_member_left: () => dmHandlersRef.current.fetchDMUnreadCount(),
    };

    // Register listeners
    Object.entries(wrappedHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(wrappedHandlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      // Clear debounce timeouts
      if (dmUnreadDebounceRef.current) clearTimeout(dmUnreadDebounceRef.current);
      if (dmChannelsDebounceRef.current) clearTimeout(dmChannelsDebounceRef.current);
    };
  }, []); // ✅ Only run once on mount

  // Socket connection
  const handleNewMessage = useCallback((message: Message) => {
    console.log('📨 New message:', message.id, 'from:', message.user?.username);
    
    const isOwnMessage = message.userId === user?.id;
    const currentSelectedChannelId = selectedChannelIdRef.current;
    
    // Update unread count
    if (!isOwnMessage && message.channelId !== currentSelectedChannelId) {
      setChannelUnreadCounts(prev => ({
        ...prev,
        [message.channelId]: {
          count: (prev[message.channelId]?.count || 0) + 1,
          hasMention: false
        }
      }));
    }
    
    // NOTIFICATION: Check settings before showing
    if (!isOwnMessage) {
      // Fetch server ID for this channel
      const currentChannels = channelsRef.current;
      const fromChannel = currentChannels.find(c => c.id === message.channelId);
      const messageServerId = fromChannel?.serverId || selectedServerId;
      
      // Check if we should show notification
      if (shouldShowNotification(message, messageServerId)) {
        const senderName = message.user?.displayName || message.user?.username || 'Someone';
        const channelName = fromChannel?.name || 'channel';
        
        // Format mentions in content for notification (simple version)
        let notificationBody = message.content?.substring(0, 100) || '📎 File';
        
        // Replace all mentions with simple @ symbol
        notificationBody = notificationBody.replace(/<@([a-f0-9-]+)>/gi, '@user');
        notificationBody = notificationBody.replace(/<@&([a-f0-9-]+)>/gi, '@role');
        notificationBody = notificationBody.replace(/<@everyone>/gi, '@everyone');
        notificationBody = notificationBody.replace(/<@here>/gi, '@here');
        
        console.log('🔔 TRIGGER NOTIFICATION for:', senderName);
        
        // Call notify using ref to always have latest function
        notifyRef.current({
          title: `${senderName} di #${channelName}`,
          body: notificationBody,
          icon: message.user?.avatar,
        });
      } else {
        console.log('🔕 NOTIFICATION SUPPRESSED based on user settings');
      }
    }
    
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      const filtered = prev.filter(m => {
        if (!m.id?.startsWith('temp-')) return true;
        return !(m.userId === message.userId && 
                 m.content === message.content &&
                 m.channelId === message.channelId);
      });
      
      return [...filtered, message];
    });
  }, [user?.id]); // Only depend on user.id which is stable

  const handleReactionUpdate = useCallback((data: { messageId: string; reactions: any[] }) => {
    console.log('📡 Socket: handleReactionUpdate received:', data.messageId, data.reactions);
    setMessages(prev => {
      const msg = prev.find(m => m.id === data.messageId);
      console.log('📡 Found message:', msg?.id, 'Current reactions:', msg?.reactions);
      return prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      );
    });
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

  // Handle member joined - add welcome message
  const handleMemberJoined = useCallback((data: { userId: string; serverId: string; username: string; displayName?: string; avatar?: string }) => {
    console.log('👋 Member joined:', data);
    
    // Only show welcome message if user is viewing the server
    if (selectedServerId === data.serverId) {
      // Create a welcome message
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        channelId: selectedChannelId || '',
        userId: 'system',
        content: `Selamat datang ${data.displayName || data.username}! 👋`,
        timestamp: new Date().toISOString(),
        user: {
          id: 'system',
          username: 'System',
          email: '',
          avatar: '',
          status: 'online',
          displayName: 'System'
        },
        type: 'system',
        isSystem: true,
        newMember: {
          id: data.userId,
          username: data.username,
          displayName: data.displayName,
          avatar: data.avatar
        }
      };
      
      // Add welcome message to current messages
      setMessages(prev => [...prev, welcomeMessage]);
      
      // Refresh messages to get the actual welcome message from server
      if (selectedChannelId) {
        fetchMessages(selectedChannelId, true);
      }
    }
  }, [selectedServerId, selectedChannelId]);

  // Handle reaction with optimistic update and API call
  const handleReaction = useCallback(async (messageId: string, emoji: string, hasReacted: boolean) => {
    console.log('🏠 ChatLayout.handleReaction called:', messageId, emoji, hasReacted);
    const token = localStorage.getItem('token');
    
    // Optimistic update - update UI immediately
    console.log('🎨 Performing optimistic update...');
    setMessages(prev => {
      console.log('🎨 setMessages callback, prev length:', prev.length);
      return prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        let updatedReactions = [...(msg.reactions || [])];
        
        if (hasReacted) {
          // Remove reaction
          updatedReactions = updatedReactions.map(r => {
            if (r.emoji === emoji) {
              return {
                ...r,
                count: r.count - 1,
                users: r.users.filter(u => u !== user?.id)
              };
            }
            return r;
          }).filter(r => r.count > 0);
        } else {
          // Add reaction
          const existingReaction = updatedReactions.find(r => r.emoji === emoji);
          if (existingReaction) {
            updatedReactions = updatedReactions.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1, users: [...r.users, user?.id || ''] }
                : r
            );
          } else {
            updatedReactions.push({
              emoji,
              count: 1,
              users: [user?.id || '']
            });
          }
        }
        
        return { ...msg, reactions: updatedReactions };
      });
    });
    
    // API call
    try {
      const response = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
        method: hasReacted ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      
      if (!response.ok) {
        console.error('Reaction failed:', response.status);
        // Revert by refetching
        if (selectedChannelId) {
          fetchMessages(selectedChannelId, true);
        }
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // Revert by refetching
      if (selectedChannelId) {
        fetchMessages(selectedChannelId, true);
      }
    }
  }, [user?.id, selectedChannelId]);

  const { 
    isConnected, 
    joinChannel, 
    leaveChannel, 
    sendMessage, 
    sendTyping, 
    typingUsers,
    userStatuses
  } = useSocket(handleNewMessage, handleReactionUpdate, handleMessageEdit, handleMessageDelete, undefined, handleMemberJoined);

  useEffect(() => {
    if (selectedChannelId && isConnected && viewMode === 'server') {
      joinChannel(selectedChannelId);
      return () => {
        leaveChannel(selectedChannelId);
      };
    }
  }, [selectedChannelId, isConnected, joinChannel, leaveChannel, viewMode]);

  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/servers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        
        // Check if current selected server is still accessible
        if (selectedServerId && viewMode === 'server') {
          const serverStillAccessible = data.some((s: Server) => s.id === selectedServerId);
          if (!serverStillAccessible) {
            // Server access revoked, redirect to friends
            setViewMode('friends');
            setSelectedServerId(null);
            setSelectedChannelId(null);
            navigate('/friends');
            toast.error('Akses ke server ini telah dicabut oleh admin.');
          }
        }
        
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
  }, [token, selectedServerId, viewMode, navigate, toast]);

  const fetchChannels = async (serverId: string) => {
    try {
      console.log(`[Frontend] Fetching channels for server ${serverId}`);
      const response = await fetch(`${API_URL}/servers/${serverId}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log(`[Frontend] Received ${data.length} channels:`, data.map((c: any) => c.name));
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannelId(data[0].id);
        }
      } else {
        console.error('[Frontend] Failed to fetch channels:', response.status);
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

  // Fetch notification settings for a server
  const fetchServerNotificationSettings = useCallback(async (serverId: string) => {
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/notification-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServerNotificationSettings(prev => ({
          ...prev,
          [serverId]: {
            notificationLevel: data.settings?.notification_level || 'all',
            muted: data.settings?.muted || false,
            mutedUntil: data.settings?.muted_until || null,
            suppressEveryoneHere: data.settings?.suppress_everyone_here || false,
            suppressRoleMentions: data.settings?.suppress_role_mentions || false,
            suppressHighlights: data.settings?.suppress_highlights || false,
            pushNotifications: data.settings?.push_notifications !== false,
            mobilePushNotifications: data.settings?.mobile_push_notifications !== false,
          }
        }));
        
        // Store channel overrides in a flat structure
        if (data.channelOverrides) {
          const overridesMap: Record<string, ChannelNotificationOverride> = {};
          data.channelOverrides.forEach((override: any) => {
            overridesMap[override.channel_id || override.channelId] = {
              channelId: override.channel_id || override.channelId,
              notificationLevel: override.notification_level || override.notificationLevel || 'default',
              muted: override.muted || false,
            };
          });
          setChannelNotificationOverrides(prev => ({ ...prev, ...overridesMap }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    }
  }, [token]);

  // Check if notification should be shown based on settings
  const shouldShowNotification = useCallback((
    message: Message,
    serverId: string | null
  ): boolean => {
    if (!serverId) return true; // DM messages always show
    
    const settings = serverNotificationSettings[serverId];
    if (!settings) return true; // Default to showing if no settings
    
    // Check if muted
    if (settings.muted) {
      // Even if muted, still show if mentioned
      const isMentioned = checkIsMentioned(message, user?.id || '');
      return isMentioned;
    }
    
    // Check notification level
    if (settings.notificationLevel === 'nothing') {
      return false;
    }
    
    if (settings.notificationLevel === 'mentions') {
      return checkIsMentioned(message, user?.id || '');
    }
    
    // Check channel override
    const channelOverride = channelNotificationOverrides[message.channelId];
    if (channelOverride) {
      if (channelOverride.muted) {
        const isMentioned = checkIsMentioned(message, user?.id || '');
        return isMentioned;
      }
      if (channelOverride.notificationLevel === 'nothing') {
        return false;
      }
      if (channelOverride.notificationLevel === 'mentions') {
        return checkIsMentioned(message, user?.id || '');
      }
    }
    
    return true;
  }, [serverNotificationSettings, channelNotificationOverrides, user?.id]);

  // Helper function to check if user is mentioned in message
  const checkIsMentioned = (message: Message, userId: string): boolean => {
    if (!message.content) return false;
    
    const content = message.content;
    
    // Check @user mention
    if (content.includes(`<@${userId}>`)) return true;
    
    // Check @everyone and @here (unless suppressed)
    const settings = selectedServerId ? serverNotificationSettings[selectedServerId] : null;
    if (!settings?.suppressEveryoneHere) {
      if (content.includes('@everyone')) return true;
      if (content.includes('@here')) return true;
    }
    
    return false;
  };

  // Fetch notification settings when server changes
  useEffect(() => {
    if (selectedServerId) {
      fetchServerNotificationSettings(selectedServerId);
    }
  }, [selectedServerId, fetchServerNotificationSettings]);

  const handleSendMessage = useCallback((content: string, replyToMessage?: Message | null, attachments?: FileAttachment[]) => {
    if (!selectedChannelId || isSending) return;
    
    // Check cooldown to prevent spam
    const now = Date.now();
    if (now - lastMessageTimeRef.current < MESSAGE_COOLDOWN_MS) {
      console.log('[ChatLayout] Message cooldown active, please wait...');
      return;
    }
    
    setIsSending(true);
    lastMessageTimeRef.current = now;
    
    console.log('[ChatLayout] Sending message with replyTo:', replyToMessage?.id);
    const success = (sendMessage as any)(selectedChannelId, content, replyToMessage, attachments);
    
    // Only clear reply if message was sent successfully
    if (success !== false) {
      setReplyTo(null);
    }
    
    // Reset sending state - focus will be handled by MessageInput's useEffect
    setTimeout(() => {
      console.log('[ChatLayout] Resetting isSending');
      setIsSending(false);
    }, 100);
  }, [selectedChannelId, sendMessage, isSending]);

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
      case 'friends':
        setViewMode('friends');
        break;
      case 'chat':
        setViewMode('dm');
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
      setIsServerDrawerOpen(false);
    } else if (serverId) {
      setViewMode('server');
      setSelectedServerId(serverId);
      setSelectedDMChannelId(null);
      // Fetch unread count for this server
      fetchChannelUnreadCount(serverId);
      setIsServerDrawerOpen(false);
      // On mobile, open channel drawer to select channel
      if (isMobile) {
        setIsChannelDrawerOpen(true);
      }
    }
  };

  const handleSelectChannel = (channelId: string) => {
    const prevChannelId = selectedChannelId;
    setSelectedChannelId(channelId);
    setIsChannelDrawerOpen(false);
    setMobileView('chat');
    // Mark channel as read
    if (channelId && channelUnreadCounts[channelId]?.count > 0) {
      markChannelAsRead(channelId);
    }
  };

  const handleSelectDMChannel = async (channelId: string) => {
    setSelectedDMChannelId(channelId);
    setViewMode('dm');
    setDMUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    
    // Mark DM channel as read in backend
    try {
      await fetch(`${API_URL}/dm/channels/${channelId}/read`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to mark DM as read:', error);
    }
  };

  const handleStartDM = async (friend: any) => {
    console.log('[handleStartDM] Starting DM with friend:', friend.username);
    try {
      const existingChannel = dmChannels.find(c => c.friend?.id === friend.id && c.type === 'direct');
      console.log('[handleStartDM] Existing channel:', existingChannel?.id);
      if (existingChannel) {
        console.log('[handleStartDM] Using existing channel');
        setSelectedDMChannelId(existingChannel.id);
        setViewMode('dm');
        console.log('[handleStartDM] Set viewMode to dm, selectedDMChannelId to:', existingChannel.id);
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
          type: data.type || 'direct',
          members: data.members || [],
          friend: data.friend || {
            id: friend.id,
            username: friend.username,
            displayName: friend.displayName,
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

  // Create Group DM
  const handleCreateGroupDM = async (userIds: string[], name: string) => {
    try {
      const response = await fetch(`${API_URL}/dm/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds, name, type: 'group' }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📨 Created Group DM:', data);
        const newChannel: DMChannel = {
          id: data.id,
          name: data.name,
          type: 'group',
          members: data.members || [],
          creatorId: data.creatorId,
          lastMessage: '',
          lastMessageAt: new Date().toISOString(),
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
        };
        setDmChannels(prev => [newChannel, ...prev]);
        setSelectedDMChannelId(newChannel.id);
        setViewMode('dm');
      }
    } catch (error) {
      console.error('Failed to create group DM:', error);
    }
  };

  // Add member to group DM
  const handleAddMemberToGroup = async (channelId: string, userId: string) => {
    try {
      const response = await fetch(`${API_URL}/dm/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Update local channel data
        setDmChannels(prev => prev.map(ch => {
          if (ch.id === channelId) {
            return { ...ch, members: [...(ch.members || []), { id: userId, username: 'Unknown', email: '', avatar: '', status: 'offline' }] };
          }
          return ch;
        }));
        fetchDMChannels(); // Refresh to get full member data
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  // Leave group DM
  const handleLeaveGroup = async (channelId: string) => {
    if (!confirm('Apakah Anda yakin ingin meninggalkan grup ini?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/dm/channels/${channelId}/members/${user?.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setDmChannels(prev => prev.filter(ch => ch.id !== channelId));
        if (selectedDMChannelId === channelId) {
          setSelectedDMChannelId(null);
          setViewMode('friends');
        }
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  // Handle start DM from user profile (used by UserProfilePopup)
  const handleStartDMFromProfile = async (user: { id: string; username: string; avatar?: string; status?: string; email?: string }) => {
    await handleStartDM(user);
  };

  const handleBackFromDM = () => {
    setSelectedDMChannelId(null);
    setViewMode('dm'); // Kembali ke daftar DM, bukan ke Friends
  };

  const selectedServer = servers.find(s => s.id === selectedServerId) || null;
  const selectedChannel = channels.find(c => c.id === selectedChannelId) || null;
  const selectedDMChannel = dmChannels.find(c => c.id === selectedDMChannelId) || null;
  
  // Calculate server unread counts from channel unread counts
  const serverUnreadCounts = useMemo(() => {
    const counts: Record<string, { count: number; hasMention: boolean }> = {};
    
    Object.entries(channelUnreadCounts).forEach(([channelId, unread]) => {
      // Find which server this channel belongs to
      const channel = channels.find(c => c.id === channelId);
      if (channel && channel.serverId) {
        if (!counts[channel.serverId]) {
          counts[channel.serverId] = { count: 0, hasMention: false };
        }
        counts[channel.serverId].count += unread.count;
        if (unread.hasMention) {
          counts[channel.serverId].hasMention = true;
        }
      }
    });
    
    return counts;
  }, [channelUnreadCounts, channels]);
  
  // Check if current user is the server owner
  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
    return null;
  };
  
  const currentUserId = getCurrentUserId();
  const isServerOwner = !!(selectedServer?.owner_id && currentUserId && selectedServer.owner_id === currentUserId);
  console.log('[ChatLayout] selectedServer?.owner_id:', selectedServer?.owner_id);
  console.log('[ChatLayout] currentUserId:', currentUserId);
  console.log('[ChatLayout] isServerOwner:', isServerOwner);
  
  // Debug log
  console.log('📊 selectedDMChannel:', selectedDMChannel);
  console.log('📊 dmChannels:', dmChannels);

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#a0a0b0]">Memuat...</p>
        </div>
      </div>
    );
  }

  // MOBILE LAYOUT
  console.log('[Mobile Layout] viewMode:', viewMode, 'selectedDMChannelId:', selectedDMChannelId, 'selectedDMChannel:', selectedDMChannel?.id);
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a12] overflow-hidden">
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
                  onBack={handleBackFromDM}
                  onAddMember={(channelId) => {
                    setActiveGroupChannelId(channelId);
                    setIsAddMemberModalOpen(true);
                  }}
                  onLeaveGroup={handleLeaveGroup}
                  isMobile={true}
                />
              </div>
            </>
          ) : viewMode === 'dm' ? (
            // Show DM List when Chat tab clicked but no DM selected
            <>
              <div className="h-12 px-4 flex items-center justify-between bg-[#1a1b2e] border-b border-[#0f0f1a]">
                <h2 className="text-white font-semibold">Pesan Langsung</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DMList
                  selectedChannelId={selectedDMChannelId}
                  onSelectChannel={handleSelectDMChannel}
                  onOpenFriends={() => setViewMode('friends')}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onCreateGroupDM={() => setIsGroupDMModalOpen(true)}
                  unreadCounts={dmUnreadCounts}
                  isMobile={true}
                />
              </div>
            </>
          ) : (
            <>
              <MobileHeader
                server={selectedServer}
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
                  showMemberList={showMemberList}
                  onToggleMemberList={() => setShowMemberList(!showMemberList)}
                  servers={servers}
                  channels={channels}
                  dmChannels={dmChannels}
                  onReaction={handleReaction}
                  onFocusInput={() => messageInputRef.current?.focus()}
                />
                <MessageInput
                  ref={messageInputRef}
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  disabled={!selectedChannelId || isSending}
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
        <div className="h-[60px] bg-[#0f0f1a] border-t border-[#1a1a1a] flex-shrink-0 z-50">
          <MobileBottomNav
            currentView={mobileView}
            onViewChange={handleMobileViewChange}
            unreadDMCount={totalDMUnread}
            onlineFriendsCount={onlineFriendsCount}
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
              serverUnreadCounts={serverUnreadCounts}
              dmUnreadCount={totalDMUnread}
            />
          </div>
        </MobileDrawer>

        <MobileDrawer
          isOpen={isChannelDrawerOpen}
          onClose={() => setIsChannelDrawerOpen(false)}
        >
          <ChannelList
            server={selectedServer}
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleSelectChannel}
            onOpenServerSettings={() => setIsServerSettingsOpen(true)}
            onOpenUserSettings={() => setIsSettingsOpen(true)}
            onOpenInvite={() => setIsInviteOpen(true)}
            isMobile={true}
            onClose={() => setIsChannelDrawerOpen(false)}
            isOwner={isServerOwner}
            unreadCounts={channelUnreadCounts}
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
            onStartDM={handleStartDM}
          />
        </MobileDrawer>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Server Settings Modal - Owner only */}
        {selectedServer && isServerOwner && (
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

        {/* Group DM Modal */}
        <GroupDMModal
          isOpen={isGroupDMModalOpen}
          onClose={() => setIsGroupDMModalOpen(false)}
          onCreateGroup={handleCreateGroupDM}
          currentUser={user}
        />

        {/* Add Member to Group Modal */}
        {activeGroupChannelId && (
          <AddMemberToGroupModal
            isOpen={isAddMemberModalOpen}
            onClose={() => setIsAddMemberModalOpen(false)}
            onAddMember={(userId) => handleAddMemberToGroup(activeGroupChannelId, userId)}
            channelId={activeGroupChannelId}
            currentMembers={dmChannels.find(c => c.id === activeGroupChannelId)?.members || []}
            currentUser={user}
          />
        )}

        {/* Connection Status */}
        <div className="fixed top-16 right-2 flex items-center gap-2 px-3 py-1.5 bg-[#18191c] rounded-full z-40">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3ba55d]' : 'bg-[#ed4245]'}`} />
          <span className="text-xs text-[#a0a0b0]">
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="h-full flex bg-[#0a0a12] overflow-hidden">
      {/* Server List */}
      <ServerList
        servers={servers}
        selectedServerId={selectedServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={handleCreateServer}
        onOpenFriends={() => setViewMode('friends')}
        isFriendsOpen={viewMode === 'friends'}
        serverUnreadCounts={serverUnreadCounts}
        dmUnreadCount={totalDMUnread}
      />

      {/* Left Sidebar */}
      {viewMode === 'server' && (
        <ChannelList
          server={selectedServer}
          channels={channels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
          onOpenServerSettings={() => setIsServerSettingsOpen(true)}
            onOpenUserSettings={() => setIsSettingsOpen(true)}
          onOpenInvite={() => setIsInviteOpen(true)}
          isOwner={isServerOwner}
          onLeaveServer={() => {
            setServers(prev => prev.filter(s => s.id !== selectedServerId));
            setSelectedServerId(null);
            setViewMode('dm');
          }}
          unreadCounts={channelUnreadCounts}
        />
      )}
      
      {(viewMode === 'dm' || viewMode === 'friends') && (
        <DMList
          selectedChannelId={selectedDMChannelId}
          onSelectChannel={handleSelectDMChannel}
          onOpenFriends={() => setViewMode('friends')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCreateGroupDM={() => setIsGroupDMModalOpen(true)}
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
          onBack={handleBackFromDM}
          onAddMember={(channelId) => {
            setActiveGroupChannelId(channelId);
            setIsAddMemberModalOpen(true);
          }}
          onLeaveGroup={handleLeaveGroup}
          onFocusInput={() => {/* DMChatArea handles its own textarea */}}
        />
      ) : !selectedChannel ? (
        // Empty state when no channel is selected
        <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1b2e]">
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-[#00d4ff]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang di WorkGrid!</h2>
            <p className="text-[#a0a0b0] mb-6">Pilih channel di sidebar untuk mulai chatting</p>
            {servers.length === 0 && (
              <p className="text-[#6a6a7a] text-sm">Buat server baru dari tombol + di sidebar kiri</p>
            )}
          </div>
        </div>
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
              servers={servers}
              channels={channels}
              dmChannels={dmChannels}
              onReaction={handleReaction}
              showMemberList={showMemberList}
              onToggleMemberList={() => setShowMemberList(!showMemberList)}
              onFocusInput={() => messageInputRef.current?.focus()}
            />
            <MessageInput
              ref={messageInputRef}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={!selectedChannelId || isSending}
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
              serverId={selectedServerId || undefined}
              channelId={selectedChannelId || undefined}
            />
          </div>

          {showMemberList && (
            <MemberList 
              serverId={selectedServerId} 
              userStatuses={userStatuses} 
              onStartDM={handleStartDM}
            />
          )}
        </>
      )}

      {/* Connection Status - Top Right */}
      <div className="fixed top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-[#18191c]/90 backdrop-blur-sm rounded-full z-50 border border-[#232438]">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3ba55d]' : 'bg-[#ed4245]'}`} />
        <span className="text-xs text-[#a0a0b0] font-medium">
          {isConnected ? 'Online' : 'Connecting...'}
        </span>
        {permission !== 'granted' && 'Notification' in window && (
          <button
            onClick={() => requestPermission()}
            className="ml-2 text-xs text-[#00d4ff] hover:text-[#00b8db]"
          >
            Enable Notifications
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Server Settings Page */}
      {selectedServer && (
        <ServerSettingsPage
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          server={selectedServer}
          onUpdateServer={(serverId, data) => {
            // Update server in state
            setServers(prev => prev.map(s => s.id === serverId ? { ...s, ...data } : s));
            if (selectedServer?.id === serverId) {
              setSelectedServerId(serverId);
            }
          }}
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

      {/* Group DM Modal */}
      <GroupDMModal
        isOpen={isGroupDMModalOpen}
        onClose={() => setIsGroupDMModalOpen(false)}
        onCreateGroup={handleCreateGroupDM}
        currentUser={user}
      />

      {/* Add Member to Group Modal */}
      {activeGroupChannelId && (
        <AddMemberToGroupModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          onAddMember={(userId) => handleAddMemberToGroup(activeGroupChannelId, userId)}
          channelId={activeGroupChannelId}
          currentMembers={dmChannels.find(c => c.id === activeGroupChannelId)?.members || []}
          currentUser={user}
        />
      )}
    </div>
  );
}

