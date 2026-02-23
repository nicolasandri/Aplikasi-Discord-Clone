import { useState, useRef } from 'react';
import { X, User, Bell, Shield, Monitor, LogOut, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'account' | 'notifications' | 'privacy' | 'appearance';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: displayName }),
      });

      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setSuccess('Password changed successfully!');
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      console.log('📤 Uploading avatar...', file.name, `${(file.size/1024).toFixed(1)}KB`);
      
      const response = await fetch(`${API_URL}/users/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('📥 Avatar upload response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Avatar uploaded:', data.avatar);
        
        // Update local storage with new avatar URL
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.avatar = data.avatar;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        // Update AuthContext state
        if (user) {
          const updatedUser = { ...user, avatar: data.avatar };
          updateUser(updatedUser);
          console.log('✅ User state updated with new avatar');
        }
        
        setSuccess('Avatar updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error('❌ Avatar upload failed:', errData);
        setError(errData.error || `Failed to upload avatar (${response.status})`);
      }
    } catch (err) {
      console.error('❌ Avatar upload error:', err);
      setError('Network error - please check your connection');
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const menuItems = [
    { id: 'account' as SettingsTab, label: 'My Account', icon: User },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'privacy' as SettingsTab, label: 'Privacy & Security', icon: Shield },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: Monitor },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0 bg-[#36393f] border-none overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-60 bg-[#2f3136] p-4 flex flex-col">
            <div className="flex items-center gap-3 mb-6 px-2">
              <img
                src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
                alt={user?.username}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                }}
              />
              <div>
                <p className="text-white font-medium text-sm">{user?.username}</p>
                <p className="text-[#b9bbbe] text-xs">Edit Profile</p>
              </div>
            </div>

            <div className="space-y-1 flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeTab === item.id
                        ? 'bg-[#40444b] text-white'
                        : 'text-[#b9bbbe] hover:bg-[#40444b] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#ed4245] hover:bg-[#ed4245]/10 transition-colors mt-auto"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col bg-[#36393f]">
            {/* Header */}
            <DialogHeader className="px-6 py-4 border-b border-[#202225]">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-white text-xl font-bold">
                  {activeTab === 'account' && 'My Account'}
                  {activeTab === 'notifications' && 'Notifications'}
                  {activeTab === 'privacy' && 'Privacy & Security'}
                  {activeTab === 'appearance' && 'Appearance'}
                </DialogTitle>
                <button
                  onClick={onClose}
                  className="text-[#b9bbbe] hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </DialogHeader>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'account' && (
                <div className="space-y-6 max-w-2xl">
                  {/* Profile Card */}
                  <div className="bg-[#2f3136] rounded-lg p-6">
                    <div className="flex items-start gap-6">
                      <div className="relative">
                        <img
                          src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
                          alt={user?.username}
                          className="w-20 h-20 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                          }}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                          className="absolute bottom-0 right-0 w-8 h-8 bg-[#5865f2] rounded-full flex items-center justify-center hover:bg-[#4752c4] transition-colors disabled:opacity-50"
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
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{user?.username}</h3>
                        <p className="text-[#b9bbbe] text-sm">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="bg-[#2f3136] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-[#b9bbbe] text-xs uppercase font-semibold">
                          Display Name
                        </Label>
                        {!isEditing && (
                          <p className="text-white mt-1">{user?.username}</p>
                        )}
                      </div>
                      {!isEditing ? (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="secondary"
                          className="bg-[#40444b] hover:bg-[#4f545c] text-white"
                        >
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setIsEditing(false);
                              setDisplayName(user?.username || '');
                            }}
                            variant="ghost"
                            className="text-[#b9bbbe]"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="bg-[#5865f2] hover:bg-[#4752c4]"
                          >
                            {loading ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-[#40444b] border-none text-white"
                      />
                    )}
                  </div>

                  {/* Email */}
                  <div className="bg-[#2f3136] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-[#b9bbbe] text-xs uppercase font-semibold">
                          Email
                        </Label>
                        <p className="text-white mt-1">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="bg-[#2f3136] rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-4">Password and Authentication</h3>
                    
                    {!isChangingPassword ? (
                      <Button
                        onClick={() => setIsChangingPassword(true)}
                        className="bg-[#5865f2] hover:bg-[#4752c4]"
                      >
                        Change Password
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Input
                          type="password"
                          placeholder="Current Password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-[#40444b] border-none text-white"
                        />
                        <Input
                          type="password"
                          placeholder="New Password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-[#40444b] border-none text-white"
                        />
                        <Input
                          type="password"
                          placeholder="Confirm New Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-[#40444b] border-none text-white"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setIsChangingPassword(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setError('');
                            }}
                            variant="ghost"
                            className="text-[#b9bbbe]"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleChangePassword}
                            disabled={loading}
                            className="bg-[#5865f2] hover:bg-[#4752c4]"
                          >
                            {loading ? 'Changing...' : 'Change Password'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && <p className="text-[#ed4245] text-sm">{error}</p>}
                  {success && <p className="text-[#3ba55d] text-sm">{success}</p>}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="text-[#b9bbbe]">
                  <p>Notification settings coming soon...</p>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="text-[#b9bbbe]">
                  <p>Privacy settings coming soon...</p>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="text-[#b9bbbe]">
                  <p>Appearance settings coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
