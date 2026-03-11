import { useState, useEffect } from 'react';
import { X, Settings, Shield, Users, ImageIcon, MoreVertical, KeyRound, Crown, ShieldCheck } from 'lucide-react';
import { ServerRoles } from './ServerRoles';
import { DaftarNamaStaff } from './DaftarNamaStaff';
import type { Server, ServerMember } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ServerSettingsPageProps {
  server: Server | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateServer?: (serverId: string, data: Partial<Server>) => void;
}

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Helper to convert relative URL to absolute URL
const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // For relative URLs, use current window origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

const BANNER_COLORS = [
  { bg: 'linear-gradient(135deg, #00d4ff 0%, #00b8db 100%)', name: 'Default' },
  { bg: 'linear-gradient(135deg, #eb459e 0%, #9b59b6 100%)', name: 'Pink' },
  { bg: 'linear-gradient(135deg, #ed4245 0%, #c0392b 100%)', name: 'Red' },
  { bg: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', name: 'Orange' },
  { bg: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)', name: 'Yellow' },
  { bg: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', name: 'Purple' },
  { bg: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', name: 'Blue' },
  { bg: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)', name: 'Teal' },
  { bg: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', name: 'Green' },
  { bg: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)', name: 'Dark' },
];

export function ServerSettingsPage({ server, isOpen, onClose, onUpdateServer }: ServerSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'members' | 'invites' | 'bans'>('overview');
  const [serverName, setServerName] = useState(server?.name || '');
  const [serverIcon, setServerIcon] = useState(server?.icon || '');
  const [description, setDescription] = useState('');
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[0].bg);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState<string | null>(null);

  // Only reset form when switching to a different server (not on every server prop update)
  // This prevents uploaded icon from being overwritten by stale server state from WebSocket
  useEffect(() => {
    if (server) {
      setServerName(server.name);
      setServerIcon(server.icon || '');
      setBannerColor(server.banner || BANNER_COLORS[0].bg);
      fetchMembers();
    }
  }, [server?.id]);

  const fetchMembers = async () => {
    if (!server) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/servers/${server.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMembers(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      console.error('No token found');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${currentToken}`
        },
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[handleIconUpload] Upload success, URL:', data.url);
        console.log('[handleIconUpload] Filename from server:', data.filename);
        setServerIcon(data.url);
        console.log('[handleIconUpload] serverIcon state set to:', data.url);
        alert('Icon berhasil diupload! Klik "Simpan Perubahan" untuk menyimpan.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[handleIconUpload] Upload failed:', response.status, errorData);
        alert('Gagal upload icon: ' + (errorData.error || response.statusText));
      }
    } catch (error) {
      console.error('Failed to upload icon:', error);
      alert('Gagal upload icon. Silakan coba lagi.');
    }
  };

  const handleSave = async () => {
    if (!server) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('[handleSave] Saving server with icon:', serverIcon);
      const res = await fetch(`${API_URL}/servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: serverName, icon: serverIcon, description, banner: bannerColor }),
      });
      
      if (res.ok) {
        const updatedServer = await res.json();
        console.log('[handleSave] Server updated successfully:', updatedServer);
        onUpdateServer?.(server.id, { name: serverName, icon: serverIcon, banner: bannerColor });
        alert('Server berhasil diperbarui!');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[handleSave] Failed to update server:', res.status, errorData);
        alert('Gagal menyimpan: ' + (errorData.error || res.statusText));
      }
    } catch (error) {
      console.error('[handleSave] Error:', error);
      alert('Terjadi kesalahan saat menyimpan.');
    }
    setIsLoading(false);
  };

  const onlineCount = members.filter(m => m.status === 'online').length;

  // Get current user from localStorage (stored as 'user' object, not 'userId')
  const getCurrentUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (e) {
      console.error('Failed to parse user from localStorage:', e);
    }
    return null;
  };
  
  const currentUserId = getCurrentUserId();
  const currentMember = members.find(m => m.id === currentUserId);
  // Check ownership from server.owner_id (more reliable than role field)
  const isOwner = server?.owner_id === currentUserId;
  
  // Debug logging
  console.log('[ServerSettingsPage] currentUserId:', currentUserId);
  console.log('[ServerSettingsPage] server?.owner_id:', server?.owner_id);
  console.log('[ServerSettingsPage] currentMember:', currentMember);
  console.log('[ServerSettingsPage] isOwner:', isOwner);

  const handleTransferOwnership = async (memberId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${server?.id}/transfer-ownership`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newOwnerId: memberId }),
      });
      if (response.ok) {
        // Update local state - new owner becomes owner, old owner becomes admin
        setMembers(members.map(m => {
          if (m.id === memberId) return { ...m, role: 'owner' as any };
          if (m.id === currentUserId) return { ...m, role: 'admin' as any };
          return m;
        }));
        setTransferConfirmOpen(null);
        setMenuOpen(null);
        alert('Ownership transferred successfully! You are now an admin.\n\nPage will refresh to apply changes.');
        // Refresh page after 2 seconds to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to transfer ownership');
      }
    } catch (error) {
      console.error('Failed to transfer ownership:', error);
      alert('Failed to transfer ownership');
    }
  };

  if (!isOpen || !server) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Settings },
    { id: 'roles' as const, label: 'Jobdesk', icon: Shield },
    { id: 'members' as const, label: 'Members', icon: Users },
  ];

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 flex">
      {/* Sidebar */}
      <div className="w-[220px] bg-[#2b2d31] flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-[#1f2023]">
          <span className="text-white font-semibold truncate">{server.name}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="px-3 py-1 text-xs font-bold text-[#949ba4] uppercase mb-2">
            Pengaturan Server
          </div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors mb-1 ${
                activeTab === tab.id 
                  ? 'bg-[#404249] text-white' 
                  : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-[#1f2023]">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00d4ff] hover:bg-[#00b8db] text-white rounded transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            Kembali ke Server
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        <div className="h-12 flex items-center px-6 border-b border-[#1f2023]">
          <h2 className="text-white font-semibold capitalize">{activeTab}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="flex gap-8">
              {/* Left Column */}
              <div className="flex-1 max-w-xl">
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-white text-xl font-bold mb-2">Server Profile</h3>
                  <p className="text-[#949ba4] text-sm">
                    Customize how your server appears in invite links and, if enabled, in Server Discovery and Announcement Channel messages
                  </p>
                </div>

                {/* Name */}
                <div className="mb-6">
                  <label className="block text-[#dbdee1] text-sm font-bold mb-2">Name</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded border border-[#232438] focus:border-[#00d4ff] outline-none transition-colors"
                  />
                </div>

                {/* Icon */}
                <div className="mb-6">
                  <label className="block text-[#dbdee1] text-sm font-bold mb-2">Icon</label>
                  <p className="text-[#949ba4] text-sm mb-3">We recommend an image of at least 512x512.</p>
                  <button 
                    onClick={() => document.getElementById('server-icon-upload')?.click()}
                    className="px-4 py-2 bg-[#00d4ff] hover:bg-[#00b8db] text-white rounded text-sm font-medium transition-colors"
                  >
                    Change Server Icon
                  </button>
                  <input
                    id="server-icon-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconUpload}
                  />
                </div>

                {/* Banner */}
                <div className="mb-6">
                  <label className="block text-[#dbdee1] text-sm font-bold mb-3">Banner</label>
                  <div className="grid grid-cols-5 gap-2">
                    {BANNER_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setBannerColor(color.bg)}
                        className={`w-full aspect-square rounded-lg ${bannerColor === color.bg ? 'ring-2 ring-white' : ''}`}
                        style={{ background: color.bg }}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-[#dbdee1] text-sm font-bold mb-2">Description</label>
                  <p className="text-[#949ba4] text-sm mb-2">How did your server get started? Why should people join?</p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded border border-[#232438] focus:border-[#00d4ff] outline-none transition-colors resize-none"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#00d4ff] hover:bg-[#00b8db] disabled:opacity-50 text-white rounded font-medium transition-colors"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>

              {/* Right Column - Preview */}
              <div className="w-[300px]">
                <div className="bg-[#2b2d31] rounded-xl overflow-hidden">
                  {/* Banner */}
                  <div 
                    className="h-24 relative"
                    style={{ background: bannerColor }}
                  >
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                      <div className="w-20 h-20 rounded-2xl bg-[#1e1f22] flex items-center justify-center overflow-hidden border-4 border-[#2b2d31]">
                        {serverIcon && (serverIcon.startsWith('http') || serverIcon.startsWith('/')) ? (
                          <img src={getFullImageUrl(serverIcon)} alt={serverName} className="w-full h-full object-cover" />
                        ) : serverIcon ? (
                          <span className="text-3xl">{serverIcon}</span>
                        ) : (
                          <span className="text-3xl font-bold text-white">{serverName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Server Info */}
                  <div className="pt-12 pb-6 px-4 text-center">
                    <h4 className="text-white font-bold text-lg mb-1">{serverName}</h4>
                    <div className="flex items-center justify-center gap-4 text-sm text-[#949ba4]">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#3ba55d]"></span>
                        {onlineCount} Online
                      </span>
                      <span>{members.length} Members</span>
                    </div>
                    <p className="text-[#6a6a7a] text-xs mt-2">Est. {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <ServerRoles serverId={server.id} isOwner={isOwner} />
          )}

          {activeTab === 'members' && (
            <DaftarNamaStaff serverId={server.id} />
          )}
        </div>
      </div>
    </div>
  );
}

