import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, Search, MoreVertical, Edit2, X, ChevronLeft, 
  UserPlus, Trash2, Check, Crown, ShieldCheck, User,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { ServerMember } from '@/types';

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
  is_default?: boolean;
  memberCount?: number;
}

interface ServerRolesProps {
  serverId: string;
  isOwner: boolean;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = import.meta.env.VITE_API_URL;
const BASE_URL = import.meta.env.VITE_SOCKET_URL;

const DEFAULT_COLORS = [
  '#00d4ff', '#eb459e', '#ed4245', '#f39c12', '#f1c40f', 
  '#9b59b6', '#3498db', '#1abc9c', '#2ecc71', '#34495e',
  '#95a5a6', '#e74c3c', '#e67e22', '#27ae60',
  '#2980b9', '#8e44ad', '#c0392b', '#7f8c8d', '#2c3e50'
];

const PERMISSIONS = [
  { id: 'VIEW_CHANNEL', name: 'View Channels', bit: 0, description: 'Allows members to view channels by default (excluding private channels).' },
  { id: 'SEND_MESSAGES', name: 'Send Messages', bit: 1, description: 'Allows members to send messages in text channels.' },
  { id: 'MANAGE_MESSAGES', name: 'Manage Messages', bit: 6, description: 'Allows members to delete messages by other members.' },
  { id: 'MANAGE_CHANNELS', name: 'Manage Channels', bit: 7, description: 'Allows members to create, edit, or delete channels.' },
  { id: 'MANAGE_ROLES', name: 'Manage Jobdesk', bit: 8, description: 'Allows members to create, edit, and delete roles.' },
];

export function ServerRoles({ serverId, isOwner }: ServerRolesProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit mode state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState<'display' | 'permissions' | 'links' | 'members' | 'channels'>('display');
  
  // Channel access state
  const [channels, setChannels] = useState<Array<{id: string, name: string, type: string, category_id?: string, is_allowed: boolean}>>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  
  // Create role modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#99aab5');
  
  // Delete confirmation
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  
  // Add members modal
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[ServerRoles] fetched roles:', data);
        setRoles(data.sort((a: Role, b: Role) => b.position - a.position));
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, [serverId]);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  }, [serverId]);

  // Fetch channels for a role
  const fetchChannels = useCallback(async (roleId: string) => {
    setIsLoadingChannels(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles/${roleId}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [serverId]);

  // Toggle channel access
  const toggleChannelAccess = async (channelId: string, currentStatus: boolean) => {
    if (!editingRole) return;
    
    const newStatus = !currentStatus;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles/${editingRole.id}/channels/${channelId}/access`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAllowed: newStatus }),
      });
      
      if (res.ok) {
        // Update local state
        setChannels(prev => prev.map(ch => 
          ch.id === channelId ? { ...ch, is_allowed: newStatus } : ch
        ));
        toast.success(`Akses channel ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      } else {
        toast.error('Gagal mengubah akses channel');
      }
    } catch (error) {
      console.error('Failed to toggle channel access:', error);
      toast.error('Gagal mengubah akses channel');
    }
  };

  useEffect(() => {
    Promise.all([fetchRoles(), fetchMembers()]).then(() => setIsLoading(false));
  }, [fetchRoles, fetchMembers]);

  // Fetch channels when tab changes to channels
  useEffect(() => {
    if (activeTab === 'channels' && editingRole) {
      fetchChannels(editingRole.id);
    }
  }, [activeTab, editingRole, fetchChannels]);



  const getRoleMemberCount = (roleId: string) => {
    return members.filter(m =>
      (m.role_ids && m.role_ids.includes(roleId)) || m.role_id === roleId
    ).length;
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newRoleName, color: newRoleColor }),
      });
      
      if (res.ok) {
        const newRole = await res.json();
        setRoles([...roles, newRole].sort((a, b) => b.position - a.position));
        setShowCreateModal(false);
        setNewRoleName('');
        setNewRoleColor('#99aab5');
        toast.success('Jobdesk berhasil dibuat', {
          description: `Jobdesk "${newRole.name}" telah dibuat.`,
        });
      } else {
        const error = await res.json();
        toast.error('Gagal membuat Jobdesk', {
          description: error.error || 'Terjadi kesalahan saat membuat role.',
        });
      }
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('Gagal membuat role', {
        description: 'Tidak dapat terhubung ke server.',
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingRole),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setRoles(roles.map(r => r.id === updated.id ? updated : r).sort((a, b) => b.position - a.position));
        toast.success('Perubahan berhasil disimpan', {
          description: `Role "${updated.name}" telah diperbarui.`,
        });
      } else {
        const error = await res.json();
        toast.error('Gagal menyimpan perubahan', {
          description: error.error || 'Terjadi kesalahan saat menyimpan role.',
        });
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Gagal menyimpan perubahan', {
        description: 'Tidak dapat terhubung ke server.',
      });
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles/${roleToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setRoles(roles.filter(r => r.id !== roleToDelete.id));
        setRoleToDelete(null);
        if (editingRole?.id === roleToDelete.id) {
          setEditingRole(null);
        }
        toast.success('Jobdesk berhasil dihapus', {
          description: `Jobdesk "${roleToDelete.name}" telah dihapus.`,
        });
      } else {
        const error = await res.json();
        toast.error('Gagal menghapus Jobdesk', {
          description: error.error || 'Terjadi kesalahan saat menghapus role.',
        });
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Gagal menghapus role', {
        description: 'Tidak dapat terhubung ke server.',
      });
    }
  };

  const handleReorderRole = async (roleId: string, direction: 'up' | 'down') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/roles/${roleId}/reorder`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction }),
      });
      
      if (res.ok) {
        await fetchRoles();
        toast.success('Urutan Jobdesk diperbarui');
      } else {
        const error = await res.json();
        toast.error('Gagal mengubah urutan', {
          description: error.error || 'Terjadi kesalahan.',
        });
      }
    } catch (error) {
      console.error('Failed to reorder role:', error);
      toast.error('Gagal mengubah urutan');
    }
  };

  const handleAssignRole = async (userId: string) => {
    if (!editingRole) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/custom-role`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId: editingRole.id }),
      });
      
      if (res.ok) {
        await fetchMembers();
        toast.success('Member ditambahkan ke role');
      } else {
        const error = await res.json();
        toast.error('Gagal menambahkan member', {
          description: error.error || 'Terjadi kesalahan.',
        });
      }
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error('Gagal menambahkan member');
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!editingRole) return;
    
    try {
      const token = localStorage.getItem('token');
      // Use DELETE endpoint to remove specific role
      const res = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/roles/${editingRole.id}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        await fetchMembers();
        toast.success('Member dihapus dari jobdesk');
      } else {
        const error = await res.json();
        toast.error('Gagal menghapus member', {
          description: error.error || 'Terjadi kesalahan.',
        });
      }
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast.error('Gagal menghapus member');
    }
  };

  const togglePermission = (bit: number) => {
    if (!editingRole) return;
    const newPermissions = editingRole.permissions ^ (1 << bit);
    setEditingRole({ ...editingRole, permissions: newPermissions });
  };

  const hasPermission = (permissions: number, bit: number) => {
    return (permissions & (1 << bit)) !== 0;
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMembersWithRole = (roleId: string) => {
    return members.filter(m =>
      (m.role_ids && m.role_ids.includes(roleId)) ||
      (m.roles && m.roles.some((r: any) => r.id === roleId)) ||
      m.role_id === roleId
    );
  };

  const getMembersWithoutRole = (roleId: string) => {
    return members.filter(m =>
      !(m.role_ids && m.role_ids.includes(roleId)) &&
      !(m.roles && m.roles.some((r: any) => r.id === roleId)) &&
      m.role_id !== roleId
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Edit Role View
  if (editingRole) {
    const membersWithRole = getMembersWithRole(editingRole.id);
    const filteredAvailableMembers = getMembersWithoutRole(editingRole.id).filter(m => 
      m.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.displayName?.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );

    return (
      <div className="flex h-full">
        {/* Left Sidebar - Jobdesk List */}
        <div className="w-60 bg-[#2b2d31] border-r border-[#1f2023] flex flex-col">
          <button
            onClick={() => setEditingRole(null)}
            className="flex items-center gap-2 p-4 text-[#b5bac1] hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">BACK</span>
          </button>
          
          <div className="flex-1 overflow-y-auto px-2">
            {/* @everyone role */}
            {(() => {
              const everyoneRole = roles.find(r => r.is_default);
              if (everyoneRole) {
                return (
                  <button
                    onClick={() => setEditingRole(everyoneRole)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded mb-1 transition-colors ${
                      editingRole.id === everyoneRole.id ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1]'
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-[#99aab5]" />
                    <span className="text-sm truncate flex-1 text-left">@everyone</span>
                  </button>
                );
              }
              return null;
            })()}
            
            {/* Custom roles */}
            {roles.filter(r => !r.is_default).sort((a, b) => b.position - a.position).map(role => (
              <button
                key={role.id}
                onClick={() => setEditingRole(role)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded mb-1 transition-colors ${
                  editingRole.id === role.id ? 'bg-[#404249] text-white' : 'hover:bg-[#35373c] text-[#b5bac1]'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span className="text-sm truncate flex-1 text-left">{role.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-[#313338] flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-[#1f2023] flex items-center justify-between px-6">
            <h2 className="text-white font-semibold flex items-center gap-2">
              Edit Jobdesk — {editingRole.name}
            </h2>
            <div className="flex items-center gap-2">
              {!editingRole.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRoleToDelete(editingRole)}
                  className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Jobdesk
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleUpdateRole}
                className="bg-[#00d4ff] hover:bg-[#00b8db] text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1f2023]">
            {(['display', 'permissions', 'channels', 'links', 'members'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors relative ${
                  activeTab === tab ? 'text-white' : 'text-[#949ba4] hover:text-white'
                }`}
              >
                {tab === 'channels' ? 'Akses Channel' : tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4ff]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'display' && (
              <div className="max-w-xl space-y-6">
                <div>
                  <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                    Nama Jobdesk
                  </label>
                  <Input
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="bg-[#1e1f22] border-[#1e1f22] text-white focus:border-[#00d4ff]"
                  />
                </div>

                <div>
                  <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                    Warna Jobdesk
                  </label>
                  <div className="grid grid-cols-10 gap-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditingRole({ ...editingRole, color })}
                        className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                          editingRole.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#313338]' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[#2b2d31] rounded-lg">
                  <h4 className="text-white font-medium mb-2">Preview</h4>
                  <div className="flex items-center gap-2">
                    <div 
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ 
                        backgroundColor: `${editingRole.color}20`,
                        color: editingRole.color 
                      }}
                    >
                      {editingRole.name}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="max-w-2xl space-y-4">
                {PERMISSIONS.map(perm => (
                  <div 
                    key={perm.id}
                    className="flex items-start gap-4 p-4 bg-[#2b2d31] rounded-lg hover:bg-[#35373c] transition-colors cursor-pointer"
                    onClick={() => togglePermission(perm.bit)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 ${
                      hasPermission(editingRole.permissions, perm.bit)
                        ? 'bg-[#00d4ff] border-[#00d4ff]'
                        : 'border-[#4f545c]'
                    }`}>
                      {hasPermission(editingRole.permissions, perm.bit) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{perm.name}</h4>
                      <p className="text-[#949ba4] text-sm">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'links' && (
              <div className="max-w-xl text-center py-12 text-[#949ba4]">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Fitur Links sedang dalam pengembangan.</p>
              </div>
            )}

            {activeTab === 'channels' && (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">Akses Channel</h3>
                    <p className="text-[#949ba4] text-sm">Atur akses channel untuk jobdesk {editingRole?.name}</p>
                  </div>
                </div>

                {isLoadingChannels ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : channels.length === 0 ? (
                  <div className="text-center py-8 text-[#949ba4]">
                    <p>Tidak ada channel di server ini</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {channels.map(channel => (
                      <div 
                        key={channel.id}
                        className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-lg hover:bg-[#35373c] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-[#949ba4]">
                            {channel.type === 'voice' ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            )}
                          </div>
                          <span className="text-white">#{channel.name}</span>
                        </div>
                        <button
                          onClick={() => toggleChannelAccess(channel.id, channel.is_allowed)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            channel.is_allowed
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          }`}
                        >
                          {channel.is_allowed ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">Kelola Anggota ({membersWithRole.length})</h3>
                    <p className="text-[#949ba4] text-sm">Anggota dengan Jobdesk ini</p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowAddMembersModal(true);
                      setSelectedMembers([]);
                      setMemberSearchQuery('');
                    }}
                    className="bg-[#00d4ff] hover:bg-[#00b8db] text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Tambah Angggota
                  </Button>
                </div>

                <div className="space-y-2">
                  {membersWithRole.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-lg group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={member.avatar 
                            ? (member.avatar?.startsWith('http') ? member.avatar : `${BASE_URL}${member.avatar}`)
                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                          alt={member.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium flex items-center gap-2 flex-wrap">
                            {member.displayName || member.username}
                            {member.role === 'owner' && <Crown className="w-4 h-4 text-[#ffd700]" />}
                            {member.role === 'admin' && <ShieldCheck className="w-4 h-4 text-[#ed4245]" />}
                          </div>
                          <div className="text-[#949ba4] text-sm">{member.username}</div>
                          {/* Display all roles as badges */}
                          {member.roles && member.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.roles.map((role: any) => (
                                <span
                                  key={role.id}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                  style={{ 
                                    backgroundColor: `${role.color}30`,
                                    color: role.color 
                                  }}
                                >
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRole(member.id)}
                        className="p-2 hover:bg-[#ed4245]/10 rounded text-[#949ba4] hover:text-[#ed4245] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title={`Hapus dari Jobdesk ${editingRole.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {membersWithRole.length === 0 && (
                    <div className="text-center py-8 text-[#949ba4]">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Belum ada anggota dengan Jobdesk ini.</p>
                      <Button
                        onClick={() => {
                          setShowAddMembersModal(true);
                          setSelectedMembers([]);
                          setMemberSearchQuery('');
                        }}
                        variant="ghost"
                        className="mt-2 text-[#00d4ff] hover:text-[#00b8db]"
                      >
                        Tambah anggota
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tambah Anggota Modal */}
        <Dialog open={showAddMembersModal} onOpenChange={setShowAddMembersModal}>
          <DialogContent className="bg-[#313338] border-[#1f2023] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Tambah anggota</DialogTitle>
              <p className="text-[#949ba4] text-sm">
                Pilih maksimal 30 anggota untuk ditambahkan ke Jobdesk <span style={{ color: editingRole.color }}>{editingRole.name}</span>
              </p>
            </DialogHeader>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
              <Input
                placeholder="Search members"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="pl-9 bg-[#1e1f22] border-[#1f2023] text-white"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              <div className="text-xs font-bold text-[#949ba4] uppercase px-2 py-1">Anggota</div>
              {filteredAvailableMembers.map(member => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-[#2b2d31] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (selectedMembers.length < 30) {
                          setSelectedMembers([...selectedMembers, member.id]);
                        }
                      } else {
                        setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                      }
                    }}
                    className="rounded border-[#4f545c] bg-[#1e1f22] text-[#00d4ff]"
                  />
                  <img
                    src={member.avatar 
                            ? (member.avatar?.startsWith('http') ? member.avatar : `${BASE_URL}${member.avatar}`)
                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                    alt={member.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {member.displayName || member.username}
                    </div>
                    <div className="text-[#949ba4] text-xs">{member.username}</div>
                  </div>
                </label>
              ))}
              
              {filteredAvailableMembers.length === 0 && (
                <div className="text-center py-4 text-[#949ba4] text-sm">
                  Tidak ada anggota yang tersedia untuk ditambahkan
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedMembers([]);
                }}
                className="text-[#b5bac1] hover:text-white"
              >
                Batal
              </Button>
              <Button
                onClick={async () => {
                  for (const memberId of selectedMembers) {
                    await handleAssignRole(memberId);
                  }
                  setShowAddMembersModal(false);
                  setSelectedMembers([]);
                }}
                disabled={selectedMembers.length === 0}
                className="bg-[#00d4ff] hover:bg-[#00b8db] text-white"
              >
                Tambah {selectedMembers.length > 0 && `(${selectedMembers.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
          <AlertDialogContent className="bg-[#2b2d31] border-[#1e1f22] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Hapus Jobdesk</AlertDialogTitle>
              <AlertDialogDescription className="text-[#a0a0b0]">
                Apakah Anda yakin ingin menghapus <span style={{ color: roleToDelete?.color }}>{roleToDelete?.name}</span>? 
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-[#2a2b3d] text-white border-[#40444b] hover:bg-[#35373c]"
                onClick={() => setRoleToDelete(null)}
              >
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-[#ed4245] text-white hover:bg-[#c0392b]"
                onClick={handleDeleteRole}
              >
                Hapus Jobdesk
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Roles List View
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[#949ba4] text-sm">
          Gunakan Jobdesk untuk mengelompokkan anggota server dan menetapkan izin.
        </p>
      </div>

      {/* Default Permissions */}
      <div 
        className="flex items-center justify-between p-4 bg-[#2b2d31] rounded-lg mb-4 cursor-pointer hover:bg-[#35373c] transition-colors"
        onClick={() => {
          const defaultRole = roles.find(r => r.is_default);
          if (defaultRole) setEditingRole(defaultRole);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4f545c] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#b5bac1]" />
          </div>
          <div>
            <h3 className="text-white font-medium">Default Permissions</h3>
            <p className="text-[#949ba4] text-sm">@everyone • berlaku untuk semua anggota server</p>
          </div>
        </div>
        <ChevronLeft className="w-5 h-5 text-[#949ba4] rotate-180" />
      </div>

      {/* Search and Create */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
          <Input
            placeholder="Cari Jobdesk"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1e1f22] border-[#1f2023] text-white"
          />
        </div>
        {isOwner && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#00d4ff] hover:bg-[#00b8db] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buat Jobdesk
          </Button>
        )}
      </div>

      {/* Info Text */}
      <p className="text-[#949ba4] text-sm mb-4">
        Anggota menggunakan warna dari Jobdesk tertinggi yang mereka miliki di daftar ini. Seret Jobdesk untuk mengurutkannya.{` `}
        <a href="#" className="text-[#00d4ff] hover:underline">Butuh bantuan dengan izin?</a>
      </p>

      {/* Jobdesk Table Header */}
      <div className="flex items-center px-4 py-2 text-xs font-bold text-[#949ba4] uppercase border-b border-[#1f2023]">
        <span className="flex-1">Jobdesk — {filteredRoles.filter(r => !r.is_default).length}</span>
        <span className="w-48 text-right pr-4">Anggota</span>
        <span className="w-32"></span>
      </div>

      {/* Jobdesk List */}
      <div className="space-y-1">
        {filteredRoles.filter(r => !r.is_default).map(role => (
          <div 
            key={role.id}
            className="flex items-center p-3 bg-[#2b2d31] rounded-lg hover:bg-[#35373c] transition-colors group"
          >
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: role.color }}
              >
                <Shield className="w-3 h-3 text-white" />
              </div>
              <span className="text-white font-medium">{role.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Reorder buttons - show for all roles */}
              {isOwner && (
                <div className="flex items-center gap-1 mr-2 bg-[#1e1f22] rounded p-1">
                  <button
                    onClick={() => handleReorderRole(role.id, 'up')}
                    className="p-1.5 bg-[#2b2d31] hover:bg-[#404249] rounded text-[#b5bac1] hover:text-white border border-[#404249]"
                    title="Naik"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleReorderRole(role.id, 'down')}
                    className="p-1.5 bg-[#2b2d31] hover:bg-[#404249] rounded text-[#b5bac1] hover:text-white border border-[#404249]"
                    title="Turun"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Member count with icon */}
              <div className="text-[#949ba4] flex items-center gap-1">
                <span>{getRoleMemberCount(role.id)}</span>
                <User className="w-4 h-4" />
              </div>
              
              {/* View Members button */}
              <button
                onClick={() => {
                  setEditingRole(role);
                  setActiveTab('members');
                }}
                className="px-3 py-1.5 bg-[#404249] hover:bg-[#4f545c] text-white text-sm rounded transition-colors"
              >
                View members
              </button>
              
              {/* Edit button */}
              <button
                onClick={() => setEditingRole(role)}
                className="p-2 hover:bg-[#404249] rounded text-[#b5bac1] hover:text-white"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              
              {/* More/Delete button - hide for default roles */}
              {!role.is_default && (
                <button
                  onClick={() => setRoleToDelete(role)}
                  className="p-2 hover:bg-[#ed4245]/10 rounded text-[#b5bac1] hover:text-[#ed4245]"
                  title="Delete"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.filter(r => !r.is_default).length === 0 && !isLoading && (
        <div className="text-center py-12 text-[#949ba4]">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Tidak ada Jobdesk. Buat Jobdesk untuk memulai!</p>
        </div>
      )}

      {/* Buat Jobdesk Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#313338] border-[#1f2023] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Buat Jobdesk</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                Nama Jobdesk
              </label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Nama Jobdesk Baru"
                className="bg-[#1e1f22] border-[#1f2023] text-white"
              />
            </div>

            <div>
              <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                Warna Jobdesk
              </label>
              <div className="grid grid-cols-10 gap-2">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewRoleColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      newRoleColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#313338]' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreateModal(false);
                setNewRoleName('');
                setNewRoleColor('#99aab5');
              }}
              className="text-[#b5bac1] hover:text-white"
            >
              Batal
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim()}
              className="bg-[#00d4ff] hover:bg-[#00b8db] text-white"
            >
              Buat Jobdesk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent className="bg-[#2b2d31] border-[#1e1f22] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Hapus Jobdesk</AlertDialogTitle>
            <AlertDialogDescription className="text-[#a0a0b0]">
              Apakah Anda yakin ingin menghapus <span style={{ color: roleToDelete?.color }}>{roleToDelete?.name}</span>? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-[#2a2b3d] text-white border-[#40444b] hover:bg-[#35373c]"
              onClick={() => setRoleToDelete(null)}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#ed4245] text-white hover:bg-[#c0392b]"
              onClick={handleDeleteRole}
            >
              Hapus Jobdesk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

