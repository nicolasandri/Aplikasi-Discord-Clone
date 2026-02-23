import { useState } from 'react';
import { Hash, Volume2, ChevronDown, Plus, Settings, Mic, Headphones } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Channel, Server } from '@/types';

interface ChannelListProps {
  server: Server | null;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenSettings?: () => void;
}

export function ChannelList({ server, channels, selectedChannelId, onSelectChannel, onOpenSettings }: ChannelListProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { user } = useAuth();

  if (!server) {
    return (
      <div className="w-60 bg-[#2f3136] flex flex-col">
        <div className="h-12 px-4 flex items-center shadow-md">
          <h2 className="text-white font-semibold">Direct Messages</h2>
        </div>
        <div className="flex-1 p-2">
          <div className="text-[#72767d] text-sm p-4 text-center">
            Pilih server untuk melihat channel
          </div>
        </div>
        
        {/* User Panel */}
        <div className="h-[52px] bg-[#292b2f] px-2 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#34373c] cursor-pointer">
            <img
              src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
              alt={user?.username}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
              }}
            />
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium truncate max-w-[100px]">{user?.username}</span>
              <span className="text-[#b9bbbe] text-xs">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
              <Mic className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
              <Headphones className="w-5 h-5" />
            </button>
            <button 
              onClick={onOpenSettings}
              className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const textChannels = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md cursor-pointer hover:bg-[#34373c] transition-colors">
        <h2 className="text-white font-semibold truncate">{server.name}</h2>
        <ChevronDown className="w-5 h-5 text-white" />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Text Channels */}
        <div className="mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-2 py-1 text-[#8e9297] hover:text-[#dcddde] text-xs font-semibold uppercase tracking-wide"
          >
            <div className="flex items-center gap-1">
              <ChevronDown className={`w-3 h-3 transition-transform ${!isExpanded && '-rotate-90'}`} />
              <span>Text Channels</span>
            </div>
            <Plus className="w-4 h-4 hover:text-white" />
          </button>

          {isExpanded && (
            <div className="mt-1 space-y-0.5">
              {textChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded channel-item ${
                    selectedChannelId === channel.id
                      ? 'bg-[rgba(79,84,92,0.6)] text-white'
                      : 'text-[#8e9297] hover:text-[#dcddde]'
                  }`}
                >
                  <Hash className="w-5 h-5" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice Channels */}
        <div>
          <button className="w-full flex items-center justify-between px-2 py-1 text-[#8e9297] hover:text-[#dcddde] text-xs font-semibold uppercase tracking-wide">
            <div className="flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              <span>Voice Channels</span>
            </div>
            <Plus className="w-4 h-4 hover:text-white" />
          </button>

          <div className="mt-1 space-y-0.5">
            {voiceChannels.map((channel) => (
              <button
                key={channel.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[#8e9297] hover:text-[#dcddde] channel-item"
              >
                <Volume2 className="w-5 h-5" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Panel */}
      <div className="h-[52px] bg-[#292b2f] px-2 flex items-center justify-between">
        <div 
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#34373c] cursor-pointer flex-1"
        >
          <img
            src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
            alt={user?.username}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-medium truncate">{user?.username}</span>
            <span className="text-[#b9bbbe] text-xs">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
            <Mic className="w-5 h-5" />
          </button>
          <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
            <Headphones className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
