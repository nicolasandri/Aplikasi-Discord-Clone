import { ForwardIcon, Hash, User } from 'lucide-react';
import type { ForwardedFrom } from '@/types';
import { useState } from 'react';

interface ForwardedMessageDisplayProps {
  forwardedFrom: ForwardedFrom;
}

export function ForwardedMessageDisplay({ forwardedFrom }: ForwardedMessageDisplayProps) {
  const [avatarError, setAvatarError] = useState(false);

  // Format timestamp
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get avatar URL
  const getAvatarUrl = () => {
    if (avatarError) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${forwardedFrom.username}`;
    }
    return forwardedFrom.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${forwardedFrom.username}`;
  };

  return (
    <div className="mt-1 rounded-lg overflow-hidden">
      {/* Forwarded Header */}
      <div className="flex items-center gap-1.5 text-[#b5bac1] text-xs mb-1">
        <ForwardIcon className="w-3 h-3" />
        <span>Diteruskan</span>
      </div>

      {/* Forwarded Content Box - Discord Style */}
      <div className="bg-[#2b2d31] rounded-lg p-3 border-l-4 border-[#00d4ff]">
        {/* Original Author Info */}
        <div className="flex items-center gap-2 mb-2">
          {avatarError ? (
            <div className="w-5 h-5 rounded-full bg-[#36393f] flex items-center justify-center">
              <User className="w-3 h-3 text-[#b5bac1]" />
            </div>
          ) : (
            <img
              src={getAvatarUrl()}
              alt={forwardedFrom.username}
              className="w-5 h-5 rounded-full"
              onError={() => setAvatarError(true)}
            />
          )}
          <span className="text-[#00d4ff] text-sm font-medium hover:underline cursor-pointer">
            {forwardedFrom.displayName || forwardedFrom.username}
          </span>
        </div>

        {/* Original Content */}
        {forwardedFrom.content && (
          <div className="text-[#dbdee1] text-sm whitespace-pre-wrap">
            {forwardedFrom.content}
          </div>
        )}

        {/* Source Info */}
        <div className="flex items-center gap-1.5 text-[#6a6a7a] text-xs mt-2 pt-2 border-t border-[#1e1f22]">
          <Hash className="w-3 h-3" />
          <span>{forwardedFrom.channelName}</span>
          {forwardedFrom.serverName && (
            <>
              <span className="mx-1">•</span>
              <span>{forwardedFrom.serverName}</span>
            </>
          )}
          <span className="mx-1">•</span>
          <span>{formatDate(forwardedFrom.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
