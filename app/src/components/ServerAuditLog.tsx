import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, Users, Shield, Hash, Trash2, Plus, Settings, UserPlus, UserMinus, Ban, Edit3, FolderPlus, FolderMinus } from 'lucide-react';

interface ServerAuditLogProps {
  serverId: string;
}

interface AuditLogEntry {
  id: string;
  serverId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  actionType: string;
  targetId?: string;
  targetName?: string;
  targetType?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

const actionTypes = [
  { id: 'all', label: 'All Actions', icon: Settings },
  { id: 'update_server', label: 'Update Server', icon: Settings },
  { id: 'create_channel', label: 'Create Channel', icon: Plus },
  { id: 'update_channel', label: 'Update Channel', icon: Edit3 },
  { id: 'delete_channel', label: 'Delete Channel', icon: Trash2 },
  { id: 'create_role', label: 'Create Role', icon: Shield },
  { id: 'update_role', label: 'Update Role', icon: Shield },
  { id: 'delete_role', label: 'Delete Role', icon: Trash2 },
  { id: 'assign_role', label: 'Assign Role', icon: UserPlus },
  { id: 'remove_role', label: 'Remove Role', icon: UserMinus },
  { id: 'kick_member', label: 'Kick Member', icon: UserMinus },
  { id: 'ban_member', label: 'Ban Member', icon: Ban },
  { id: 'unban_member', label: 'Unban Member', icon: UserPlus },
  { id: 'create_invite', label: 'Create Invite', icon: Plus },
  { id: 'delete_invite', label: 'Delete Invite', icon: Trash2 },
];

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

export function ServerAuditLog({ serverId }: ServerAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<{id: string, name: string, avatar?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const actionDropdownRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/servers/${serverId}/audit-log`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        setFilteredLogs(data);
        
        // Extract unique users for filter
        const uniqueUsers = data.reduce((acc: any[], log: AuditLogEntry) => {
          if (!acc.find(u => u.id === log.userId)) {
            acc.push({ id: log.userId, name: log.userName, avatar: log.userAvatar });
          }
          return acc;
        }, []);
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter logs
  useEffect(() => {
    let filtered = logs;
    
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.userId === selectedUser);
    }
    
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.actionType === selectedAction);
    }
    
    setFilteredLogs(filtered);
  }, [selectedUser, selectedAction, logs]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAvatarUrl = (log: AuditLogEntry) => {
    if (!log.userAvatar) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.userName}`;
    }
    if (log.userAvatar.startsWith('http')) return log.userAvatar;
    return `${BASE_URL}${log.userAvatar}`;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // If less than 24 hours, show "Today at XX:XX AM/PM"
    if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) {
      return `Today at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) {
      return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // Otherwise show "Last Monday at XX:XX AM/PM" or date
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return `Last ${d.toLocaleDateString('en-US', { weekday: 'long' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
           ` at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const getActionIcon = (actionType: string) => {
    const action = actionTypes.find(a => a.id === actionType);
    if (!action) return Settings;
    return action.icon;
  };

  const getActionColor = (actionType: string) => {
    if (actionType.includes('create') || actionType.includes('add')) return 'text-[#3ba55d]';
    if (actionType.includes('delete') || actionType.includes('remove') || actionType.includes('kick') || actionType.includes('ban')) return 'text-[#ed4245]';
    if (actionType.includes('update')) return 'text-[#faa81a]';
    return 'text-[#5865f2]';
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
      <div>
        <h2 className="text-white text-xl font-bold mb-1">Audit Log</h2>
        <p className="text-[#b9bbbe] text-sm">
          Track changes made to your server.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        {/* Filter by User */}
        <div className="relative" ref={userDropdownRef}>
          <label className="text-[#72767d] text-xs font-bold uppercase mb-1.5 block">Filter by User</label>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center justify-between w-64 px-3 py-2 bg-[#1e1f22] text-white rounded text-sm hover:bg-[#2f3136] transition-colors"
          >
            <span className="flex items-center gap-2">
              {selectedUser === 'all' ? (
                <>
                  <Users className="w-4 h-4 text-[#72767d]" />
                  All Users
                </>
              ) : (
                <>
                  {(() => {
                    const user = users.find(u => u.id === selectedUser);
                    return user ? (
                      <>
                        <img 
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                          alt={user.name}
                          className="w-5 h-5 rounded-full"
                        />
                        {user.name}
                      </>
                    ) : 'Unknown User';
                  })()}
                </>
              )}
            </span>
            <ChevronRight className={`w-4 h-4 text-[#72767d] transition-transform ${showUserDropdown ? 'rotate-90' : ''}`} />
          </button>
          
          {showUserDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#18191c] rounded-lg shadow-xl z-50 py-1 border border-[#2f3136] max-h-60 overflow-y-auto">
              <button
                onClick={() => { setSelectedUser('all'); setShowUserDropdown(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#5865f2] hover:text-white ${selectedUser === 'all' ? 'bg-[#5865f2] text-white' : 'text-[#b9bbbe]'}`}
              >
                <Users className="w-4 h-4" />
                All Users
              </button>
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => { setSelectedUser(user.id); setShowUserDropdown(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#5865f2] hover:text-white ${selectedUser === user.id ? 'bg-[#5865f2] text-white' : 'text-[#b9bbbe]'}`}
                >
                  <img 
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
                    alt={user.name}
                    className="w-5 h-5 rounded-full"
                  />
                  {user.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter by Action */}
        <div className="relative" ref={actionDropdownRef}>
          <label className="text-[#72767d] text-xs font-bold uppercase mb-1.5 block">Filter by Action</label>
          <button
            onClick={() => setShowActionDropdown(!showActionDropdown)}
            className="flex items-center justify-between w-56 px-3 py-2 bg-[#1e1f22] text-white rounded text-sm hover:bg-[#2f3136] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#72767d]" />
              {actionTypes.find(a => a.id === selectedAction)?.label || 'All Actions'}
            </span>
            <ChevronRight className={`w-4 h-4 text-[#72767d] transition-transform ${showActionDropdown ? 'rotate-90' : ''}`} />
          </button>
          
          {showActionDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#18191c] rounded-lg shadow-xl z-50 py-1 border border-[#2f3136] max-h-80 overflow-y-auto">
              {actionTypes.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => { setSelectedAction(action.id); setShowActionDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#5865f2] hover:text-white ${selectedAction === action.id ? 'bg-[#5865f2] text-white' : 'text-[#b9bbbe]'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-[#72767d]">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No audit log entries found</p>
            <p className="text-sm mt-1">Actions taken in this server will appear here</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const ActionIcon = getActionIcon(log.actionType);
            const isExpanded = expandedLog === log.id;
            
            return (
              <div 
                key={log.id}
                className="bg-[#2b2d31] rounded-lg overflow-hidden hover:bg-[#35373c] transition-colors"
              >
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  {/* User Avatar */}
                  <img
                    src={getAvatarUrl(log)}
                    alt={log.userName}
                    className="w-10 h-10 rounded-full bg-[#36393f] flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.userName}`;
                    }}
                  />
                  
                  {/* Action Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{log.userName}</span>
                      <span className="text-[#b9bbbe]">{log.action}</span>
                      {log.targetName && (
                        <span className={`font-medium ${getActionColor(log.actionType)}`}>
                          {log.targetName}
                        </span>
                      )}
                    </div>
                    <p className="text-[#72767d] text-sm mt-0.5">{formatTime(log.createdAt)}</p>
                  </div>
                  
                  {/* Action Icon */}
                  <div className={`p-2 rounded-full bg-[#1e1f22] ${getActionColor(log.actionType)}`}>
                    <ActionIcon className="w-4 h-4" />
                  </div>
                  
                  {/* Expand Arrow */}
                  <ChevronRight className={`w-5 h-5 text-[#72767d] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Expanded Details */}
                {isExpanded && (log.oldValue || log.newValue) && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-14 pl-4 border-l-2 border-[#40444b] space-y-2">
                      {log.oldValue && (
                        <div className="flex items-center gap-2">
                          <span className="text-[#72767d] text-sm">Before:</span>
                          <span className="text-[#ed4245] text-sm line-through">{log.oldValue}</span>
                        </div>
                      )}
                      {log.newValue && (
                        <div className="flex items-center gap-2">
                          <span className="text-[#72767d] text-sm">After:</span>
                          <span className="text-[#3ba55d] text-sm">{log.newValue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
