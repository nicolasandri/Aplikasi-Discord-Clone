import { useEffect, useState, useCallback } from 'react';
import { Crown, Shield, ShieldAlert, User } from 'lucide-react';
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

interface MemberListProps {
  serverId: string | null;
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

const roleIcons = {
  owner: Crown,
  admin: ShieldAlert,
  moderator: Shield,
  member: User,
};

const roleColors = {
  owner: 'text-[#ffd700]',
  admin: 'text-[#ed4245]',
  moderator: 'text-[#43b581]',
  member: 'text-[#b9bbbe]',
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};

// Role hierarchy for checking who can manage whom
const roleHierarchy: Record<string, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

export function MemberList({ serverId }: MemberListProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (serverId) {
      fetchMembers();
      fetchCurrentUserPermissions();
    }
  }, [serverId]);

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
        // Get current user ID from token
        const tokenData = JSON.parse(atob(token!.split('.')[1]));
        setCurrentUserId(tokenData.id);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const canManageUser = useCallback((targetRole: string, targetId: string) => {
    if (!currentUserRole || !currentUserId) return false;
    if (currentUserId === targetId) return false; // Can't manage yourself
    
    const currentLevel = roleHierarchy[currentUserRole];
    const targetLevel = roleHierarchy[targetRole];
    
    // Owner can manage everyone except other owners
    // Admin can manage moderator and member
    // Moderator can't manage roles
    return currentLevel > targetLevel;
  }, [currentUserRole, currentUserId]);

  const canChangeRole = useCallback((targetRole: string, targetId: string, newRole: string) => {
    if (!canManageUser(targetRole, targetId)) return false;
    
    // Admin cannot assign admin role (only owner can)
    if (currentUserRole === 'admin' && newRole === 'admin') return false;
    
    return true;
  }, [canManageUser, currentUserRole]);

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
          description: `Role berhasil diubah ke ${roleLabels[newRole as keyof typeof roleLabels]}`,
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

  if (!serverId) {
    return (
      <div className="w-60 bg-[#2f3136] border-l border-[#202225] hidden lg:block">
        <div className="p-4 text-[#72767d] text-sm text-center">
          Pilih server untuk melihat member
        </div>
      </div>
    );
  }

  const onlineMembers = members.filter(m => m.status !== 'offline');
  const offlineMembers = members.filter(m => m.status === 'offline');

  const groupedMembers = [
    { title: `Online — ${onlineMembers.length}`, members: onlineMembers },
    { title: `Offline — ${offlineMembers.length}`, members: offlineMembers },
  ];

  const MemberItem = ({ member }: { member: ServerMember }) => {
    const RoleIcon = roleIcons[member.role];
    const canManage = canManageUser(member.role, member.id);
    const showContextMenu = canManage;

    const memberContent = (
      <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#34373c] cursor-pointer group">
        <div className="relative">
          <img
            src={member.avatar}
            alt={member.username}
            className="w-8 h-8 rounded-full"
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
            <RoleIcon className={`w-3 h-3 ${roleColors[member.role]}`} />
          </div>
          <div className="text-[10px] text-[#72767d] uppercase tracking-wide">
            {roleLabels[member.role]}
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
        <ContextMenuContent className="w-48 bg-[#18191c] border-[#2f3136]">
          <div className="px-2 py-1.5 text-sm font-medium text-[#dcddde]">
            {member.username}
          </div>
          <ContextMenuSeparator className="bg-[#2f3136]" />
          
          {/* Change Role Submenu */}
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-[#b9bbbe] hover:text-white hover:bg-[#5865f2] focus:bg-[#5865f2] focus:text-white">
              Ubah Role
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="bg-[#18191c] border-[#2f3136]">
              {(['member', 'moderator', 'admin'] as const).map((role) => (
                <ContextMenuItem
                  key={role}
                  className={`text-[#b9bbbe] hover:text-white hover:bg-[#5865f2] focus:bg-[#5865f2] focus:text-white ${
                    member.role === role ? 'bg-[#5865f2]/20' : ''
                  } ${!canChangeRole(member.role, member.id, role) ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={() => handleChangeRole(member.id, role)}
                  disabled={!canChangeRole(member.role, member.id, role)}
                >
                  <span className={`w-2 h-2 rounded-full mr-2 ${roleColors[role].replace('text-', 'bg-')}`} />
                  {roleLabels[role]}
                  {member.role === role && <span className="ml-auto text-xs">✓</span>}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator className="bg-[#2f3136]" />

          <ContextMenuItem
            className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 focus:bg-[#ed4245]/10"
            onClick={() => handleKickMember(member.id, member.username)}
          >
            Kick Member
          </ContextMenuItem>

          <ContextMenuItem
            className="text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 focus:bg-[#ed4245]/10"
            onClick={() => handleBanMember(member.id, member.username)}
          >
            Ban Member
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="w-60 bg-[#2f3136] border-l border-[#202225] hidden lg:flex flex-col">
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
  );
}
