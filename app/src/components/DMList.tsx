import { useEffect, useState } from 'react';
import { MessageCircle, UserPlus, Users, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserProfileButton } from './UserProfileButton';
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
}

export function DMList({ 
  selectedChannelId, 
  onSelectChannel, 
  onOpenFriends,
  onOpenSettings,
  onCreateGroupDM,
  unreadCounts 
}: DMListProps) {
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const token = localStorage.getItem('token');
  
  // Decode token to get user ID
  const getUserIdFromToken = () => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.userId;
    } catch {
      return null;
    }
  };
  const currentUserId = getUserIdFromToken();

  const fetchDMChannels = async () => {
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
          lastMessage: row.last_message,
          lastMessageAt: row.last_message_at,
          unreadCount: row.unread_count || 0,
          updatedAt: row.updated_at || row.last_message_at,
        }));
        console.log('📨 DM channels mapped:', mappedChannels);
        setDmChannels(mappedChannels);
      }
    } catch (error) {
      console.error('Failed to fetch DM channels:', error);
    }
  };

  useEffect(() => {
    fetchDMChannels();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchDMChannels, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Listen for socket events
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleDMMessageReceived = () => {
      fetchDMChannels();
    };

    const handleDMChannelUpdated = () => {
      fetchDMChannels();
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
    socket.on('dm_channel_updated', handleDMChannelUpdated);
    socket.on('user_left_dm', handleUserLeftDM);

    return () => {
      socket.off('dm_message_received', handleDMMessageReceived);
      socket.off('dm_channel_updated', handleDMChannelUpdated);
      socket.off('user_left_dm', handleUserLeftDM);
    };
  }, []);

  const handleDeleteDM = async (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    if (!confirm('Hapus percakapan ini?')) return;

    try {
      const response = await fetch(`${API_URL}/dm/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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
    <div className="w-60 bg-[#2f3136] flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center shadow-md border-b border-[#202225]">
        <button 
          onClick={onOpenFriends}
          className="w-full bg-[#202225] hover:bg-[#36393f] text-[#b9bbbe] text-sm font-medium py-1.5 px-3 rounded transition-colors text-left"
        >
          Cari atau mulai percakapan
        </button>
      </div>

      {/* Friends Button */}
      <div className="px-2 py-2">
        <button
          onClick={onOpenFriends}
          className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-[#34373c] text-[#b9bbbe] hover:text-white transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#36393f] flex items-center justify-center">
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

      {/* DM List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5">
          {dmChannels.map((channel) => {
            const isGroup = channel.type === 'group';
            const displayName = isGroup 
              ? (channel.name || `Grup (${channel.members?.length || 2})`)
              : (channel.friend?.displayName || channel.friend?.username || 'Unknown');
            
            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded group relative ${
                  selectedChannelId === channel.id
                    ? 'bg-[#40444b] text-white'
                    : 'hover:bg-[#34373c] text-[#b9bbbe] hover:text-white'
                }`}
              >
                {/* Avatar or Group Icon */}
                <div className="relative flex-shrink-0">
                  {isGroup ? (
                    <div className="w-8 h-8 rounded-full bg-[#5865f2] flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <>
                      <Avatar className="w-8 h-8">
                        <AvatarImage 
                          src={channel.friend?.avatar 
                            ? (channel.friend.avatar.startsWith('http') ? channel.friend.avatar : `${BASE_URL}${channel.friend.avatar}`)
                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.friend?.username || 'user'}`} 
                          alt={channel.friend?.displayName || channel.friend?.username || 'User'} 
                        />
                        <AvatarFallback>{(channel.friend?.displayName || channel.friend?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[channel.friend?.status || 'offline']} rounded-full border-2 border-[#2f3136]`} />
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm truncate ${
                      (unreadCounts[channel.id] || 0) > 0 ? 'text-white' : ''
                    }`}>
                      {displayName}
                    </span>
                    {channel.lastMessageAt && (
                      <span className="text-[10px] text-[#72767d] flex-shrink-0 ml-1">
                        {formatTime(channel.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs truncate ${
                      (unreadCounts[channel.id] || 0) > 0 
                        ? 'text-white font-semibold' 
                        : 'text-[#72767d]'
                    }`}>
                      {isGroup && channel.lastMessage && (
                        <span className="mr-1">
                          {channel.members?.find(m => channel.lastMessage?.includes(m.username))?.username || ''}:
                        </span>
                      )}
                      {channel.lastMessage || 'Belum ada pesan'}
                    </span>
                    {(unreadCounts[channel.id] || 0) > 0 && (
                      <Badge className="bg-[#ed4245] text-white text-[10px] min-w-[16px] h-4 flex items-center justify-center p-0 flex-shrink-0 ml-1">
                        {unreadCounts[channel.id] > 9 ? '9+' : unreadCounts[channel.id]}
                      </Badge>
                    )}
                  </div>
                </div>


              </button>
            );
          })}

          {dmChannels.length === 0 && (
            <div className="text-center py-8 text-[#72767d] text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada percakapan</p>
              <p className="text-xs mt-1">Mulai chat dari daftar teman</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Profile - Fixed at bottom */}
      {onOpenSettings && (
        <div className="p-2 border-t border-[#202225] bg-[#2f3136]">
          <UserProfileButton onOpenSettings={onOpenSettings} />
        </div>
      )}
    </div>
  );
}
