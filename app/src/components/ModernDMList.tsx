import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageCircle, UserPlus, Users, Plus, User as UserIcon, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarUserPanel } from './SidebarUserPanel';
import { motion } from 'framer-motion';
import type { DMChannel } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

const statusColors = {
  online: 'bg-[#3ba55d]',
  offline: 'bg-[#747f8d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
};

interface ModernDMListProps {
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenFriends: () => void;
  onOpenSettings?: () => void;
  onCreateGroupDM?: () => void;
  unreadCounts: Record<string, number>;
  isMobile?: boolean;
}

export function ModernDMList({
  selectedChannelId,
  onSelectChannel,
  onOpenFriends,
  onOpenSettings,
  onCreateGroupDM,
  unreadCounts,
  isMobile = false
}: ModernDMListProps) {
  const [dmChannels, setDmChannels] = useState<DMChannel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const tokenRef = useRef(localStorage.getItem('token'));
  const currentUserIdRef = useRef<string | null>(null);

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
  currentUserIdRef.current = getUserIdFromToken();

  const fetchDMChannels = useCallback(async (_force = false) => {
    const token = tokenRef.current;
    if (!token) return;

    setIsFetching(true);
    try {
      const response = await fetch(`${API_URL}/dm/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const mappedChannels: DMChannel[] = data.map((row: any) => {
          let friend = row.friend;
          if (!friend && row.members && Array.isArray(row.members)) {
            friend = row.members.find((m: any) => m.id !== currentUserIdRef.current);
            if (friend) {
              friend = {
                ...friend,
                displayName: friend.displayName || friend.display_name || friend.username,
              };
            }
          }
          if (!friend) {
            friend = {
              id: row.friend_id,
              username: row.friend_username,
              displayName: row.friend_display_name || row.friend_username,
              avatar: row.friend_avatar,
              status: row.friend_status || 'offline',
              email: '',
            };
          }
          return {
            id: row.id,
            friend: friend,
            type: row.type,
            name: row.name,
            members: row.members,
            lastMessage: row.lastMessage || row.last_message,
            lastMessageAt: row.lastMessageAt || row.last_message_at,
            unreadCount: parseInt(row.unread_count || row.unreadCount || '0', 10),
            updatedAt: row.updated_at || row.updatedAt || row.last_message_at,
          };
        });
        setDmChannels(mappedChannels);
      }
    } catch (error) {
      console.error('Failed to fetch DM channels:', error);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!tokenRef.current) return;

    fetchDMChannels(true);
    const interval = setInterval(() => {
      fetchDMChannels();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredChannels = dmChannels.filter(channel => {
    const displayName = channel.type === 'group'
      ? (channel.name || `Grup (${channel.members?.length || 2})`)
      : (channel.friend?.displayName || channel.friend?.username || 'Unknown');
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 24 * 60 * 60 * 1000) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('id-ID', { weekday: 'short' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
  };

  return (
    <div className={`${isMobile ? 'w-full bg-gradient-to-b from-[#0d0d14] to-[#05060a]' : 'w-72 bg-gradient-to-b from-[#15172d] via-[#1a1d3a] to-[#0f1119]'} flex flex-col h-full backdrop-blur-xl border-r border-white/5`}>
      {!isMobile && (
        <>
          {/* Modern Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-16 px-4 flex items-center justify-between border-b border-white/5"
          >
            <h2 className="text-white font-bold text-lg">Pesan Langsung</h2>
            {onCreateGroupDM && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCreateGroupDM}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                title="Buat Grup"
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="px-3 py-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.08] transition-all"
              />
            </div>
          </motion.div>

          {/* Friends Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="px-2 py-2"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenFriends}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center group-hover:from-cyan-500/40 group-hover:to-blue-500/40 transition-all">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Tambah Teman</span>
            </motion.button>
          </motion.div>
        </>
      )}

      {/* DM List */}
      <ScrollArea className={`flex-1 ${isMobile ? 'px-0' : 'px-2'}`}>
        <div className={`${isMobile ? 'divide-y divide-white/5' : 'space-y-1'}`}>
          {filteredChannels.map((channel, index) => {
            const isGroup = channel.type === 'group';
            const displayName = isGroup
              ? (channel.name || `Grup (${channel.members?.length || 2})`)
              : (channel.friend?.displayName || channel.friend?.username || 'Unknown');
            const isSelected = selectedChannelId === channel.id;
            const unreadCount = unreadCounts[channel.id] || 0;

            return (
              <motion.button
                key={channel.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{ x: 4 }}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-3 ${isMobile ? 'px-4 py-3' : 'px-3 py-2.5 rounded-lg'} group relative transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30'
                    : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                }`}
              >
                {/* Avatar */}
                <motion.div
                  className="relative flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  {isGroup ? (
                    <div className={`${isMobile ? 'w-12 h-12' : 'w-10 h-10'} rounded-lg bg-gradient-to-br from-cyan-500/40 to-blue-500/40 flex items-center justify-center border border-cyan-500/30`}>
                      <Users className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-cyan-400`} />
                    </div>
                  ) : (
                    <>
                      <Avatar className={`${isMobile ? 'w-12 h-12' : 'w-10 h-10'} ring-2 ring-white/10 group-hover:ring-cyan-500/30 transition-all`}>
                        <AvatarImage
                          src={channel.friend?.avatar
                            ? (channel.friend.avatar?.startsWith('http') ? channel.friend.avatar : `${BASE_URL}${channel.friend.avatar}`)
                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.friend?.username || 'user'}`}
                          alt={channel.friend?.displayName || channel.friend?.username || 'User'}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500/30 to-blue-500/30">
                          <UserIcon className="w-5 h-5 text-cyan-400" />
                        </AvatarFallback>
                      </Avatar>
                      <motion.div
                        className={`absolute -bottom-0.5 -right-0.5 ${isMobile ? 'w-3.5 h-3.5 border-2' : 'w-3 h-3 border-2'} ${statusColors[channel.friend?.status || 'offline']} rounded-full border-[#15172d] ring-1 ring-white/5`}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                    </>
                  )}
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`${isMobile ? 'font-semibold text-base' : 'font-bold text-sm'} truncate ${
                      isSelected ? 'text-white' : unreadCount > 0 ? 'text-white' : 'text-white/70'
                    }`}>
                      {displayName}
                    </span>
                    {channel.lastMessageAt && (
                      <span className={`${isMobile ? 'text-xs' : 'text-[10px]'} text-white/40 flex-shrink-0`}>
                        {formatTime(channel.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} truncate line-clamp-1 ${
                      unreadCount > 0
                        ? 'text-white font-medium'
                        : 'text-white/50'
                    }`}>
                      {channel.lastMessage || 'Belum ada pesan'}
                    </p>
                    {unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center px-2 py-0.5 text-[10px] font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Hover Glow */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/5 to-blue-500/5 pointer-events-none"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}

          {filteredChannels.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-white/40"
            >
              <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Belum ada percakapan</p>
              <p className="text-xs mt-1 text-white/30">Mulai chat dari daftar teman</p>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* User Panel */}
      {!isMobile && onOpenSettings && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border-t border-white/5 bg-white/5 backdrop-blur-xl"
        >
          <SidebarUserPanel onOpenSettings={onOpenSettings} />
        </motion.div>
      )}
    </div>
  );
}
