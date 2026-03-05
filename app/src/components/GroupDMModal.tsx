import { useState, useEffect } from 'react';
import { X, Users, Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface GroupDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (userIds: string[], name: string) => void;
  currentUser: User | null;
}

export function GroupDMModal({ isOpen, onClose, onCreateGroup, currentUser }: GroupDMModalProps) {
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      // Reset state
      setSelectedUsers([]);
      setGroupName('');
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
        setFriends(data);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (selectedUsers.length < 1) {
      setError('Pilih minimal 1 teman untuk membuat grup');
      return;
    }

    // Include current user in the group
    const allUserIds = currentUser?.id 
      ? [currentUser.id, ...selectedUsers.filter(id => id !== currentUser.id)]
      : selectedUsers;

    // Generate default name if not provided
    const finalName = groupName.trim() || 
      `Grup ${friends.filter(f => selectedUsers.includes(f.id)).map(f => f.username).join(', ')}`.slice(0, 50);

    onCreateGroup(allUserIds, finalName);
    onClose();
  };

  if (!isOpen) return null;

  const selectedFriends = friends.filter(f => selectedUsers.includes(f.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1b2e] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#0f0f1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00d4ff] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Buat Grup Baru</h2>
              <p className="text-sm text-[#a0a0b0]">Pilih teman untuk diajak ngobrol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a0a0b0] hover:text-white transition-colors p-1 hover:bg-[#4f545c] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Group Name Input */}
          <div className="space-y-2">
            <Label htmlFor="groupName" className="text-[#a0a0b0] text-sm font-medium">
              Nama Grup (Opsional)
            </Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Masukkan nama grup..."
              className="bg-[#0f0f1a] border-[#040405] text-white placeholder:text-[#6a6a7a]"
              maxLength={50}
            />
          </div>

          {/* Selected Count */}
          <div className="flex items-center justify-between">
            <span className="text-[#a0a0b0] text-sm">
              {selectedUsers.length} dipilih
            </span>
            {selectedUsers.length > 0 && (
              <button
                onClick={() => setSelectedUsers([])}
                className="text-xs text-[#ed4245] hover:text-[#ed4245]/80 transition-colors"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {/* Selected Users Preview */}
          {selectedFriends.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-[#232438] rounded-lg">
              {selectedFriends.map(friend => (
                <div 
                  key={friend.id}
                  className="flex items-center gap-1.5 bg-[#00d4ff]/20 text-[#00d4ff] px-2 py-1 rounded-full text-sm"
                >
                  <span className="truncate max-w-[100px]">{friend.username}</span>
                  <button
                    onClick={() => toggleUserSelection(friend.id)}
                    className="hover:text-[#ed4245] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Friends List */}
          <div className="space-y-2">
            <Label className="text-[#a0a0b0] text-sm font-medium">
              Pilih Teman
            </Label>
            <ScrollArea className="h-48 border border-[#0f0f1a] rounded-lg">
              <div className="p-2 space-y-1">
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-[#6a6a7a]">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada teman</p>
                    <p className="text-xs mt-1">Tambah teman terlebih dahulu</p>
                  </div>
                ) : (
                  friends.map(friend => {
                    const isSelected = selectedUsers.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleUserSelection(friend.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                          isSelected 
                            ? 'bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30' 
                            : 'hover:bg-[#2a2b3d]'
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
                          isSelected ? 'text-[#00d4ff]' : 'text-white'
                        }`}>
                          {friend.username}
                        </span>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#00d4ff] border-[#00d4ff]' 
                            : 'border-[#72767d]'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-[#ed4245] text-sm">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#0f0f1a] flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[#a0a0b0] hover:text-white hover:bg-[#4f545c]"
          >
            Batal
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedUsers.length < 1 || isLoading}
            className="bg-[#00d4ff] hover:bg-[#00b8db] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Membuat...
              </span>
            ) : (
              'Buat Grup'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GroupDMModal;

