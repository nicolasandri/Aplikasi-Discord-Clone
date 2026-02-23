import { useEffect, useState } from 'react';
import { Crown, Shield, User } from 'lucide-react';
import type { ServerMember } from '@/types';

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
  admin: Shield,
  member: User,
};

const roleColors = {
  owner: 'text-[#ffd700]',
  admin: 'text-[#43b581]',
  member: 'text-[#b9bbbe]',
};

export function MemberList({ serverId }: MemberListProps) {
  const [members, setMembers] = useState<ServerMember[]>([]);

  useEffect(() => {
    if (serverId) {
      fetchMembers();
    }
  }, [serverId]);

  const fetchMembers = async () => {
    if (!serverId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members`, {
        headers: { Authorization: token || '' },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
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
                {group.members.map((member) => {
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#34373c] cursor-pointer group"
                    >
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
