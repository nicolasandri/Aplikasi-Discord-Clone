import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ArrowUpDown, UserX, MoreVertical, Shield, Bot, MessageSquare, Crown, Ban, UserMinus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MemberProfilePanel } from './MemberProfilePanel';
import type { ServerMember } from '@/types';

interface ServerMembersProps {
  serverId: string;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const BASE_URL = (() => {
  if (API_URL.startsWith('http')) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  return 'http://localhost:3001';
})();

export function ServerMembers({ serverId }: ServerMembersProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInChannelList, setShowInChannelList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [selectedMember, setSelectedMember] = useState<ServerMember | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchMembers = useCallback(async () => {
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
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchMembers();
    setAvatarVersion(Date.now());
  }, [fetchMembers]);

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

  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.username.toLowerCase().includes(query) ||
      member.displayName?.toLowerCase().includes(query) ||
      member.id.toLowerCase().includes(query)
    );
  });

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMonths = (now.getFullYear() - past.getFullYear()) * 12 + 
      (now.getMonth() - past.getMonth());
    
    if (diffInMonths >= 12) {
      const years = Math.floor(diffInMonths / 12);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
    if (diffInMonths > 0) {
      return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }
    return 'Recently';
  };

  const getAvatarUrl = (member: ServerMember) => {
    if (!member.avatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
    }
    if (member.avatar.startsWith('http')) {
      return member.avatar;
    }
    return `${BASE_URL}${member.avatar}?v=${avatarVersion}`;
  };

  const getRoleBadge = (member: ServerMember) => {
    if (member.role_name) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
          style={{ 
            backgroundColor: `${member.role_color || '#99aab5'}20`,
            color: member.role_color || '#99aab5'
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ backgroundColor: member.role_color || '#99aab5' }}
          />
          {member.role_name}
        </span>
      );
    }
    
    const roleLabels: Record<string, { label: string; color: string }> = {
      owner: { label: 'Owner', color: '#ffd700' },
      admin: { label: 'Admin', color: '#ed4245' },
      moderator: { label: 'Moderator', color: '#43b581' },
      member: { label: 'Member', color: '#99aab5' },
    };
    
    const role = roleLabels[member.role] || { label: 'Member', color: '#99aab5' };
    
    return (
      <span 
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
        style={{ 
          backgroundColor: `${role.color}20`,
          color: role.color
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }} />
        {role.label}
      </span>
    );
  };

  const handleKickMember = async (memberId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberId));
        setMenuOpen(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to kick member');
      }
    } catch (error) {
      console.error('Failed to kick member:', error);
    }
  };

  const handleBanMember = async (memberId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/bans/${memberId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberId));
        setMenuOpen(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to ban member');
      }
    } catch (error) {
      console.error('Failed to ban member:', error);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
        setMenuOpen(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to change role');
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  // Get current user role
  const currentUserId = localStorage.getItem('userId');
  const currentMember = members.find(m => m.id === currentUserId);
  const canManage = currentMember?.role === 'owner' || currentMember?.role === 'admin' || currentMember?.role === 'moderator';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle Setting */}
      <div className="flex items-start justify-between p-4 bg-[#2b2d31] rounded-lg">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">Show Members in Channel List</h3>
          <p className="text-[#b9bbbe] text-sm">
            Enabling this will show the members page in the channel list, allowing you to quickly see who's recently joined your server, and find any users flagged for unusual activity.
          </p>
        </div>
        <Switch
          checked={showInChannelList}
          onCheckedChange={setShowInChannelList}
          className="data-[state=checked]:bg-[#5865f2]"
        />
      </div>

      {/* Members Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent Members</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
              <input
                type="text"
                placeholder="Search by username or id"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#1e1f22] text-white pl-9 pr-4 py-2 rounded text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded text-sm transition-colors">
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#ed4245] rounded text-sm transition-colors">
              <UserX className="w-4 h-4" />
              Prune
            </button>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-[#2b2d31] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[#72767d] text-xs uppercase border-b border-[#1e1f22]">
                <th className="py-3 px-4 text-left font-semibold w-10">
                  <input type="checkbox" className="rounded bg-[#1e1f22] border-[#72767d]" />
                </th>
                <th className="py-3 px-4 text-left font-semibold">Name</th>
                <th className="py-3 px-4 text-left font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center gap-1">
                    Member Since
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-left font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center gap-1">
                    Joined Discord
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-left font-semibold">Join Method</th>
                <th className="py-3 px-4 text-left font-semibold">Roles</th>
                <th className="py-3 px-4 text-left font-semibold">Signals</th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr 
                  key={member.id} 
                  className="border-b border-[#1e1f22] hover:bg-[#35373c] transition-colors cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded bg-[#1e1f22] border-[#72767d]" />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getAvatarUrl(member)}
                        alt={member.username}
                        className="w-8 h-8 rounded-full bg-[#36393f]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{member.displayName || member.username}</span>
                          {member.role === 'owner' && <Shield className="w-4 h-4 text-[#ffd700]" />}
                          {member.isBot && <Bot className="w-4 h-4 text-[#5865f2]" />}
                          {member.role_name && (
                            <span className="text-xs">{member.role_name}</span>
                          )}
                        </div>
                        <span className="text-[#72767d] text-sm">{member.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#b9bbbe] text-sm">
                    {formatTimeAgo(member.joinedAt || new Date().toISOString())}
                  </td>
                  <td className="py-3 px-4 text-[#b9bbbe] text-sm">
                    {formatTimeAgo(member.createdAt || new Date().toISOString())}
                  </td>
                  <td className="py-3 px-4 text-[#b9bbbe] text-sm">
                    {member.joinMethod || 'Unknown'}
                  </td>
                  <td className="py-3 px-4">
                    {getRoleBadge(member)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {member.status === 'online' && (
                        <div className="flex items-center gap-1 text-[#3ba55d]">
                          <span className="w-2 h-2 rounded-full bg-[#3ba55d]" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="relative" ref={menuOpen === member.id ? menuRef : null}>
                      <button 
                        onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                        className="p-1 hover:bg-[#40444b] rounded text-[#b9bbbe] hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {menuOpen === member.id && canManage && member.id !== currentUserId && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#18191c] rounded-lg shadow-xl z-50 py-1 border border-[#2f3136]">
                          <button
                            onClick={() => { setSelectedMember(member); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                          >
                            <MessageSquare className="w-4 h-4" />
                            View Profile
                          </button>
                          
                          <div className="my-1 border-t border-[#2f3136]" />
                          
                          <button
                            onClick={() => handleChangeRole(member.id, 'admin')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                          >
                            <Crown className="w-4 h-4" />
                            Make Admin
                          </button>
                          
                          <button
                            onClick={() => handleChangeRole(member.id, 'moderator')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                          >
                            <Shield className="w-4 h-4" />
                            Make Moderator
                          </button>
                          
                          <button
                            onClick={() => handleChangeRole(member.id, 'member')}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                          >
                            <UserMinus className="w-4 h-4" />
                            Make Member
                          </button>
                          
                          <div className="my-1 border-t border-[#2f3136]" />
                          
                          <button
                            onClick={() => handleKickMember(member.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#ed4245] hover:bg-[#ed4245] hover:text-white text-sm"
                          >
                            <UserX className="w-4 h-4" />
                            Kick Member
                          </button>
                          
                          <button
                            onClick={() => handleBanMember(member.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#ed4245] hover:bg-[#ed4245] hover:text-white text-sm"
                          >
                            <Ban className="w-4 h-4" />
                            Ban Member
                          </button>
                        </div>
                      )}
                      
                      {menuOpen === member.id && (!canManage || member.id === currentUserId) && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#18191c] rounded-lg shadow-xl z-50 py-1 border border-[#2f3136]">
                          <button
                            onClick={() => { setSelectedMember(member); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                          >
                            <MessageSquare className="w-4 h-4" />
                            View Profile
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Footer */}
          <div className="py-3 px-4 border-t border-[#1e1f22] text-[#72767d] text-sm">
            Showing {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Member Profile Panel */}
      <MemberProfilePanel
        member={selectedMember}
        serverId={serverId}
        onClose={() => setSelectedMember(null)}
        onMessage={() => {
          // TODO: Open DM with member
          setSelectedMember(null);
        }}
        onKick={() => {
          // TODO: Kick member
          console.log('Kick member:', selectedMember?.id);
        }}
        onBan={() => {
          // TODO: Ban member
          console.log('Ban member:', selectedMember?.id);
        }}
      />
    </div>
  );
}
