import { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, VolumeX, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ChannelNotificationSettingsProps {
  channelId: string;
  serverId?: string;
}

type NotificationLevel = 'all' | 'mentions' | 'nothing' | 'default';

interface NotificationSettings {
  notification_level: NotificationLevel;
  muted_until: string | null;
}

export function ChannelNotificationSettings({ channelId, serverId: _serverId }: ChannelNotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    notification_level: 'all',
    muted_until: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const API_URL = import.meta.env.VITE_API_URL;

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/channels/${channelId}/notification-settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
      }
    };
    
    if (channelId) {
      fetchSettings();
    }
  }, [channelId, API_URL]);

  // Update settings
  const updateSettings = async (level: NotificationLevel, mutedUntil: string | null = null) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/channels/${channelId}/notification-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_level: level,
          muted_until: mutedUntil
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({ notification_level: level, muted_until: mutedUntil });
        
        const levelLabels: Record<NotificationLevel, string> = {
          'all': 'Semua Pesan',
          'mentions': 'Hanya @mentions',
          'nothing': 'Tidak Ada',
          'default': 'Gunakan Default Kategori'
        };
        
        toast({
          description: `Notifikasi diatur ke: ${levelLabels[level]}`,
          duration: 2000
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      toast({
        variant: 'destructive',
        description: 'Gagal mengubah pengaturan notifikasi',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mute channel
  const muteChannel = async (duration: string) => {
    let mutedUntil: string | null = null;
    const now = new Date();
    
    switch (duration) {
      case '15m':
        mutedUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
        break;
      case '1h':
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        break;
      case '8h':
        mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
        break;
      case '24h':
        mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'forever':
        mutedUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
        break;
    }
    
    await updateSettings('nothing', mutedUntil);
  };

  // Unmute channel
  const unmuteChannel = async () => {
    await updateSettings('all', null);
  };

  // Get icon based on current settings
  const getIcon = () => {
    if (settings.muted_until && new Date(settings.muted_until) > new Date()) {
      return <VolumeX className="w-5 h-5 text-[#ed4245]" />;
    }
    switch (settings.notification_level) {
      case 'mentions':
        return <Bell className="w-5 h-5 text-white" />;
      case 'nothing':
        return <BellOff className="w-5 h-5 text-white" />;
      case 'all':
      default:
        return <Bell className="w-5 h-5 text-white" />;
    }
  };

  const isMuted = settings.muted_until && new Date(settings.muted_until) > new Date();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/10"
          disabled={isLoading}
        >
          {getIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 bg-[#18191c] border-[#2f3136] text-white"
      >
        {/* Mute Channel Option */}
        <DropdownMenuItem
          className="flex items-center justify-between hover:bg-[#5865f2]/10 focus:bg-[#5865f2]/10 cursor-pointer"
          onClick={() => isMuted ? unmuteChannel() : muteChannel('forever')}
        >
          <span className="flex items-center gap-2">
            <VolumeX className="w-4 h-4" />
            {isMuted ? 'Bunyikan Channel' : 'Mute Channel'}
          </span>
          {!isMuted && <ChevronRight className="w-4 h-4" />}
        </DropdownMenuItem>

        {/* Mute Submenu (only when not muted) */}
        {!isMuted && (
          <div className="pl-8 pr-2 py-1">
            <DropdownMenuRadioGroup value="">
              <DropdownMenuRadioItem
                value="15m"
                onClick={() => muteChannel('15m')}
                className="text-sm text-gray-400 hover:text-white cursor-pointer"
              >
                15 Menit
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="1h"
                onClick={() => muteChannel('1h')}
                className="text-sm text-gray-400 hover:text-white cursor-pointer"
              >
                1 Jam
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="8h"
                onClick={() => muteChannel('8h')}
                className="text-sm text-gray-400 hover:text-white cursor-pointer"
              >
                8 Jam
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="24h"
                onClick={() => muteChannel('24h')}
                className="text-sm text-gray-400 hover:text-white cursor-pointer"
              >
                24 Jam
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem
                value="forever"
                onClick={() => muteChannel('forever')}
                className="text-sm text-gray-400 hover:text-white cursor-pointer"
              >
                Sampai Saya Bunyikan
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </div>
        )}

        <DropdownMenuSeparator className="bg-[#2f3136]" />

        {/* Notification Level Options */}
        <div className="px-2 py-2">
          <p className="text-xs text-gray-400 mb-2 px-2">PENGATURAN NOTIFIKASI</p>
          
          <DropdownMenuRadioGroup
            value={settings.notification_level}
            onValueChange={(value) => updateSettings(value as NotificationLevel)}
          >
            <DropdownMenuRadioItem
              value="default"
              className="flex items-center gap-3 py-2 hover:bg-[#5865f2]/10 focus:bg-[#5865f2]/10 cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-sm">Gunakan Default Kategori</span>
                <span className="text-xs text-gray-400">Semua Pesan</span>
              </div>
            </DropdownMenuRadioItem>
            
            <DropdownMenuRadioItem
              value="all"
              className="flex items-center gap-3 py-2 hover:bg-[#5865f2]/10 focus:bg-[#5865f2]/10 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#3ba55d]" />
                <span className="text-sm">Semua Pesan</span>
              </div>
            </DropdownMenuRadioItem>
            
            <DropdownMenuRadioItem
              value="mentions"
              className="flex items-center gap-3 py-2 hover:bg-[#5865f2]/10 focus:bg-[#5865f2]/10 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#faa61a]" />
                <span className="text-sm">Hanya @mentions</span>
              </div>
            </DropdownMenuRadioItem>
            
            <DropdownMenuRadioItem
              value="nothing"
              className="flex items-center gap-3 py-2 hover:bg-[#5865f2]/10 focus:bg-[#5865f2]/10 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-[#ed4245]" />
                <span className="text-sm">Tidak Ada</span>
              </div>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ChannelNotificationSettings;
