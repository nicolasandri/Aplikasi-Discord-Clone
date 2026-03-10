import { useEffect, useState } from 'react';
import { X, Shield, User as UserIcon, Crown, Star, UserPlus, MessageCircle, UserX, Ban, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast.tsx';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron
  ? 'http://localhost:3001/api'
  : (import.meta.env.VITE_API_URL || '/api');
const BASE_URL = isElectron ? 'http://localhost:3001' : '';

interface UserProfilePopupProps {
  userId: string;
  serverId?: string; // Optional - if not provided (DM), role won't be shown
  isOpen: boolean;
  onClose: () => void;
  onStartDM?: (user: { id: string; username: string; avatar?: string; status?: string; email?: string }) => void;
}

interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'custom';
  role_id?: string | null;
  role_name?: string;
  role_color?: string;
  created_at?: string;
  joinedAt?: string;
  bio?: string;
}

type FriendshipStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted' | 'blocked';

const roleConfig = {
  owner: {
    label: 'Owner',
    color: 'text-[#f0b232]',
    bgColor: 'bg-[#f0b232]/10',
    borderColor: 'border-[#f0b232]/30',
    icon: Crown,
  },
  admin: {
    label: 'Admin',
    color: 'text-[#ed4245]',
    bgColor: 'bg-[#ed4245]/10',
    borderColor: 'border-[#ed4245]/30',
    icon: Shield,
  },
  moderator: {
    label: 'Moderator',
    color: 'text-[#43b581]',
    bgColor: 'bg-[#43b581]/10',
    borderColor: 'border-[#43b581]/30',
    icon: Shield,
  },
  member: {
    label: 'Member',
    color: 'text-[#a0a0b0]',
    bgColor: 'bg-[#00d4ff]/10',
    borderColor: 'border-[#00d4ff]/30',
    icon: UserIcon,
  },
};

const statusConfig = {
  online: { color: 'bg-[#3ba55d]', label: 'Online' },
  idle: { color: 'bg-[#faa81a]', label: 'Idle' },
  dnd: { color: 'bg-[#ed4245]', label: 'Do Not Disturb' },
  offline: { color: 'bg-[#747f8d]', label: 'Offline' },
};

export function UserProfilePopup({ userId, serverId, isOpen, onClose, onStartDM }: UserProfilePopupProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const { toast } = useToast();

  // Update avatar version when profile changes
  useEffect(() => {
    if (profile?.avatar) {
      setAvatarVersion(Date.now());
    }
  }, [profile?.avatar]);

  const currentUserId = localStorage.getItem('token') 
    ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).id 
    : null;

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
      fetchFriendshipStatus();
    }
  }, [isOpen, userId, serverId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // If serverId provided, fetch from server endpoint (includes role)
      // Otherwise fetch from users endpoint (DM view, no role)
      const endpoint = serverId
        ? `${API_URL}/servers/${serverId}/users/${userId}`
        : `${API_URL}/users/${userId}`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (serverId && response.status >= 500) {
        // Fallback ke endpoint users jika server endpoint error
        const fallback = await fetch(`${API_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fallback.ok) {
          const data = await fallback.json();
          setProfile(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendshipStatus = async () => {
    if (!currentUserId || currentUserId === userId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/friends/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFriendshipStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch friendship status:', error);
    }
  };

  const handleAddFriend = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId: userId }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Permintaan pertemanan dikirim ke ${profile?.username}`,
        });
        setFriendshipStatus('pending_outgoing');
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptRequest = async () => {
    // Find the pending request ID first
    try {
      const token = localStorage.getItem('token');
      const pendingResponse = await fetch(`${API_URL}/friends/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (pendingResponse.ok) {
        const pending = await pendingResponse.json();
        const incomingRequest = pending.incoming?.find((r: any) => r.requester_id === userId);
        
        if (incomingRequest) {
          const response = await fetch(`${API_URL}/friends/${incomingRequest.id}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            toast({
              title: 'Berhasil',
              description: 'Permintaan pertemanan diterima',
            });
            setFriendshipStatus('accepted');
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFriend = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${profile?.username} dari daftar teman?`)) return;
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/friends/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${profile?.username} dihapus dari daftar teman`,
        });
        setFriendshipStatus('none');
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBlockUser = async () => {
    if (!confirm(`Apakah Anda yakin ingin memblokir ${profile?.username}?`)) return;
    
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/friends/${userId}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${profile?.username} telah diblokir`,
        });
        setFriendshipStatus('blocked');
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnblockUser = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/friends/${userId}/unblock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${profile?.username} telah di-unblock`,
        });
        setFriendshipStatus('none');
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartDM = () => {
    if (profile) {
      onStartDM?.({
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar,
        status: profile.status,
        email: profile.email,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  // Handle loading and null profile
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className="bg-[#232428] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center">
            <div className="w-10 h-10 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // If profile is null after loading, show error
  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className="bg-[#232428] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-center text-[#a0a0b0]">Gagal memuat profil</p>
        </div>
      </div>
    );
  }

  const role = profile.role || 'member';
  const roleName = profile.role_name || roleConfig[role as keyof typeof roleConfig]?.label || 'Member';
  const roleColor = profile.role_color || (roleConfig[role as keyof typeof roleConfig]?.color.replace('text-', '') || '#b9bbbe');
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
  const RoleIcon = config.icon;
  const isSelf = currentUserId === userId;
  const status = profile.status || 'offline';
  const statusCfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#232428] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient banner */}
        <div className="h-28 bg-gradient-to-br from-[#00d4ff] via-[#00b8db] to-[#3b45a0] relative">
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 relative">
          {/* Avatar with status */}
          <div className="relative -mt-14 mb-3">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full border-[6px] border-[#232428] bg-[#232428] overflow-hidden">
                <img
                  src={profile.avatar 
                    ? `${profile.avatar.startsWith('http') ? profile.avatar : `${BASE_URL}${profile.avatar}`}?v=${avatarVersion}`
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                  alt={profile.displayName || profile.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`;
                  }}
                />
              </div>
              {/* Status indicator */}
              <div className={`absolute bottom-1 right-1 w-6 h-6 ${statusCfg.color} rounded-full border-[4px] border-[#232428]`} />
            </div>
          </div>

          <div className="space-y-4">
            {/* User Info Header */}
            <div className="pb-3 border-b border-[#1e1f22]">
              {/* Display Name */}
              <h2 className="text-xl font-bold text-white leading-tight">
                {profile.displayName || profile.username}
              </h2>
              
              {/* Username */}
              <p className="text-[#a0a0b0] text-sm mt-1">
                {profile.username}
              </p>
              
              {/* Role Badge - Only show if in server context */}
              {serverId && profile.role && (
                <div className="mt-2 inline-flex">
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                    style={{ 
                      backgroundColor: `${roleColor}20`,
                      borderColor: `${roleColor}40`
                    }}
                  >
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: roleColor }}
                    />
                    <span 
                      className="text-xs font-semibold"
                      style={{ color: roleColor }}
                    >
                      {roleName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bio/About Section */}
            {profile.bio && (
              <div className="bg-[#111214] rounded-lg p-3">
                <p className="text-[#dbdee1] text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Member Since */}
            <div className="bg-[#111214] rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-[#00d4ff]/20 rounded-lg">
                  <Star className="w-4 h-4 text-[#00d4ff]" />
                </div>
                <div>
                  <p className="text-xs text-[#b5bac1] font-semibold uppercase tracking-wide">
                    {serverId ? 'Member Since' : 'WorkGrid Member Since'}
                  </p>
                  <p className="text-[#dbdee1] text-sm">
                    {serverId 
                      ? (profile.joinedAt 
                          ? new Date(profile.joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Unknown')
                      : (profile.created_at 
                          ? new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Unknown')
                    }
                  </p>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
            {!isSelf && (
              <div className="flex gap-2 pt-2">
                {/* Message Button */}
                {(friendshipStatus === 'accepted' || friendshipStatus === 'none') && (
                  <Button
                    onClick={handleStartDM}
                    className="flex-1 h-10 bg-[#00d4ff] hover:bg-[#00b8db] text-white font-medium rounded-md"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                )}

                {/* Add Friend Button */}
                {friendshipStatus === 'none' && (
                  <Button
                    onClick={handleAddFriend}
                    disabled={isProcessing}
                    className="flex-1 h-10 bg-[#248046] hover:bg-[#1a6334] text-white font-medium rounded-md"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Friend
                  </Button>
                )}

                {/* Accept/Reject Buttons */}
                {friendshipStatus === 'pending_incoming' && (
                  <>
                    <Button
                      onClick={handleAcceptRequest}
                      disabled={isProcessing}
                      className="flex-1 h-10 bg-[#248046] hover:bg-[#1a6334] text-white font-medium rounded-md"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      onClick={handleRemoveFriend}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1 h-10 border-[#ed4245] text-[#ed4245] hover:bg-[#ed4245]/10 font-medium rounded-md"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Ignore
                    </Button>
                  </>
                )}

                {/* Cancel Request Button */}
                {friendshipStatus === 'pending_outgoing' && (
                  <Button
                    onClick={handleRemoveFriend}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex-1 h-10 border-[#72767d] text-[#a0a0b0] hover:bg-[#72767d]/10 font-medium rounded-md"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Cancel Request
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

