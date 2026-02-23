import { useState, useEffect, useCallback } from 'react';
import { 
  UserPlus, 
  Users, 
  UserCheck, 
  UserX, 
  MessageCircle, 
  MoreVertical,
  Check,
  X,
  Search,
  ShieldAlert,
  Loader2
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
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

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
  requester_avatar?: string;
  requester_status?: string;
  recipient_id?: string;
  recipient_username?: string;
  recipient_avatar?: string;
  recipient_status?: string;
}

interface BlockedUser {
  id: string;
  username: string;
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

export function FriendsPage({ onClose, onStartDM }: FriendsPageProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ incoming: FriendRequest[], outgoing: FriendRequest[] }>({ incoming: [], outgoing: [] });
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('online');
  const [isLoading, setIsLoading] = useState(true);
  const [addFriendUsername, setAddFriendUsername] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const { toast } = useToast();

  const token = localStorage.getItem('token');

  const fetchFriends = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  }, [token]);

  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/friends/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    }
  }, [token]);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/friends/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    }
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchFriends(), fetchPendingRequests(), fetchBlockedUsers()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchFriends, fetchPendingRequests, fetchBlockedUsers]);

  // Listen for socket events
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleFriendRequestReceived = (data: { requestId: string; userId: string; username: string; avatar: string }) => {
      toast({
        title: 'Permintaan Pertemanan Baru',
        description: `${data.username} ingin berteman dengan Anda`,
      });
      fetchPendingRequests();
    };

    const handleFriendRequestAccepted = (data: { friendId: string; username: string }) => {
      toast({
        title: 'Permintaan Diterima',
        description: `${data.username} menerima permintaan pertemanan Anda`,
      });
      fetchFriends();
      fetchPendingRequests();
    };

    const handleFriendRemoved = (data: { friendId: string }) => {
      fetchFriends();
    };

    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('friend_removed', handleFriendRemoved);

    return () => {
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('friend_removed', handleFriendRemoved);
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
          Authorization: `Bearer ${token}`,
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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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

  const _handleBlockUser = async (userId: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin memblokir ${username}?`)) return;

    try {
      const response = await fetch(`${API_URL}/friends/${userId}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#36393f] transition-colors group">
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={friend.avatar} alt={friend.username} />
          <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[friend.status]} rounded-full border-2 border-[#2f3136]`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{friend.username}</div>
        <div className="text-xs text-[#b9bbbe]">{statusLabels[friend.status]}</div>
      </div>
      {showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#b9bbbe] hover:text-white hover:bg-[#5865f2]"
            onClick={() => onStartDM?.(friend)}
            title="Kirim Pesan"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#b9bbbe] hover:text-[#ed4245] hover:bg-[#ed4245]/10"
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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#36393f]/50">
      <Avatar className="w-10 h-10">
        <AvatarImage src={request.requester_avatar} alt={request.requester_username} />
        <AvatarFallback>{request.requester_username?.[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{request.requester_username}</div>
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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#36393f]/50 opacity-70">
      <Avatar className="w-10 h-10">
        <AvatarImage src={request.recipient_avatar} alt={request.recipient_username} />
        <AvatarFallback>{request.recipient_username?.[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{request.recipient_username}</div>
        <div className="text-xs text-[#b9bbbe]">Permintaan tertunda</div>
      </div>
      <Badge variant="secondary" className="bg-[#5865f2]/20 text-[#5865f2]">Outgoing</Badge>
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
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#36393f]/50">
      <div className="relative">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.avatar} alt={user.username} />
          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <ShieldAlert className="absolute -bottom-1 -right-1 w-4 h-4 text-[#ed4245]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{user.username}</div>
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
      <div className="flex-1 bg-[#36393f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#36393f] flex flex-col min-h-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center gap-4 border-b border-[#202225]">
        <Users className="w-5 h-5 text-[#8e9297]" />
        <h2 className="text-white font-semibold">Teman</h2>
        <div className="h-6 w-px bg-[#40444b] mx-2" />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
            <TabsTrigger 
              value="online" 
              className="data-[state=active]:bg-[#40444b] text-[#b9bbbe] data-[state=active]:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Online
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-[#40444b] text-[#b9bbbe] data-[state=active]:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Semua
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-[#40444b] text-[#b9bbbe] data-[state=active]:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Pending
              {pendingRequests.incoming.length > 0 && (
                <Badge className="ml-2 bg-[#ed4245] text-white text-xs px-1.5 py-0 h-5 min-w-[20px]">
                  {pendingRequests.incoming.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="blocked" 
              className="data-[state=active]:bg-[#40444b] text-[#b9bbbe] data-[state=active]:text-white px-3 py-1.5 rounded-md text-sm"
            >
              Diblokir
            </TabsTrigger>
            <TabsTrigger 
              value="add" 
              className="data-[state=active]:bg-[#3ba55d]/20 data-[state=active]:text-[#3ba55d] text-[#3ba55d] px-3 py-1.5 rounded-md text-sm font-medium"
            >
              Tambah Teman
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
                  className="pl-10 bg-[#202225] border-none text-white placeholder:text-[#72767d]"
                />
              </div>
            </div>
          )}

          {/* Online Tab */}
          <TabsContent value="online" className="mt-0 space-y-2">
            <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide mb-3">
              Online — {filteredFriends(onlineFriends).length}
            </div>
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

          {/* Pending Tab */}
          <TabsContent value="pending" className="mt-0 space-y-4">
            {pendingRequests.incoming.length > 0 && (
              <>
                <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide">
                  Masuk — {pendingRequests.incoming.length}
                </div>
                <div className="space-y-2">
                  {pendingRequests.incoming.map(request => (
                    <IncomingRequestItem key={request.id} request={request} />
                  ))}
                </div>
              </>
            )}
            
            {pendingRequests.outgoing.length > 0 && (
              <>
                <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide mt-6">
                  Keluar — {pendingRequests.outgoing.length}
                </div>
                <div className="space-y-2">
                  {pendingRequests.outgoing.map(request => (
                    <OutgoingRequestItem key={request.id} request={request} />
                  ))}
                </div>
              </>
            )}
            
            {pendingRequests.incoming.length === 0 && pendingRequests.outgoing.length === 0 && (
              <div className="text-center py-12 text-[#72767d]">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada permintaan tertunda</p>
              </div>
            )}
          </TabsContent>

          {/* Blocked Tab */}
          <TabsContent value="blocked" className="mt-0 space-y-2">
            <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide mb-3">
              Diblokir — {blockedUsers.length}
            </div>
            {blockedUsers.length === 0 ? (
              <div className="text-center py-12 text-[#72767d]">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada user yang diblokir</p>
              </div>
            ) : (
              blockedUsers.map(user => (
                <BlockedUserItem key={user.id} user={user} />
              ))
            )}
          </TabsContent>

          {/* Add Friend Tab */}
          <TabsContent value="add" className="mt-0">
            <div className="max-w-md">
              <h3 className="text-white font-semibold text-lg mb-2">TAMBAHKAN TEMAN</h3>
              <p className="text-[#b9bbbe] text-sm mb-6">
                Anda dapat menambahkan teman dengan memasukkan username mereka.
              </p>
              
              <form onSubmit={handleAddFriend} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Masukkan username"
                    value={addFriendUsername}
                    onChange={(e) => setAddFriendUsername(e.target.value)}
                    className="flex-1 bg-[#202225] border-none text-white placeholder:text-[#72767d]"
                  />
                  <Button
                    type="submit"
                    disabled={isAddingFriend || !addFriendUsername.trim()}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                  >
                    {isAddingFriend ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Kirim Permintaan'
                    )}
                  </Button>
                </div>
              </form>

              {pendingRequests.outgoing.length > 0 && (
                <div className="mt-8">
                  <div className="text-[#b9bbbe] text-xs font-semibold uppercase tracking-wide mb-3">
                    Permintaan Tertunda
                  </div>
                  <div className="space-y-2">
                    {pendingRequests.outgoing.map(request => (
                      <OutgoingRequestItem key={request.id} request={request} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

export default FriendsPage;
