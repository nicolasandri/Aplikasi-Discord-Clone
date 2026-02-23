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

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  onCategoryCreated?: () => void;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function CreateCategoryModal({
  isOpen,
  onClose,
  serverId,
  onCategoryCreated,
}: CreateCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/servers/${serverId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Kategori "${categoryName}" dibuat`,
        });
        setCategoryName('');
        onClose();
        onCategoryCreated?.();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal membuat kategori',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat membuat kategori',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#36393f] border-[#202225] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Buat Kategori</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-[#b9bbbe] text-sm uppercase font-bold tracking-wide">
              Nama Kategori
            </label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Kategori baru"
              className="bg-[#202225] border-[#040405] text-white focus:border-[#5865f2]"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-[#b9bbbe] hover:text-white hover:bg-[#34373c]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !categoryName.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              {isLoading ? 'Membuat...' : 'Buat Kategori'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
