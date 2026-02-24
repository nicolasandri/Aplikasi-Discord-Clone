import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Edit2, Check, Shield, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
  is_default: boolean;
}

interface RoleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  currentUserRole?: string;
  isOwner?: boolean;
}

// Default colors for roles
const ROLE_COLORS = [
  '#99aab5', // Gray
  '#ed4245', // Red
  '#e67e22', // Orange
  '#f1c40f', // Yellow
  '#43b581', // Green
  '#3ba55d', // Dark Green
  '#3498db', // Blue
  '#9b59b6', // Purple
  '#e91e63', // Pink
  '#1abc9c', // Teal
  '#795548', // Brown
  '#607d8b', // Blue Gray
];

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function RoleManagerModal({ 
  isOpen, 
  onClose, 
  serverId,
  currentUserRole,
  isOwner = false
}: RoleManagerModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
  const { toast } = useToast();

  const canManageRoles = isOwner || currentUserRole === 'admin';

  const fetchRoles = useCallback(async () => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Sort by position descending (highest position first)
        setRoles(data.sort((a: Role, b: Role) => b.position - a.position));
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, [serverId]);

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, fetchRoles]);

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !canManageRoles) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          color: newRoleColor,
          position: roles.length + 1,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Role "${newRoleName}" berhasil dibuat`,
        });
        setNewRoleName('');
        fetchRoles();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal membuat role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Create role error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat membuat role',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRole = async (roleId: string, updates: Partial<Role>) => {
    if (!canManageRoles) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: 'Role berhasil diperbarui',
        });
        setEditingRole(null);
        fetchRoles();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal memperbarui role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Update role error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat memperbarui role',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!canManageRoles) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus role "${roleName}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Role "${roleName}" berhasil dihapus`,
        });
        fetchRoles();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal menghapus role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete role error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat menghapus role',
        variant: 'destructive',
      });
    }
  };

  const moveRole = async (roleId: string, direction: 'up' | 'down') => {
    if (!canManageRoles) return;
    
    const roleIndex = roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) return;
    
    const role = roles[roleIndex];
    const newPosition = direction === 'up' 
      ? role.position + 1 
      : Math.max(0, role.position - 1);
    
    if (newPosition === role.position) return;
    
    await handleUpdateRole(roleId, { position: newPosition });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#36393f] border-[#202225] text-[#dcddde] max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Kelola Role
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create new role */}
          {canManageRoles && (
            <div className="bg-[#2f3136] p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-semibold text-[#b9bbbe] uppercase">
                Buat Role Baru
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Nama role (contoh: CS, SPV, Operator)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="bg-[#40444b] border-[#202225] text-white placeholder-[#72767d]"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
                />
                <Button
                  onClick={handleCreateRole}
                  disabled={!newRoleName.trim() || isLoading}
                  className="bg-[#5865f2] hover:bg-[#4752c4]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Color picker */}
              <div className="space-y-2">
                <span className="text-xs text-[#72767d]">Warna Role</span>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewRoleColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newRoleColor === color 
                          ? 'border-white scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Role list */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#b9bbbe] uppercase">
              Daftar Role ({roles.length})
            </h3>
            
            {roles.length === 0 ? (
              <div className="text-center py-8 text-[#72767d]">
                Belum ada role custom
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map((role, index) => (
                  <div
                    key={role.id}
                    className="bg-[#2f3136] p-3 rounded-lg flex items-center gap-3 group"
                  >
                    {/* Role color indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    
                    {/* Role info */}
                    <div className="flex-1 min-w-0">
                      {editingRole?.id === role.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                            className="bg-[#40444b] border-[#202225] text-white h-8"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleUpdateRole(role.id, { name: editingRole.name })}
                            className="bg-[#3ba55d] hover:bg-[#2d7d46] h-8 px-2"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRole(null)}
                            className="h-8 px-2"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {role.name}
                          </span>
                          {role.is_default && (
                            <span className="text-[10px] bg-[#5865f2]/20 text-[#5865f2] px-1.5 py-0.5 rounded">
                              Default
                            </span>
                          )}
                          {role.name === 'Admin' && (
                            <Crown className="w-3 h-3 text-[#ffd700]" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {canManageRoles && !editingRole && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Position controls */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveRole(role.id, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 p-0 text-[#b9bbbe] hover:text-white"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveRole(role.id, 'down')}
                          disabled={index === roles.length - 1}
                          className="h-7 w-7 p-0 text-[#b9bbbe] hover:text-white"
                        >
                          ↓
                        </Button>
                        
                        {/* Edit */}
                        {!role.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRole(role)}
                            className="h-7 w-7 p-0 text-[#b9bbbe] hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* Delete */}
                        {!role.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="h-7 w-7 p-0 text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-[#72767d] bg-[#2f3136] p-3 rounded">
            <p className="mb-1">💡 <strong>Tips:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Role dengan posisi lebih tinggi dapat mengelola role di bawahnya</li>
              <li>Owner dan Admin bawaan tidak dapat dihapus</li>
              <li>Member dengan role yang dihapus akan otomatis menjadi Member</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
