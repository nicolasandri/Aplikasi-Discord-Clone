import { Menu, X, Users, ArrowLeft } from 'lucide-react';
import type { Channel, Server, DMChannel } from '@/types';

interface MobileHeaderProps {
  server?: Server | null;
  channel?: Channel | null;
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
  channel,
  dmChannel,
  onOpenServers,
  onOpenChannels,
  onOpenMembers,
  onBack,
  showBack = false,
  isChannelsOpen = false,
}: MobileHeaderProps) {
  const isDM = !!dmChannel;
  
  return (
    <div className="h-12 px-3 flex items-center justify-between bg-[#36393f] border-b border-[#202225]">
      {/* Left side */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBack ? (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-[#b9bbbe] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={onOpenChannels}
            className="p-2 -ml-2 text-[#b9bbbe] hover:text-white"
          >
            {isChannelsOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
        
        <div className="flex items-center gap-2 min-w-0">
          {isDM ? (
            <>
              <img 
                src={dmChannel?.friend.avatar} 
                alt={dmChannel?.friend.username}
                className="w-7 h-7 rounded-full flex-shrink-0"
              />
              <span className="text-white font-semibold truncate">
                {dmChannel?.friend.username}
              </span>
            </>
          ) : (
            <>
              <span className="text-[#8e9297] text-lg">#</span>
              <span className="text-white font-semibold truncate">
                {channel?.name || server?.name || 'Chat'}
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
            className="p-2 text-[#b9bbbe] hover:text-white"
          >
            <Users className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
