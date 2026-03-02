import { useState, useEffect } from 'react';
import { X, ChevronRight, Hash, Volume2, Plus, Trash2, Edit2, Save, UserPlus, Shield, Crown, Tag, Smile, Sticker, Music, Users, UserCog, UserX, Settings, Bell, Lock, FileText, Ban, Bot, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Server, Channel, Category, ServerRole, ServerMember } from '@/types';

interface ServerSettingsPageProps {
  server: Server | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateServer?: (serverId: string, data: Partial<Server>) => void;
}

type SettingsTab = 'overview' | 'roles' | 'emoji' | 'stickers' | 'soundboard' | 'widget' | 'integration' | 'members' | 'invites' | 'bans' | 'automod' | 'audit' | 'community';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function ServerSettingsPage({ server, isOpen, onClose, onUpdateServer }: ServerSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [serverName, setServerName] = useState(server?.name || '');
  const [serverIcon, setServerIcon] = useState(server?.icon || '');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (server) {
      setServerName(server.name);
      setServerIcon(server.icon || '');
      fetchServerData();
    }
  }, [server]);

  const fetchServerData = async () => {
    if (!server) return;
    try {
      // Fetch members
      const membersRes = await fetch(`${API_URL}/servers/${server.id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }

      // Fetch roles
      const rolesRes = await fetch(`${API_URL}/servers/${server.id}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rolesRes.ok) {
        setRoles(await rolesRes.json());
      }

      // Fetch channels
      const channelsRes = await fetch(`${API_URL}/servers/${server.id}/channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (channelsRes.ok) {
        setChannels(await channelsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch server data:', error);
    }
  };

  const handleSaveServer = async () => {
    if (!server) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: serverName, icon: serverIcon, description }),
      });
      if (response.ok) {
        onUpdateServer?.(server.id, { name: serverName, icon: serverIcon });
      }
    } catch (error) {
      console.error('Failed to update server:', error);
    }
    setIsLoading(false);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setServerIcon(data.url);
      }
    } catch (error) {
      console.error('Failed to upload icon:', error);
    }
  };

  if (!isOpen || !server) return null;

  const renderSidebarItem = (tab: SettingsTab, label: string, icon: React.ReactNode, _category?: string) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
        activeTab === tab 
          ? 'bg-[#404249] text-white' 
          : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-white'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
      {activeTab === tab && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 flex">
      {/* Left Sidebar */}
      <div className="w-[220px] bg-[#2b2d31] flex flex-col">
        {/* Server Name Header */}
        <div className="h-12 flex items-center px-4 border-b border-[#1f2023]">
          <span className="text-white font-semibold truncate">{server.name}</span>
        </div>

        {/* Settings Navigation */}
        <div className="flex-1 overflow-y-auto p-3">
          {/* Server Settings Section */}
          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-bold text-[#949ba4] uppercase">
              Pengaturan Server
            </div>
            {renderSidebarItem('overview', 'Overview', <Settings className="w-4 h-4" />)}
            {renderSidebarItem('roles', 'Roles', <Shield className="w-4 h-4" />)}
            {renderSidebarItem('emoji', 'Emoji', <Smile className="w-4 h-4" />)}
            {renderSidebarItem('stickers', 'Stickers', <Sticker className="w-4 h-4" />)}
            {renderSidebarItem('soundboard', 'Soundboard', <Music className="w-4 h-4" />)}
            {renderSidebarItem('widget', 'Widget', <LayoutGrid className="w-4 h-4" />)}
            {renderSidebarItem('integration', 'Integrations', <Bot className="w-4 h-4" />)}
          </div>

          {/* Community Section */}
          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-bold text-[#949ba4] uppercase">
              Manajemen Komunitas
            </div>
            {renderSidebarItem('members', 'Members', <Users className="w-4 h-4" />)}
            {renderSidebarItem('invites', 'Invites', <UserPlus className="w-4 h-4" />)}
            {renderSidebarItem('bans', 'Bans', <UserX className="w-4 h-4" />)}
            {renderSidebarItem('automod', 'AutoMod', <Bot className="w-4 h-4" />)}
            {renderSidebarItem('audit', 'Audit Log', <FileText className="w-4 h-4" />)}
            {renderSidebarItem('community', 'Enable Community', <LayoutGrid className="w-4 h-4" />)}
          </div>
        </div>

        {/* Exit Button */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#313338]">
        {/* Header */}
        <div className="h-12 flex items-center px-6 border-b border-[#1f2023]">
          <h2 className="text-white font-semibold capitalize">{activeTab}</h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="max-w-2xl">
              {/* Server Preview Card */}
              <div className="bg-[#1e1f22] rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center overflow-hidden">
                      {serverIcon ? (
                        <img src={serverIcon} alt={serverName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-white">{serverName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-6 h-6 bg-[#5865f2] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#4752c4] transition-colors">
                      <ImageIcon className="w-3 h-3 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{serverName}</h3>
                    <p className="text-[#949ba4] text-sm">{members.length} Members • Est. {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {/* Server Name */}
              <div className="mb-6">
                <label className="block text-[#dbdee1] text-sm font-medium mb-2">Nama Server</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-[#2f3136] focus:border-[#5865f2] outline-none transition-colors"
                  placeholder="Nama server"
                />
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-[#dbdee1] text-sm font-medium mb-2">Deskripsi</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-[#2f3136] focus:border-[#5865f2] outline-none transition-colors resize-none"
                  placeholder="Bagaimana server Anda dimulai? Mengapa orang harus bergabung?"
                />
                <p className="text-[#949ba4] text-xs mt-1">Maksimal 120 karakter</p>
              </div>

              {/* Banner Colors */}
              <div className="mb-6">
                <label className="block text-[#dbdee1] text-sm font-medium mb-2">Banner</label>
                <div className="grid grid-cols-5 gap-2">
                  {['#2f3136', '#ff73fa', '#eb459e', '#fa7715', '#f9f9f9', '#9b59b6', '#3498db', '#1abc9c', '#2ecc71', '#34495e'].map((color) => (
                    <button
                      key={color}
                      className="w-full aspect-square rounded-lg border-2 border-transparent hover:border-white transition-colors"
                      style={{ backgroundColor: color }}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveServer}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-semibold text-lg">Roles</h3>
                  <p className="text-[#949ba4] text-sm">Gunakan roles untuk mengelompokkan anggota server dan memberikan izin.</p>
                </div>
                <button className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded transition-colors flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Role
                </button>
              </div>

              {roles.length === 0 ? (
                <div className="text-center py-12 text-[#949ba4]">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada roles. Buat role pertama Anda!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between bg-[#1e1f22] p-3 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} />
                        <span className="text-white">{role.name}</span>
                        {role.isDefault && <span className="text-xs text-[#949ba4] bg-[#2f3136] px-2 py-0.5 rounded">Default</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-[#b5bac1] hover:text-white hover:bg-[#35373c] rounded transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-[#b5bac1] hover:text-[#ed4245] hover:bg-[#35373c] rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-semibold text-lg">Members ({members.length})</h3>
                  <p className="text-[#949ba4] text-sm">Kelola anggota server Anda.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cari members..."
                    className="px-3 py-2 bg-[#1e1f22] text-white rounded border border-[#2f3136] focus:border-[#5865f2] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-[#1e1f22] p-3 rounded">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                        alt={member.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{member.displayName || member.username}</span>
                          {member.role === 'owner' && <Crown className="w-4 h-4 text-[#f1c40f]" />}
                        </div>
                        <span className="text-[#949ba4] text-sm">{member.username}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#949ba4] text-sm capitalize">{member.role}</span>
                      <button className="p-2 text-[#b5bac1] hover:text-white hover:bg-[#35373c] rounded transition-colors">
                        <UserCog className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-white font-semibold text-lg">Invites</h3>
                  <p className="text-[#949ba4] text-sm">Kelola link invite untuk server Anda.</p>
                </div>
                <button className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded transition-colors flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create Invite
                </button>
              </div>
              <div className="text-center py-12 text-[#949ba4]">
                <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada invites. Buat link invite pertama Anda!</p>
              </div>
            </div>
          )}

          {activeTab === 'emoji' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <Smile className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Emoji</h3>
              <p>Fitur custom emoji akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'stickers' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <Sticker className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Stickers</h3>
              <p>Fitur stickers akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'soundboard' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Soundboard</h3>
              <p>Fitur soundboard akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'widget' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Widget</h3>
              <p>Fitur widget akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'integration' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Integrations</h3>
              <p>Fitur integrations akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'bans' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Bans</h3>
              <p>Tidak ada member yang dibanned.</p>
            </div>
          )}

          {activeTab === 'automod' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">AutoMod</h3>
              <p>Fitur AutoMod akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="max-w-2xl text-center py-12 text-[#949ba4]">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-white font-semibold mb-2">Audit Log</h3>
              <p>Fitur audit log akan segera hadir!</p>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="max-w-2xl">
              <div className="bg-[#1e1f22] rounded-lg p-6">
                <h3 className="text-white font-semibold text-lg mb-2">Enable Community</h3>
                <p className="text-[#949ba4] text-sm mb-4">
                  Ubah server Anda menjadi Community Server untuk mengakses fitur seperti Rules Screening, Insights, dan lainnya.
                </p>
                <button className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded transition-colors">
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
