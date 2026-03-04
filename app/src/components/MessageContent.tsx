import { useMemo, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface MessageContentProps {
  content: string;
  serverId?: string;
}

interface MentionData {
  users: Record<string, { username: string; displayName?: string }>;
  roles: Record<string, { name: string; color: string }>;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function MessageContent({ content, serverId }: MessageContentProps) {
  const [mentionData, setMentionData] = useState<MentionData>({ users: {}, roles: {} });

  // Fetch mention data (members and roles) when serverId changes
  useEffect(() => {
    if (!serverId) return;
    
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Fetch members
        const membersRes = await fetch(`${API_URL}/servers/${serverId}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const users: MentionData['users'] = {};
        if (membersRes.ok) {
          const members = await membersRes.json();
          members.forEach((m: { id: string; username: string; displayName?: string }) => {
            users[m.id] = { username: m.username, displayName: m.displayName };
          });
        }

        // Fetch roles
        const rolesRes = await fetch(`${API_URL}/servers/${serverId}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const roles: MentionData['roles'] = {};
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          rolesData.forEach((r: { id: string; name: string; color: string }) => {
            roles[r.id] = { name: r.name, color: r.color };
          });
        }

        setMentionData({ users, roles });
      } catch (error) {
        console.error('Failed to fetch mention data:', error);
      }
    };

    fetchData();
  }, [serverId]);

  const parseContent = useCallback((text: string): ReactNode[] => {
    if (!text) return [];
    
    const parts: ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // Helper to add text with markdown
    const addTextPart = (text: string) => {
      if (!text) return;
      
      // Escape HTML first
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      // Apply markdown (but NOT mentions - we handle those separately)
      html = html
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Strikethrough
        .replace(/~~(.+?)~~/g, '<s class="text-gray-400">$1</s>')
        // Inline code
        .replace(/`(.+?)`/g, '<code class="bg-[#2B2D31] px-1.5 py-0.5 rounded text-sm font-mono text-[#b9bbbe]">$1</code>')
        // Links
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#00AFF4] hover:underline">$1</a>')
        // Newlines
        .replace(/\n/g, '<br />');
      
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
    };

    // Regex to match user, role, and @everyone mentions
    const mentionRegex = /<@([a-f0-9-]+)>|<@&([a-f0-9-]+)>|<@(everyone|here)>/g;
    let match;
    let lastIndex = 0;

    while ((match = mentionRegex.exec(remaining)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        addTextPart(remaining.slice(lastIndex, match.index));
      }

      const [fullMatch, userId, roleId, everyoneOrHere] = match;

      if (everyoneOrHere) {
        // @everyone or @here mention - use Discord's yellow/gold color
        parts.push(
          <span
            key={key++}
            className="bg-[#FAA61A]/20 text-[#FAA61A] rounded px-1 font-medium cursor-pointer hover:bg-[#FAA61A]/30 transition-colors"
          >
            @{everyoneOrHere}
          </span>
        );
      } else if (userId) {
        // User mention
        const user = mentionData.users[userId];
        const name = user ? (user.displayName || user.username) : 'Unknown User';
        parts.push(
          <span
            key={key++}
            className="bg-[#5865F2]/20 text-[#5865F2] rounded px-1 font-medium cursor-pointer hover:bg-[#5865F2]/30 transition-colors hover:underline"
          >
            @{name}
          </span>
        );
      } else if (roleId) {
        // Role mention
        const role = mentionData.roles[roleId];
        const roleName = role ? role.name : 'Unknown Role';
        const color = role?.color || '#99aab5';
        parts.push(
          <span
            key={key++}
            className="rounded px-1 font-medium cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: `${color}20`, color }}
          >
            @{roleName}
          </span>
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < remaining.length) {
      addTextPart(remaining.slice(lastIndex));
    }

    return parts;
  }, [mentionData]);

  const contentParts = useMemo(() => parseContent(content), [content, parseContent]);

  return (
    <div className="message-content text-[#dcddde] leading-relaxed whitespace-pre-wrap">
      {contentParts}
    </div>
  );
}
