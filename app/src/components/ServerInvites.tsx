import { useState, useEffect, useCallback, useRef } from 'react';
import { UserPlus, Copy, Trash2, MoreVertical, X, Clock, Users, Link2, Check } from 'lucide-react';

interface ServerInvitesProps {
  serverId: string;
}

interface Invite {
  id: string;
  code: string;
  serverId: string;
  createdBy: string;
  createdByUsername: string;
  createdByAvatar?: string;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
  roleId?: string | null;
  roleName?: string | null;
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

export function ServerInvites({ serverId }: ServerInvitesProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

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

  const handleCopyInvite = (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteInvite = async (code: string) => {
    if (!confirm('Are you sure you want to delete this invite?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/invites/${code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        await fetchInvites();
        setMenuOpen(null);
      }
    } catch (error) {
      console.error('Failed to delete invite:', error);
    }
  };

  const handleCreateInvite = async (maxUses: number | null, expiresIn: number | null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/invites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maxUses, expiresIn }),
      });
      if (response.ok) {
        await fetchInvites();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
    }
  };

  const formatExpires = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAvatarUrl = (invite: Invite) => {
    if (!invite.createdByAvatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${invite.createdByUsername}`;
    }
    if (invite.createdByAvatar.startsWith('http')) return invite.createdByAvatar;
    return `${BASE_URL}${invite.createdByAvatar}`;
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white text-xl font-bold mb-1">Invites</h2>
          <p className="text-[#b9bbbe] text-sm">
            Manage your server's invite links and see who has joined.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 bg-[#2b2d31] hover:bg-[#35373c] text-[#ed4245] rounded text-sm font-medium transition-colors border border-[#ed4245]/30">
          Pause Invites
        </button>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create Invite Link
        </button>
      </div>

      {/* Invites Table */}
      <div className="bg-[#2b2d31] rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_80px_140px_80px_50px] gap-4 px-4 py-3 border-b border-[#1e1f22] text-[#72767d] text-xs font-semibold uppercase">
          <span>Inviter</span>
          <span>Invite Code</span>
          <span className="text-center">Uses</span>
          <span className="text-center">Expires</span>
          <span className="text-center">Roles</span>
          <span></span>
        </div>

        {/* Invite Items */}
        <div className="divide-y divide-[#1e1f22]">
          {invites.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#72767d]">
              <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No active invite links</p>
              <p className="text-sm mt-1">Create one to invite people to your server</p>
            </div>
          ) : (
            invites.map((invite) => (
              <div 
                key={invite.id}
                className="grid grid-cols-[1fr_120px_80px_140px_80px_50px] gap-4 px-4 py-3 items-center hover:bg-[#35373c] transition-colors group"
              >
                {/* Inviter */}
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatarUrl(invite)}
                    alt={invite.createdByUsername}
                    className="w-8 h-8 rounded-full bg-[#36393f]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${invite.createdByUsername}`;
                    }}
                  />
                  <div>
                    <span className="text-white font-medium">{invite.createdByUsername}</span>
                  </div>
                </div>

                {/* Invite Code */}
                <div className="flex items-center gap-2">
                  <code className="text-[#b9bbbe] text-sm">{invite.code}</code>
                  <button
                    onClick={() => handleCopyInvite(invite.code)}
                    className="p-1 hover:bg-[#40444b] rounded text-[#72767d] hover:text-white"
                    title="Copy invite link"
                  >
                    {copiedCode === invite.code ? (
                      <Check className="w-3.5 h-3.5 text-[#3ba55d]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Uses */}
                <div className="text-center text-[#b9bbbe]">
                  {invite.uses}{invite.maxUses ? `/${invite.maxUses}` : ''}
                </div>

                {/* Expires */}
                <div className="flex items-center justify-center gap-1.5 text-[#b9bbbe]">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-sm">{formatExpires(invite.expiresAt)}</span>
                </div>

                {/* Roles */}
                <div className="text-center">
                  {invite.roleName ? (
                    <span className="text-xs text-[#b9bbbe]">{invite.roleName}</span>
                  ) : (
                    <span className="text-xs text-[#72767d]">-</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end">
                  <div className="relative" ref={menuOpen === invite.code ? menuRef : null}>
                    <button 
                      onClick={() => setMenuOpen(menuOpen === invite.code ? null : invite.code)}
                      className="p-1.5 hover:bg-[#40444b] rounded text-[#b9bbbe] hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {menuOpen === invite.code && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-[#18191c] rounded-lg shadow-xl z-50 py-1 border border-[#2f3136]">
                        <button
                          onClick={() => { handleCopyInvite(invite.code); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(invite.code)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-[#ed4245] hover:bg-[#ed4245] hover:text-white text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Invite
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Invite Modal */}
      {showCreateModal && (
        <CreateInviteModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateInvite}
        />
      )}
    </div>
  );
}

// Create Invite Modal Component
function CreateInviteModal({ 
  onClose, 
  onCreate 
}: { 
  onClose: () => void; 
  onCreate: (maxUses: number | null, expiresIn: number | null) => void;
}) {
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>('');

  const expiresOptions = [
    { value: '', label: 'Never' },
    { value: '1800', label: '30 minutes' },
    { value: '3600', label: '1 hour' },
    { value: '21600', label: '6 hours' },
    { value: '43200', label: '12 hours' },
    { value: '86400', label: '1 day' },
    { value: '604800', label: '7 days' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#36393f] rounded-lg shadow-xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">Create Invite</h3>
          <button onClick={onClose} className="text-[#b9bbbe] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">
              Max Uses
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              min="1"
              className="w-full bg-[#202225] text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
            <p className="text-[#72767d] text-xs mt-1">Leave empty for unlimited uses</p>
          </div>
          
          <div>
            <label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">
              Expires After
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full bg-[#202225] text-white px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            >
              {expiresOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
            onClick={() => onCreate(
              maxUses ? parseInt(maxUses) : null,
              expiresIn ? parseInt(expiresIn) : null
            )}
            className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-sm font-medium"
          >
            Create Invite
          </button>
        </div>
      </div>
    </div>
  );
}
