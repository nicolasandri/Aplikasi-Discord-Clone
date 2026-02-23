import { useEffect, useState } from 'react';
import { X, Shield, User as UserIcon, Crown, Star, UserPlus, MessageCircle, UserX, Ban, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast.tsx';

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
  onStartDM?: (userId: string) => void;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'idle' | 'dnd';
  role: 'owner' | 'admin' | 'moderator' | 'member';
  created_at?: string;
}

type FriendshipStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'accepted' | 'blocked';

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
  moderator: {
    label: 'Moderator',
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    borderColor: 'border-green-400/50',
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

export function UserProfilePopup({ userId, serverId, isOpen, onClose, onStartDM }: UserProfilePopupProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const currentUserId = localStorage.getItem('token') 
    ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).id 
    : null;

  useEffect(() => {
    if (isOpen && userId && serverId) {
      fetchUserProfile();
      fetchFriendshipStatus();
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
    onStartDM?.(userId);
    onClose();
  };

  if (!isOpen) return null;

  const role = profile?.role || 'member';
  const config = roleConfig[role];
  const RoleIcon = config.icon;
  const isSelf = currentUserId === userId;

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

              {/* Friend Actions */}
              {!isSelf && (
                <div className="flex flex-wrap gap-2">
                  {friendshipStatus === 'none' && (
                    <Button
                      onClick={handleAddFriend}
                      disabled={isProcessing}
                      className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Tambah Teman
                    </Button>
                  )}

                  {friendshipStatus === 'pending_incoming' && (
                    <>
                      <Button
                        onClick={handleAcceptRequest}
                        disabled={isProcessing}
                        className="flex-1 bg-[#3ba55d] hover:bg-[#2d7d46] text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Terima
                      </Button>
                      <Button
                        onClick={handleRemoveFriend}
                        disabled={isProcessing}
                        variant="destructive"
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Tolak
                      </Button>
                    </>
                  )}

                  {friendshipStatus === 'pending_outgoing' && (
                    <Button
                      onClick={handleRemoveFriend}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1 border-[#72767d] text-[#b9bbbe]"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Batalkan Permintaan
                    </Button>
                  )}

                  {friendshipStatus === 'accepted' && (
                    <>
                      <Button
                        onClick={handleStartDM}
                        className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Kirim Pesan
                      </Button>
                      <Button
                        onClick={handleRemoveFriend}
                        disabled={isProcessing}
                        variant="outline"
                        className="border-[#ed4245] text-[#ed4245] hover:bg-[#ed4245]/10"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Hapus Teman
                      </Button>
                    </>
                  )}

                  {friendshipStatus === 'blocked' ? (
                    <Button
                      onClick={handleUnblockUser}
                      disabled={isProcessing}
                      variant="outline"
                      className="flex-1 border-[#72767d] text-[#b9bbbe]"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Unblock
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBlockUser}
                      disabled={isProcessing}
                      variant="outline"
                      className="border-[#ed4245] text-[#ed4245] hover:bg-[#ed4245]/10"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Blokir
                    </Button>
                  )}
                </div>
              )}

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
