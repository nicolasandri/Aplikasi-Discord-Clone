import { useEffect, useState } from 'react';
import { X, Shield, User as UserIcon, Crown, UserPlus, MessageCircle, UserX, Ban, Check } from 'lucide-react';
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
  roles?: Array<{
    id: string;
    name: string;
    color: string;
    position: number;
  }>;
}

type FriendshipStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted' | 'blocked';

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
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; color: string; position: number }>>([]);
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
      if (serverId) {
        fetchCustomRoles(serverId);
      }
    }
  }, [isOpen, userId, serverId]);

  const fetchCustomRoles = async (sid: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${sid}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomRoles(data.filter((r: any) => !r.is_default));
      }
    } catch (e) {
      console.error('Failed to fetch custom roles:', e);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch user data dulu (pasti berhasil)
      const userRes = await fetch(`${API_URL}/users/${userId}`, { headers });
      if (!userRes.ok) {
        setLoading(false);
        return;
      }
      const userData = await userRes.json();

      // Jika di server context, fetch role secara terpisah
      if (serverId) {
        try {
          const memberRes = await fetch(`${API_URL}/servers/${serverId}/member-role/${userId}`, { headers });
          if (memberRes.ok) {
            const memberData = await memberRes.json();
            
            // Fetch member's custom roles
            try {
              const memberRolesRes = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/roles`, { headers });
              if (memberRolesRes.ok) {
                const memberRoles = await memberRolesRes.json();
                userData.roles = memberRoles;
              }
            } catch (_) {
              // Ignore roles fetch error
            }
            
            // Gabungkan data user + role dari server
            setProfile({
              ...userData,
              role: memberData.role,
              role_name: memberData.role_name,
              role_color: memberData.role_color,
              joinedAt: memberData.joinedAt || memberData.joined_at || userData.created_at,
            });
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Failed to fetch member role:', err);
          // Role fetch gagal, pakai data user saja
        }
      }

      setProfile(userData);
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

  // Get banner color based on highest role
  const getBannerColor = () => {
    if (profile?.roles && profile.roles.length > 0 && customRoles.length > 0) {
      const sortedRoles = [...profile.roles].sort((a, b) => {
        const roleA = customRoles.find(cr => cr.id === a.id);
        const roleB = customRoles.find(cr => cr.id === b.id);
        return (roleB?.position || 0) - (roleA?.position || 0);
      });
      return sortedRoles[0]?.color || profile.role_color || '#00d4ff';
    }
    if (profile?.role_color) return profile.role_color;
    if (profile?.role === 'owner') return '#ffd700';
    if (profile?.role === 'admin') return '#ed4245';
    if (profile?.role === 'moderator') return '#43b581';
    return '#00d4ff';
  };

  if (!isOpen) return null;

  // Handle loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className="bg-[#1e1f22] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl p-8"
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
          className="bg-[#1e1f22] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-center text-[#a0a0b0]">Gagal memuat profil</p>
        </div>
      </div>
    );
  }

  const isSelf = currentUserId === userId;
  const status = profile.status || 'offline';
  const statusCfg = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
  const bannerColor = getBannerColor();
  const displayName = profile.displayName || profile.username;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[#1e1f22] rounded-lg w-[400px] max-w-[90vw] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner - Design seperti MemberProfilePopup */}
        <div 
          className="h-[120px] w-full relative"
          style={{ 
            background: `linear-gradient(135deg, ${bannerColor} 0%, #1e1f22 100%)` 
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-12 relative">
          <div className="relative inline-block">
            <img
              src={profile.avatar 
                ? `${profile.avatar?.startsWith('http') ? profile.avatar : `${BASE_URL}${profile.avatar}`}?v=${avatarVersion}`
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
              alt={displayName}
              className="w-[80px] h-[80px] rounded-full border-4 border-[#1e1f22] bg-[#1e1f22]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`;
              }}
            />
            {/* Status indicator on avatar */}
            <div 
              className={`absolute bottom-1 right-1 w-5 h-5 ${statusCfg.color} rounded-full border-[3px] border-[#1e1f22]`}
            />
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4 pt-3">
          {/* Username - use highest role color */}
          <div className="mb-1">
            <h2 
              className="text-xl font-extrabold tracking-tight"
              style={{ color: bannerColor }}
            >
              {displayName}
            </h2>
            <p className="text-[#b5bac1] text-sm">{profile.username}</p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-3 mb-4">
            <div className={`w-2 h-2 ${statusCfg.color} rounded-full`} />
            <span className="text-[#b5bac1] text-sm">{statusCfg.label}</span>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#2b2d31] my-4" />

          {/* Bio/About Section */}
          {profile.bio && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">
                About
              </h3>
              <p className="text-[#b5bac1] text-sm">{profile.bio}</p>
            </div>
          )}

          {/* Member Since */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">
              Member Since
            </h3>
            <div className="text-[#b5bac1] text-sm">
              {(profile.joinedAt || profile.created_at)
                ? new Date(profile.joinedAt || profile.created_at!).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Unknown'
              }
            </div>
          </div>

          {/* Jobdesk / Roles */}
          {serverId && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">
                JOBDESK
              </h3>
              
              {/* Display all roles sorted by position */}
              {profile.roles && profile.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {[...profile.roles].sort((a, b) => {
                    const roleA = customRoles.find(cr => cr.id === a.id);
                    const roleB = customRoles.find(cr => cr.id === b.id);
                    return (roleB?.position || 0) - (roleA?.position || 0);
                  }).map((role) => (
                    <div 
                      key={role.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                      style={{ 
                        backgroundColor: `${role.color || '#99aab5'}20`,
                        color: role.color || '#99aab5'
                      }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: role.color || '#99aab5' }}
                      />
                      {role.name}
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback to single role display */
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{ 
                    backgroundColor: `${profile.role_color || '#99aab5'}20`,
                    color: profile.role_color || '#99aab5'
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: profile.role_color || '#99aab5' }}
                  />
                  {(profile.role_name && profile.role_name.trim() !== '') ? profile.role_name : 
                   (profile.role === 'owner' ? 'Owner' : 
                    profile.role === 'admin' ? 'Admin' : 
                    profile.role === 'moderator' ? 'Moderator' : 
                    profile.role === 'custom' ? 'Custom Role' : 
                    'Member')}
                </div>
              )}
            </div>
          )}

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
  );
}
