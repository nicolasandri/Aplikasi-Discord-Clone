import { Menu, X, Users, ArrowLeft } from 'lucide-react';
import type { Channel, Server, DMChannel } from '@/types';

interface MobileHeaderProps {
  server?: Server | null;
  dmChannel?: DMChannel | null;
  onOpenServers: () => void;
  onOpenChannels: () => void;
  onOpenMembers: () => void;
  onBack?: () => void;
  showBack?: boolean;
  isChannelsOpen?: boolean;
}

export function MobileHeader({
  server,
  dmChannel,
  onOpenServers: _onOpenServers,
  onOpenChannels,
  onOpenMembers,
  onBack,
  showBack = false,
  isChannelsOpen = false,
}: MobileHeaderProps) {
  const isDM = !!dmChannel;
  const isGroupDM = dmChannel?.type === 'group';
  
  return (
    <div className="h-12 px-3 flex items-center justify-between bg-[#1a1b2e] border-b border-[#0f0f1a]">
      {/* Left side */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBack ? (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-[#a0a0b0] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={onOpenChannels}
            className="p-2 -ml-2 text-[#a0a0b0] hover:text-white"
          >
            {isChannelsOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        
        <div className="flex items-center gap-2 min-w-0">
          {isDM ? (
            isGroupDM ? (
              // Group DM Header
              <>
                <div className="w-7 h-7 rounded-full bg-[#00d4ff] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold truncate">
                  {dmChannel?.name || `Grup (${dmChannel?.members?.length || 0})`}
                </span>
              </>
            ) : (
              // Direct DM Header
              <>
                <img 
                  src={dmChannel?.friend?.avatar 
                    ? (dmChannel.friend.avatar.startsWith('http') ? dmChannel.friend.avatar : `http://localhost:3001${dmChannel.friend.avatar}`)
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${dmChannel?.friend?.username || 'user'}`}
                  alt={dmChannel?.friend?.username || 'User'}
                  className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${dmChannel?.friend?.username || 'user'}`;
                  }}
                />
                <span className="text-white font-semibold truncate">
                  {dmChannel?.friend?.displayName || dmChannel?.friend?.username || 'Unknown'}
                </span>
              </>
            )
          ) : (
            <>
              <span className="text-[#8e9297] text-lg">#</span>
              <span className="text-white font-semibold truncate">
                {server?.name || 'Chat'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {!isDM && (
          <button 
            onClick={onOpenMembers}
            className="p-2 text-[#a0a0b0] hover:text-white"
          >
            <Users className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

