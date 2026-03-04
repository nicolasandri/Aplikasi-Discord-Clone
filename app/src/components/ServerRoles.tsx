import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Plus, Search, MoreVertical, Edit2, X, ChevronLeft, 
  UserPlus, Trash2, Check, Crown, ShieldCheck, User
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
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
const BASE_URL = isElectron 
  ? 'http://localhost:3001' 
  : (import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001');

const DEFAULT_COLORS = [
  '#5865f2', '#eb459e', '#ed4245', '#f39c12', '#f1c40f', 
  '#9b59b6', '#3498db', '#1abc9c', '#2ecc71', '#34495e',
  '#95a5a6', '#e74c3c', '#e67e22', '#f39c12', '#27ae60',
  '#2980b9', '#8e44ad', '#c0392b', '#7f8c8d', '#2c3e50'
];

const PERMISSIONS = [
  { id: 'VIEW_CHANNEL', name: 'View Channels', bit: 0, description: 'Allows members to view channels by default (excluding private channels).' },
  { id: 'MANAGE_CHANNELS', name: 'Manage Channels', bit: 1, description: 'Allows members to create, edit, or delete channels.' },
  { id: 'MANAGE_ROLES', name: 'Manage Roles', bit: 2, description: 'Allows members to create, edit, and delete roles.' },
  { id: 'KICK_MEMBERS', name: 'Kick Members', bit: 3, description: 'Allows members to kick members.' },
  { id: 'BAN_MEMBERS', name: 'Ban Members', bit: 4, description: 'Allows members to ban members.' },
  { id: 'MANAGE_MESSAGES', name: 'Manage Messages', bit: 5, description: 'Allows members to delete messages by other members.' },
  { id: 'SEND_MESSAGES', name: 'Send Messages', bit: 6, description: 'Allows members to send messages in text channels.' },
  { id: 'CONNECT', name: 'Connect', bit: 7, description: 'Allows members to connect to voice channels.' },
  { id: 'SPEAK', name: 'Speak', bit: 8, description: 'Allows members to speak in voice channels.' },
];

export function ServerRoles({ serverId, isOwner }: ServerRolesProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit mode state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState<'display' | 'permissions' | 'links' | 'members'>('display');
  
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

  useEffect(() => {
    Promise.all([fetchRoles(), fetchMembers()]).then(() => setIsLoading(false));
  }, [fetchRoles, fetchMembers]);

  const getRoleMemberCount = (roleId: string) => {
    return members.filter(m => m.role_id === roleId).length;
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
      }
    } catch (error) {
      console.error('Failed to create role:', error);
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
      }
    } catch (error) {
      console.error('Failed to update role:', error);
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
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
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
      }
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!editingRole) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/role`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'member' }),
      });
      
      if (res.ok) {
        await fetchMembers();
      }
    } catch (error) {
      console.error('Failed to remove role:', error);
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
    return members.filter(m => m.role_id === roleId);
  };

  const getMembersWithoutRole = (roleId: string) => {
    return members.filter(m => m.role_id !== roleId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
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
        {/* Left Sidebar - Role List */}
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
              Edit Role — {editingRole.name}
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
                  Delete Role
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleUpdateRole}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#1f2023]">
            {(['display', 'permissions', 'links', 'members'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors relative ${
                  activeTab === tab ? 'text-white' : 'text-[#949ba4] hover:text-white'
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5865f2]" />
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
                    Role Name
                  </label>
                  <Input
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="bg-[#1e1f22] border-[#1e1f22] text-white focus:border-[#5865f2]"
                  />
                </div>

                <div>
                  <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                    Role Color
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
                        ? 'bg-[#5865f2] border-[#5865f2]'
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

            {activeTab === 'members' && (
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">Manage Members ({membersWithRole.length})</h3>
                    <p className="text-[#949ba4] text-sm">Members with this role</p>
                  </div>
                  <Button
                    onClick={() => {
                      setShowAddMembersModal(true);
                      setSelectedMembers([]);
                      setMemberSearchQuery('');
                    }}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Members
                  </Button>
                </div>

                <div className="space-y-2">
                  {membersWithRole.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-lg group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar 
                            ? (member.avatar.startsWith('http') ? member.avatar : `${BASE_URL}${member.avatar}`)
                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                          alt={member.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {member.displayName || member.username}
                            {member.role === 'owner' && <Crown className="w-4 h-4 text-[#ffd700]" />}
                            {member.role === 'admin' && <ShieldCheck className="w-4 h-4 text-[#ed4245]" />}
                          </div>
                          <div className="text-[#949ba4] text-sm">{member.username}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRole(member.id)}
                        className="p-2 hover:bg-[#ed4245]/10 rounded text-[#949ba4] hover:text-[#ed4245] opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove from role"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {membersWithRole.length === 0 && (
                    <div className="text-center py-8 text-[#949ba4]">
                      <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No members have this role yet.</p>
                      <Button
                        onClick={() => {
                          setShowAddMembersModal(true);
                          setSelectedMembers([]);
                          setMemberSearchQuery('');
                        }}
                        variant="ghost"
                        className="mt-2 text-[#5865f2] hover:text-[#4752c4]"
                      >
                        Add members
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Members Modal */}
        <Dialog open={showAddMembersModal} onOpenChange={setShowAddMembersModal}>
          <DialogContent className="bg-[#313338] border-[#1f2023] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Add members</DialogTitle>
              <p className="text-[#949ba4] text-sm">
                Select up to 30 members to add to role <span style={{ color: editingRole.color }}>{editingRole.name}</span>
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
              <div className="text-xs font-bold text-[#949ba4] uppercase px-2 py-1">Members</div>
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
                    className="rounded border-[#4f545c] bg-[#1e1f22] text-[#5865f2]"
                  />
                  <img
                    src={member.avatar 
                            ? (member.avatar.startsWith('http') ? member.avatar : `${BASE_URL}${member.avatar}`)
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
                  No members available to add
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
                Cancel
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
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
              >
                Add {selectedMembers.length > 0 && `(${selectedMembers.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
          <AlertDialogContent className="bg-[#2b2d31] border-[#1e1f22] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Role</AlertDialogTitle>
              <AlertDialogDescription className="text-[#b9bbbe]">
                Are you sure you want to delete <span style={{ color: roleToDelete?.color }}>{roleToDelete?.name}</span>? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="bg-[#40444b] text-white border-[#40444b] hover:bg-[#35373c]"
                onClick={() => setRoleToDelete(null)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-[#ed4245] text-white hover:bg-[#c0392b]"
                onClick={handleDeleteRole}
              >
                Delete Role
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
          Use roles to group your server members and assign permissions.
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
            <p className="text-[#949ba4] text-sm">@everyone • applies to all server members</p>
          </div>
        </div>
        <ChevronLeft className="w-5 h-5 text-[#949ba4] rotate-180" />
      </div>

      {/* Warning Banner */}
      <div className="flex items-center gap-2 p-3 bg-[#faa61a]/10 border border-[#faa61a]/20 rounded-lg mb-4">
        <Shield className="w-5 h-5 text-[#faa61a]" />
        <span className="text-[#faa61a] text-sm">Messaging permissions have changed</span>
        <ChevronLeft className="w-4 h-4 text-[#faa61a] rotate-180 ml-auto" />
      </div>

      {/* Search and Create */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
          <Input
            placeholder="Search Roles"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1e1f22] border-[#1f2023] text-white"
          />
        </div>
        {isOwner && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Info Text */}
      <p className="text-[#949ba4] text-sm mb-4">
        Members use the color of the highest role they have on this list. Drag roles to reorder them.{` `}
        <a href="#" className="text-[#00a8fc] hover:underline">Need help with permissions?</a>
      </p>

      {/* Roles Table Header */}
      <div className="flex items-center px-4 py-2 text-xs font-bold text-[#949ba4] uppercase border-b border-[#1f2023]">
        <span className="flex-1">Roles — {filteredRoles.filter(r => !r.is_default).length}</span>
        <span className="w-48 text-right pr-4">Members</span>
        <span className="w-32"></span>
      </div>

      {/* Roles List */}
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
            
            <div className="flex items-center gap-3">
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
              
              {/* More/Delete button */}
              <button
                onClick={() => setRoleToDelete(role)}
                className="p-2 hover:bg-[#ed4245]/10 rounded text-[#b5bac1] hover:text-[#ed4245]"
                title="Delete"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.filter(r => !r.is_default).length === 0 && !isLoading && (
        <div className="text-center py-12 text-[#949ba4]">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No roles found. Create one to get started!</p>
        </div>
      )}

      {/* Create Role Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#313338] border-[#1f2023] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Create Role</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                Role Name
              </label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="New Role"
                className="bg-[#1e1f22] border-[#1f2023] text-white"
              />
            </div>

            <div>
              <label className="block text-[#dbdee1] text-xs font-bold uppercase mb-2">
                Role Color
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
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent className="bg-[#2b2d31] border-[#1e1f22] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Role</AlertDialogTitle>
            <AlertDialogDescription className="text-[#b9bbbe]">
              Are you sure you want to delete <span style={{ color: roleToDelete?.color }}>{roleToDelete?.name}</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-[#40444b] text-white border-[#40444b] hover:bg-[#35373c]"
              onClick={() => setRoleToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#ed4245] text-white hover:bg-[#c0392b]"
              onClick={handleDeleteRole}
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
