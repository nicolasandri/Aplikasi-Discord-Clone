import { useState, useRef, useEffect } from 'react';
// Keep useEffect import - now used for avatar version tracking
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings, 
  Edit3, 
  Users, 
  Copy,
  Check
} from 'lucide-react';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface UserProfileButtonProps {
  onOpenSettings: () => void;
}

export function UserProfileButton({ onOpenSettings }: UserProfileButtonProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  // Voice state (for future use)
  // const [isMuted, setIsMuted] = useState(false);
  // const [isDeafened, setIsDeafened] = useState(false);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update avatar version when user avatar changes
  useEffect(() => {
    setAvatarVersion(Date.now());
  }, [user?.avatar]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    onOpenSettings();
  };

  if (!user) return null;

  return (
    <div className="relative w-full">
      {/* Main Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-[#36393f] rounded-md transition-colors group"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={user.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt={user.displayName || user.username}
            className="w-10 h-10 rounded-full object-cover bg-[#36393f]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
            }}
          />
          {/* Status Indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#3ba55d] rounded-full border-[3px] border-[#202225]" />
        </div>

        {/* User Info */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-white font-semibold text-sm truncate">{user.displayName || user.username}</p>
          <p className="text-[#b9bbbe] text-xs truncate">Online</p>
        </div>

        {/* Settings Icon */}
        <Settings className="w-4 h-4 text-[#b9bbbe] group-hover:text-white transition-colors flex-shrink-0" />
      </button>

      {/* Popup Menu */}
      {isOpen && (
        <div
          ref={popupRef}
          className="fixed bottom-2 left-[76px] w-[280px] bg-[#18191c] rounded-lg shadow-2xl overflow-hidden z-[100]"
          style={{ maxHeight: 'calc(100vh - 20px)', overflowY: 'auto' }}
        >
          {/* Banner */}
          <div className="h-16 bg-[#5865f2] relative">
            <div className="absolute -bottom-6 left-4">
              <div className="relative">
                <img
                  src={user.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `${API_URL.replace('/api', '')}${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt={user.displayName || user.username}
                  className="w-16 h-16 rounded-full object-cover border-4 border-[#18191c] bg-[#36393f]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
                  }}
                />
                {/* Status Badge */}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#3ba55d] rounded-full border-[3px] border-[#18191c]" />
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="pt-8 px-4 pb-3">
            <h3 className="text-white font-bold text-lg">{user.displayName || user.username}</h3>
            <p className="text-[#b9bbbe] text-sm">{user.email}</p>
            
            {/* Badges */}
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-[#5865f2] text-white text-xs rounded font-medium">VIP</span>
              <span className="text-[#faa61a]">👑</span>
              <span className="text-[#43b581]">✓</span>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-[#36393f]" />

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleEditProfile}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white transition-colors text-left"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm">Edit Profile</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white transition-colors text-left"
            >
              <div className="w-4 h-4 rounded-full bg-[#3ba55d]" />
              <span className="text-sm">Online</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white transition-colors text-left"
            >
              <Users className="w-4 h-4" />
              <span className="text-sm">Switch Accounts</span>
            </button>

            <button
              onClick={handleCopyUserId}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white transition-colors text-left"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#3ba55d]" />
                  <span className="text-sm">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Copy User ID</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-[#36393f]" />

          {/* Log Out */}
          <div className="p-2">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[#ed4245] hover:bg-[#ed4245]/10 transition-colors rounded-md"
            >
              <span className="text-sm font-medium">Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
