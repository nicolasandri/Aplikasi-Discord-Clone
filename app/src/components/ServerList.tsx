import { useState, useEffect } from 'react';
import { Plus, Compass, Download, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Server } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface ServerListProps {
  servers: Server[];
  selectedServerId: string | null;
  onSelectServer: (serverId: string | null) => void;
  onCreateServer: (name: string, icon: string) => void;
  onOpenFriends?: () => void;
  isFriendsOpen?: boolean;
  isMobile?: boolean;
}

export function ServerList({ 
  servers, 
  selectedServerId, 
  onSelectServer, 
  onCreateServer,
  onOpenFriends,
  isFriendsOpen = false,
  isMobile = false
}: ServerListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerIcon, setNewServerIcon] = useState('🌐');
  const [pendingCount, setPendingCount] = useState(0);
  const [onlineFriendCount, setOnlineFriendCount] = useState(0);

  const token = localStorage.getItem('token');

  // Fetch pending friend requests count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch(`${API_URL}/friends/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setPendingCount(data.incoming?.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending count:', error);
      }
    };

    const fetchOnlineFriends = async () => {
      try {
        const response = await fetch(`${API_URL}/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const online = data.filter((f: any) => f.status === 'online');
          setOnlineFriendCount(online.length);
        }
      } catch (error) {
        console.error('Failed to fetch online friends:', error);
      }
    };

    fetchPendingCount();
    fetchOnlineFriends();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchPendingCount();
      fetchOnlineFriends();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  // Listen for socket events to update counts
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) return;

    const handleFriendRequestReceived = () => {
      setPendingCount(prev => prev + 1);
    };

    const handleFriendRequestAccepted = () => {
      // Refresh counts
      fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : []).then(data => {
        const online = data.filter((f: any) => f.status === 'online');
        setOnlineFriendCount(online.length);
      });
    };

    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);

    return () => {
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
    };
  }, [token]);

  const handleCreateServer = () => {
    if (newServerName.trim()) {
      onCreateServer(newServerName.trim(), newServerIcon);
      setNewServerName('');
      setNewServerIcon('🌐');
      setIsCreateOpen(false);
    }
  };

  const handleDMClick = () => {
    onSelectServer('home');
    onOpenFriends?.();
  };

  if (isMobile) {
    return (
      <div className="p-4 space-y-4">
        {/* Direct Messages / Friends Button */}
        <button
          onClick={handleDMClick}
          className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
            isFriendsOpen || selectedServerId === 'home'
              ? 'bg-[#5865f2] text-white'
              : 'bg-[#36393f] text-white hover:bg-[#5865f2]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#36393f] flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold">Pesan Langsung</div>
            <div className="text-sm opacity-70">{onlineFriendCount} teman online</div>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-[#ed4245] text-white text-xs min-w-[24px] h-6 flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </button>

        <div className="border-t border-[#36393f] pt-4">
          <h3 className="text-[#96989d] text-xs font-bold uppercase px-3 mb-3">Server</h3>
          <div className="space-y-2">
            {servers.map((server) => (
              <button
                key={server.id}
                onClick={() => onSelectServer(server.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                  selectedServerId === server.id && !isFriendsOpen
                    ? 'bg-[#5865f2] text-white'
                    : 'bg-[#36393f] text-white hover:bg-[#5865f2]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#36393f] flex items-center justify-center overflow-hidden">
                  {server.icon?.startsWith('http') ? (
                    <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{server.icon || '🌐'}</span>
                  )}
                </div>
                <span className="font-medium truncate flex-1 text-left">{server.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Server Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="w-full flex items-center gap-4 p-3 rounded-xl bg-[#36393f] hover:bg-[#3ba55d] text-[#3ba55d] hover:text-white transition-all"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Buat Server</span>
        </button>

        {/* Create Server Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-[#36393f] border-[#202225] text-white">
            <DialogHeader>
              <DialogTitle className="text-xl">Buat Server Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-[#b9bbbe] text-sm">Nama Server</label>
                <Input
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Server saya"
                  className="bg-[#202225] border-[#040405] text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[#b9bbbe] text-sm">Icon (emoji)</label>
                <Input
                  value={newServerIcon}
                  onChange={(e) => setNewServerIcon(e.target.value)}
                  placeholder="🌐"
                  maxLength={2}
                  className="bg-[#202225] border-[#040405] text-white"
                />
              </div>
              <Button
                onClick={handleCreateServer}
                className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
              >
                Buat Server
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="w-[72px] bg-[#202225] flex flex-col h-full">
      {/* Scrollable Server Area */}
      <div className="flex-1 flex flex-col items-center py-3 gap-2 overflow-y-auto min-h-0">
        {/* Direct Messages / Friends Button */}
      <div className="relative group">
        <button
          onClick={handleDMClick}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            isFriendsOpen || selectedServerId === 'home'
              ? 'bg-[#5865f2] rounded-2xl'
              : 'bg-[#36393f] hover:bg-[#5865f2] hover:rounded-2xl'
          }`}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
        
        {/* Selected indicator */}
        {(isFriendsOpen || selectedServerId === 'home') && (
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
        
        {/* Unread badge */}
        {pendingCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-[#ed4245] text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center p-0 border-2 border-[#202225]">
            {pendingCount > 9 ? '9+' : pendingCount}
          </Badge>
        )}

        {/* Online friend count badge */}
        {onlineFriendCount > 0 && pendingCount === 0 && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#3ba55d] rounded-full border-2 border-[#202225] flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">{onlineFriendCount > 9 ? '9+' : onlineFriendCount}</span>
          </div>
        )}
        
        {/* Tooltip */}
        <div className="absolute left-16 bg-[#18191c] text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          Direct Messages {pendingCount > 0 && `(${pendingCount} pending)`}
        </div>
      </div>

      <div className="w-8 h-[2px] bg-[#36393f] rounded-full my-1" />

      {/* Server List */}
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 relative group overflow-hidden ${
            selectedServerId === server.id && !isFriendsOpen
              ? 'bg-[#5865f2] rounded-2xl'
              : 'bg-[#36393f] hover:bg-[#5865f2] hover:rounded-2xl'
          }`}
        >
          {server.icon?.startsWith('http') ? (
            <img 
              src={server.icon} 
              alt={server.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xl">🌐</span>';
              }}
            />
          ) : (
            <span className="text-2xl">{server.icon || '🌐'}</span>
          )}
          
          {/* Selected indicator */}
          {selectedServerId === server.id && !isFriendsOpen && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
          )}
          
          {/* Hover indicator */}
          {!(selectedServerId === server.id && !isFriendsOpen) && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-2 bg-white rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
          )}

          {/* Tooltip */}
          <div className="absolute left-16 bg-[#18191c] text-white text-sm px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {server.name}
          </div>
        </button>
      ))}

      {/* Add Server Button */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <button className="w-12 h-12 rounded-full bg-[#36393f] hover:bg-[#3ba55d] flex items-center justify-center transition-all duration-200 group mt-2">
            <Plus className="w-6 h-6 text-[#3ba55d] group-hover:text-white transition-colors" />
          </button>
        </DialogTrigger>
        <DialogContent className="bg-[#36393f] border-[#202225] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Buat Server Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-[#b9bbbe] text-sm">Nama Server</label>
              <Input
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Server saya"
                className="bg-[#202225] border-[#040405] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#b9bbbe] text-sm">Icon (emoji)</label>
              <Input
                value={newServerIcon}
                onChange={(e) => setNewServerIcon(e.target.value)}
                placeholder="🌐"
                maxLength={2}
                className="bg-[#202225] border-[#040405] text-white"
              />
            </div>
            <Button
              onClick={handleCreateServer}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4]"
            >
              Buat Server
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Explore Button */}
      <button className="w-12 h-12 rounded-full bg-[#36393f] hover:bg-[#5865f2] flex items-center justify-center transition-all duration-200 group">
        <Compass className="w-6 h-6 text-[#5865f2] group-hover:text-white transition-colors" />
      </button>

      <div className="w-8 h-[2px] bg-[#36393f] rounded-full my-1" />

      {/* Download App Button */}
      <button className="w-12 h-12 rounded-full bg-[#36393f] hover:bg-[#3ba55d] flex items-center justify-center transition-all duration-200 group">
        <Download className="w-6 h-6 text-[#3ba55d] group-hover:text-white transition-colors" />
      </button>
      </div>
    </div>
  );
}
