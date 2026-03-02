import { useState, useEffect } from 'react';
import { 
  Monitor, Smartphone, X, Loader2, AlertCircle,
  LogOut, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface Device {
  id: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export function DevicesSettings() {
  const { logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch devices');
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      console.error('Fetch devices error:', err);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    try {
      setLoggingOut(deviceId);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to logout device');
      }

      // Remove device from list
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err: any) {
      console.error('Logout device error:', err);
      setError(err.message || 'Failed to logout device');
    } finally {
      setLoggingOut(null);
    }
  };

  const handleLogoutAll = async () => {
    try {
      setLoggingOutAll(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/devices/others`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to logout devices');
      }

      // Only keep current device
      setDevices(prev => prev.filter(d => d.isCurrent));
    } catch (err: any) {
      console.error('Logout all error:', err);
      setError(err.message || 'Failed to logout devices');
    } finally {
      setLoggingOutAll(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDeviceIcon = (deviceType: string, os: string) => {
    if (deviceType === 'Mobile' || os === 'Android' || os === 'iOS') {
      return <Smartphone className="w-6 h-6 text-[#b9bbbe]" />;
    }
    return <Monitor className="w-6 h-6 text-[#b9bbbe]" />;
  };

  const currentDevice = devices.find(d => d.isCurrent);
  const otherDevices = devices.filter(d => !d.isCurrent);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#5865f2] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header Description */}
      <div className="mb-6">
        <p className="text-[#b9bbbe] text-sm leading-relaxed">
          Here are all the devices that are currently logged in with your WorkGrid account. 
          You can log out of each one individually or all other devices.
        </p>
        <p className="text-[#b9bbbe] text-sm mt-2 leading-relaxed">
          If you see an entry you don't recognize, log out of that device and change your 
          WorkGrid account password immediately.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-[#ed4245]/10 border border-[#ed4245]/50 rounded-lg flex items-center gap-2 text-[#ed4245] text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button 
            onClick={() => setError('')}
            className="ml-auto text-[#ed4245] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Current Device Section */}
      <div className="mb-6">
        <h3 className="text-white text-xs font-bold uppercase mb-3 tracking-wide">
          Current Device
        </h3>
        {currentDevice ? (
          <div className="bg-[#2f3136] rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#202225] rounded-full flex items-center justify-center flex-shrink-0">
                {getDeviceIcon(currentDevice.deviceType, currentDevice.os)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">
                    {currentDevice.os.toUpperCase()} • {currentDevice.browser.toUpperCase()}
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#5865f2]/20 text-[#5865f2] text-[10px] font-bold rounded uppercase">
                    Current
                  </span>
                </div>
                <p className="text-[#b9bbbe] text-sm mt-0.5">
                  {currentDevice.location}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#2f3136] rounded-lg p-4 text-center">
            <p className="text-[#b9bbbe] text-sm">No current device found</p>
          </div>
        )}
      </div>

      {/* Other Devices Section */}
      {otherDevices.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-xs font-bold uppercase tracking-wide">
              Other Devices
            </h3>
            <Button
              onClick={handleLogoutAll}
              disabled={loggingOutAll}
              size="sm"
              className="bg-[#ed4245] hover:bg-[#c03537] text-white text-xs h-8"
            >
              {loggingOutAll ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <LogOut className="w-3 h-3 mr-1" />
              )}
              Log Out All
            </Button>
          </div>

          <div className="space-y-2">
            {otherDevices.map(device => (
              <div 
                key={device.id}
                className="bg-[#2f3136] rounded-lg p-4 group hover:bg-[#36393f] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#202225] rounded-full flex items-center justify-center flex-shrink-0">
                    {getDeviceIcon(device.deviceType, device.os)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {device.os.toUpperCase()} • {device.browser.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#b9bbbe] text-sm mt-0.5">
                      {device.location} • {formatTimeAgo(device.lastActive)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleLogoutDevice(device.id)}
                    disabled={loggingOut === device.id}
                    className="w-8 h-8 flex items-center justify-center text-[#b9bbbe] hover:text-[#ed4245] hover:bg-[#ed4245]/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                    title="Log out this device"
                  >
                    {loggingOut === device.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Other Devices */}
      {otherDevices.length === 0 && !loading && currentDevice && (
        <div className="bg-[#2f3136] rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-[#202225] rounded-full flex items-center justify-center mx-auto mb-3">
            <RefreshCw className="w-8 h-8 text-[#43b581]" />
          </div>
          <p className="text-white font-medium">No other devices</p>
          <p className="text-[#b9bbbe] text-sm mt-1">
            You're only logged in on this device
          </p>
        </div>
      )}

      {/* No Devices At All - Need to re-login */}
      {!currentDevice && !loading && (
        <div className="bg-[#2f3136] rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-[#202225] rounded-full flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-8 h-8 text-[#72767d]" />
          </div>
          <p className="text-white font-medium">No devices found</p>
          <p className="text-[#b9bbbe] text-sm mt-1 mb-4">
            Please log out and log in again to see your devices
          </p>
          <Button
            onClick={() => logout()}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
          >
            Log Out Now
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-[#2f3136]/50 rounded-lg">
        <p className="text-[#72767d] text-xs leading-relaxed">
          <span className="text-[#b9bbbe] font-semibold uppercase tracking-wide">Note:</span>{' '}
          Some older devices may not be shown here. To log them out, please{' '}
          <button 
            onClick={() => logout()}
            className="text-[#00aff4] hover:underline"
          >
            change your password
          </button>
          .
        </p>
      </div>
    </div>
  );
}
