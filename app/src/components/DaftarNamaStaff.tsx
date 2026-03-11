import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ArrowUpDown, UserX, Crown, Bot } from 'lucide-react';
import type { ServerMember } from '@/types';

interface DaftarNamaStaffProps {
  serverId: string;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
const BASE_URL = isElectron ? 'http://localhost:3001' : '';

type SortOption = 'memberSinceDesc' | 'memberSinceAsc' | 'joinedDiscordDesc' | 'joinedDiscordAsc';

export function DaftarNamaStaff({ serverId }: DaftarNamaStaffProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('memberSinceDesc');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

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
  }, [fetchMembers]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortMembers = (members: ServerMember[]) => {
    const sorted = [...members];
    switch (sortOption) {
      case 'memberSinceDesc':
        return sorted.sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime());
      case 'memberSinceAsc':
        return sorted.sort((a, b) => new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime());
      case 'joinedDiscordDesc':
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case 'joinedDiscordAsc':
        return sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      default:
        return sorted;
    }
  };

  const filteredMembers = sortMembers(members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.username.toLowerCase().includes(query) ||
      member.displayName?.toLowerCase().includes(query)
    );
  }));

  const formatTimeAgo = (date: string) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const past = new Date(date);
    const diffInDays = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInMonths / 12);
    
    if (diffInYears >= 1) return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    if (diffInMonths >= 1) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    if (diffInDays >= 1) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return 'Recently';
  };

  const getAvatarUrl = (member: ServerMember) => {
    if (!member.avatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
    }
    if (member.avatar.startsWith('http')) {
      return member.avatar;
    }
    const avatarPath = member.avatar.startsWith('/') ? member.avatar : `/${member.avatar}`;
    return `${BASE_URL}${avatarPath}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search, Sort, Prune */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-base">DAFTAR NAMA STAFF</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6a6a7a]" />
            <input
              type="text"
              placeholder="Search by username or id"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1e1f22] text-white pl-9 pr-4 py-2 rounded text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#00d4ff] placeholder:text-[#6a6a7a]"
            />
          </div>
          <div className="relative" ref={sortRef}>
            <button 
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-white rounded text-sm transition-colors border border-[#1e1f22]"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>
            
            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#111214] rounded-lg shadow-lg border border-[#1e1f22] py-2 z-50">
                <div className="px-3 py-2 text-[#949ba4] text-xs font-semibold uppercase">Sort by</div>
                
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-[#35373c] cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortOption === 'memberSinceDesc'}
                    onChange={() => { setSortOption('memberSinceDesc'); setSortDropdownOpen(false); }}
                    className="w-4 h-4 accent-[#00d4ff]"
                  />
                  <span className="text-[#dbdee1] text-sm">Member Since (Newest first)</span>
                </label>
                
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-[#35373c] cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortOption === 'memberSinceAsc'}
                    onChange={() => { setSortOption('memberSinceAsc'); setSortDropdownOpen(false); }}
                    className="w-4 h-4 accent-[#00d4ff]"
                  />
                  <span className="text-[#dbdee1] text-sm">Member Since (Oldest first)</span>
                </label>
                
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-[#35373c] cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortOption === 'joinedDiscordDesc'}
                    onChange={() => { setSortOption('joinedDiscordDesc'); setSortDropdownOpen(false); }}
                    className="w-4 h-4 accent-[#00d4ff]"
                  />
                  <span className="text-[#dbdee1] text-sm">Joined Discord (Newest first)</span>
                </label>
                
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-[#35373c] cursor-pointer">
                  <input
                    type="radio"
                    name="sort"
                    checked={sortOption === 'joinedDiscordAsc'}
                    onChange={() => { setSortOption('joinedDiscordAsc'); setSortDropdownOpen(false); }}
                    className="w-4 h-4 accent-[#00d4ff]"
                  />
                  <span className="text-[#dbdee1] text-sm">Joined Discord (Oldest first)</span>
                </label>
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#ed4245] rounded text-sm transition-colors border border-[#1e1f22]">
            <UserX className="w-4 h-4" />
            Prune
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[#949ba4] text-xs font-medium border-b border-[#1e1f22]">
              <th className="py-2 px-4 text-left w-10">
                <input type="checkbox" className="rounded bg-[#2b2d31] border-[#4e5058]" />
              </th>
              <th className="py-2 px-4 text-left">Name</th>
              <th 
                className="py-2 px-4 text-left cursor-pointer hover:text-white"
                onClick={() => {
                  if (sortOption === 'memberSinceDesc') {
                    setSortOption('memberSinceAsc');
                  } else {
                    setSortOption('memberSinceDesc');
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  Member Since
                  {sortOption === 'memberSinceDesc' && <ArrowUpDown className="w-3 h-3 rotate-180" />}
                  {sortOption === 'memberSinceAsc' && <ArrowUpDown className="w-3 h-3" />}
                </div>
              </th>
              <th 
                className="py-2 px-4 text-left cursor-pointer hover:text-white"
                onClick={() => {
                  if (sortOption === 'joinedDiscordDesc') {
                    setSortOption('joinedDiscordAsc');
                  } else {
                    setSortOption('joinedDiscordDesc');
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  Joined Discord
                  {sortOption === 'joinedDiscordDesc' && <ArrowUpDown className="w-3 h-3 rotate-180" />}
                  {sortOption === 'joinedDiscordAsc' && <ArrowUpDown className="w-3 h-3" />}
                </div>
              </th>
              <th className="py-2 px-4 text-left">Join Method</th>
              <th className="py-2 px-4 text-left">Roles</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr 
                key={member.id} 
                className="border-b border-[#1e1f22] hover:bg-[#2b2d31]/50 transition-colors group"
              >
                <td className="py-3 px-4">
                  <input type="checkbox" className="rounded bg-[#2b2d31] border-[#4e5058]" />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatarUrl(member)}
                      alt={member.username}
                      className="w-8 h-8 rounded-full bg-[#1a1b2e] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#00d4ff] font-medium hover:underline cursor-pointer">
                          {member.displayName || member.username}
                        </span>
                        {member.role === 'owner' && <Crown className="w-4 h-4 text-[#f0b232]" />}
                      </div>
                      <div className="text-[#949ba4] text-sm">{member.username}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#dbdee1] text-sm">
                  {formatTimeAgo(member.joinedAt || '')}
                </td>
                <td className="py-3 px-4 text-[#dbdee1] text-sm">
                  {formatTimeAgo(member.createdAt || '')}
                </td>
                <td className="py-3 px-4 text-[#dbdee1] text-sm">
                  {member.joinMethod || 'Unknown'}
                </td>
                <td className="py-3 px-4">
                  {member.role_name ? (
                    <span 
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: member.role_color ? `${member.role_color}20` : '#00d4ff20',
                        color: member.role_color || '#00d4ff'
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: member.role_color || '#00d4ff' }}
                      />
                      {member.role_name}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#99aab520] text-[#99aab5]">
                      <span className="w-2 h-2 rounded-full bg-[#99aab5]" />
                      Member
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Showing count */}
      <div className="text-[#949ba4] text-sm">
        Showing {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

