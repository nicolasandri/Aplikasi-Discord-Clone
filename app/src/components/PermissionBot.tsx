import { useState, useEffect, useCallback } from 'react';
import { Timer, CheckCircle, AlertCircle, Clock, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PermissionRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  max_duration_minutes: number;
  started_at: string;
  ended_at?: string;
  username?: string;
  display_name?: string;
  avatar?: string;
}

interface PermissionBotProps {
  channelId: string;
  serverId: string;
  currentUserId: string;
}

export function PermissionBot({ channelId, serverId, currentUserId }: PermissionBotProps) {
  const [activeRequests, setActiveRequests] = useState<PermissionRequest[]>([]);
  const [myActiveRequest, setMyActiveRequest] = useState<PermissionRequest | null>(null);
  const [izinType, setIzinType] = useState('wc');
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();

  const API_URL = typeof window !== 'undefined' && (window as any).electronAPI
    ? 'http://localhost:3001/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

  // Fetch active permissions
  const fetchActivePermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/channels/${channelId}/permissions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveRequests(data);
        // Find my active request
        const mine = data.find((r: PermissionRequest) => r.user_id === currentUserId);
        setMyActiveRequest(mine || null);
      }
    } catch (error) {
      console.error('Failed to fetch active permissions:', error);
    }
  }, [channelId, currentUserId, API_URL]);

  // Initial fetch and polling
  useEffect(() => {
    fetchActivePermissions();
    const interval = setInterval(fetchActivePermissions, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchActivePermissions]);

  // Update elapsed time
  useEffect(() => {
    if (!myActiveRequest) {
      setElapsedTime(0);
      return;
    }

    const startedAt = new Date(myActiveRequest.started_at).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startedAt) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [myActiveRequest]);

  const handleIzin = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/bot/permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          channelId,
          serverId,
          command: 'IZIN',
          type: izinType
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: data.embed.title,
          description: `Izin ${data.embed.type} dimulai. Maksimal ${data.embed.maxDuration}.`,
          duration: 5000
        });
        fetchActivePermissions();
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: data.error || 'Terjadi kesalahan',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Failed to request permission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengirim permintaan izin'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKembali = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/bot/permission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          channelId,
          serverId,
          command: 'KEMBALI'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        const embed = data.embed;
        toast({
          title: embed.title,
          description: `Durasi: ${embed.actualDuration}${embed.penalty !== '0d' ? ` (Penalty: ${embed.penalty})` : ''}`,
          duration: 5000
        });
        fetchActivePermissions();
        setElapsedTime(0);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: data.error || 'Terjadi kesalahan',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Failed to complete permission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengakhiri izin'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}d`;
  };

  const isOverTime = myActiveRequest && elapsedTime > (myActiveRequest.max_duration_minutes * 60);

  return (
    <div className="bg-[#1e1f2e] rounded-lg p-4 mb-4 border border-[#2f3136]">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="w-5 h-5 text-[#00d4ff]" />
        <h3 className="text-white font-semibold">Bot Izin Keluar</h3>
        {activeRequests.length > 0 && (
          <Badge className="bg-[#00d4ff] text-black text-xs">
            {activeRequests.length} aktif
          </Badge>
        )}
      </div>

      {/* My Active Request */}
      {myActiveRequest ? (
        <div className={`p-4 rounded-lg mb-4 ${isOverTime ? 'bg-red-900/30 border border-red-500' : 'bg-[#2a2b3d] border border-[#00d4ff]/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${isOverTime ? 'text-red-400' : 'text-green-400'}`} />
              <span className="text-white font-medium">IZIN AKTIF</span>
            </div>
            <Badge className={`${isOverTime ? 'bg-red-500' : 'bg-green-500'} text-white`}>
              {myActiveRequest.request_type.toUpperCase()}
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm mb-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4" />
              <span>Waktu: {formatTime(elapsedTime)}</span>
              <span className="text-gray-500">/ {myActiveRequest.max_duration_minutes} menit</span>
            </div>
            {isOverTime && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>TERLAMBAT! Penalty: {formatTime(elapsedTime - (myActiveRequest.max_duration_minutes * 60))}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleKembali}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {loading ? 'Memproses...' : 'KEMBALI'}
          </Button>
        </div>
      ) : (
        /* Request Form */
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={izinType}
              onChange={(e) => setIzinType(e.target.value)}
              placeholder="Jenis izin (wc, makan, rokok, dll)"
              className="flex-1 bg-[#2a2b3d] border-[#40444b] text-white placeholder-gray-500"
              disabled={loading}
            />
            <Button
              onClick={handleIzin}
              disabled={loading || !izinType.trim()}
              className="bg-[#00d4ff] hover:bg-[#00b8db] text-black font-medium"
            >
              {loading ? '...' : 'IZIN'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Contoh: wc, makan, rokok, dll. Maksimal 5 menit.
          </p>
        </div>
      )}

      {/* Other Active Requests */}
      {activeRequests.filter(r => r.user_id !== currentUserId).length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#2f3136]">
          <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Staff lain yang izin:
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeRequests
              .filter(r => r.user_id !== currentUserId)
              .map(request => (
                <div key={request.id} className="flex items-center justify-between p-2 bg-[#2a2b3d] rounded">
                  <div className="flex items-center gap-2">
                    <img 
                      src={request.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.username}`}
                      alt={request.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-gray-300">
                      {request.display_name || request.username}
                    </span>
                  </div>
                  <Badge className="bg-[#5865f2] text-white text-xs">
                    {request.request_type}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PermissionBot;
