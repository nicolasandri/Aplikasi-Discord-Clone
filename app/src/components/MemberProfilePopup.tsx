import { useState, useEffect } from 'react';
import { X, MessageCircle } from 'lucide-react';
import type { ServerMember } from '@/types';

interface MemberProfilePopupProps {
  member: ServerMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: () => void;
  serverId?: string | null;
}

const statusColors = {
  online: 'bg-[#3ba55d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
  offline: 'bg-[#747f8d]',
};

const statusText = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

export function MemberProfilePopup({ member, isOpen, onClose, onSendMessage, serverId: _serverId }: MemberProfilePopupProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      console.log('MemberProfilePopup - member data:', member);
      console.log('MemberProfilePopup - role_name:', member?.role_name);
      console.log('MemberProfilePopup - role:', member?.role);
      console.log('MemberProfilePopup - role_id:', member?.role_id);
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, member]);

  if (!mounted || !member) return null;

  const displayName = member.displayName || member.username;
  const username = member.username;
  
  // Get avatar URL
  const getAvatarUrl = () => {
    if (!member.avatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'user'}`;
    }
    if (member.avatar.startsWith('http')) {
      return member.avatar;
    }
    return `http://localhost:3001${member.avatar}`;
  };

  // Get banner color based on role
  const getBannerColor = () => {
    if (member.role_color) return member.role_color;
    if (member.role === 'owner') return '#ffd700';
    if (member.role === 'admin') return '#ed4245';
    if (member.role === 'moderator') return '#43b581';
    return '#5865f2';
  };

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop - only closes on click */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Popup Card - positioned on the right side near member list */}
      <div 
        className={`absolute right-[260px] top-[80px] w-[340px] bg-[#1e1f22] rounded-lg overflow-hidden shadow-2xl transition-all duration-200 member-profile-popup ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ 
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto'
        }}
      >
        {/* Banner */}
        <div 
          className="h-[120px] w-full"
          style={{ 
            background: `linear-gradient(135deg, ${getBannerColor()} 0%, #1e1f22 100%)` 
          }}
        />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="px-4 -mt-12 relative">
          <div className="relative inline-block">
            <img
              src={getAvatarUrl()}
              alt={displayName}
              className="w-[80px] h-[80px] rounded-full border-4 border-[#1e1f22] bg-[#1e1f22]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'user'}`;
              }}
            />
            {/* Status indicator on avatar */}
            <div 
              className={`absolute bottom-1 right-1 w-5 h-5 ${statusColors[member.status || 'offline']} rounded-full border-[3px] border-[#1e1f22]`}
            />
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4 pt-3">
          {/* Username */}
          <div className="mb-1">
            <h2 
              className="text-xl font-extrabold text-white tracking-tight"
              style={{ color: member.role_color || '#fff' }}
            >
              {displayName}
            </h2>
            <p className="text-[#b5bac1] text-sm">{username}</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-3 mb-4">
            <div className={`w-2 h-2 ${statusColors[member.status || 'offline']} rounded-full`} />
            <span className="text-[#b5bac1] text-sm">
              {statusText[member.status || 'offline']}
            </span>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#2b2d31] my-4" />

          {/* Member Since */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">
              Member Since
            </h3>
            <div className="text-[#b5bac1] text-sm">
              {member.joinedAt 
                ? new Date(member.joinedAt).toLocaleDateString('id-ID', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
                : 'Unknown'
              }
            </div>
          </div>

          {/* Role */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">
              Role
            </h3>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              style={{ 
                backgroundColor: `${member.role_color || '#99aab5'}20`,
                color: member.role_color || '#99aab5'
              }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: member.role_color || '#99aab5' }}
              />
              {(member.role_name && member.role_name.trim() !== '') ? member.role_name : 
               (member.role === 'owner' ? 'Owner' : 
                member.role === 'admin' ? 'Admin' : 
                member.role === 'moderator' ? 'Moderator' : 
                member.role === 'custom' ? 'Custom Role' : 
                'Member')}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4">
            <button
              onClick={onSendMessage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm font-medium rounded-md transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemberProfilePopup;
