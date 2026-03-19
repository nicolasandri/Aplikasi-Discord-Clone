import { useState, useEffect, useCallback } from 'react';
import { X, Bell, BellRing, BellOff, ChevronDown, VolumeX, AtSign, Hash, MessageSquare, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Channel } from '@/types';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
  channels: Channel[];
}

interface NotificationSettings {
  notificationLevel: 'all' | 'mentions' | 'nothing';
  muted: boolean;
  mutedUntil: string | null;
  suppressEveryoneHere: boolean;
  suppressRoleMentions: boolean;
  suppressHighlights: boolean;
  pushNotifications: boolean;
  mobilePushNotifications: boolean;
  muteNewEvents: boolean;
  communityActivityAlerts: boolean;
}

interface ChannelOverride {
  channelId: string;
  notificationLevel: 'all' | 'mentions' | 'nothing' | 'default';
  muted: boolean;
  mutedUntil: string | null;
}

const API_URL = import.meta.env.VITE_API_URL ;

export function NotificationSettingsModal({
  isOpen,
  onClose,
  serverId,
  serverName,
  channels
}: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    notificationLevel: 'all',
    muted: false,
    mutedUntil: null,
    suppressEveryoneHere: false,
    suppressRoleMentions: false,
    suppressHighlights: false,
    pushNotifications: true,
    mobilePushNotifications: true,
    muteNewEvents: false,
    communityActivityAlerts: true
  });
  
  const [channelOverrides, setChannelOverrides] = useState<ChannelOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [showChannelOverrideForm, setShowChannelOverrideForm] = useState(false);

  // Fetch notification settings
  useEffect(() => {
    if (!isOpen || !serverId) return;
    
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/servers/${serverId}/notification-settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings({
            notificationLevel: data.settings.notification_level || 'all',
            muted: data.settings.muted || false,
            mutedUntil: data.settings.muted_until || null,
            suppressEveryoneHere: data.settings.suppress_everyone_here || false,
            suppressRoleMentions: data.settings.suppress_role_mentions || false,
            suppressHighlights: data.settings.suppress_highlights || false,
            pushNotifications: data.settings.push_notifications !== false,
            mobilePushNotifications: data.settings.mobile_push_notifications !== false,
            muteNewEvents: data.settings.mute_new_events || false,
            communityActivityAlerts: data.settings.community_activity_alerts !== false
          });
          setChannelOverrides(data.channelOverrides || []);
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [isOpen, serverId]);

  // Save settings
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/servers/${serverId}/notification-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationLevel: settings.notificationLevel,
          muted: settings.muted,
          mutedUntil: settings.mutedUntil,
          suppressEveryoneHere: settings.suppressEveryoneHere,
          suppressRoleMentions: settings.suppressRoleMentions,
          suppressHighlights: settings.suppressHighlights,
          pushNotifications: settings.pushNotifications,
          mobilePushNotifications: settings.mobilePushNotifications,
          muteNewEvents: settings.muteNewEvents,
          communityActivityAlerts: settings.communityActivityAlerts
        })
      });
      
      if (response.ok) {
        onClose();
      } else {
        console.error('Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setSaving(false);
    }
  }, [serverId, settings, onClose]);

  // Add channel override
  const handleAddChannelOverride = async (channelId: string, level: 'all' | 'mentions' | 'nothing') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/channels/${channelId}/notification-override`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationLevel: level,
          muted: false,
          mutedUntil: null
        })
      });
      
      if (response.ok) {
        const newOverride: ChannelOverride = {
          channelId,
          notificationLevel: level,
          muted: false,
          mutedUntil: null
        };
        setChannelOverrides(prev => [...prev.filter(o => o.channelId !== channelId), newOverride]);
        setShowChannelOverrideForm(false);
        setSelectedChannelId('');
      }
    } catch (error) {
      console.error('Failed to add channel override:', error);
    }
  };

  // Remove channel override
  const handleRemoveChannelOverride = async (channelId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/channels/${channelId}/notification-override`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setChannelOverrides(prev => prev.filter(o => o.channelId !== channelId));
      }
    } catch (error) {
      console.error('Failed to remove channel override:', error);
    }
  };

  if (!isOpen) return null;

  const textChannels = channels.filter(c => c.type === 'text');
  
  // Get channel name by ID
  const getChannelName = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    return channel?.name || 'Unknown Channel';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#2b2d31] w-full max-w-[550px] max-h-[85vh] rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1f22]">
          <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-[#b5bac1] hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Mute Server Section */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Mute {serverName}</h3>
                  <p className="text-[#b5bac1] text-sm">
                    Muting a server prevents unread indicators and notifications from appearing unless you are mentioned.
                  </p>
                </div>
                <Switch
                  checked={settings.muted}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, muted: checked }))
                  }
                />
              </div>

              <Separator className="bg-[#1e1f22]" />

              {/* Server Notification Settings */}
              <div>
                <h3 className="text-white font-semibold mb-4">Server Notification Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#383a40] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="notificationLevel"
                      value="all"
                      checked={settings.notificationLevel === 'all'}
                      onChange={() => setSettings(prev => ({ ...prev, notificationLevel: 'all' }))}
                      className="w-5 h-5 accent-[#5865f2]"
                    />
                    <div className="flex items-center gap-3">
                      <BellRing className="w-5 h-5 text-[#b5bac1]" />
                      <div>
                        <div className="text-white font-medium">All Messages</div>
                        <div className="text-[#b5bac1] text-xs">Get notified for all messages</div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#383a40] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="notificationLevel"
                      value="mentions"
                      checked={settings.notificationLevel === 'mentions'}
                      onChange={() => setSettings(prev => ({ ...prev, notificationLevel: 'mentions' }))}
                      className="w-5 h-5 accent-[#5865f2]"
                    />
                    <div className="flex items-center gap-3">
                      <AtSign className="w-5 h-5 text-[#b5bac1]" />
                      <div>
                        <div className="text-white font-medium">Only @mentions</div>
                        <div className="text-[#b5bac1] text-xs">Only get notified when mentioned</div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#383a40] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="notificationLevel"
                      value="nothing"
                      checked={settings.notificationLevel === 'nothing'}
                      onChange={() => setSettings(prev => ({ ...prev, notificationLevel: 'nothing' }))}
                      className="w-5 h-5 accent-[#5865f2]"
                    />
                    <div className="flex items-center gap-3">
                      <BellOff className="w-5 h-5 text-[#b5bac1]" />
                      <div>
                        <div className="text-white font-medium">Nothing</div>
                        <div className="text-[#b5bac1] text-xs">No notifications at all</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <Separator className="bg-[#1e1f22]" />

              {/* Community Activity Alerts */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Community Activity Alerts</h3>
                  <p className="text-[#b5bac1] text-sm">
                    Receive notifications for DM or join activity that exceeds usual numbers for your server.
                  </p>
                </div>
                <Switch
                  checked={settings.communityActivityAlerts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, communityActivityAlerts: checked }))
                  }
                />
              </div>

              <Separator className="bg-[#1e1f22]" />

              {/* Push Notifications */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Push Notifications</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">In-app alerts</div>
                    <p className="text-[#b5bac1] text-sm">
                      A global bar that appears across the top when you are using it.
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Mobile Push Notifications</div>
                    <p className="text-[#b5bac1] text-sm">
                      Sends to mobile or desktop devices when you are not using the app.
                    </p>
                  </div>
                  <Switch
                    checked={settings.mobilePushNotifications}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, mobilePushNotifications: checked }))
                    }
                  />
                </div>
              </div>

              <Separator className="bg-[#1e1f22]" />

              {/* Suppress Options */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Notification Filters</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <VolumeX className="w-5 h-5 text-[#b5bac1]" />
                    <div className="text-white">Suppress @everyone and @here</div>
                  </div>
                  <Switch
                    checked={settings.suppressEveryoneHere}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, suppressEveryoneHere: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AtSign className="w-5 h-5 text-[#b5bac1]" />
                    <div className="text-white">Suppress All Role @mentions</div>
                  </div>
                  <Switch
                    checked={settings.suppressRoleMentions}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, suppressRoleMentions: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-[#b5bac1]" />
                    <div>
                      <div className="text-white">Suppress Highlights</div>
                      <p className="text-[#b5bac1] text-xs">
                        Highlights provide occasional updates when your friends are chatting.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.suppressHighlights}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, suppressHighlights: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-[#b5bac1]" />
                    <div className="text-white">Mute New Events</div>
                  </div>
                  <Switch
                    checked={settings.muteNewEvents}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, muteNewEvents: checked }))
                    }
                  />
                </div>
              </div>

              <Separator className="bg-[#1e1f22]" />

              {/* Channel Overrides */}
              <div>
                <h3 className="text-white font-semibold mb-4">Channel Overrides</h3>
                <p className="text-[#b5bac1] text-sm mb-4">
                  Add a channel to override its default notification settings
                </p>

                {/* Add Channel Override Button */}
                {!showChannelOverrideForm ? (
                  <button
                    onClick={() => setShowChannelOverrideForm(true)}
                    className="w-full p-3 bg-[#383a40] hover:bg-[#404249] rounded-lg text-white text-left flex items-center justify-between transition-colors"
                  >
                    <span>Select a channel or category...</span>
                    <ChevronDown className="w-5 h-5 text-[#b5bac1]" />
                  </button>
                ) : (
                  <div className="bg-[#383a40] rounded-lg p-4 space-y-3">
                    <select
                      value={selectedChannelId}
                      onChange={(e) => setSelectedChannelId(e.target.value)}
                      className="w-full p-2 bg-[#1e1f22] text-white rounded border border-[#1e1f22] focus:border-[#5865f2] outline-none"
                    >
                      <option value="">Select a channel...</option>
                      {textChannels.map(channel => (
                        <option key={channel.id} value={channel.id}>
                          # {channel.name}
                        </option>
                      ))}
                    </select>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => selectedChannelId && handleAddChannelOverride(selectedChannelId, 'all')}
                        disabled={!selectedChannelId}
                        className="flex-1 py-2 px-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm rounded transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={() => selectedChannelId && handleAddChannelOverride(selectedChannelId, 'mentions')}
                        disabled={!selectedChannelId}
                        className="flex-1 py-2 px-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm rounded transition-colors"
                      >
                        Mentions
                      </button>
                      <button
                        onClick={() => selectedChannelId && handleAddChannelOverride(selectedChannelId, 'nothing')}
                        disabled={!selectedChannelId}
                        className="flex-1 py-2 px-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-sm rounded transition-colors"
                      >
                        Nothing
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowChannelOverrideForm(false);
                        setSelectedChannelId('');
                      }}
                      className="w-full py-2 text-[#b5bac1] hover:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Channel Overrides List */}
                {channelOverrides.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-[1fr,auto,auto] gap-2 text-[#b5bac1] text-xs px-2">
                      <span>CHANNEL</span>
                      <span className="px-2">LEVEL</span>
                      <span></span>
                    </div>
                    {channelOverrides.map(override => (
                      <div
                        key={override.channelId}
                        className="grid grid-cols-[1fr,auto,auto] gap-2 items-center p-2 bg-[#383a40] rounded-lg"
                      >
                        <div className="flex items-center gap-2 text-white">
                          <Hash className="w-4 h-4 text-[#b5bac1]" />
                          <span className="truncate">{getChannelName(override.channelId)}</span>
                        </div>
                        <span className="px-2 py-1 bg-[#1e1f22] rounded text-white text-xs uppercase">
                          {override.notificationLevel}
                        </span>
                        <button
                          onClick={() => handleRemoveChannelOverride(override.channelId)}
                          className="p-1 text-[#b5bac1] hover:text-[#ed4245] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1e1f22]">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full py-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
