import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Shield, Pencil, MoreVertical, Plus, Users, ChevronRight, Trash2, Crown, Lock } from 'lucide-react';
import type { ServerRole } from '@/types';

interface ServerRolesProps {
  serverId: string;
}

interface RoleWithCount extends ServerRole {
  memberCount: number;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function ServerRoles({ serverId }: ServerRolesProps) {
  const [roles, setRoles] = useState<RoleWithCount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<RoleWithCount | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all roles
      const response = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Fetch members to calculate accurate counts
        const membersRes = await fetch(`${API_URL}/servers/${serverId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let members: any[] = [];
        if (membersRes.ok) {
          members = await membersRes.json();
        }
        
        // Calculate member count for each role
        const rolesWithCount = data.map((role: ServerRole) => {
          let count = 0;
          
          if (role.isDefault) {
            // For @everyone (default), count members with role='member' and no custom role_id
            count = members.filter((m: any) => 
              m.role === 'member' && !m.role_id
            ).length;
          } else {
            // For custom roles, count by role_id
            count = members.filter((m: any) => m.role_id === role.id).length;
          }
          
          return { ...role, memberCount: count };
        });
        
        // Sort by position (default first, then by position descending)
        rolesWithCount.sort((a: RoleWithCount, b: RoleWithCount) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return b.position - a.position;
        });
        
        setRoles(rolesWithCount);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateRole = async (name: string, color: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color }),
      });
      if (response.ok) {
        await fetchRoles();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async (roleId: string, name: string, color: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color }),
      });
      if (response.ok) {
        await fetchRoles();
        setShowEditModal(false);
        setEditingRole(null);
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchRoles();
        setMenuOpen(null);
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const getRoleIcon = (role: RoleWithCount) => {
    if (role.isDefault) {
      return (
        <div className="w-8 h-8 rounded-full bg-[#4f545c] flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
      );
    }
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: role.color || '#5865f2' }}
      >
        <Shield className="w-4 h-4 text-white" />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-white text-xl font-bold mb-1">Roles</h2>
        <p className="text-[#b9bbbe] text-sm">
          Use roles to group your server members and assign permissions.
        </p>
      </div>

      {/* Info Alert */}
      <div className="bg-[#2d2f36] border border-[#202225] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#faa81a] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-black font-bold text-xs">!</span>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-1">
              Messaging permissions have changed
            </h4>
            <p className="text-[#b9bbbe] text-sm">
              Historically, Pin Messages and Bypass Slowmode were controlled by permissions intended for moderators, such as <span className="font-semibold text-white">Manage Messages</span> and <span className="font-semibold text-white">Manage Channels</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Create */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
          <input
            type="text"
            placeholder="Search Roles"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1e1f22] text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
          />
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      {/* Info Text */}
      <p className="text-[#72767d] text-sm">
        Members use the color of the highest role they have on this list. Drag roles to reorder them.{' '}
        <a href="#" className="text-[#5865f2] hover:underline">Need help with permissions?</a>
      </p>

      {/* Roles Table */}
      <div className="bg-[#2b2d31] rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_100px_100px] gap-4 px-4 py-3 border-b border-[#1e1f22] text-[#72767d] text-xs font-semibold uppercase">
          <span>ROLES — {filteredRoles.length}</span>
          <span className="text-center">MEMBERS</span>
          <span></span>
        </div>

        {/* Role Items */}
        <div className="divide-y divide-[#1e1f22]">
          {filteredRoles.map((role) => (
            <div 
              key={role.id}
              className="grid grid-cols-[1fr_100px_100px] gap-4 px-4 py-3 items-center hover:bg-[#35373c] transition-colors group"
            >
              <div className="flex items-center gap-3">
                {getRoleIcon(role)}
                <span className="text-white font-medium">
                  {role.isDefault ? '@everyone' : role.name}
                </span>
                {role.isDefault && <Lock className="w-3 h-3 text-[#72767d]" />}
              </div>
              <div className="flex items-center justify-center gap-1 text-[#b9bbbe]">
                <span>{role.memberCount}</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingRole(role); setShowEditModal(true); }}
                  className="p-2 hover:bg-[#40444b] rounded text-[#b9bbbe] hover:text-white"
                  title="Edit Role"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {!role.isDefault && (
                  <div className="relative" ref={menuOpen === role.id ? menuRef : null}>
                    <button 
                      onClick={() => setMenuOpen(menuOpen === role.id ? null : role.id)}
                      className="p-2 hover:bg-[#40444b] rounded text-[#b9bbbe] hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {menuOpen === role.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-[#18191c] rounded-lg shadow-xl z-50 py-1 border border-[#2f3136]">
                        <button
                          onClick={() => { setEditingRole(role); setShowEditModal(true); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit Role
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-[#ed4245] hover:bg-[#ed4245] hover:text-white text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Role
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRole}
        />
      )}

      {/* Edit Role Modal */}
      {showEditModal && editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => { setShowEditModal(false); setEditingRole(null); }}
          onUpdate={handleUpdateRole}
        />
      )}
    </div>
  );
}

// Create Role Modal Component
function CreateRoleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, color: string) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#5865f2');
  const colors = ['#5865f2', '#ed4245', '#43b581', '#faa81a', '#eb459e', '#99aab5'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#36393f] rounded-lg shadow-xl w-96 p-6">
        <h3 className="text-white text-xl font-bold mb-4">Create Role</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[#b9bbbe] text-xs font-bold uppercase mb-1 block">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter role name"
              className="w-full bg-[#202225] text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">Role Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">{name || 'New Role'}</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[#b9bbbe] hover:text-white text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => name && onCreate(name, color)}
            disabled={!name}
            className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium"
          >
            Create Role
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Role Modal Component
function EditRoleModal({ role, onClose, onUpdate }: { role: RoleWithCount; onClose: () => void; onUpdate: (id: string, name: string, color: string) => void }) {
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color || '#5865f2');
  const colors = ['#5865f2', '#ed4245', '#43b581', '#faa81a', '#eb459e', '#99aab5'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#36393f] rounded-lg shadow-xl w-96 p-6">
        <h3 className="text-white text-xl font-bold mb-4">Edit Role</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-[#b9bbbe] text-xs font-bold uppercase mb-1 block">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#202225] text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">Role Color</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          
          <div 
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium">{name}</span>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[#b9bbbe] hover:text-white text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={() => onUpdate(role.id, name, color)}
            className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-sm font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
