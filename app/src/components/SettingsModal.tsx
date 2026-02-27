import { useState, useRef, useEffect } from 'react';
import { 
  X, User, Bell, Shield, LogOut, Camera,
  Search, Star, Database, Link, Smartphone, Gift, CreditCard, Brush, Check, Eye, EyeOff,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NotificationSettings } from './NotificationSettings';
import { useIsMobile } from '@/hooks/use-mobile';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'appearance' | 'connections' | 'devices';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout, updateUser } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  const [avatarVersion, setAvatarVersion] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Change Password Modal States
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Update displayName when user changes
  useEffect(() => {
    setDisplayName(user?.displayName || user?.username || '');
  }, [user?.displayName, user?.username]);

  // Listen for display name and avatar updates from other components
  useEffect(() => {
    const handleDisplayNameUpdate = (e: CustomEvent<{ displayName: string }>) => {
      if (e.detail.displayName && user) {
        updateUser({ ...user, displayName: e.detail.displayName });
        setDisplayName(e.detail.displayName);
      }
    };

    const handleAvatarUpdate = (e: CustomEvent<{ avatar: string }>) => {
      if (e.detail.avatar) {
        setAvatarVersion(Date.now());
        if (user) {
          updateUser({ ...user, avatar: e.detail.avatar });
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          if (user && updatedUser.id === user.id) {
            updateUser(updatedUser);
            setDisplayName(updatedUser.displayName || updatedUser.username || '');
            if (updatedUser.avatar !== user.avatar) {
              setAvatarVersion(Date.now());
            }
          }
        } catch (err) {
          console.error('Failed to parse user from storage:', err);
        }
      }
    };

    window.addEventListener('displayname-updated', handleDisplayNameUpdate as EventListener);
    window.addEventListener('avatar-updated', handleAvatarUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('displayname-updated', handleDisplayNameUpdate as EventListener);
      window.removeEventListener('avatar-updated', handleAvatarUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, updateUser]);

  // Extract username from email (part before @)
  const getUsernameFromEmail = (email: string | undefined) => {
    if (!email) return '';
    return email.split('@')[0].toLowerCase();
  };

  const handleSaveDisplayName = async () => {
    if (!displayName.trim() || displayName === (user?.displayName || user?.username)) {
      setEditingDisplayName(false);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (response.ok) {
        const updatedDisplayName = displayName.trim();
        
        // Update localStorage first
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.displayName = updatedDisplayName;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        // Update auth context
        if (user) {
          updateUser({ ...user, displayName: updatedDisplayName });
        }
        
        setSuccess('Display name updated successfully!');
        setEditingDisplayName(false);
        
        // Dispatch custom event to notify all components
        window.dispatchEvent(new CustomEvent('displayname-updated', { 
          detail: { displayName: updatedDisplayName } 
        }));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Failed to update display name');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/password`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        }),
      });

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        const errData = await response.json().catch(() => ({}));
        const errorMsg = errData.error || `Error ${response.status}: Failed to change password`;
        console.error('Change password error:', errorMsg, errData);
        setPasswordError(errorMsg);
      }
    } catch (err) {
      setPasswordError('Network error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update localStorage first
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.avatar = data.avatar;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        // Update auth context
        if (user) {
          updateUser({ ...user, avatar: data.avatar });
        }
        
        // Update avatar version to force reload
        setAvatarVersion(Date.now());
        
        // Dispatch custom event to notify all components
        window.dispatchEvent(new CustomEvent('avatar-updated', { 
          detail: { avatar: data.avatar } 
        }));
        
        setSuccess('Avatar updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Failed to upload avatar');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const menuSections = [
    {
      label: 'User Settings',
      items: [
        { id: 'account' as SettingsTab, label: 'My Account', icon: User },
        { id: 'connections' as SettingsTab, label: 'Connections', icon: Link },
        { id: 'devices' as SettingsTab, label: 'Devices', icon: Smartphone },
        { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
      ]
    },
    {
      label: 'Billing Settings',
      items: [
        { id: 'privacy' as SettingsTab, label: 'Nitro', icon: Star },
        { id: 'privacy' as SettingsTab, label: 'Server Boost', icon: Gift },
        { id: 'privacy' as SettingsTab, label: 'Subscriptions', icon: CreditCard },
        { id: 'privacy' as SettingsTab, label: 'Billing', icon: Database },
      ]
    },
    {
      label: 'App Settings',
      items: [
        { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Brush },
        { id: 'privacy' as SettingsTab, label: 'Accessibility', icon: Shield },
      ]
    },
  ];

  if (!isOpen) return null;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[100] w-full h-full bg-[#36393f] flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#202225] bg-[#2f3136] flex-shrink-0">
          {showMobileMenu ? (
            <>
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
                  alt={user?.displayName || user?.username}
                  className="w-9 h-9 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                  }}
                />
                <div>
                  <p className="text-white font-semibold text-base">{user?.displayName || user?.username}</p>
                  <p className="text-[#b9bbbe] text-xs">Pengaturan</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-[#b9bbbe] hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowMobileMenu(true)}
                className="flex items-center gap-2 text-[#b9bbbe] hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Kembali</span>
              </button>
              <h2 className="text-white font-semibold text-base">
                {activeTab === 'account' && 'Akun Saya'}
                {activeTab === 'notifications' && 'Notifikasi'}
                {activeTab === 'privacy' && 'Privasi'}
                {activeTab === 'appearance' && 'Tampilan'}
                {activeTab === 'connections' && 'Koneksi'}
                {activeTab === 'devices' && 'Perangkat'}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-[#b9bbbe] hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Content */}
        {showMobileMenu ? (
          <div className="flex-1 overflow-y-auto py-2 bg-[#36393f]">
            {menuSections.map((section, idx) => (
              <div key={idx} className="px-3 mb-4">
                <p className="px-3 py-1 text-[#96989d] text-xs font-bold uppercase tracking-wider">
                  {section.label}
                </p>
                <div className="mt-1 space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => {
                          setActiveTab(item.id);
                          setShowMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm transition-colors text-left text-[#b9bbbe] hover:bg-[#40444b] hover:text-white active:bg-[#3c3f45]"
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* Log Out */}
            <div className="p-3 border-t border-[#202225] mt-4">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm text-[#ed4245] hover:bg-[#ed4245]/10 transition-colors active:bg-[#ed4245]/20"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 bg-[#36393f]">
            {activeTab === 'account' && (
              <div className="space-y-4 max-w-lg mx-auto">
                {/* Banner */}
                <div className="bg-[#5865f2] h-20 rounded-t-lg relative">
                  <div className="absolute -bottom-8 left-4">
                    <div className="relative">
                      <img
                        src={user?.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `http://localhost:3001${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                        alt={user?.displayName || user?.username}
                        className="w-16 h-16 rounded-full border-4 border-[#36393f] bg-[#36393f] object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="absolute bottom-0 right-0 w-6 h-6 bg-[#5865f2] rounded-full flex items-center justify-center hover:bg-[#4752c4] border-2 border-[#36393f]"
                      >
                        <Camera className="w-3 h-3 text-white" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="pt-8">
                  <h3 className="text-white text-lg font-bold">{user?.displayName || user?.username}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-[#5865f2] text-white text-xs rounded font-semibold">VIP</span>
                    <span>👑</span>
                    <span className="text-[#43b581]">✓</span>
                  </div>
                </div>

                {/* Info Cards */}
                <div className="space-y-3 mt-4">
                  <div className="bg-[#2f3136] rounded-lg p-3">
                    <Label className="text-[#b9bbbe] text-xs font-bold uppercase">Display Name</Label>
                    <p className="text-white mt-1">{user?.displayName || user?.username}</p>
                  </div>
                  <div className="bg-[#2f3136] rounded-lg p-3">
                    <Label className="text-[#b9bbbe] text-xs font-bold uppercase">Username</Label>
                    <p className="text-white mt-1">{getUsernameFromEmail(user?.email)}</p>
                  </div>
                  <div className="bg-[#2f3136] rounded-lg p-3">
                    <Label className="text-[#b9bbbe] text-xs font-bold uppercase">Email</Label>
                    <p className="text-white mt-1">{user?.email}</p>
                  </div>
                </div>

                <Button 
                  onClick={() => setShowChangePassword(true)}
                  className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white mt-4"
                >
                  Ubah Password
                </Button>
              </div>
            )}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab !== 'account' && activeTab !== 'notifications' && (
              <p className="text-[#b9bbbe] text-center py-12">Fitur ini sedang dalam pengembangan.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="w-[900px] max-w-[95vw] h-[600px] max-h-[90vh] bg-[#36393f] rounded-lg overflow-hidden flex shadow-2xl">
        {/* Sidebar */}
        <div className="w-[240px] bg-[#2f3136] flex flex-col h-full border-r border-[#202225]">
          {/* Header with Search */}
          <div className="p-4 pb-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
                alt={user?.displayName || user?.username}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{user?.displayName || user?.username}</p>
                <p className="text-[#b9bbbe] text-xs">Edit Profile</p>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#72767d]" />
              <input
                type="text"
                placeholder="Search"
                className="w-full h-8 bg-[#202225] text-white text-sm rounded pl-9 pr-3 outline-none placeholder:text-[#72767d]"
              />
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-2">
            {menuSections.map((section, idx) => (
              <div key={idx} className="px-2 mb-4">
                <p className="px-3 py-1 text-[#96989d] text-xs font-bold uppercase">
                  {section.label}
                </p>
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                          activeTab === item.id
                            ? 'bg-[#3c3f45] text-white'
                            : 'text-[#b9bbbe] hover:bg-[#3c3f45] hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Log Out */}
          <div className="p-3 border-t border-[#202225]">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#ed4245] hover:bg-[#ed4245]/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col h-full bg-[#36393f]">
          {/* Header */}
          <div className="h-14 px-6 flex items-center justify-between border-b border-[#202225] flex-shrink-0">
            <h2 className="text-white text-lg font-semibold">
              {activeTab === 'account' && 'My Account'}
              {activeTab === 'notifications' && 'Notifications'}
              {activeTab === 'privacy' && 'Privacy & Security'}
              {activeTab === 'appearance' && 'Appearance'}
              {activeTab === 'connections' && 'Connections'}
              {activeTab === 'devices' && 'Devices'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[#b9bbbe] hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'account' && (
              <div className="max-w-3xl space-y-6">
                {/* Banner */}
                <div className="bg-[#5865f2] h-32 rounded-t-lg relative">
                  <div className="absolute -bottom-12 left-6">
                    <div className="relative">
                      <img
                        src={user?.avatar ? `${user.avatar.startsWith('http') ? user.avatar : `http://localhost:3001${user.avatar}`}?v=${avatarVersion}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                        alt={user?.displayName || user?.username}
                        className="w-24 h-24 rounded-full border-4 border-[#36393f] bg-[#36393f] object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                        }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-[#5865f2] rounded-full flex items-center justify-center hover:bg-[#4752c4] border-2 border-[#36393f] transition-colors"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm h-8">
                      Edit User Profile
                    </Button>
                  </div>
                </div>

                {/* User Info Card */}
                <div className="bg-[#2f3136] rounded-b-lg p-6 pt-16">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-white text-xl font-bold">{user?.displayName || user?.username}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-[#5865f2] text-white text-xs rounded font-semibold">VIP</span>
                        <span>👑</span>
                        <span className="text-[#43b581]">✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[#202225] my-4" />

                  <div className="space-y-4">
                    {/* Display Name - Editable */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="text-[#b9bbbe] text-xs font-bold uppercase">Display Name</Label>
                        {editingDisplayName ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="h-8 bg-[#202225] border-[#040405] text-white text-sm w-64"
                              placeholder="Display name"
                              disabled={loading}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveDisplayName();
                                if (e.key === 'Escape') {
                                  setEditingDisplayName(false);
                                  setDisplayName(user?.displayName || user?.username || '');
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveDisplayName}
                              disabled={loading}
                              className="h-8 bg-[#5865f2] hover:bg-[#4752c4] text-white px-3"
                            >
                              {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-white mt-1">{user?.displayName || user?.username}</p>
                        )}
                      </div>
                      {!editingDisplayName && (
                        <Button 
                          variant="secondary" 
                          onClick={() => setEditingDisplayName(true)}
                          className="bg-[#4f545c] hover:bg-[#5d6269] text-white h-8"
                        >
                          Edit
                        </Button>
                      )}
                    </div>

                    {/* Username - Not editable, extracted from email */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[#b9bbbe] text-xs font-bold uppercase">Username</Label>
                        <p className="text-white mt-1">{getUsernameFromEmail(user?.email)}</p>
                      </div>
                      {/* No Edit button for username */}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[#b9bbbe] text-xs font-bold uppercase">Email</Label>
                        <p className="text-white mt-1">{user?.email}</p>
                      </div>
                      <Button variant="secondary" className="bg-[#4f545c] hover:bg-[#5d6269] text-white h-8">Edit</Button>
                    </div>

                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-3">Password and Authentication</h3>
                  <Button 
                    onClick={() => setShowChangePassword(true)}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
                  >
                    Change Password
                  </Button>
                </div>

                {error && <div className="bg-[#ed4245]/10 border border-[#ed4245] text-[#ed4245] px-4 py-3 rounded">{error}</div>}
                {success && <div className="bg-[#3ba55d]/10 border border-[#3ba55d] text-[#3ba55d] px-4 py-3 rounded">{success}</div>}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="max-w-3xl">
                <NotificationSettings />
              </div>
            )}
            {activeTab !== 'account' && activeTab !== 'notifications' && (
              <div className="max-w-3xl">
                <p className="text-[#b9bbbe] text-center py-12">This section is under development.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#36393f] rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#202225] flex items-center justify-between">
              <h3 className="text-white text-xl font-bold">Change Password</h3>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-[#b9bbbe] hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="bg-[#ed4245]/10 border border-[#ed4245] text-[#ed4245] px-4 py-3 rounded text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="bg-[#3ba55d]/10 border border-[#3ba55d] text-[#3ba55d] px-4 py-3 rounded text-sm">
                  {passwordSuccess}
                </div>
              )}

              {/* Current Password */}
              <div>
                <Label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-10 bg-[#202225] border-[#040405] text-white pr-10"
                    placeholder="Enter current password"
                    disabled={changingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <Label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 bg-[#202225] border-[#040405] text-white pr-10"
                    placeholder="Enter new password"
                    disabled={changingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#72767d] hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <Label className="text-[#b9bbbe] text-xs font-bold uppercase mb-2 block">
                  Confirm New Password
                </Label>
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 bg-[#202225] border-[#040405] text-white"
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={changingPassword}
                  className="flex-1 bg-[#4f545c] hover:bg-[#5d6269] text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white"
                >
                  {changingPassword ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
