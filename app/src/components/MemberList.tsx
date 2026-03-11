import { useEffect, useState, useCallback } from 'react';
import { Crown, Settings, Check } from 'lucide-react';
import type { ServerMember } from '@/types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useToast } from '@/hooks/use-toast.tsx';
import { Button } from '@/components/ui/button';
import { RoleManagerModal } from './RoleManagerModal';
import { MemberProfilePopup } from './MemberProfilePopup';

interface MemberListProps {
  serverId: string | null;
  isMobile?: boolean;
  userStatuses?: Map<string, string>;
  onStartDM?: (user: { id: string; username: string; displayName?: string; avatar?: string; status?: string }) => void;
}

interface CustomRole {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default?: boolean;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Get base URL for backend (without /api)
const BASE_URL = (() => {
  if (API_URL.startsWith('http')) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  // For relative API URL in web/production mode, use relative base
  return '';
})();

const statusColors = {
  online: 'bg-[#3ba55d]',
  offline: 'bg-[#747f8d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
};

// Standard role colors for context menu
const roleColors: Record<string, string> = {
  owner: 'text-[#ffd700]',
  admin: 'text-[#ed4245]',
  moderator: 'text-[#43b581]',
  member: 'text-[#a0a0b0]',
};

// Role hierarchy for checking who can manage whom (higher = more power)
const roleHierarchy: Record<string, number> = {
  owner: 100,
  admin: 50,
  moderator: 30,
  member: 10,
};

export function MemberList({ serverId, isMobile: _isMobile = false, userStatuses, onStartDM }: MemberListProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [selectedMember, setSelectedMember] = useState<ServerMember | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const { toast } = useToast();

  // Apply userStatuses overrides to members
  // Normalize status: null/undefined dianggap sebagai 'offline'
  const membersWithLiveStatus = members.map(member => {
    const liveStatus = userStatuses?.get(member.id);
    const effectiveStatus = liveStatus || member.status || 'offline';
    return { ...member, status: effectiveStatus as 'online' | 'offline' | 'idle' | 'dnd' };
  });

  useEffect(() => {
    if (serverId) {
      fetchMembers();
      fetchCustomRoles();
      fetchCurrentUserPermissions();
    }
  }, [serverId]);

  // Listen for status changes via socket
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket) {
      console.log('MemberList: Socket not available yet');
      return;
    }

    console.log('MemberList: Setting up user_status_changed listener');

    const handleStatusChange = (data: { userId: string; status: string }) => {
      console.log('MemberList: Status change received:', data);
      setMembers(prev => 
        prev.map(member => 
          member.id === data.userId 
            ? { ...member, status: data.status as 'online' | 'offline' | 'idle' | 'dnd' }
            : member
        )
      );
    };

    socket.on('user_status_changed', handleStatusChange);

    return () => {
      console.log('MemberList: Removing user_status_changed listener');
      socket.off('user_status_changed', handleStatusChange);
    };
  }, []);

  // Re-fetch members every 60 seconds to ensure status is up to date (reduced from 10s)
  useEffect(() => {
    if (!serverId) return;
    
    const interval = setInterval(() => {
      fetchMembers();
    }, 60000);

    return () => clearInterval(interval);
  }, [serverId]);

  // Update avatar version when members change (for cache-busting)
  useEffect(() => {
    setAvatarVersion(Date.now());
  }, [members]);

  const fetchMembers = async () => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Members from API:', data.map((m: any) => ({ id: m.id, username: m.username, role_name: m.role_name, role: m.role, role_id: m.role_id })));
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchCustomRoles = async () => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched roles:', data);
        // Filter out default roles - use is_default flag if available, fallback to name check
        const filtered = data.filter((r: CustomRole) => {
          // If is_default is defined, use it
          if (r.is_default !== undefined) {
            return !r.is_default;
          }
          // Fallback: filter by name (case-insensitive)
          const nameLower = r.name.toLowerCase();
          return !['admin', 'moderator', 'member'].includes(nameLower);
        });
        console.log('Filtered custom roles:', filtered);
        setCustomRoles(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch custom roles:', error);
    }
  };

  const fetchCurrentUserPermissions = async () => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUserRole(data.role);
        setIsOwner(data.role === 'owner');
        // Get current user ID from token
        const tokenData = JSON.parse(atob(token!.split('.')[1]));
        setCurrentUserId(tokenData.id);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const canManageUser = useCallback((targetRole: string, targetId: string, targetRolePosition?: number) => {
    if (!currentUserRole || !currentUserId) return false;
    if (currentUserId === targetId) return false; // Can't manage yourself
    if (isOwner) return targetRole !== 'owner'; // Owner can manage everyone except other owners
    
    const currentLevel = roleHierarchy[currentUserRole] || 0;
    const targetLevel = targetRolePosition || roleHierarchy[targetRole] || 0;
    
    return currentLevel > targetLevel;
  }, [currentUserRole, currentUserId, isOwner]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Jobdesk berhasil diubah`,
        });
        fetchMembers();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal mengubah role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Change role error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mengubah role',
        variant: 'destructive',
      });
    }
  };

  const handleAssignCustomRole = async (userId: string, roleId: string, roleName: string) => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/custom-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roleId }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `Jobdesk "${roleName}" berhasil diassign`,
        });
        fetchMembers();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal mengassign role',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Assign custom role error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mengassign role',
        variant: 'destructive',
      });
    }
  };

  // Toggle role for member (assign if not has, remove if has)
  const handleToggleRole = async (userId: string, roleId: string, roleName: string, hasRole: boolean) => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      
      if (hasRole) {
        // Remove role
        const response = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/roles/${roleId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          toast({ title: 'Berhasil', description: `Role "${roleName}" dihapus` });
          fetchMembers();
        } else {
          const error = await response.json();
          toast({ title: 'Gagal', description: error.error || 'Gagal menghapus role', variant: 'destructive' });
        }
      } else {
        // Assign role
        const response = await fetch(`${API_URL}/servers/${serverId}/members/${userId}/custom-role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roleId }),
        });

        if (response.ok) {
          toast({ title: 'Berhasil', description: `Role "${roleName}" ditambahkan` });
          fetchMembers();
        } else {
          const error = await response.json();
          toast({ title: 'Gagal', description: error.error || 'Gagal menambahkan role', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Toggle role error:', error);
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  // Check if member has a specific role
  const memberHasRole = (member: ServerMember, roleId: string): boolean => {
    if (member.roles && member.roles.length > 0) {
      return member.roles.some(r => r.id === roleId);
    }
    return member.role_id === roleId;
  };

  const handleKickMember = async (userId: string, username: string) => {
    if (!serverId) return;
    if (!confirm(`Apakah Anda yakin ingin mengeluarkan ${username} dari server?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${username} telah dikeluarkan dari server`,
        });
        fetchMembers();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal mengeluarkan member',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Kick member error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mengeluarkan member',
        variant: 'destructive',
      });
    }
  };

  const handleBanMember = async (userId: string, username: string) => {
    if (!serverId) return;
    if (!confirm(`Apakah Anda yakin ingin mem-banned ${username} dari server?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/bans/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Banned by moderator' }),
      });

      if (response.ok) {
        toast({
          title: 'Berhasil',
          description: `${username} telah di-banned dari server`,
        });
        fetchMembers();
      } else {
        const error = await response.json();
        toast({
          title: 'Gagal',
          description: error.error || 'Gagal mem-banned member',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Ban member error:', error);
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat mem-banned member',
        variant: 'destructive',
      });
    }
  };

  // Get display role for member - use highest position role color
  const getMemberDisplay = (member: ServerMember) => {
    // If member has multiple roles, use the highest position one (first in sorted array)
    if (member.roles && member.roles.length > 0) {
      console.log('[getMemberDisplay] member:', member.username, 'roles:', member.roles, 'sortedRoles:', sortedRoles.map(r => ({ id: r.id, name: r.name, position: r.position })));
      // Sort by position (highest first)
      const sortedMemberRoles = [...member.roles].sort((a, b) => {
        const roleA = sortedRoles.find(sr => sr.id === a.id);
        const roleB = sortedRoles.find(sr => sr.id === b.id);
        console.log('[getMemberDisplay] comparing:', a.name, 'position:', roleA?.position, 'vs', b.name, 'position:', roleB?.position);
        return (roleB?.position || 0) - (roleA?.position || 0);
      });
      const highestRole = sortedMemberRoles[0];
      console.log('[getMemberDisplay] highestRole:', highestRole.name, 'color:', highestRole.color);
      return {
        name: highestRole.name,
        color: highestRole.color || '#99aab5',
        isCustom: true,
      };
    }
    
    // If member has a custom role with name (legacy)
    if (member.role_name) {
      return {
        name: member.role_name,
        color: member.role_color || '#99aab5',
        isCustom: true,
      };
    }
    
    // Fallback - show as Member
    return {
      name: 'Member',
      color: '#99aab5',
      isCustom: false,
    };
  };

  if (!serverId) {
    return (
      <div className="w-60 bg-[#232438] border-l border-[#0f0f1a] hidden lg:block">
        <div className="p-4 text-[#6a6a7a] text-sm text-center">
          Pilih server untuk melihat member
        </div>
      </div>
    );
  }

  // Get all roles sorted by position (highest first)
  const sortedRoles = [...customRoles].sort((a, b) => b.position - a.position);
  
  // Split members by status
  const onlineMembers = membersWithLiveStatus.filter(m => m.status && m.status !== 'offline');
  const offlineMembers = membersWithLiveStatus.filter(m => !m.status || m.status === 'offline');
  
  // Helper function to get member's role combination
  const getMemberRoleCombination = (member: ServerMember) => {
    const roles: Array<{ name: string; color: string; position: number }> = [];
    
    // Add custom roles from roles array
    if (member.roles && member.roles.length > 0) {
      member.roles.forEach(r => {
        const roleInfo = sortedRoles.find(sr => sr.id === r.id);
        roles.push({
          name: r.name,
          color: r.color,
          position: roleInfo?.position || 0
        });
      });
    } else if (member.role_id) {
      // Legacy single role
      const roleInfo = sortedRoles.find(sr => sr.id === member.role_id);
      if (roleInfo) {
        roles.push({
          name: roleInfo.name,
          color: roleInfo.color,
          position: roleInfo.position
        });
      }
    }
    
    // If no roles, add Member
    if (roles.length === 0) {
      roles.push({ name: 'Member', color: '#99aab5', position: 0 });
    }
    
    // Sort by position (highest first)
    roles.sort((a, b) => b.position - a.position);
    
    return roles;
  };
  
  // Build role groups for online members with combined roles
  interface RoleGroup {
    roleParts: Array<{ name: string; color: string }>;
    members: ServerMember[];
    maxPosition: number;
  }
  
  // Group members by their role combination
  const roleCombinationMap = new Map<string, RoleGroup>();
  
  onlineMembers.forEach(member => {
    const memberRoles = getMemberRoleCombination(member);
    const roleKey = memberRoles.map(r => r.name).join(' - ');
    
    if (!roleCombinationMap.has(roleKey)) {
      roleCombinationMap.set(roleKey, {
        roleParts: memberRoles.map(r => ({ name: r.name, color: r.color })),
        members: [],
        maxPosition: Math.max(...memberRoles.map(r => r.position))
      });
    }
    roleCombinationMap.get(roleKey)!.members.push(member);
  });
  
  // Convert map to array and sort by position 
  // Following server settings order: highest position (top of list) first
  const sortedCombinations = Array.from(roleCombinationMap.entries())
    .map(([, value]) => value)
    .sort((a, b) => {
      // Primary sort: by maxPosition descending (highest position first)
      const diff = b.maxPosition - a.maxPosition;
      if (diff !== 0) return diff;
      // Secondary sort: by first role name for consistency
      return (a.roleParts[0]?.name || '').localeCompare(b.roleParts[0]?.name || '');
    });
  
  // Debug logging
  console.log('[MemberList] sortedRoles:', sortedRoles.map(r => ({ name: r.name, position: r.position })));
  console.log('[MemberList] sortedCombinations:', sortedCombinations.map(c => ({ 
    name: c.roleParts.map(p => p.name).join(' - '), 
    maxPosition: c.maxPosition 
  })));

  const MemberItem = ({ member, showRole = true }: { member: ServerMember; showRole?: boolean }) => {
    const display = getMemberDisplay(member);
    console.log('[MemberItem] member:', member.username, 'roles:', member.roles, 'display.color:', display.color);
    const canManage = canManageUser(member.role, member.id);
    // Only show context menu for admins, moderators, and owners
    const isStaff = currentUserRole === 'owner' || currentUserRole === 'admin' || currentUserRole === 'moderator';
    const showContextMenu = isStaff && canManage;
    
    // Debug logging
    console.log('[MemberItem] currentUserRole:', currentUserRole, 'isStaff:', isStaff, 'canManage:', canManage, 'showContextMenu:', showContextMenu);

    // Get display name for member
    const displayName = member.displayName || member.username;
    
    // Get full avatar URL with fallback and cache-busting
    const getAvatarUrl = () => {
      if (!member.avatar) {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username || 'user'}`;
      }
      if (member.avatar.startsWith('http')) {
        return member.avatar;
      }
      // Add cache-busting to force reload when avatar changes
      return `${BASE_URL}${member.avatar}${member.avatar.includes('?') ? '&' : '?'}_v=${avatarVersion}`;
    };

    const handleMemberClick = (e: React.MouseEvent) => {
      // Only open popup on left click
      if (e.button === 0) {
        setSelectedMember(member);
        setShowProfilePopup(true);
      }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
      // Prevent default browser context menu
      e.preventDefault();
    };

    const memberContent = (
      <div 
        className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#34373c] cursor-pointer group"
        onClick={handleMemberClick}
        onContextMenu={handleContextMenu}
      >
        <div className="relative">
          <img
            src={getAvatarUrl()}
            alt={displayName}
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username || 'user'}`;
            }}
          />
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[member.status || 'offline']} rounded-full border-2 border-[#232438]`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span 
              className={`text-sm font-bold truncate group-hover:text-white ${
                member.status === 'offline' ? 'text-[#6a6a7a]' : ''
              }`}
              style={{ 
                color: member.status === 'offline' 
                  ? '#72767d' 
                  : display.color
              }}
            >
              {displayName}
            </span>
            {member.role === 'owner' && <Crown className="w-3 h-3 text-[#ffd700]" />}
          </div>
          {showRole && (
            <div 
              className="text-[10px] uppercase tracking-wide truncate"
              style={{ color: display.color }}
            >
              {display.name}
            </div>
          )}
        </div>
      </div>
    );

    // Show context menu for all members (for testing)
    // We'll filter actions based on permissions inside the menu
    const showContextMenuForAll = true;

    return (
      <ContextMenu key={member.id}>
        <ContextMenuTrigger asChild>
          {memberContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-[#18191c] border-[#232438]">
          <div className="px-2 py-1.5 text-sm font-medium text-[#dcddde]">
            {displayName}
          </div>
          <ContextMenuSeparator className="bg-[#232438]" />
          
          {/* Standard Roles Submenu - Only for Owner and Admin */}
          {(isOwner || currentUserRole === 'admin') && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] focus:bg-[#00d4ff] focus:text-white">
                Jobdesk Standar
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="bg-[#18191c] border-[#232438]">
                {(['member', 'moderator', 'admin'] as const).map((role) => (
                  <ContextMenuItem
                    key={role}
                    className={`text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] focus:bg-[#00d4ff] focus:text-white ${
                      member.role === role ? 'bg-[#00d4ff]/20' : ''
                    } ${!canManageUser(role, member.id) ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleChangeRole(member.id, role)}
                    disabled={!canManageUser(role, member.id)}
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${roleColors[role].replace('text-', 'bg-')}`} />
                    {role === 'member' ? 'Member' : role === 'moderator' ? 'Moderator' : 'Admin'}
                    {member.role === role && <span className="ml-auto text-xs">✓</span>}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {/* Roles Submenu - Like Discord (All roles with checkmarks) - Only for Owner, Admin, and Moderator */}
          {(isOwner || currentUserRole === 'admin' || currentUserRole === 'moderator') && customRoles.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] focus:bg-[#00d4ff] focus:text-white">
                Role
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="bg-[#18191c] border-[#232438] max-h-64 overflow-y-auto">
                {sortedRoles.map((role) => {
                  const hasRole = memberHasRole(member, role.id);
                  return (
                    <ContextMenuItem
                      key={role.id}
                      className={`text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] focus:bg-[#00d4ff] focus:text-white ${
                        !canManage ? 'opacity-50 pointer-events-none' : ''
                      }`}
                      onClick={() => handleToggleRole(member.id, role.id, role.name, hasRole)}
                      disabled={!canManage}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: role.color }}
                        />
                        <span 
                          className="truncate"
                          style={{ color: hasRole ? role.color : undefined }}
                        >
                          {role.name}
                        </span>
                      </div>
                      {hasRole && (
                        <Check className="w-4 h-4 ml-2" style={{ color: role.color }} />
                      )}
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {/* Kick/Ban - Only for Owner, Admin, and Moderator */}
          {(isOwner || currentUserRole === 'admin' || currentUserRole === 'moderator') && (
            <>
              <ContextMenuSeparator className="bg-[#232438]" />
              <ContextMenuItem
                className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 focus:bg-[#ed4245]/10"
                onClick={() => handleKickMember(member.id, displayName)}
                disabled={!canManage}
              >
                Kick Member
              </ContextMenuItem>

              <ContextMenuItem
                className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 focus:bg-[#ed4245]/10"
                onClick={() => handleBanMember(member.id, displayName)}
                disabled={!canManage}
              >
                Ban Member
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div className="w-60 bg-[#232438] border-l border-[#0f0f1a] hidden lg:flex flex-col">
        {/* Header with role manager button */}
        <div className="p-3 border-b border-[#0f0f1a] flex items-center justify-between">
          <span className="text-[#96989d] text-xs font-semibold uppercase">Member</span>
          {(isOwner || currentUserRole === 'admin') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleManager(true)}
              className="h-7 px-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c]"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Online Members grouped by Role - only show groups with members */}
          {sortedCombinations
            .filter(group => group.members.length > 0)
            .map((group, index) => (
              <div key={index} className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 px-2">
                  {group.roleParts.map((part, i) => (
                    <span key={i}>
                      <span style={{ color: part.color }}>{part.name}</span>
                      {i < group.roleParts.length - 1 && (
                        <span className="text-[#96989d] mx-1">—</span>
                      )}
                    </span>
                  ))}
                  <span className="text-[#96989d] ml-1">— {group.members.length}</span>
                </h3>
                <div className="space-y-1">
                  {group.members.map((member) => (
                    <MemberItem key={member.id} member={member} showRole={false} />
                  ))}
                </div>
              </div>
            ))}
          
          {/* Offline Members */}
          {offlineMembers.length > 0 && (
            <div className="mb-6 mt-6">
              <h3 className="text-[#96989d] text-xs font-semibold uppercase tracking-wide mb-2 px-2">
                Offline — {offlineMembers.length}
              </h3>
              <div className="space-y-1">
                {offlineMembers.map((member) => (
                  <MemberItem key={member.id} member={member} />
                ))}
              </div>
            </div>
          )}
          
          {onlineMembers.length === 0 && offlineMembers.length === 0 && (
            <div className="text-center text-[#6a6a7a] text-sm py-4">
              Tidak ada member di server ini
            </div>
          )}
        </div>
      </div>

      {/* Role Manager Modal */}
      <RoleManagerModal
        isOpen={showRoleManager}
        onClose={() => {
          setShowRoleManager(false);
          // Re-fetch custom roles after modal closes
          fetchCustomRoles();
        }}
        serverId={serverId}
        currentUserRole={currentUserRole || undefined}
        isOwner={isOwner}
      />

      {/* Member Profile Popup */}
      <MemberProfilePopup
        member={selectedMember ? membersWithLiveStatus.find(m => m.id === selectedMember.id) || selectedMember : null}
        isOpen={showProfilePopup}
        onClose={() => {
          setShowProfilePopup(false);
          setSelectedMember(null);
        }}
        onSendMessage={() => {
          if (onStartDM && selectedMember) {
            onStartDM({
              id: selectedMember.id,
              username: selectedMember.username,
              displayName: selectedMember.displayName,
              avatar: selectedMember.avatar,
              status: selectedMember.status
            });
          }
          setShowProfilePopup(false);
        }}
        serverId={serverId}
      />
    </>
  );
}

