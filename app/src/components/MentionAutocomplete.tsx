import { useState, useEffect, useCallback, useRef } from 'react';
import type { ServerMember } from '@/types';

interface Role {
  id: string;
  name: string;
  color: string;
}

interface MentionAutocompleteProps {
  query: string;
  serverId: string;
  onSelect: (mention: string) => void;
  onClose: () => void;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
const BASE_URL = isElectron ? 'http://localhost:3001' : '';

export function MentionAutocomplete({ query, serverId, onSelect, onClose }: MentionAutocompleteProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch members and roles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch members
        const membersRes = await fetch(`${API_URL}/servers/${serverId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }

        // Fetch roles
        const rolesRes = await fetch(`${API_URL}/servers/${serverId}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          setRoles(rolesData);
        }
      } catch (error) {
        console.error('Failed to fetch mention data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [serverId]);

  // Filter items based on query
  const filteredMembers = members.filter(member => {
    const searchQuery = query.toLowerCase();
    return (
      member.username.toLowerCase().includes(searchQuery) ||
      member.displayName?.toLowerCase().includes(searchQuery)
    );
  }).slice(0, 10); // Limit to 10 results

  const filteredRoles = roles.filter(role => {
    const searchQuery = query.toLowerCase();
    return role.name.toLowerCase().includes(searchQuery);
  }).slice(0, 5); // Limit to 5 results

  // Add @everyone and @here options when query matches or is empty
  const showEveryone = !query || 'everyone'.toLowerCase().includes(query.toLowerCase());
  const showHere = !query || 'here'.toLowerCase().includes(query.toLowerCase());
  
  // Combine items for selection
  const items: Array<
    | { type: 'everyone'; data: null }
    | { type: 'here'; data: null }
    | { type: 'member'; data: ServerMember }
    | { type: 'role'; data: Role }
  > = [
    ...(showEveryone ? [{ type: 'everyone' as const, data: null }] : []),
    ...(showHere ? [{ type: 'here' as const, data: null }] : []),
    ...filteredMembers.map(m => ({ type: 'member' as const, data: m })),
    ...filteredRoles.map(r => ({ type: 'role' as const, data: r }))
  ];

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (items[selectedIndex]) {
            handleSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onClose]);

  const handleSelect = (item: typeof items[0]) => {
    if (item.type === 'everyone') {
      onSelect(`<@everyone>`);
    } else if (item.type === 'here') {
      onSelect(`<@here>`);
    } else if (item.type === 'member') {
      onSelect(`<@${item.data.id}>`);
    } else {
      onSelect(`<@&${item.data.id}>`);
    }
  };

  const getAvatarUrl = (member: ServerMember) => {
    if (!member.avatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
    }
    if (member.avatar?.startsWith('http')) {
      return member.avatar;
    }
    const avatarPath = member.avatar?.startsWith('/') ? member.avatar : `/${member.avatar}`;
    return `${BASE_URL}${avatarPath}`;
  };

  if (loading) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#2B2D31] rounded-lg shadow-xl border border-[#1E1F22] z-50">
        <div className="p-4 text-center text-[#949ba4]">
          <div className="w-6 h-6 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-sm">Loading...</p>
          <p className="text-xs text-[#6a6a7a]">Loading members and roles...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 mb-2 w-80 bg-[#2B2D31] rounded-lg shadow-xl border border-[#1E1F22] z-50">
        <div className="p-3 text-sm text-[#949ba4]">
          No matches found
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto bg-[#2B2D31] rounded-lg shadow-xl border border-[#1E1F22] z-50"
    >
      {/* Everyone Section */}
      {showEveryone && (
        <div className="border-b border-[#1E1F22]">
          <button
            onClick={() => handleSelect({ type: 'everyone', data: null })}
            className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#404249] transition-colors ${
              selectedIndex === 0 ? 'bg-[#404249]' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#00d4ff] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">@</span>
            </div>
            <div className="text-left">
              <div className="text-white text-sm font-medium">
                everyone
              </div>
              <div className="text-[#949ba4] text-xs">
                Notify everyone in this server
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Here Section */}
      {showHere && (
        <div className="border-b border-[#1E1F22]">
          <button
            onClick={() => handleSelect({ type: 'here', data: null })}
            className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#404249] transition-colors ${
              selectedIndex === (showEveryone ? 1 : 0) ? 'bg-[#404249]' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-[#3BA55D] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">@</span>
            </div>
            <div className="text-left">
              <div className="text-white text-sm font-medium">
                here
              </div>
              <div className="text-[#949ba4] text-xs">
                Notify online, idle, and DnD members
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Members Section */}
      {filteredMembers.length > 0 && (
        <div className="border-b border-[#1E1F22]">
          <div className="px-3 py-2 text-xs font-semibold text-[#949ba4] uppercase">
            Members ({filteredMembers.length})
          </div>
          {filteredMembers.map((member, index) => {
            const actualIndex = (showEveryone ? 1 : 0) + (showHere ? 1 : 0) + index;
            return (
              <button
                key={member.id}
                onClick={() => handleSelect({ type: 'member', data: member })}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#404249] transition-colors ${
                  selectedIndex === actualIndex ? 'bg-[#404249]' : ''
                }`}
              >
                <img
                  src={getAvatarUrl(member)}
                  alt={member.username}
                  className="w-8 h-8 rounded-full bg-[#1a1b2e] object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
                  }}
                />
                <div className="text-left">
                  <div className="text-white text-sm font-medium">
                    {member.displayName || member.username}
                  </div>
                  <div className="text-[#949ba4] text-xs">
                    {member.username}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Roles Section */}
      {filteredRoles.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-[#949ba4] uppercase">
            Roles ({filteredRoles.length})
          </div>
          {filteredRoles.map((role, index) => {
            const actualIndex = (showEveryone ? 1 : 0) + (showHere ? 1 : 0) + filteredMembers.length + index;
            return (
              <button
                key={role.id}
                onClick={() => handleSelect({ type: 'role', data: role })}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#404249] transition-colors ${
                  selectedIndex === actualIndex ? 'bg-[#404249]' : ''
                }`}
              >
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: role.color || '#99aab5' }}
                />
                <span 
                  className="text-sm font-medium"
                  style={{ color: role.color || '#99aab5' }}
                >
                  @{role.name}
                </span>
                <span className="ml-auto text-xs text-[#949ba4]">
                  Notify users with this role who have permission to view this channel.
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

