import { useState, useEffect } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface AddMemberToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (userId: string) => void;
  channelId: string;
  currentMembers: User[];
  currentUser: User | null;
}

export function AddMemberToGroupModal({ 
  isOpen, 
  onClose, 
  onAddMember, 
  currentMembers,
  currentUser: _currentUser 
}: AddMemberToGroupModalProps) {
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      setSelectedUserId(null);
      setError('');
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter out friends who are already members
        const memberIds = currentMembers.map(m => m.id);
        const availableFriends = data.filter((f: User) => !memberIds.includes(f.id));
        setFriends(availableFriends);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const handleAdd = () => {
    if (!selectedUserId) {
      setError('Pilih teman untuk ditambahkan');
      return;
    }

    onAddMember(selectedUserId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#36393f] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#202225] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#43b581] flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Tambah Anggota</h2>
              <p className="text-sm text-[#b9bbbe]">Tambah teman ke grup ini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#b9bbbe] hover:text-white transition-colors p-1 hover:bg-[#4f545c] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Friends List */}
          <div className="space-y-2">
            {friends.length === 0 ? (
              <div className="text-center py-8 text-[#72767d]">
                <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tidak ada teman yang tersedia</p>
                <p className="text-xs mt-1">Semua teman sudah menjadi anggota grup</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border border-[#202225] rounded-lg">
                <div className="p-2 space-y-1">
                  {friends.map(friend => {
                    const isSelected = selectedUserId === friend.id;
                    return (
                      <button
                        key={friend.id}
                        onClick={() => setSelectedUserId(friend.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                          isSelected 
                            ? 'bg-[#43b581]/20 hover:bg-[#43b581]/30' 
                            : 'hover:bg-[#40444b]'
                        }`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage 
                            src={friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} 
                            alt={friend.username}
                          />
                          <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className={`flex-1 text-left text-sm ${
                          isSelected ? 'text-[#43b581]' : 'text-white'
                        }`}>
                          {friend.username}
                        </span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#43b581] border-[#43b581]' 
                            : 'border-[#72767d]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-[#ed4245] text-sm">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#202225] flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]"
          >
            Batal
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedUserId || isLoading}
            className="bg-[#43b581] hover:bg-[#3ba55d] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menambahkan...
              </span>
            ) : (
              'Tambah ke Grup'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddMemberToGroupModal;
