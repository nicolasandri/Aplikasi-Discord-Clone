import { useEffect, useState } from 'react';
import { MessageCircle, UserPlus, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DMChannel } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

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
  unreadCounts: Record<string, number>;
}

export function DMList({ 
  selectedChannelId, 
  onSelectChannel, 
  onOpenFriends,
  unreadCounts 
}: DMListProps) {
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const token = localStorage.getItem('token');

  const fetchDMChannels = async () => {
    try {
      const response = await fetch(`${API_URL}/dm/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDmChannels(data);
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

    socket.on('dm_message_received', handleDMMessageReceived);
    socket.on('dm_channel_updated', handleDMChannelUpdated);

    return () => {
      socket.off('dm_message_received', handleDMMessageReceived);
      socket.off('dm_channel_updated', handleDMChannelUpdated);
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
      }
    } catch (error) {
      console.error('Failed to delete DM channel:', error);
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 24 hours - show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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

      {/* Section Title */}
      <div className="px-4 py-1">
        <h3 className="text-[#96989d] text-xs font-semibold uppercase tracking-wide">
          Pesan Langsung
        </h3>
      </div>

      {/* DM List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5">
          {dmChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded group relative ${
                selectedChannelId === channel.id
                  ? 'bg-[#40444b] text-white'
                  : 'hover:bg-[#34373c] text-[#b9bbbe] hover:text-white'
              }`}
            >
              {/* Avatar with status */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={channel.friend.avatar} alt={channel.friend.username} />
                  <AvatarFallback>{channel.friend.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[channel.friend.status]} rounded-full border-2 border-[#2f3136]`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm truncate ${
                    (unreadCounts[channel.id] || 0) > 0 ? 'text-white' : ''
                  }`}>
                    {channel.friend.username}
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
                      ? 'text-white font-medium' 
                      : 'text-[#72767d]'
                  }`}>
                    {channel.lastMessage || 'Belum ada pesan'}
                  </span>
                  {(unreadCounts[channel.id] || 0) > 0 && (
                    <Badge className="bg-[#ed4245] text-white text-[10px] min-w-[16px] h-4 flex items-center justify-center p-0 flex-shrink-0 ml-1">
                      {unreadCounts[channel.id] > 9 ? '9+' : unreadCounts[channel.id]}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Delete button (hover) */}
              <button
                onClick={(e) => handleDeleteDM(e, channel.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#ed4245]/20 rounded text-[#72767d] hover:text-[#ed4245] transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}

          {dmChannels.length === 0 && (
            <div className="text-center py-8 text-[#72767d] text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada percakapan</p>
              <p className="text-xs mt-1">Mulai chat dari daftar teman</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
