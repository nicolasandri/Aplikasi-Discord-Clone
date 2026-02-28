import { useState, useEffect, useRef } from 'react';
import { X, Users, Shield, UserPlus, ScrollText, Ban, Settings, ChevronRight } from 'lucide-react';
import { ServerMembers } from './ServerMembers';
import { ServerRoles } from './ServerRoles';
import { ServerInvites } from './ServerInvites';
import { ServerAuditLog } from './ServerAuditLog';
import type { Server } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Get base URL for backend (without /api)
const BASE_URL = (() => {
  if (API_URL.startsWith('http')) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  // For relative API URL in dev mode, use localhost:3001
  return 'http://localhost:3001';
})();

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server | null;
}

interface ServerSettings {
  name: string;
  icon: string | null;
  banner: string | null;
  description: string;
}

const bannerColors = [
  { id: 'default', color: '#18191c', gradient: 'linear-gradient(135deg, #18191c 0%, #2f3136 100%)' },
  { id: 'pink', color: '#ff006e', gradient: 'linear-gradient(135deg, #ff006e 0%, #fb5607 100%)' },
  { id: 'red', color: '#e63946', gradient: 'linear-gradient(135deg, #e63946 0%, #f1faee 100%)' },
  { id: 'orange', color: '#fb5607', gradient: 'linear-gradient(135deg, #fb5607 0%, #ffbe0b 100%)' },
  { id: 'yellow', color: '#ffbe0b', gradient: 'linear-gradient(135deg, #ffbe0b 0%, #ff006e 100%)' },
  { id: 'purple', color: '#8338ec', gradient: 'linear-gradient(135deg, #8338ec 0%, #3a86ff 100%)' },
  { id: 'blue', color: '#3a86ff', gradient: 'linear-gradient(135deg, #3a86ff 0%, #06ffa5 100%)' },
  { id: 'cyan', color: '#06ffa5', gradient: 'linear-gradient(135deg, #06ffa5 0%, #3a86ff 100%)' },
  { id: 'green', color: '#2ecc71', gradient: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)' },
  { id: 'gray', color: '#34495e', gradient: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)' },
];

const menuSections = [
  {
    title: 'Server Profile',
    items: [
      { id: 'overview', label: 'Server Profile', icon: Settings },
    ]
  },
  {
    title: 'Expression',
    items: [
      { id: 'emoji', label: 'Emoji', icon: () => <span className="text-lg">😀</span> },
      { id: 'stickers', label: 'Stickers', icon: () => <span className="text-lg">⭐</span> },
      { id: 'soundboard', label: 'Soundboard', icon: () => <span className="text-lg">🔊</span> },
    ]
  },
  {
    title: 'People',
    items: [
      { id: 'members', label: 'Members', icon: Users },
      { id: 'roles', label: 'Roles', icon: Shield },
      { id: 'invites', label: 'Invites', icon: UserPlus },
      { id: 'access', label: 'Access', icon: () => <span className="text-lg">🔒</span> },
    ]
  },
  {
    title: 'Apps',
    items: [
      { id: 'integrations', label: 'Integrations', icon: () => <span className="text-lg">🔗</span> },
      { id: 'appdirectory', label: 'App Directory', icon: () => <span className="text-lg">📁</span> },
    ]
  },
  {
    title: 'Moderation',
    items: [
      { id: 'safety', label: 'Safety Setup', icon: Shield },
      { id: 'auditlog', label: 'Audit Log', icon: ScrollText },
      { id: 'bans', label: 'Bans', icon: Ban },
    ]
  },
];

export function ServerSettingsModal({ isOpen, onClose, server }: ServerSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [settings, setSettings] = useState<ServerSettings>({
    name: server?.name || '',
    icon: server?.icon || null,
    banner: null,
    description: '',
  });
  const [selectedBanner, setSelectedBanner] = useState(bannerColors[0].id);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (server) {
      setSettings(prev => ({
        ...prev,
        name: server.name,
        icon: server.icon || null,
      }));
    }
  }, [server]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!server) return;
    
    console.log('Saving server settings:', {
      name: settings.name,
      icon: settings.icon,
    });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${server.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: settings.name,
          icon: settings.icon,
        }),
      });

      console.log('Save response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Save success:', data);
        onClose();
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('Save failed:', error);
        alert('Gagal menyimpan: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save server settings:', error);
      alert('Gagal menyimpan server settings');
    }
  };

  const handleIconUpload = () => {
    iconInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !server) return;

    console.log('Uploading file:', file.name, file.size, file.type);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Upload response:', data);
        const url = data.file?.url || data.url;
        console.log('Upload success, URL:', url);
        if (url) {
          setSettings(prev => ({ ...prev, icon: url }));
        } else {
          console.error('URL not found in response:', data);
          alert('Gagal mendapatkan URL dari upload');
        }
      } else {
        const error = await response.json();
        console.error('Upload failed:', error);
        alert('Gagal upload icon: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to upload icon:', error);
      alert('Gagal upload icon');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get full icon URL with backend domain
  const getIconUrl = (iconPath: string | null): string | undefined => {
    if (!iconPath) return undefined;
    if (iconPath.startsWith('http')) return iconPath;
    return `${BASE_URL}${iconPath}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Server Name */}
            <div>
              <label className="block text-xs font-bold text-[#b9bbbe] uppercase tracking-wide mb-2">
                Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-[#2f3136] focus:border-[#5865f2] focus:outline-none"
              />
            </div>

            {/* Server Icon */}
            <div>
              <label className="block text-xs font-bold text-[#b9bbbe] uppercase tracking-wide mb-2">
                Icon
              </label>
              <p className="text-[#b9bbbe] text-sm mb-3">
                We recommend an image of at least 512x512.
              </p>
              <button
                onClick={handleIconUpload}
                className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Change Server Icon
              </button>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Banner */}
            <div>
              <label className="block text-xs font-bold text-[#b9bbbe] uppercase tracking-wide mb-2">
                Banner
              </label>
              <div className="grid grid-cols-5 gap-2">
                {bannerColors.map((banner) => (
                  <button
                    key={banner.id}
                    onClick={() => setSelectedBanner(banner.id)}
                    className={`h-16 rounded-lg border-2 transition-all ${
                      selectedBanner === banner.id
                        ? 'border-white'
                        : 'border-transparent hover:border-white/50'
                    }`}
                    style={{ background: banner.gradient }}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#b9bbbe] uppercase tracking-wide mb-2">
                Description
              </label>
              <textarea
                value={settings.description}
                onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                placeholder="How did your server get started? Why should people join?"
                rows={4}
                className="w-full bg-[#1e1f22] text-white px-3 py-2 rounded border border-[#2f3136] focus:border-[#5865f2] focus:outline-none resize-none"
              />
            </div>
          </div>
        );
      case 'members':
        return server ? <ServerMembers serverId={server.id} /> : null;
      case 'roles':
        return server ? <ServerRoles serverId={server.id} /> : null;
      case 'invites':
        return server ? <ServerInvites serverId={server.id} /> : null;
      case 'audit_log':
        return server ? <ServerAuditLog serverId={server.id} /> : null;
      default:
        return (
          <div className="flex items-center justify-center h-full text-[#b9bbbe]">
            <p>Feature coming soon...</p>
          </div>
        );
    }
  };

  if (!isOpen || !server) return null;

  const activeMenuItem = menuSections.flatMap(s => s.items).find(i => i.id === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative flex w-full h-full bg-[#313338]">
        {/* Left Sidebar */}
        <div className="w-[280px] bg-[#2b2d31] flex flex-col">
          {/* Server Name Header */}
          <div className="p-4 border-b border-[#1e1f22]">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
              {server.name}
            </h2>
          </div>

          {/* Menu Sections */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-[#949ba4] text-xs font-bold uppercase tracking-wider px-3 mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                          activeTab === item.id
                            ? 'bg-[#404249] text-white'
                            : 'text-[#b5bac1] hover:bg-[#35373c] hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        <ChevronRight className="w-4 h-4 ml-auto opacity-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-[#313338]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#1e1f22]">
            <div>
              <h1 className="text-white text-xl font-semibold">
                {activeMenuItem?.label || 'Settings'}
              </h1>
              {activeTab === 'overview' && (
                <p className="text-[#b9bbbe] text-sm mt-1">
                  Customize how your server appears in invite links and, if enabled, in Server Discovery and Announcement Channel messages
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[#b9bbbe] hover:text-white p-2 hover:bg-[#35373c] rounded transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto flex gap-8">
              {/* Main Content */}
              <div className="flex-1">
                {renderContent()}

                {/* Save Bar */}
                <div className="fixed bottom-0 left-[280px] right-0 bg-[#313338] border-t border-[#1e1f22] p-4 flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-white hover:underline text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-6 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Preview Card */}
              {activeTab === 'overview' && (
                <div className="w-[300px] flex-shrink-0">
                  <div className="bg-[#1e1f22] rounded-2xl overflow-hidden">
                    {/* Banner */}
                    <div 
                      className="h-32 relative"
                      style={{ 
                        background: bannerColors.find(b => b.id === selectedBanner)?.gradient 
                      }}
                    >
                      {/* Server Icon */}
                      <div className="absolute -bottom-6 left-4">
                        <div className="w-20 h-20 rounded-2xl bg-[#313338] flex items-center justify-center border-4 border-[#1e1f22] overflow-hidden">
                          {settings.icon ? (
                            <img 
                              src={getIconUrl(settings.icon)} 
                              alt={settings.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Failed to load icon:', settings.icon);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-2xl font-bold text-white">
                              {getInitials(settings.name)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Server Info */}
                    <div className="pt-8 pb-4 px-4">
                      <h3 className="text-white font-bold text-lg">
                        {settings.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[#b9bbbe] text-sm mt-1">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#3ba55d]" />
                          1 Online
                        </span>
                        <span>•</span>
                        <span>2 Members</span>
                      </div>
                      <p className="text-[#949ba4] text-xs mt-2">
                        Est. {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


