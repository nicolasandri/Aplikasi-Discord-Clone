import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageCircle, UserPlus, Users, Plus, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarUserPanel } from './SidebarUserPanel';
import type { DMChannel } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Base URL for assets (images, uploads)
const BASE_URL = 'http://localhost:3001';

const statusColors = {
  online: 'bg-[#3ba55d]',
  offline: 'bg-[#747f8d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
};

interface DMListProps {
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenFriends: () => void;
  onOpenSettings?: () => void;
  onCreateGroupDM?: () => void;
  unreadCounts: Record<string, number>;
  isMobile?: boolean;
}

export function DMList({ 
  selectedChannelId, 
  onSelectChannel, 
  onOpenFriends,
  onOpenSettings,
  onCreateGroupDM,
  unreadCounts,
  isMobile = false
}: DMListProps) {
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const tokenRef = useRef(localStorage.getItem('token'));
  const lastFetchTime = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Decode token to get user ID
  const getUserIdFromToken = () => {
    const token = tokenRef.current;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.userId;
    } catch {
      return null;
    }
  };
  const currentUserId = getUserIdFromToken();

  const fetchDMChannels = useCallback(async (force = false) => {
    const token = tokenRef.current;
    if (!token) return;
    
    // Prevent multiple simultaneous requests using ref (not state to avoid dependency issues)
    if (isFetchingRef.current) return;
    
    // Debounce: only fetch if last fetch was more than 1 second ago (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchTime.current < 1000) return;
    
    isFetchingRef.current = true;
    setIsFetching(true);
    lastFetchTime.current = now;
    
    try {
      const response = await fetch(`${API_URL}/dm/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📨 DM channels raw data:', data);
        // API returns nested friend object, use it directly
        const mappedChannels: DMChannel[] = data.map((row: any) => ({
          id: row.id,
          friend: row.friend || {
            // Fallback if API returns flat format (from DB query)
            id: row.friend_id,
            username: row.friend_username,
            displayName: row.friend_display_name,
            avatar: row.friend_avatar,
            status: row.friend_status || 'offline',
            email: '',
          },
          lastMessage: row.lastMessage || row.last_message,
          lastMessageAt: row.lastMessageAt || row.last_message_at,
          unreadCount: row.unread_count || 0,
          updatedAt: row.updated_at || row.last_message_at,
        }));
        console.log('📨 DM channels mapped:', mappedChannels);
        setDmChannels(mappedChannels);
      }
    } catch (error) {
      console.error('Failed to fetch DM channels:', error);
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
    }
  }, []);

  // Initial fetch - only once when component mounts
  useEffect(() => {
    if (!tokenRef.current) return;
    
    fetchDMChannels(true);

    // Poll for updates every 30 seconds (reduced to prevent rate limiting)
    const interval = setInterval(() => {
      fetchDMChannels();
    }, 30000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for socket events with debounce
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const debouncedFetchDMChannels = () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
      fetchDebounceRef.current = setTimeout(() => {
        fetchDMChannels();
      }, 500);
    };

    const handleDMMessageReceived = () => {
      debouncedFetchDMChannels();
    };

    const handleNewDMMessage = () => {
      debouncedFetchDMChannels();
    };

    const handleDMChannelUpdated = () => {
      debouncedFetchDMChannels();
    };

    const handleUserLeftDM = (data: { channelId: string; userId: string }) => {
      // Remove the channel from the list if the current user left
      if (data.userId === currentUserId) {
        setDmChannels(prev => prev.filter(ch => ch.id !== data.channelId));
        if (selectedChannelId === data.channelId) {
          onSelectChannel('');
        }
      }
    };

    socket.on('dm_message_received', handleDMMessageReceived);
    socket.on('new-dm-message', handleNewDMMessage);
    socket.on('dm_channel_updated', handleDMChannelUpdated);
    socket.on('user_left_dm', handleUserLeftDM);

    return () => {
      socket.off('dm_message_received', handleDMMessageReceived);
      socket.off('new-dm-message', handleNewDMMessage);
      socket.off('dm_channel_updated', handleDMChannelUpdated);
      socket.off('user_left_dm', handleUserLeftDM);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, []);

  const handleDeleteDM = async (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    if (!confirm('Hapus percakapan ini?')) return;

    try {
      const response = await fetch(`${API_URL}/dm/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      
      if (response.ok) {
        setDmChannels(prev => prev.filter(ch => ch.id !== channelId));
        if (selectedChannelId === channelId) {
          onSelectChannel(''); // Deselect
        }
        console.log('DM channel deleted successfully:', channelId);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to delete DM channel:', response.status, errorData);
        alert('Gagal menghapus percakapan: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete DM channel:', error);
      alert('Gagal menghapus percakapan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours - show time with seconds
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    // Less than 7 days - show day name
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('id-ID', { weekday: 'short' });
    }
    // Otherwise - show date
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
  };

  return (
    <div className={`${isMobile ? 'w-full bg-[#0d0d14]' : 'w-60 bg-[#232438]'} flex flex-col h-full`}>
      {!isMobile && (
        <>
          {/* Header */}
          <div className="h-12 px-4 flex items-center shadow-md border-b border-[#0f0f1a]">
            <button 
              onClick={onOpenFriends}
              className="w-full bg-[#0f0f1a] hover:bg-[#1a1b2e] text-[#a0a0b0] text-sm font-medium py-1.5 px-3 rounded transition-colors text-left"
            >
              Cari atau mulai percakapan
            </button>
          </div>

          {/* Friends Button */}
          <div className="px-2 py-2">
            <button
              onClick={onOpenFriends}
              className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-[#34373c] text-[#a0a0b0] hover:text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#1a1b2e] flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="font-medium">Teman</span>
            </button>
          </div>

          {/* Section Title with Create Group Button */}
          <div className="px-4 py-1 flex items-center justify-between">
            <h3 className="text-[#96989d] text-xs font-semibold uppercase tracking-wide">
              Pesan Langsung
            </h3>
            {onCreateGroupDM && (
              <button
                onClick={onCreateGroupDM}
                className="text-[#96989d] hover:text-white transition-colors p-1"
                title="Buat Grup Baru"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </>
      )}

      {/* DM List */}
      <ScrollArea className={`flex-1 ${isMobile ? 'px-0' : 'px-2'}`}>
        <div className={`${isMobile ? 'divide-y divide-[#1a1a24]' : 'space-y-0.5'}`}>
          {dmChannels.map((channel) => {
            const isGroup = channel.type === 'group';
            const displayName = isGroup 
              ? (channel.name || `Grup (${channel.members?.length || 2})`)
              : (channel.friend?.displayName || channel.friend?.username || 'Unknown');
            
            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-2 py-2 rounded'} group relative ${
                  selectedChannelId === channel.id
                    ? isMobile ? 'bg-[#1a1b2e] text-white' : 'bg-[#2a2b3d] text-white'
                    : isMobile ? 'hover:bg-[#13131a] text-[#a0a0b0] hover:text-white' : 'hover:bg-[#34373c] text-[#a0a0b0] hover:text-white'
                }`}
              >
                {/* Avatar or Group Icon */}
                <div className="relative flex-shrink-0">
                  {isGroup ? (
                    <div className={`${isMobile ? 'w-12 h-12' : 'w-8 h-8'} rounded-full bg-[#00d4ff] flex items-center justify-center`}>
                      <Users className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-white`} />
                    </div>
                  ) : (
                    <>
                      <Avatar className={`${isMobile ? 'w-12 h-12' : 'w-8 h-8'}`}>
                        <AvatarImage 
                          src={channel.friend?.avatar 
                            ? (channel.friend.avatar.startsWith('http') ? channel.friend.avatar : `${BASE_URL}${channel.friend.avatar}`)
                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.friend?.username || 'user'}`} 
                          alt={channel.friend?.displayName || channel.friend?.username || 'User'} 
                        />
                        <AvatarFallback className="bg-[#36393f]"><UserIcon className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} text-[#b9bbbe]`} /></AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 ${isMobile ? 'w-3.5 h-3.5 border-2' : 'w-3 h-3 border-2'} ${statusColors[channel.friend?.status || 'offline']} rounded-full ${isMobile ? 'border-[#0d0d14]' : 'border-[#232438]'}`} />
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={`${isMobile ? 'font-semibold text-base' : 'font-bold text-sm'} truncate ${
                      (unreadCounts[channel.id] || 0) > 0 ? 'text-white' : ''
                    }`}>
                      {displayName}
                    </span>
                    {channel.lastMessageAt && (
                      <span className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-[#6a6a7a] flex-shrink-0 ml-2`}>
                        {formatTime(channel.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={`${isMobile ? 'text-sm' : 'text-xs'} truncate ${
                      (unreadCounts[channel.id] || 0) > 0 
                        ? 'text-white font-medium' 
                        : 'text-[#6a6a7a]'
                    }`}>
                      {isGroup && channel.lastMessage && (
                        <span className="mr-1">
                          {channel.members?.find(m => channel.lastMessage?.includes(m.username))?.username || ''}:
                        </span>
                      )}
                      {channel.lastMessage || 'Belum ada pesan'}
                    </span>
                    {(unreadCounts[channel.id] || 0) > 0 && (
                      <Badge className={`bg-[#ed4245] text-white flex items-center justify-center p-0 flex-shrink-0 ml-2 ${isMobile ? 'text-xs min-w-[20px] h-5' : 'text-[10px] min-w-[16px] h-4'}`}>
                        {unreadCounts[channel.id] > 9 ? '9+' : unreadCounts[channel.id]}
                      </Badge>
                    )}
                  </div>
                </div>


              </button>
            );
          })}

          {dmChannels.length === 0 && (
            <div className="text-center py-8 text-[#6a6a7a] text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada percakapan</p>
              <p className="text-xs mt-1">Mulai chat dari daftar teman</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Panel - Fixed at bottom like Discord (hidden on mobile) */}
      {!isMobile && onOpenSettings && (
        <div className="p-2 bg-[#292b2f]">
          <SidebarUserPanel onOpenSettings={onOpenSettings} />
        </div>
      )}
    </div>
  );
}

