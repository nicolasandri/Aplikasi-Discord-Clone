import { useState, useRef, useEffect } from 'react';
// Keep useEffect import - now used for avatar version tracking
import { useAuth } from '@/contexts/AuthContext';
import { 
  Settings, 
  Edit3, 
  Users, 
  Copy,
  Check,
  GripVertical,
  Shield
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
  // For relative API URL in dev mode, use localhost:3001
  return 'http://localhost:3001';
})();

interface UserProfileButtonProps {
  onOpenSettings: () => void;
}

// Default position (bottom-left corner)
const DEFAULT_POSITION = { x: 16, y: window.innerHeight - 80 };

export function UserProfileButton({ onOpenSettings }: UserProfileButtonProps) {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  // Voice state (for future use)
  // const [isMuted, setIsMuted] = useState(false);
  // const [isDeafened, setIsDeafened] = useState(false);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Draggable state
  const [position, setPosition] = useState(() => {
    // Load saved position from localStorage
    const saved = localStorage.getItem('userProfileButtonPosition');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_POSITION;
      }
    }
    return DEFAULT_POSITION;
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update avatar version when user avatar changes
  useEffect(() => {
    setAvatarVersion(Date.now());
  }, [user?.avatar]);

  // Listen for display name and avatar updates from SettingsModal
  useEffect(() => {
    const handleDisplayNameUpdate = (e: CustomEvent<{ displayName: string }>) => {
      if (user && e.detail.displayName) {
        updateUser({ ...user, displayName: e.detail.displayName });
      }
    };

    const handleAvatarUpdate = (e: CustomEvent<{ avatar: string }>) => {
      if (user && e.detail.avatar) {
        setAvatarVersion(Date.now());
        updateUser({ ...user, avatar: e.detail.avatar });
      }
    };

    // Listen for localStorage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          if (user && updatedUser.id === user.id) {
            updateUser(updatedUser);
            if (updatedUser.avatar !== user.avatar) {
              setAvatarVersion(Date.now());
            }
          }
        } catch (err) {
          console.error('Failed to parse user from storage:', err);
        }
      }
    };

    window.addEventListener('displayname-updated', handleDisplayNameUpdate as EventListener);
    window.addEventListener('avatar-updated', handleAvatarUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('displayname-updated', handleDisplayNameUpdate as EventListener);
      window.removeEventListener('avatar-updated', handleAvatarUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, updateUser]);

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

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the drag handle (grip icon area)
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Constrain to window bounds
        const maxX = window.innerWidth - 240;
        const maxY = window.innerHeight - 60;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handleUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Save position to localStorage
        localStorage.setItem('userProfileButtonPosition', JSON.stringify(position));
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, dragOffset, position]);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragOffset({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.touches[0];
        const newX = touch.clientX - dragOffset.x;
        const newY = touch.clientY - dragOffset.y;
        
        const maxX = window.innerWidth - 240;
        const maxY = window.innerHeight - 60;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        setPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem('userProfileButtonPosition', JSON.stringify(position));
      }
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragOffset, position]);

  if (!user) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="relative">
        {/* Drag Handle */}
        <div className="drag-handle absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-6 bg-[#18191c] rounded-t-lg cursor-grab hover:bg-[#2b2d31] transition-colors group/handle opacity-0 hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-[#72767d] rotate-90 group-hover/handle:text-[#a0a0b0]" />
        </div>
        
        {/* Main Button */}
        <button
          ref={buttonRef}
          onClick={() => !isDragging && setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-2.5 bg-[#18191c] hover:bg-[#232428] rounded-lg shadow-lg border border-[#2b2d31] transition-all group"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={user.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `${BASE_URL}${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              alt={user.displayName || user.username}
              className="w-10 h-10 rounded-full object-cover bg-[#1a1b2e]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
              }}
            />
            {/* Status Indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#3ba55d] rounded-full border-[3px] border-[#18191c]" />
          </div>

          {/* User Info */}
          <div className="flex-1 text-left min-w-0">
            <p className="text-white font-bold text-sm truncate">{user.displayName || user.username}</p>
            <p className="text-[#3ba55d] text-xs font-medium">Online</p>
          </div>

          {/* Settings Icon */}
          <Settings className="w-4 h-4 text-[#a0a0b0] group-hover:text-white transition-colors flex-shrink-0" />
        </button>

      {/* Popup Menu */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-0 mb-2 w-[280px] bg-[#18191c] rounded-lg shadow-2xl overflow-hidden z-[100]"
          style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
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
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-[#00d4ff] text-white text-xs rounded font-medium">VIP</span>
              <span className="text-[#faa61a]">👑</span>
              <span className="text-[#43b581]">✓</span>
            </div>
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[#a0a0b0] hover:bg-[#00d4ff] hover:text-white transition-colors text-left"
            >
              <Users className="w-4 h-4" />
              <span className="text-sm">Switch Accounts</span>
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
    </div>
  );
}

