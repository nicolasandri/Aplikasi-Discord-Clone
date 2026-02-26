import { useEffect, useState, useCallback } from 'react';
import { Crown, Settings } from 'lucide-react';
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

interface MemberListProps {
  serverId: string | null;
  isMobile?: boolean;
  userStatuses?: Map<string, string>;
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
  member: 'text-[#b9bbbe]',
};

// Role hierarchy for checking who can manage whom (higher = more power)
const roleHierarchy: Record<string, number> = {
  owner: 100,
  admin: 50,
  moderator: 30,
  member: 10,
};

export function MemberList({ serverId, isMobile: _isMobile = false, userStatuses }: MemberListProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const { toast } = useToast();

  // Apply userStatuses overrides to members
  const membersWithLiveStatus = members.map(member => {
    const liveStatus = userStatuses?.get(member.id);
    if (liveStatus) {
      return { ...member, status: liveStatus as 'online' | 'offline' | 'idle' | 'dnd' };
    }
    return member;
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

  // Re-fetch members every 10 seconds to ensure status is up to date
  useEffect(() => {
    if (!serverId) return;
    
    const interval = setInterval(() => {
      fetchMembers();
    }, 10000);

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
      const response = await fetch(`${API_URL}/servers/${serverId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
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
          description: `Role berhasil diubah`,
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
          description: `Role "${roleName}" berhasil diassign`,
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

  // Get display role for member
  const getMemberDisplay = (member: ServerMember) => {
    // If member has a custom role with name
    if (member.role_name) {
      return {
        name: member.role_name,
        color: member.role_color || '#99aab5',
        isCustom: true,
      };
    }
    
    // Fallback to legacy role
    return {
      name: member.role === 'owner' ? 'Owner' : 
            member.role === 'admin' ? 'Admin' :
            member.role === 'moderator' ? 'Moderator' : 'Member',
      color: member.role === 'owner' ? '#ffd700' : 
             member.role === 'admin' ? '#ed4245' :
             member.role === 'moderator' ? '#43b581' : '#99aab5',
      isCustom: false,
    };
  };

  if (!serverId) {
    return (
      <div className="w-60 bg-[#2f3136] border-l border-[#202225] hidden lg:block">
        <div className="p-4 text-[#72767d] text-sm text-center">
          Pilih server untuk melihat member
        </div>
      </div>
    );
  }

  const onlineMembers = membersWithLiveStatus.filter(m => m.status !== 'offline');
  const offlineMembers = membersWithLiveStatus.filter(m => m.status === 'offline');

  const groupedMembers = [
    { title: `Online — ${onlineMembers.length}`, members: onlineMembers },
    { title: `Offline — ${offlineMembers.length}`, members: offlineMembers },
  ];

  const MemberItem = ({ member }: { member: ServerMember }) => {
    const display = getMemberDisplay(member);
    const canManage = canManageUser(member.role, member.id);
    const showContextMenu = canManage || customRoles.length > 0;

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
      const baseUrl = API_URL.replace('/api', '');
      return `${baseUrl}${member.avatar}${member.avatar.includes('?') ? '&' : '?'}_v=${avatarVersion}`;
    };

    const memberContent = (
      <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#34373c] cursor-pointer group">
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
            className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[member.status]} rounded-full border-2 border-[#2f3136]`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[#dcddde] text-sm font-medium truncate group-hover:text-white">
              {member.username}
            </span>
            {member.role === 'owner' && <Crown className="w-3 h-3 text-[#ffd700]" />}
          </div>
          <div 
            className="text-[10px] uppercase tracking-wide"
            style={{ color: display.color }}
          >
            {display.name}
          </div>
        </div>
      </div>
    );

    if (!showContextMenu) {
      return (
        <div key={member.id}>
          {memberContent}
        </div>
      );
    }

    return (
      <ContextMenu key={member.id}>
        <ContextMenuTrigger asChild>
          {memberContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56 bg-[#18191c] border-[#2f3136]">
          <div className="px-2 py-1.5 text-sm font-medium text-[#dcddde]">
            {displayName}
          </div>
          <ContextMenuSeparator className="bg-[#2f3136]" />
          
          {/* Standard Roles Submenu */}
          {(isOwner || currentUserRole === 'admin') && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-[#b9bbbe] hover:text-white hover:bg-[#5865f2] focus:bg-[#5865f2] focus:text-white">
                Role Standar
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="bg-[#18191c] border-[#2f3136]">
                {(['member', 'moderator', 'admin'] as const).map((role) => (
                  <ContextMenuItem
                    key={role}
                    className={`text-[#b9bbbe] hover:text-white hover:bg-[#5865f2] focus:bg-[#5865f2] focus:text-white ${
                      member.role === role ? 'bg-[#5865f2]/20' : ''
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

          {/* Custom Roles Submenu */}
          {customRoles.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-[#b9bbbe] hover:text-white hover:bg-[#5865f2] focus:bg-[#5865f2] focus:text-white">
                Role Custom ({customRoles.length})
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="bg-[#18191c] border-[#2f3136]">
                {customRoles.map((role) => (
                  <ContextMenuItem
                    key={role.id}
                    className={`text-[#b9bbbe] hover:text-white hover:bg-[#5865f2] focus:bg-[#5865f2] focus:text-white ${
                      member.role_id === role.id ? 'bg-[#5865f2]/20' : ''
                    } ${!canManage ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleAssignCustomRole(member.id, role.id, role.name)}
                    disabled={!canManage}
                  >
                    <span 
                      className="w-2 h-2 rounded-full mr-2" 
                      style={{ backgroundColor: role.color }}
                    />
                    {role.name}
                    {member.role_id === role.id && <span className="ml-auto text-xs">✓</span>}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {((isOwner || currentUserRole === 'admin') || customRoles.length > 0) && (
            <ContextMenuSeparator className="bg-[#2f3136]" />
          )}

          <ContextMenuItem
            className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 focus:bg-[#ed4245]/10"
            onClick={() => handleKickMember(member.id, displayName)}
          >
            Kick Member
          </ContextMenuItem>

          <ContextMenuItem
            className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 focus:bg-[#ed4245]/10"
            onClick={() => handleBanMember(member.id, displayName)}
          >
            Ban Member
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      <div className="w-60 bg-[#2f3136] border-l border-[#202225] hidden lg:flex flex-col">
        {/* Header with role manager button */}
        <div className="p-3 border-b border-[#202225] flex items-center justify-between">
          <span className="text-[#96989d] text-xs font-semibold uppercase">Member</span>
          {(isOwner || currentUserRole === 'admin') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleManager(true)}
              className="h-7 px-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c]"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {groupedMembers.map((group) => (
            group.members.length > 0 && (
              <div key={group.title} className="mb-6">
                <h3 className="text-[#96989d] text-xs font-semibold uppercase tracking-wide mb-2 px-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.members.map((member) => (
                    <MemberItem key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )
          ))}
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
    </>
  );
}
