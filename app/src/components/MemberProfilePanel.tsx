import { useState, useEffect } from 'react';
import { X, MessageSquare, UserPlus, UserMinus, Shield, Mail, Calendar, LogIn, CheckCircle, Crown, Ban } from 'lucide-react';
import type { ServerMember } from '@/types';

interface MemberProfilePanelProps {
  member: ServerMember | null;
  serverId: string;
  onClose: () => void;
  onMessage?: () => void;
  onKick?: () => void;
  onBan?: () => void;
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

const roleColors: Record<string, string> = {
  owner: '#ffd700',
  admin: '#ed4245',
  moderator: '#43b581',
  member: '#99aab5',
};

const roleLabels: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
};

export function MemberProfilePanel({ member, serverId, onClose, onMessage, onKick, onBan }: MemberProfilePanelProps) {
  const [memberDetails, setMemberDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'permissions' | 'notes'>('info');

  useEffect(() => {
    if (member) {
      fetchMemberDetails();
    }
  }, [member]);

  const fetchMemberDetails = async () => {
    if (!member) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/members/${member.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMemberDetails(data);
      }
    } catch (error) {
      console.error('Failed to fetch member details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!member) return null;

  const getAvatarUrl = () => {
    if (!member.avatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
    }
    if (member.avatar.startsWith('http')) return member.avatar;
    return `${BASE_URL}${member.avatar}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-[340px] bg-[#2f3136] shadow-xl animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#202225]">
          <h3 className="text-white font-semibold">User Profile</h3>
          <button 
            onClick={onClose}
            className="text-[#b9bbbe] hover:text-white p-1 hover:bg-[#40444b] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto h-[calc(100vh-65px)]">
            {/* User Info Header */}
            <div className="p-4 bg-gradient-to-b from-[#5865f2]/20 to-transparent">
              <div className="flex items-start gap-4">
                <img
                  src={getAvatarUrl()}
                  alt={member.username}
                  className="w-20 h-20 rounded-full bg-[#36393f] border-4 border-[#2f3136]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`;
                  }}
                />
                <div className="flex-1 pt-2">
                  <h4 className="text-white font-bold text-lg">{member.displayName || member.username}</h4>
                  <p className="text-[#b9bbbe] text-sm">{member.username}</p>
                  {member.role === 'owner' && (
                    <span className="inline-flex items-center gap-1 text-[#ffd700] text-xs mt-1">
                      <Crown className="w-3 h-3" />
                      Server Owner
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={onMessage}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#5865f2] hover:bg-[#4752c4] text-white py-2 rounded text-sm font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-[#40444b] hover:bg-[#4f545c] text-white py-2 rounded text-sm font-medium transition-colors">
                  <UserPlus className="w-4 h-4" />
                  Add Friend
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#202225]">
              {(['info', 'permissions', 'notes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-white border-b-2 border-[#5865f2]'
                      : 'text-[#b9bbbe] hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Server Activity */}
                  <div>
                    <h5 className="text-[#72767d] text-xs font-bold uppercase mb-3">Server Activity</h5>
                    <div className="space-y-2 bg-[#36393f] rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <MessageSquare className="w-4 h-4" />
                          <span>Messages</span>
                        </div>
                        <span className="text-white font-medium">1</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <Mail className="w-4 h-4" />
                          <span>Links</span>
                        </div>
                        <span className="text-white font-medium">0</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <Calendar className="w-4 h-4" />
                          <span>Media</span>
                        </div>
                        <span className="text-white font-medium">0</span>
                      </div>
                    </div>
                  </div>

                  {/* Roles */}
                  <div>
                    <h5 className="text-[#72767d] text-xs font-bold uppercase mb-3">Roles</h5>
                    <div className="flex flex-wrap gap-2">
                      {member.role_name ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${member.role_color || '#99aab5'}20`,
                            color: member.role_color || '#99aab5'
                          }}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: member.role_color || '#99aab5' }}
                          />
                          {member.role_name}
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${roleColors[member.role] || '#99aab5'}20`,
                            color: roleColors[member.role] || '#99aab5'
                          }}
                        >
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: roleColors[member.role] || '#99aab5' }}
                          />
                          {roleLabels[member.role] || 'Member'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account Info */}
                  <div>
                    <h5 className="text-[#72767d] text-xs font-bold uppercase mb-3">Account</h5>
                    <div className="space-y-2 bg-[#36393f] rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <CheckCircle className="w-4 h-4 text-[#3ba55d]" />
                          <span>Passed Verification Level</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <Calendar className="w-4 h-4" />
                          <span>Discord Join Date</span>
                        </div>
                        <span className="text-white">{formatDate(member.createdAt || new Date().toISOString())}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <LogIn className="w-4 h-4" />
                          <span>Server Join Date</span>
                        </div>
                        <span className="text-white">{formatDate(member.joinedAt || new Date().toISOString())}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[#b9bbbe]">
                          <Shield className="w-4 h-4" />
                          <span>Join Method</span>
                        </div>
                        <span className="text-white">{member.joinMethod || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#b9bbbe] mb-4">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Mod Permissions</span>
                    <span className="text-xs ml-auto">ALL (32)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[#36393f] text-[#b9bbbe] text-xs rounded">Create Expressions</span>
                    <span className="px-2 py-1 bg-[#36393f] text-[#b9bbbe] text-xs rounded">Mention @everyone</span>
                    <span className="px-2 py-1 bg-[#36393f] text-[#b9bbbe] text-xs rounded">Manage Messages</span>
                    <span className="px-2 py-1 bg-[#36393f] text-[#b9bbbe] text-xs rounded">Create Events</span>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="text-[#b9bbbe] text-sm">
                  <textarea
                    placeholder="Click to add note..."
                    className="w-full h-32 bg-[#36393f] text-white p-3 rounded resize-none focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#202225] space-y-2">
              <button
                onClick={onKick}
                className="w-full flex items-center justify-center gap-2 bg-[#ed4245]/10 hover:bg-[#ed4245]/20 text-[#ed4245] py-2 rounded text-sm font-medium transition-colors"
              >
                <UserMinus className="w-4 h-4" />
                Kick {member.username}
              </button>
              <button
                onClick={onBan}
                className="w-full flex items-center justify-center gap-2 bg-[#ed4245]/10 hover:bg-[#ed4245]/20 text-[#ed4245] py-2 rounded text-sm font-medium transition-colors"
              >
                <Ban className="w-4 h-4" />
                Ban {member.username}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
