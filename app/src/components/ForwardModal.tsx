import { useState, useEffect, useMemo } from 'react';
import { X, Search, Hash, Volume2, Send, Check, User, Users } from 'lucide-react';
import type { Message, Channel, Server, DMChannel } from '@/types';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  servers: Server[];
  channels: Channel[];
  dmChannels: DMChannel[];
  currentServerId: string | null;
  onForward: (message: Message, targetChannelId: string, comment?: string) => void;
}

interface ChannelGroup {
  serverId: string;
  serverName: string;
  serverIcon?: string;
  channels: Channel[];
}

type TabType = 'servers' | 'dms';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function ForwardModal({ isOpen, onClose, message, servers, channels: _channels, dmChannels, currentServerId: _currentServerId, onForward }: ForwardModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDMId, setSelectedDMId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('servers');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [channelList, setChannelList] = useState<Channel[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      fetchAllChannels();
    } else {
      // Reset state when closed
      setSearchQuery('');
      setSelectedChannelId(null);
      setSelectedDMId(null);
      setActiveTab('servers');
      setComment('');
    }
  }, [isOpen]);

  const fetchAllChannels = async () => {
    try {
      // Get channels from all servers
      const allChannels: Channel[] = [];
      
      for (const server of servers) {
        const response = await fetch(`${API_URL}/servers/${server.id}/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const serverChannels = await response.json();
          allChannels.push(...serverChannels.map((ch: Channel) => ({
            ...ch,
            serverId: server.id,
            serverName: server.name,
            serverIcon: server.icon
          })));
        }
      }
      
      setChannelList(allChannels);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const groupedChannels = useMemo(() => {
    const groups: { [key: string]: ChannelGroup } = {};
    
    channelList.forEach(channel => {
      const serverId = channel.serverId || 'unknown';
      if (!groups[serverId]) {
        groups[serverId] = {
          serverId,
          serverName: channel.serverName || 'Unknown Server',
          serverIcon: channel.serverIcon,
          channels: []
        };
      }
      groups[serverId].channels.push(channel);
    });
    
    // Filter by search query
    if (searchQuery && activeTab === 'servers') {
      const query = searchQuery.toLowerCase();
      Object.keys(groups).forEach(serverId => {
        groups[serverId].channels = groups[serverId].channels.filter(
          ch => ch.name.toLowerCase().includes(query) || 
                groups[serverId].serverName.toLowerCase().includes(query)
        );
      });
    }
    
    // Remove empty groups
    return Object.values(groups).filter(g => g.channels.length > 0);
  }, [channelList, searchQuery, activeTab]);

  // Filter DM channels by search
  const filteredDMs = useMemo(() => {
    if (!searchQuery || activeTab !== 'dms') return dmChannels;
    const query = searchQuery.toLowerCase();
    return dmChannels.filter(dm => {
      const name = dm.type === 'group' 
        ? dm.name 
        : (dm.friend?.displayName || dm.friend?.username || dm.members[0]?.displayName || dm.members[0]?.username);
      return name?.toLowerCase().includes(query);
    });
  }, [dmChannels, searchQuery, activeTab]);

  const handleSend = async () => {
    if (!message) return;
    
    const targetId = activeTab === 'servers' ? selectedChannelId : selectedDMId;
    if (!targetId) return;
    
    setIsSending(true);
    try {
      await onForward(message, targetId, comment);
      onClose();
    } catch (error) {
      console.error('Failed to forward message:', error);
    }
    setIsSending(false);
  };

  // Get message preview content
  const getMessagePreview = () => {
    if (!message) return '';
    if (message.content) {
      return message.content.length > 100 
        ? message.content.substring(0, 100) + '...' 
        : message.content;
    }
    if (message.attachments && message.attachments.length > 0) {
      return `${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''}`;
    }
    return 'Message';
  };

  const hasSelection = activeTab === 'servers' ? selectedChannelId : selectedDMId;

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#313338] w-full max-w-lg rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1f2023] flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Forward To</h3>
            <p className="text-[#949ba4] text-sm">Select where you want to share this message.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-[#b5bac1] hover:text-white p-1 rounded hover:bg-[#232438]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1f2023]">
          <button
            onClick={() => setActiveTab('servers')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'servers' 
                ? 'text-white border-b-2 border-[#00d4ff]' 
                : 'text-[#949ba4] hover:text-white'
            }`}
          >
            <Hash className="w-4 h-4" />
            Servers
          </button>
          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'dms' 
                ? 'text-white border-b-2 border-[#00d4ff]' 
                : 'text-[#949ba4] hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Direct Messages
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
            <input
              type="text"
              placeholder={activeTab === 'servers' ? "Search channels..." : "Search friends..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1f22] text-white pl-10 pr-4 py-2 rounded border border-[#232438] focus:border-[#00d4ff] outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Content - Servers Tab */}
        {activeTab === 'servers' && (
          <div className="max-h-[300px] overflow-y-auto px-2">
            {groupedChannels.map((group) => (
              <div key={group.serverId} className="mb-2">
                {/* Server Header */}
                <div className="flex items-center gap-2 px-2 py-1">
                  {group.serverIcon ? (
                    <img 
                      src={group.serverIcon} 
                      alt={group.serverName}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#00d4ff] flex items-center justify-center text-[10px] text-white font-bold">
                      {group.serverName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[#949ba4] text-xs font-semibold uppercase tracking-wide">
                    {group.serverName}
                  </span>
                </div>
                
                {/* Channels */}
                {group.channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannelId(channel.id);
                      setSelectedDMId(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded transition-colors ${
                      selectedChannelId === channel.id
                        ? 'bg-[#404249]'
                        : 'hover:bg-[#232438]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {channel.type === 'voice' ? (
                        <Volume2 className="w-5 h-5 text-[#949ba4]" />
                      ) : (
                        <Hash className="w-5 h-5 text-[#949ba4]" />
                      )}
                      <span className={`${
                        selectedChannelId === channel.id ? 'text-white' : 'text-[#b5bac1]'
                      }`}>
                        {channel.name}
                      </span>
                    </div>
                    {selectedChannelId === channel.id && (
                      <Check className="w-4 h-4 text-[#00d4ff]" />
                    )}
                  </button>
                ))}
              </div>
            ))}
            
            {groupedChannels.length === 0 && (
              <div className="text-center py-8 text-[#949ba4]">
                <p>No channels found</p>
              </div>
            )}
          </div>
        )}

        {/* Content - DMs Tab */}
        {activeTab === 'dms' && (
          <div className="max-h-[300px] overflow-y-auto px-2">
            {filteredDMs.map((dm) => {
              const isGroup = dm.type === 'group';
              const name = isGroup 
                ? dm.name 
                : (dm.friend?.displayName || dm.friend?.username || dm.members[0]?.displayName || dm.members[0]?.username);
              const avatar = isGroup 
                ? undefined 
                : (dm.friend?.avatar || dm.members[0]?.avatar);
              
              return (
                <button
                  key={dm.id}
                  onClick={() => {
                    setSelectedDMId(dm.id);
                    setSelectedChannelId(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded transition-colors ${
                    selectedDMId === dm.id
                      ? 'bg-[#404249]'
                      : 'hover:bg-[#232438]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isGroup ? (
                      <div className="w-8 h-8 rounded-full bg-[#00d4ff] flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <img 
                        src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
                        alt={name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="text-left">
                      <span className={`block ${
                        selectedDMId === dm.id ? 'text-white' : 'text-[#b5bac1]'
                      }`}>
                        {name}
                      </span>
                      {isGroup && (
                        <span className="text-[#6a6a7a] text-xs">{dm.members.length} members</span>
                      )}
                    </div>
                  </div>
                  {selectedDMId === dm.id && (
                    <Check className="w-4 h-4 text-[#00d4ff]" />
                  )}
                </button>
              );
            })}
            
            {filteredDMs.length === 0 && (
              <div className="text-center py-8 text-[#949ba4]">
                <p>No direct messages found</p>
              </div>
            )}
          </div>
        )}

        {/* Message Preview & Comment */}
        <div className="px-4 py-3 border-t border-[#1f2023]">
          {/* Original Message Preview */}
          <div className="bg-[#1e1f22] rounded p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <img
                src={message.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.username}`}
                alt={message.user?.username}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-white text-sm font-medium">{message.user?.displayName || message.user?.username}</span>
              <span className="text-[#6a6a7a] text-xs">Original message</span>
            </div>
            <p className="text-[#b5bac1] text-sm line-clamp-2">{getMessagePreview()}</p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 text-[#6a6a7a] text-xs">
                {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Add an optional message..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#383a40] text-white px-3 py-2 pr-10 rounded border border-transparent focus:border-[#00d4ff] outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hasSelection && !isSending) {
                    handleSend();
                  }
                }}
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b5bac1] hover:text-white">
                <span className="text-lg">😊</span>
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!hasSelection || isSending}
              className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00b8db] disabled:bg-[#4e5058] disabled:cursor-not-allowed text-white rounded font-medium flex items-center gap-2 transition-colors"
            >
              {isSending ? 'Sending...' : (
                <>
                  Send
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

