import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast.tsx';
import { Hash, Timer, Bot } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  categoryId?: string | null;
  onChannelCreated?: () => void;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function CreateChannelModal({
  isOpen,
  onClose,
  serverId,
  categoryId,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'permission_bot'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: channelName.trim(),
          type: channelType === 'permission_bot' ? 'voice' : channelType,
          categoryId: categoryId || null,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Channel "${channelName}" dibuat`,
        });
        setChannelName('');
        setChannelType('text');
        onClose();
        onChannelCreated?.();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal membuat channel',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat membuat channel',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setChannelName('');
    setChannelType('text');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1b2e] border-[#0f0f1a] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Buat Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Channel Type Selection */}
          <div className="space-y-2">
            <label className="text-[#a0a0b0] text-sm uppercase font-bold tracking-wide">
              Tipe Channel
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannelType('text')}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  channelType === 'text'
                    ? 'border-[#00d4ff] bg-[#00d4ff]/10'
                    : 'border-[#0f0f1a] bg-[#0f0f1a] hover:bg-[#232438]'
                }`}
              >
                <Hash className="w-5 h-5 text-[#6a6a7a]" />
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Teks</p>
                  <p className="text-[#6a6a7a] text-xs">Kirim pesan, gambar, dan diskusi</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setChannelType('permission_bot')}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  channelType === 'permission_bot'
                    ? 'border-[#00d4ff] bg-[#00d4ff]/10'
                    : 'border-[#0f0f1a] bg-[#0f0f1a] hover:bg-[#232438]'
                }`}
              >
                <Timer className="w-5 h-5 text-[#6a6a7a]" />
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Bot Izin Keluar</p>
                  <p className="text-[#6a6a7a] text-xs">Sistem izin dan report staff</p>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <label className="text-[#a0a0b0] text-sm uppercase font-bold tracking-wide">
              Nama Channel
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6a6a7a]">
                {channelType === 'text' ? '#' : '⏱️'}
              </span>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={channelType === 'text' ? 'channel-baru' : 'bot-izin-keluar'}
                className="bg-[#0f0f1a] border-[#040405] text-white focus:border-[#00d4ff] pl-8"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-[#a0a0b0] hover:text-white hover:bg-[#34373c]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !channelName.trim()}
              className="bg-[#00d4ff] hover:bg-[#00b8db] text-white"
            >
              {isLoading ? 'Membuat...' : 'Buat Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

