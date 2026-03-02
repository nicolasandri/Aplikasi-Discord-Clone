import { useState, useEffect } from 'react';
import { X, Settings, Shield, Users, UserPlus, UserX, ImageIcon } from 'lucide-react';
import type { Server, ServerMember } from '@/types';

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

const BANNER_COLORS = [
  { bg: 'linear-gradient(135deg, #5865f2 0%, #4752c4 100%)', name: 'Default' },
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

  useEffect(() => {
    if (server) {
      setServerName(server.name);
      setServerIcon(server.icon || '');
      fetchMembers();
    }
  }, [server]);

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
        setServerIcon(data.url);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload failed:', response.status, errorData);
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
      const res = await fetch(`${API_URL}/servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: serverName, icon: serverIcon, description }),
      });
      if (res.ok) {
        onUpdateServer?.(server.id, { name: serverName, icon: serverIcon });
      }
    } catch (error) {
      console.error('Failed to update server:', error);
    }
    setIsLoading(false);
  };

  const onlineCount = members.filter(m => m.status === 'online').length;

  if (!isOpen || !server) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Settings },
    { id: 'roles' as const, label: 'Roles', icon: Shield },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'invites' as const, label: 'Invites', icon: UserPlus },
    { id: 'bans' as const, label: 'Bans', icon: UserX },
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded transition-colors text-sm"
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
                    className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded border border-[#2f3136] focus:border-[#5865f2] outline-none transition-colors"
                  />
                </div>

                {/* Icon */}
                <div className="mb-6">
                  <label className="block text-[#dbdee1] text-sm font-bold mb-2">Icon</label>
                  <p className="text-[#949ba4] text-sm mb-3">We recommend an image of at least 512x512.</p>
                  <button 
                    onClick={() => document.getElementById('server-icon-upload')?.click()}
                    className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded text-sm font-medium transition-colors"
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
                    className="w-full bg-[#1e1f22] text-white px-3 py-2.5 rounded border border-[#2f3136] focus:border-[#5865f2] outline-none transition-colors resize-none"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white rounded font-medium transition-colors"
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
                        {serverIcon ? (
                          <img src={serverIcon} alt={serverName} className="w-full h-full object-cover" />
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
                    <p className="text-[#72767d] text-xs mt-2">Est. {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Fitur Roles sedang dalam pengembangan.</p>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="max-w-2xl">
              <h3 className="text-white font-semibold mb-4">Members ({members.length})</h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 bg-[#1e1f22] p-3 rounded">
                    <img
                      src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                      alt={member.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="text-white font-medium">{member.displayName || member.username}</div>
                      <div className="text-[#949ba4] text-sm">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Fitur Invites sedang dalam pengembangan.</p>
            </div>
          )}

          {activeTab === 'bans' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Fitur Bans sedang dalam pengembangan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
