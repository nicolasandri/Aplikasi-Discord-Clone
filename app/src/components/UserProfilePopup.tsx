import { useEffect, useState } from 'react';
import { X, Shield, User as UserIcon, Crown, Star } from 'lucide-react';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface UserProfilePopupProps {
  userId: string;
  serverId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  role: 'owner' | 'admin' | 'member';
  created_at?: string;
}

const roleConfig = {
  owner: {
    label: 'Owner',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    borderColor: 'border-yellow-400/50',
    icon: Crown,
  },
  admin: {
    label: 'Admin',
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    borderColor: 'border-red-400/50',
    icon: Shield,
  },
  member: {
    label: 'Member',
    color: 'text-[#b9bbbe]',
    bgColor: 'bg-[#5865f2]/20',
    borderColor: 'border-[#5865f2]/50',
    icon: UserIcon,
  },
};

export function UserProfilePopup({ userId, serverId, isOpen, onClose }: UserProfilePopupProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId && serverId) {
      fetchUserProfile();
    }
  }, [isOpen, userId, serverId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const role = profile?.role || 'member';
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#36393f] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="h-24 bg-gradient-to-r from-[#5865f2] to-[#4752c4] relative">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4">
            <img
              src={profile?.avatar 
                ? (profile.avatar.startsWith('http') ? profile.avatar : `http://localhost:3001${profile.avatar}`)
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
              alt={profile?.username}
              className="w-24 h-24 rounded-full border-4 border-[#36393f] bg-[#36393f] object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`;
              }}
            />
            <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.borderColor} border flex items-center gap-1`}>
              <RoleIcon className={`w-3 h-3 ${config.color}`} />
              <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profile ? (
            <div className="space-y-4">
              {/* Username */}
              <div>
                <h2 className="text-xl font-bold text-white">{profile.username}</h2>
                <p className="text-sm text-[#b9bbbe]">{profile.email}</p>
              </div>

              {/* Role Badge */}
              <div className="flex items-center gap-3 p-3 bg-[#2f3136] rounded-lg">
                <div className={`p-2 rounded-full ${config.bgColor}`}>
                  <RoleIcon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-sm text-[#72767d]">Role</p>
                  <p className={`font-semibold ${config.color}`}>{config.label}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-3 bg-[#2f3136] rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  profile.status === 'online' ? 'bg-[#3ba55d]' :
                  profile.status === 'idle' ? 'bg-[#faa81a]' :
                  profile.status === 'dnd' ? 'bg-[#ed4245]' :
                  'bg-[#747f8d]'
                }`} />
                <div>
                  <p className="text-sm text-[#72767d]">Status</p>
                  <p className="text-white capitalize">{profile.status}</p>
                </div>
              </div>

              {/* Join Date */}
              {profile.created_at && (
                <div className="flex items-center gap-3 p-3 bg-[#2f3136] rounded-lg">
                  <Star className="w-5 h-5 text-[#b9bbbe]" />
                  <div>
                    <p className="text-sm text-[#72767d]">Bergabung</p>
                    <p className="text-white">
                      {new Date(profile.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-[#b9bbbe] py-4">Gagal memuat profil</p>
          )}
        </div>
      </div>
    </div>
  );
}
