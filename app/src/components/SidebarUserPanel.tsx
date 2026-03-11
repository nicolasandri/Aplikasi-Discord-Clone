import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings, 
  Edit3, 
  Users, 
  Copy,
  Check,
  Shield,
  LogOut,
  Mic,
  Headphones
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Get base URL for backend (without /api)
const BASE_URL = (() => {
  if (API_URL.startsWith('http')) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  return '';
})();

interface SidebarUserPanelProps {
  onOpenSettings: () => void;
}

export function SidebarUserPanel({ onOpenSettings }: SidebarUserPanelProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

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
    if (user?.username) {
      navigator.clipboard.writeText(user.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    onOpenSettings();
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Main Panel - Discord Style */}
      <div
        ref={buttonRef}
        className="flex items-center gap-2 px-2 py-2 bg-[#232438] hover:bg-[#2a2b3d] rounded-lg cursor-pointer transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={user.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `${BASE_URL}${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
            alt={user.displayName || user.username}
            className="w-8 h-8 rounded-full object-cover bg-[#1a1b2e]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
            }}
          />
          {/* Status Indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#3ba55d] rounded-full border-2 border-[#232438]" />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{user.displayName || user.username}</p>
          <p className="text-[#3ba55d] text-xs">Online</p>
        </div>

        {/* Settings Icon */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          className="p-1.5 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Popup Menu - Discord Style */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-[#18191c] rounded-lg shadow-2xl overflow-hidden z-[100]"
        >
          {/* Banner */}
          <div className="h-16 bg-[#00d4ff] relative">
            <div className="absolute -bottom-6 left-4">
              <div className="relative">
                <img
                  src={user.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `${BASE_URL}${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt={user.displayName || user.username}
                  className="w-16 h-16 rounded-full object-cover border-4 border-[#18191c] bg-[#1a1b2e]"
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
            <p className="text-[#a0a0b0] text-sm">{user.email}</p>
            
            {/* Badges */}
            {user.badges && user.badges.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {user.badges.includes('vip') && <span className="px-2 py-0.5 bg-[#00d4ff] text-white text-xs rounded font-medium">VIP</span>}
                {user.badges.includes('crown') && <span className="text-[#faa61a]">👑</span>}
                {user.badges.includes('verified') && <span className="text-[#43b581]">✓</span>}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-[#1a1b2e]" />

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleEditProfile}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#a0a0b0] hover:bg-[#00d4ff] hover:text-white transition-colors text-left"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm">Edit Profile</span>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#a0a0b0] hover:bg-[#00d4ff] hover:text-white transition-colors text-left"
            >
              <div className="w-4 h-4 rounded-full bg-[#3ba55d]" />
              <span className="text-sm">Online</span>
            </button>

            <button
              onClick={handleCopyUserId}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#a0a0b0] hover:bg-[#00d4ff] hover:text-white transition-colors text-left"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#3ba55d]" />
                  <span className="text-sm">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Copy Username</span>
                </>
              )}
            </button>

            {user?.isMasterAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-colors text-left"
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Master Admin Dashboard</span>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-[#1a1b2e]" />

          {/* Logout */}
          <div className="py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#ed4245] hover:bg-[#ed4245] hover:text-white transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
