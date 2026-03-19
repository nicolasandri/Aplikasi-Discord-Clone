import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UserPlus, 
  Users, 
  UserCheck, 
  UserX, 
  MessageCircle, 
  Check,
  X,
  Search,
  ShieldAlert,
  Loader2,
  User as UserIcon
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast.tsx';
import type { User } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = import.meta.env.VITE_API_URL;

interface Friend extends User {
  friendship_date?: string;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  requester_id?: string;
  requester_username?: string;
  requester_display_name?: string;
  requester_avatar?: string;
  requester_status?: string;
  recipient_id?: string;
  recipient_username?: string;
  recipient_display_name?: string;
  recipient_avatar?: string;
  recipient_status?: string;
}

interface BlockedUser {
  id: string;
  username: string;
  display_name?: string;
  avatar: string;
  blocked_date: string;
}

interface FriendsPageProps {
  onClose?: () => void;
  onStartDM?: (friend: Friend) => void;
}

const statusColors = {
  online: 'bg-[#3ba55d]',
  offline: 'bg-[#747f8d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
};

const statusLabels = {
  online: 'Online',
  offline: 'Offline',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
};

export function FriendsPage({ onClose: _onClose, onStartDM }: FriendsPageProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ incoming: FriendRequest[], outgoing: FriendRequest[] }>({ incoming: [], outgoing: [] });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('online');
  const [isLoading, setIsLoading] = useState(true);
  const [addFriendUsername, setAddFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const { toast } = useToast();

  const tokenRef = useRef(localStorage.getItem('token'));
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const FETCH_COOLDOWN_MS = 1000; // Minimum 1 second between fetches

  const fetchFriends = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || isFetchingRef.current) return;
    
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_COOLDOWN_MS) return;
    
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      const response = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[FriendsPage] Friends data:', data);
        const mappedData = data.map((friend: any) => ({
          ...friend,
          displayName: friend.displayName || friend.display_name || friend.username,
        }));
        setFriends(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || isFetchingRef.current) return;
    
    const now = Date.now();
    if (now - lastFetchTimeRef.current < FETCH_COOLDOWN_MS) return;
    
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;
    
    try {
      const response = await fetch(`${API_URL}/friends/pending`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[FriendsPage] Pending data:', data);
        const mappedData = {
          incoming: (data.incoming || []).map((req: any) => ({
            ...req,
            requester_display_name: req.requester_display_name || req.requester_displayName || req.requester_username,
          })),
          outgoing: (data.outgoing || []).map((req: any) => ({
            ...req,
            recipient_display_name: req.recipient_display_name || req.recipient_displayName || req.recipient_username,
          })),
        };
        setPendingRequests(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const fetchBlockedUsers = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/friends/blocked`, {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[FriendsPage] Blocked data:', data);
        const mappedData = data.map((user: any) => ({
          ...user,
          display_name: user.display_name || user.displayName || user.username,
        }));
        setBlockedUsers(mappedData);
      }
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    }
  }, []);

  // Initial data load - only once
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchFriends(), fetchPendingRequests(), fetchBlockedUsers()]);
      setIsLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when window becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[FriendsPage] Window visible, refreshing friends...');
        fetchFriends();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchFriends]);

  // Polling for sync between desktop and web (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        Promise.all([fetchFriends(), fetchPendingRequests()]);
      }
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Listen for socket events - with retry mechanism for Electron
  useEffect(() => {
    let socket = (window as any).socket;
    let retryInterval: ReturnType<typeof setInterval> | null = null;
    let isSubscribed = false;

    const setupListeners = (s: any) => {
      if (!s || isSubscribed) return;
      isSubscribed = true;

      const handleFriendRequestReceived = (data: { requestId: string; userId: string; username: string; displayName?: string; avatar: string }) => {
        const name = data.displayName || data.username;
        toast({
          title: 'Permintaan Pertemanan Baru',
          description: `${name} ingin berteman dengan Anda`,
        });
        fetchPendingRequests();
      };

      const handleFriendRequestAccepted = (data: { friendId: string; username: string; displayName?: string }) => {
        const name = data.displayName || data.username;
        toast({
          title: 'Permintaan Diterima',
          description: `${name} menerima permintaan pertemanan Anda`,
        });
        fetchFriends();
        fetchPendingRequests();
      };

      const handleFriendRemoved = (_data: { friendId: string }) => {
        fetchFriends();
      };

      const handleNewFriendAdded = (data: { friend: Friend; message: string }) => {
        console.log('📢 [FriendsPage] new_friend_added event:', data);
        toast({
          title: 'Teman Baru Bergabung! 🎉',
          description: data.message,
        });
        // Force refresh friends list
        setTimeout(() => {
          console.log('[FriendsPage] Auto-refreshing after new friend added');
          fetchFriends();
        }, 500);
      };

      s.on('friend_request_received', handleFriendRequestReceived);
      s.on('friend_request_accepted', handleFriendRequestAccepted);
      s.on('friend_removed', handleFriendRemoved);
      s.on('new_friend_added', handleNewFriendAdded);

      console.log('✅ FriendsPage: Socket listeners attached');

      return () => {
        s.off('friend_request_received', handleFriendRequestReceived);
        s.off('friend_request_accepted', handleFriendRequestAccepted);
        s.off('friend_removed', handleFriendRemoved);
        s.off('new_friend_added', handleNewFriendAdded);
        isSubscribed = false;
      };
    };

    // Try to setup immediately
    let cleanup = setupListeners(socket);

    // If socket not available, retry every 1 second (for Electron)
    if (!socket) {
      console.log('⏳ FriendsPage: Socket not ready, retrying...');
      retryInterval = setInterval(() => {
        socket = (window as any).socket;
        if (socket) {
          console.log('✅ FriendsPage: Socket found, attaching listeners');
          cleanup = setupListeners(socket);
          if (retryInterval) {
            clearInterval(retryInterval);
            retryInterval = null;
          }
        }
      }, 1000);
    }

    return () => {
      if (cleanup) cleanup();
      if (retryInterval) clearInterval(retryInterval);
    };
  }, [fetchFriends, fetchPendingRequests, toast]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendUsername.trim()) return;

    setIsAddingFriend(true);
    try {
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ username: addFriendUsername.trim() }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Permintaan pertemanan dikirim ke ${addFriendUsername}`,
        });
        setAddFriendUsername('');
        fetchPendingRequests();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal mengirim permintaan pertemanan',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mengirim permintaan',
        variant: 'destructive',
      });
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/${requestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Permintaan pertemanan diterima',
        });
        fetchFriends();
        fetchPendingRequests();
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
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/${requestId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Permintaan ditolak',
        });
        fetchPendingRequests();
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
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/${requestId}/cancel`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Permintaan dibatalkan',
        });
        fetchPendingRequests();
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
    }
  };

  const handleRemoveFriend = async (friendId: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${username} dari daftar teman?`)) return;

    try {
      const response = await fetch(`${API_URL}/friends/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${username} dihapus dari daftar teman`,
        });
        fetchFriends();
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
    }
  };

  const handleBlockUser = async (userId: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin memblokir ${username}?`)) return;

    try {
      const response = await fetch(`${API_URL}/friends/${userId}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${username} telah diblokir`,
        });
        fetchFriends();
        fetchBlockedUsers();
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
    }
  };

  const handleUnblockUser = async (userId: string, username: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/${userId}/unblock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${username} telah di-unblock`,
        });
        fetchBlockedUsers();
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
    }
  };

  const onlineFriends = friends.filter(f => f.status === 'online');
  const allFriends = friends;

  const filteredFriends = (friendList: Friend[]) => {
    if (!searchQuery.trim()) return friendList;
    return friendList.filter(f => 
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const FriendItem = ({ friend, showActions = true }: { friend: Friend; showActions?: boolean }) => (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#2f3136] hover:translate-y-[-1px] transition-all duration-200 group cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onStartDM?.(friend);
      }}
    >
      <div className="relative">
        <Avatar className="w-10 h-10 border-2 border-transparent group-hover:border-[#00d4ff] transition-colors">
          <AvatarImage src={friend.avatar} alt={friend.displayName || friend.username} />
          <AvatarFallback className="bg-[#36393f]"><UserIcon className="w-5 h-5 text-[#b9bbbe]" /></AvatarFallback>
        </Avatar>
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[friend.status]} rounded-full border-2 border-[#0d0d14]`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate text-base">{friend.displayName || friend.username}</div>
        <div className="text-xs text-[#b9bbbe]">{statusLabels[friend.status]}</div>
      </div>
      {showActions && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#b9bbbe] hover:text-white hover:bg-[#00d4ff] rounded-full"
            onClick={() => onStartDM?.(friend)}
            title="Kirim Pesan"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#b9bbbe] hover:text-[#ed4245] hover:bg-[#ed4245]/10 rounded-full"
            onClick={() => handleRemoveFriend(friend.id, friend.username)}
            title="Hapus Teman"
          >
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const IncomingRequestItem = ({ request }: { request: FriendRequest }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d14]/50">
      <Avatar className="w-10 h-10">
        <AvatarImage src={request.requester_avatar} alt={request.requester_display_name || request.requester_username} />
        <AvatarFallback className="bg-[#36393f]"><UserIcon className="w-5 h-5 text-[#b9bbbe]" /></AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{request.requester_display_name || request.requester_username}</div>
        <div className="text-xs text-[#b9bbbe]">Mengirim permintaan pertemanan</div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#3ba55d] hover:text-[#3ba55d] hover:bg-[#3ba55d]/10"
          onClick={() => handleAcceptRequest(request.id)}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10"
          onClick={() => handleRejectRequest(request.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const OutgoingRequestItem = ({ request }: { request: FriendRequest }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d14]/50 opacity-70">
      <Avatar className="w-10 h-10">
        <AvatarImage src={request.recipient_avatar} alt={request.recipient_display_name || request.recipient_username} />
        <AvatarFallback className="bg-[#36393f]"><UserIcon className="w-5 h-5 text-[#b9bbbe]" /></AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{request.recipient_display_name || request.recipient_username}</div>
        <div className="text-xs text-[#b9bbbe]">Permintaan tertunda</div>
      </div>
      <Badge variant="secondary" className="bg-[#00d4ff]/20 text-[#00d4ff]">Outgoing</Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-[#b9bbbe] hover:text-[#ed4245] hover:bg-[#ed4245]/10"
        onClick={() => handleCancelRequest(request.id)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const BlockedUserItem = ({ user }: { user: BlockedUser }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d14]/50">
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.avatar} alt={user.display_name || user.username} />
          <AvatarFallback className="bg-[#36393f]"><UserIcon className="w-5 h-5 text-[#b9bbbe]" /></AvatarFallback>
        </Avatar>
        <ShieldAlert className="absolute -bottom-1 -right-1 w-4 h-4 text-[#ed4245]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{user.display_name || user.username}</div>
        <div className="text-xs text-[#b9bbbe]">Diblokir</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-[#b9bbbe] hover:text-white"
        onClick={() => handleUnblockUser(user.id, user.username)}
      >
        Unblock
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0d0d14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0d0d14] flex flex-col min-h-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-[#08080c]">
        <Users className="w-5 h-5 text-[#8e9297]" />
        <h2 className="text-white font-semibold">Teman</h2>
        <div className="h-6 w-px bg-[#1a1a24] mx-2" />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
            <TabsTrigger 
              value="online" 
              className="data-[state=active]:bg-[#1a1a24] text-[#b9bbbe] data-[state=active]:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Online
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-[#1a1a24] text-[#b9bbbe] data-[state=active]:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Semua
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <Tabs value={activeTab} className="w-full">
          {/* Search Bar (for friends tabs) */}
          {activeTab !== 'add' && activeTab !== 'blocked' && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
                <Input
                  placeholder="Cari teman"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#08080c] border-none text-white placeholder:text-[#72767d]"
                />
              </div>
            </div>
          )}

          {/* Online Tab */}
          <TabsContent value="online" className="mt-0">
            <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide mb-3 px-2">
              Online — {filteredFriends(onlineFriends).length}
            </div>
            <div className="space-y-1">
              {filteredFriends(onlineFriends).length === 0 ? (
                <div className="text-center py-12 text-[#72767d]">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada teman yang online</p>
                </div>
              ) : (
                filteredFriends(onlineFriends).map(friend => (
                  <FriendItem key={friend.id} friend={friend} />
                ))
              )}
            </div>
          </TabsContent>

          {/* All Tab */}
          <TabsContent value="all" className="mt-0 space-y-2">
            <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide mb-3">
              Semua Teman — {filteredFriends(allFriends).length}
            </div>
            {filteredFriends(allFriends).length === 0 ? (
              <div className="text-center py-12 text-[#72767d]">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum punya teman</p>
                <p className="text-sm mt-1">Tambahkan teman untuk mulai mengobrol</p>
              </div>
            ) : (
              filteredFriends(allFriends).map(friend => (
                <FriendItem key={friend.id} friend={friend} />
              ))
            )}
          </TabsContent>

        </Tabs>
      </ScrollArea>
    </div>
  );
}

export default FriendsPage;
