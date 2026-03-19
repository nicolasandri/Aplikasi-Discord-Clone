import { useState, useEffect, useCallback } from 'react';
import { Timer, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PermissionType {
  id: string;
  name: string;
  max_duration: number;
}

interface PermissionRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: 'active' | 'completed' | 'expired';
  max_duration_minutes: number;
  started_at: string;
  ended_at?: string;
  actual_duration_seconds?: number;
  penalty_seconds?: number;
  username?: string;
  display_name?: string;
  avatar?: string;
}

interface PermissionBotProps {
  channelId: string;
  serverId: string;
  currentUserId: string;
  onRefreshMessages?: () => void;
}

// Format duration (2m 30d)
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}d`;
  }
  return `${secs}d`;
}

export function PermissionBot({ channelId, serverId, currentUserId, onRefreshMessages }: PermissionBotProps) {
  const [myActiveRequest, setMyActiveRequest] = useState<PermissionRequest | null>(null);
  const [activeRequests, setActiveRequests] = useState<PermissionRequest[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [izinType, setIzinType] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([]);
  const [selectedType, setSelectedType] = useState<PermissionType | null>(null);
  const { toast } = useToast();

  const API_URL = import.meta.env.VITE_API_URL;

  // Fetch active permissions for this channel
  const fetchMyPermission = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/channels/${channelId}/permissions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveRequests(data);
        setActiveCount(data.length);
        const mine = data.find((r: PermissionRequest) => r.user_id === currentUserId);
        setMyActiveRequest(mine || null);
      }
    } catch (error) {
      console.error('Failed to fetch permission:', error);
    }
  }, [channelId, currentUserId, API_URL]);

  // Fetch permission types from server settings
  useEffect(() => {
    const fetchPermissionTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/servers/${serverId}/permission-types`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPermissionTypes(data);
          // Set default selected type
          if (data.length > 0 && !selectedType) {
            setSelectedType(data[0]);
            setIzinType(data[0].name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch permission types:', error);
      }
    };
    
    fetchPermissionTypes();
  }, [serverId, API_URL]);

  // Polling
  useEffect(() => {
    fetchMyPermission();
    const interval = setInterval(fetchMyPermission, 5000);
    return () => clearInterval(interval);
  }, [fetchMyPermission]);

  // Update elapsed time
  useEffect(() => {
    if (!myActiveRequest) {
      setElapsedTime(0);
      return;
    }

    const startedAt = new Date(myActiveRequest.started_at).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [myActiveRequest]);

  const handleIzin = async () => {
    if (!selectedType) return;
    
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
          type: selectedType.name,
          maxDuration: selectedType.max_duration
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: '✅ IZIN DIMULAI',
          description: `Izin ${data.embed.type} untuk ${data.embed.maxDuration}`,
          duration: 3000
        });
        setIzinType('');
        if (permissionTypes.length > 0) {
          setSelectedType(permissionTypes[0]);
          setIzinType(permissionTypes[0].name);
        }
        fetchMyPermission();
        // Refresh messages to show bot message
        setTimeout(() => {
          onRefreshMessages?.();
        }, 500);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: data.error || 'Terjadi kesalahan',
          duration: 3000
        });
      }
    } catch (error) {
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
        const isLate = data.details?.penaltySeconds > 0;
        toast({
          title: isLate ? '🏁 IZIN SELESAI (TERLAMBAT)' : '✅ IZIN SELESAI',
          description: `Durasi: ${data.embed.actualDuration}`,
          duration: 3000
        });
        fetchMyPermission();
        // Refresh messages to show bot message
        setTimeout(() => {
          onRefreshMessages?.();
        }, 500);
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: data.error || 'Terjadi kesalahan',
          duration: 3000
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Gagal mengakhiri izin'
      });
    } finally {
      setLoading(false);
    }
  };

  const isOverTime = myActiveRequest && elapsedTime > (myActiveRequest.max_duration_minutes * 60);

  return (
    <div className="bg-[#1e1f2e] rounded-lg p-4 mb-4 border border-[#2f3136]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-[#00d4ff]" />
        <h3 className="text-white font-semibold">Bot Izin Keluar</h3>
        {activeCount > 0 && (
          <Badge className="bg-[#00d4ff] text-black text-xs">
            {activeCount} aktif
          </Badge>
        )}
      </div>

      {/* Active Staff List */}
      {activeCount > 0 && (
        <div className="mb-4 p-3 bg-[#2a2b3d] rounded-lg border border-[#00d4ff]/30">
          <div className="text-xs text-gray-400 mb-2">Staff izin aktif:</div>
          <div className="flex flex-wrap gap-2">
            {activeRequests.map((request) => {
              // Check if this staff is late
              const startedAt = new Date(request.started_at).getTime();
              const maxDurationMs = request.max_duration_minutes * 60 * 1000;
              const isStaffLate = Date.now() > (startedAt + maxDurationMs);
              
              return (
                <div 
                  key={request.id} 
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                    isStaffLate 
                      ? 'bg-red-900/30 border border-red-500/30' 
                      : 'bg-[#1e1f2e]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isStaffLate 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {(request.display_name || request.username || 'User').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-white">
                    @{request.display_name || request.username || 'User'}
                  </span>
                  <span className={`text-[10px] px-1.5 rounded ${
                    isStaffLate 
                      ? 'text-red-400 bg-red-500/10' 
                      : 'text-[#00d4ff] bg-[#00d4ff]/10'
                  }`}>
                    {request.request_type}
                    {isStaffLate && ' ⚠️'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Active Request */}
      {myActiveRequest ? (
        <div className={`p-4 rounded-lg ${isOverTime ? 'bg-red-900/20 border border-red-500/50' : 'bg-[#2a2b3d] border border-green-500/30'}`}>
          <div className="flex items-center gap-2 mb-3">
            {isOverTime ? (
              <>
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-bold">⚠️ TERLAMBAT!</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white font-bold">IZIN AKTIF</span>
              </>
            )}
            <Badge className={`${isOverTime ? 'bg-red-500' : 'bg-green-500'} text-white text-xs`}>
              {myActiveRequest.request_type.toUpperCase()}
            </Badge>
          </div>
          
          <div className="text-sm mb-4">
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Waktu:</span>
              <span className={isOverTime ? 'text-red-400 font-bold' : 'text-white'}>
                {formatDuration(elapsedTime)} / {myActiveRequest.max_duration_minutes} menit
              </span>
            </div>
            {isOverTime && (
              <div className="text-red-400 text-sm">
                Keterlambatan: {formatDuration(elapsedTime - (myActiveRequest.max_duration_minutes * 60))}
              </div>
            )}
          </div>

          <Button
            onClick={handleKembali}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Memproses...' : 'KEMBALI'}
          </Button>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Laporan akan muncul di chat setelah klik KEMBALI
          </p>
        </div>
      ) : (
        /* Request Form */
        <div className="space-y-3">
          {permissionTypes.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-3">
              Belum ada jenis izin. Hubungi admin untuk menambahkan.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <select
                  value={selectedType?.id || ''}
                  onChange={(e) => {
                    const type = permissionTypes.find(t => t.id === e.target.value);
                    setSelectedType(type || null);
                    setIzinType(type?.name || '');
                  }}
                  className="flex-1 bg-[#2a2b3d] border border-[#40444b] text-white rounded px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
                  disabled={loading}
                >
                  {permissionTypes.map((type) => (
                    <option key={type.id} value={type.id} className="bg-[#2a2b3d]">
                      {type.name.charAt(0).toUpperCase() + type.name.slice(1)} ({type.max_duration} menit)
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleIzin}
                  disabled={loading || !selectedType}
                  className="bg-[#00d4ff] hover:bg-[#00b8db] text-black font-medium"
                >
                  {loading ? '...' : 'IZIN'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Pilih jenis izin dari daftar. Durasi maksimal ditentukan oleh admin.
              </p>
            </>
          )}
          <p className="text-xs text-gray-500">
            Laporan izin akan muncul di chat channel ini.
          </p>
        </div>
      )}
    </div>
  );
}

export default PermissionBot;
