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
import { Hash, Volume2 } from 'lucide-react';

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
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
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
          type: channelType,
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
      <DialogContent className="bg-[#36393f] border-[#202225] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Buat Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Channel Type Selection */}
          <div className="space-y-2">
            <label className="text-[#b9bbbe] text-sm uppercase font-bold tracking-wide">
              Tipe Channel
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannelType('text')}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  channelType === 'text'
                    ? 'border-[#5865f2] bg-[#5865f2]/10'
                    : 'border-[#202225] bg-[#202225] hover:bg-[#2f3136]'
                }`}
              >
                <Hash className="w-5 h-5 text-[#72767d]" />
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Teks</p>
                  <p className="text-[#72767d] text-xs">Kirim pesan, gambar, dan diskusi</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setChannelType('voice')}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  channelType === 'voice'
                    ? 'border-[#5865f2] bg-[#5865f2]/10'
                    : 'border-[#202225] bg-[#202225] hover:bg-[#2f3136]'
                }`}
              >
                <Volume2 className="w-5 h-5 text-[#72767d]" />
                <div className="text-left">
                  <p className="text-white font-medium text-sm">Suara</p>
                  <p className="text-[#72767d] text-xs">Chat suara dan video call</p>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <label className="text-[#b9bbbe] text-sm uppercase font-bold tracking-wide">
              Nama Channel
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#72767d]">
                {channelType === 'text' ? '#' : '🔊'}
              </span>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={channelType === 'text' ? 'channel-baru' : 'Channel Suara'}
                className="bg-[#202225] border-[#040405] text-white focus:border-[#5865f2] pl-8"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-[#b9bbbe] hover:text-white hover:bg-[#34373c]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !channelName.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              {isLoading ? 'Membuat...' : 'Buat Channel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
