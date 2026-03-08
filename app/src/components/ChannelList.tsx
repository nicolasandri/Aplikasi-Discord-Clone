import { useState, useEffect, useCallback, useRef } from 'react';
import { Hash, Volume2, ChevronDown, Plus, Settings, Mic, Headphones, UserPlus, Trash2, Edit2, LogOut, Gem, Calendar, LayoutGrid, Bell, Shield, UserCog, EyeOff, Edit3, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryItem } from './CategoryItem';
import { CreateCategoryModal } from './CreateCategoryModal';
import { RenameCategoryModal } from './RenameCategoryModal';
import { CreateChannelModal } from './CreateChannelModal';
import type { Channel, Server, Category } from '@/types';

// Dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
} from '@dnd-kit/sortable';

interface ChannelListProps {
  server: Server | null;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenSettings?: () => void;
  onOpenServerSettings?: () => void;
  onOpenUserSettings?: () => void;
  onOpenInvite?: () => void;
  onLeaveServer?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
  isOwner?: boolean;
  unreadCounts?: Record<string, { count: number; hasMention: boolean }>;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Base URL for assets
const BASE_URL = isElectron ? 'http://localhost:3001' : '';

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function ChannelList({ server, channels: _channels, selectedChannelId, onSelectChannel, onOpenSettings, onOpenServerSettings, onOpenUserSettings, onOpenInvite, onLeaveServer, isMobile = false, onClose, isOwner: propIsOwner, unreadCounts = {} }: ChannelListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedChannels, setUncategorizedChannels] = useState<Channel[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [canManage, setCanManage] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [renameCategory, setRenameCategory] = useState<Category | null>(null);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const serverMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  // Fetch categories when server changes
  const fetchCategories = useCallback(async () => {
    if (!server) return;
    try {
      const response = await fetch(`${API_URL}/servers/${server.id}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        setUncategorizedChannels(data.uncategorized);
        // Expand all categories by default
        setExpandedCategories(new Set(data.categories.map((c: Category) => c.id)));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [server, token]);

  // Get current user ID from localStorage
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
  // Check if current user is the server owner - use prop if provided, otherwise calculate locally
  const calculatedIsOwner = !!(server?.owner_id && currentUserId && server.owner_id === currentUserId);
  const isOwner = propIsOwner !== undefined ? propIsOwner : calculatedIsOwner;
  
  // Debug logging
  console.log('[ChannelList] server?.owner_id:', server?.owner_id);
  console.log('[ChannelList] currentUserId:', currentUserId);
  console.log('[ChannelList] propIsOwner:', propIsOwner);
  console.log('[ChannelList] isOwner:', isOwner, '| type:', typeof isOwner);

  // Check permissions
  useEffect(() => {
    const checkPermission = async () => {
      if (!server) return;
      try {
        const response = await fetch(`${API_URL}/servers/${server.id}/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setCanManage(data.canManageChannels || data.isOwner || isOwner);
        } else {
          // Fallback: use isOwner check if API fails
          setCanManage(isOwner);
        }
      } catch (error) {
        console.error('Failed to check permissions:', error);
        // Fallback: use isOwner check if API fails
        setCanManage(isOwner);
      }
    };
    checkPermission();
    fetchCategories();
  }, [server, fetchCategories, token, isOwner]);

  // Listen for socket events
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket || !server) return;

    const handleCategoryCreated = () => fetchCategories();
    const handleCategoryUpdated = () => fetchCategories();
    const handleCategoryDeleted = () => fetchCategories();
    const handleChannelMoved = () => fetchCategories();
    const handleOwnershipTransferred = (data: any) => {
      if (data.serverId === server.id) {
        // Refresh permissions after ownership transfer
        window.location.reload();
      }
    };

    socket.on('category_created', handleCategoryCreated);
    socket.on('category_updated', handleCategoryUpdated);
    socket.on('category_deleted', handleCategoryDeleted);
    socket.on('channel_moved', handleChannelMoved);
    socket.on('ownership_transferred', handleOwnershipTransferred);

    return () => {
      socket.off('category_created', handleCategoryCreated);
      socket.off('category_updated', handleCategoryUpdated);
      socket.off('category_deleted', handleCategoryDeleted);
      socket.off('channel_moved', handleChannelMoved);
      socket.off('ownership_transferred', handleOwnershipTransferred);
    };
  }, [server, fetchCategories]);

  // Close server menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(event.target as Node)) {
        setShowServerMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showServerMenu || showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showServerMenu, showUserMenu]);

  const handleCopyUsername = () => {
    if (user?.username) {
      navigator.clipboard.writeText(user.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEditProfile = () => {
    setShowUserMenu(false);
    onOpenUserSettings?.();
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleCreateChannel = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setIsCreateChannelModalOpen(true);
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const response = await fetch(`${API_URL}/channels/${channelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchCategories();
      } else {
        const error = await response.json();
        alert(error.error || 'Gagal menghapus channel');
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
      alert('Terjadi kesalahan saat menghapus channel');
    }
  };

  const handleConvertToCategory = async (categoryName: string) => {
    if (!server || uncategorizedChannels.length === 0) return;
    
    try {
      // Create new category
      const response = await fetch(`${API_URL}/servers/${server.id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        
        // Move all uncategorized channels to new category
        for (const channel of uncategorizedChannels) {
          await fetch(`${API_URL}/channels/${channel.id}/move`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ categoryId: newCategory.id }),
          });
        }
        
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to convert to category:', error);
      alert('Terjadi kesalahan saat mengubah nama kategori');
    }
  };

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum distance to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event: KeyboardEvent & { active?: { rect?: { current?: { translated?: { left: number; top: number } } } } }) => {
        const { active } = event;
        const node = active?.rect?.current?.translated;
        return node ? { x: node.left, y: node.top } : { x: 0, y: 0 };
      },
    })
  );

  // Handle channel reorder within a category
  const handleDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id && server) {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;

      const oldChannels = category.channels || [];
      const oldIndex = oldChannels.findIndex((c) => c.id === active.id);
      const newIndex = oldChannels.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Create new array with reordered channels
      const newChannels = arrayMove(oldChannels, oldIndex, newIndex);

      // Update local state immediately for responsive UI
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId ? { ...cat, channels: newChannels } : cat
        )
      );

      // Send reorder to server
      try {
        // Prepare channels array with position
        const channelsToUpdate = newChannels.map((channel, index) => ({
          id: channel.id,
          categoryId: categoryId,
          position: index,
        }));

        const response = await fetch(`${API_URL}/servers/${server.id}/channels/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ channels: channelsToUpdate }),
        });

        if (!response.ok) {
          console.error('Failed to reorder channels');
          // Revert on error by refetching
          fetchCategories();
        }
      } catch (error) {
        console.error('Failed to reorder channels:', error);
        fetchCategories();
      }
    }
  };

  if (!server) {
    return (
      <div className="w-60 bg-[#232438] flex flex-col">
        <div className="h-12 px-4 flex items-center shadow-md">
          <h2 className="text-white font-semibold">Direct Messages</h2>
        </div>
        <div className="flex-1 p-2">
          <div className="text-[#6a6a7a] text-sm p-4 text-center">
            Pilih server untuk melihat channel
          </div>
        </div>
        
        {/* User Panel */}
        <div className="h-[52px] bg-[#292b2f] px-2 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#34373c] cursor-pointer">
            <img
              src={user?.avatar?.startsWith('http') ? user?.avatar : `${BASE_URL}${user?.avatar}`}
              alt={user?.displayName || user?.username}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
              }}
            />
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium truncate max-w-[100px]">{user?.displayName || user?.username}</span>
              <span className="text-[#a0a0b0] text-xs">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded">
              <Mic className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded">
              <Headphones className="w-5 h-5" />
            </button>
            <button 
              onClick={onOpenSettings}
              className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#232438] flex flex-col">
      {/* Server Header */}
      <div 
        className="h-12 px-4 flex items-center justify-between shadow-md cursor-pointer hover:bg-[#34373c] transition-colors group relative"
        onClick={() => setShowServerMenu(!showServerMenu)}
        ref={serverMenuRef}
      >
        <h2 className="text-white font-semibold truncate">{server.name}</h2>
        <div className="flex items-center gap-2">
          {/* Invite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInvite?.();
            }}
            className="p-1.5 rounded hover:bg-[#00d4ff] text-[#a0a0b0] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Invite People"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <ChevronDown className={`w-5 h-5 text-white transition-transform ${showServerMenu ? 'rotate-180' : ''}`} />
        </div>

        {/* Server Dropdown Menu */}
        {showServerMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 mx-2 bg-[#18191c] rounded-lg shadow-lg border border-[#232438] z-50 overflow-hidden py-1">
            
            {/* Server Boost */}
            <button
              onClick={() => {
                alert('Server Boost - Fitur premium akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#ff73fa] hover:text-white hover:bg-[#ff73fa] transition-colors text-sm"
            >
              <span>Server Boost</span>
              <Gem className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="h-px bg-[#232438] mx-2 my-1" />

            {/* Invite People */}
            <button
              onClick={() => {
                onOpenInvite?.();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>Invite People</span>
              <UserPlus className="w-4 h-4" />
            </button>

            {/* Server Settings - Owner only - v2 */}
            {isOwner && (
              <button
                onClick={() => {
                  onOpenServerSettings?.();
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
              >
                <span>Server Settings</span>
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Divider */}
            <div className="h-px bg-[#232438] mx-2 my-1" />

            {/* Create Channel */}
            {canManage && (
              <button
                onClick={() => {
                  setSelectedCategoryId(null);
                  setIsCreateChannelModalOpen(true);
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
              >
                <span>Create Channel</span>
                <Plus className="w-4 h-4" />
              </button>
            )}

            {/* Create Category */}
            {canManage && (
              <button
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setShowServerMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
              >
                <span>Create Category</span>
                <Plus className="w-4 h-4" />
              </button>
            )}

            {/* Create Event */}
            <button
              onClick={() => {
                alert('Create Event - Fitur akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>Create Event</span>
              <Calendar className="w-4 h-4" />
            </button>

            {/* App Directory */}
            <button
              onClick={() => {
                alert('App Directory - Fitur akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>App Directory</span>
              <LayoutGrid className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="h-px bg-[#232438] mx-2 my-1" />

            {/* Notification Settings */}
            <button
              onClick={() => {
                alert('Notification Settings - Fitur akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>Notification Settings</span>
              <Bell className="w-4 h-4" />
            </button>

            {/* Privacy Settings */}
            <button
              onClick={() => {
                alert('Privacy Settings - Fitur akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>Privacy Settings</span>
              <Shield className="w-4 h-4" />
            </button>

            {/* Edit Per-server Profile */}
            <button
              onClick={() => {
                alert('Edit Per-server Profile - Fitur akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>Edit Per-server Profile</span>
              <UserCog className="w-4 h-4" />
            </button>

            {/* Hide Muted Channels */}
            <button
              onClick={() => {
                alert('Hide Muted Channels - Fitur akan segera hadir!');
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#a0a0b0] hover:text-white hover:bg-[#00d4ff] transition-colors text-sm"
            >
              <span>Hide Muted Channels</span>
              <EyeOff className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="h-px bg-[#232438] mx-2 my-1" />

            {/* Leave Server */}
            <button
              onClick={async () => {
                if (!server?.id) {
                  alert('Server not found');
                  return;
                }
                if (confirm('Are you sure you want to leave this server?')) {
                  try {
                    console.log('[LEAVE] Sending request to:', `${API_URL}/servers/${server.id}/leave`);
                    const response = await fetch(`${API_URL}/servers/${server.id}/leave`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    console.log('[LEAVE] Response status:', response.status);
                    
                    if (response.ok) {
                      onLeaveServer?.();
                    } else {
                      const errorData = await response.json().catch(() => ({ error: 'Failed to leave server' }));
                      console.error('[LEAVE] Error:', errorData);
                      alert(errorData.error || 'Failed to leave server. Please try again.');
                    }
                  } catch (error) {
                    console.error('Leave server error:', error);
                    alert('Failed to leave server. Please try again.');
                  }
                }
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-[#ed4245] hover:text-white hover:bg-[#ed4245] transition-colors text-sm"
            >
              <span>Leave Server</span>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Categories */}
        {categories.map((category) => (
          <DndContext
            key={category.id}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, category.id)}
          >
            <CategoryItem
              category={category}
              channels={category.channels || []}
              isExpanded={expandedCategories.has(category.id)}
              selectedChannelId={selectedChannelId}
              canManage={canManage}
              onToggle={() => toggleCategory(category.id)}
              onSelectChannel={onSelectChannel}
              onCreateChannel={() => handleCreateChannel(category.id)}
              onDeleteCategory={() => handleDeleteCategory(category.id)}
              onRenameCategory={() => setRenameCategory(category)}
              onDeleteChannel={handleDeleteChannel}
              unreadCounts={unreadCounts}
            />
          </DndContext>
        ))}

        {/* Uncategorized Channels */}
        {(uncategorizedChannels.length > 0 || canManage) && (
          <div className="mb-2">
            <div className="flex items-center px-2 py-1 text-[#96989d] group">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-semibold uppercase tracking-wide flex-1">
                LAINNYA
              </span>
              {canManage && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setIsCreateChannelModalOpen(true);
                    }}
                    className="p-1 hover:bg-[#34373c] rounded text-[#a0a0b0] hover:text-white transition-opacity"
                    title="Buat Channel"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      const newName = prompt('Nama kategori baru:', 'LAINNYA');
                      if (newName && newName.trim()) {
                        handleConvertToCategory(newName.trim());
                      }
                    }}
                    className="p-1 hover:bg-[#34373c] rounded text-[#a0a0b0] hover:text-white transition-opacity"
                    title="Ubah Nama Kategori"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-0.5">
              {uncategorizedChannels.map((channel) => {
                const unread = unreadCounts[channel.id];
                const hasUnread = unread && unread.count > 0;
                const hasMention = unread?.hasMention;
                
                return (
                  <div
                    key={channel.id}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded ${
                      selectedChannelId === channel.id
                        ? 'bg-[#2a2b3d] text-white'
                        : hasUnread 
                          ? 'bg-[#232438] text-white'
                          : 'text-[#a0a0b0] hover:bg-[#34373c] hover:text-[#dcddde]'
                    }`}
                  >
                    <button
                      onClick={() => {
                        onSelectChannel(channel.id);
                        if (isMobile) onClose?.();
                      }}
                      className="flex-1 flex items-center gap-2 min-w-0"
                    >
                      {channel.type === 'voice' ? (
                        <Volume2 className="w-4 h-4 text-[#6a6a7a]" />
                      ) : (
                        <Hash className={`w-4 h-4 ${hasUnread ? 'text-white' : 'text-[#6a6a7a]'}`} />
                      )}
                      <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-white' : ''}`}>
                        {channel.name}
                      </span>
                      
                      {/* Unread badge */}
                      {hasUnread && (
                        <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                          hasMention 
                            ? 'bg-[#ed4245] text-white' 
                            : 'bg-[#b9bbbe] text-[#0d0d14]'
                        }`}>
                          {unread.count > 99 ? '99+' : unread.count}
                        </span>
                      )}
                    </button>
                    
                    {/* Delete Channel Button (hover) */}
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Hapus channel "#${channel.name}"?`)) {
                            handleDeleteChannel(channel.id);
                          }
                        }}
                        className="p-1 hover:bg-[#ed4245]/20 rounded text-[#a0a0b0] hover:text-[#ed4245] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Channel"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Category Button */}
        {canManage && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-2 mt-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Buat Kategori</span>
          </button>
        )}
      </div>

      {/* User Panel */}
      <div className="h-[52px] bg-[#292b2f] px-2 flex items-center justify-between relative">
        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#34373c] cursor-pointer flex-1"
        >
          <img
            src={user?.avatar?.startsWith('http') ? user?.avatar : `${BASE_URL}${user?.avatar}`}
            alt={user?.displayName || user?.username}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-medium truncate">{user?.displayName || user?.username}</span>
            <span className="text-[#a0a0b0] text-xs">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded">
            <Mic className="w-5 h-5" />
          </button>
          <button className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded">
            <Headphones className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenUserSettings}
            className="p-2 text-[#a0a0b0] hover:text-white hover:bg-[#34373c] rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* User Popup Menu - Mobile Compact Style */}
        {showUserMenu && (
          <div
            ref={userMenuRef}
            className="absolute bottom-full left-2 right-2 mb-2 bg-[#18191c] rounded-lg shadow-2xl overflow-hidden z-[100]"
          >
            {/* Compact User Info */}
            <div className="p-3 flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <img
                  src={user?.avatar?.startsWith('http') ? user?.avatar : `${BASE_URL}${user?.avatar}`}
                  alt={user?.displayName || user?.username}
                  className="w-12 h-12 rounded-full object-cover bg-[#1a1b2e]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
                  }}
                />
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#3ba55d] rounded-full border-2 border-[#18191c]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-sm truncate">{user?.displayName || user?.username}</h3>
                  <span className="px-1.5 py-0.5 bg-[#00d4ff] text-white text-[10px] rounded">VIP</span>
                </div>
                <p className="text-[#a0a0b0] text-xs truncate">{user?.email}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-[#3ba55d]" />
                  <span className="text-[#a0a0b0] text-xs">Online</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-3 h-px bg-[#2f3136]" />

            {/* Compact Menu Items */}
            <div className="py-1">
              <button
                onClick={handleEditProfile}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#a0a0b0] hover:bg-[#00d4ff] hover:text-white transition-colors text-left"
              >
                <Edit3 className="w-4 h-4" />
                <span className="text-sm">Edit Profile</span>
              </button>

              <button
                onClick={handleCopyUsername}
                className="w-full flex items-center gap-2 px-3 py-2 text-[#a0a0b0] hover:bg-[#00d4ff] hover:text-white transition-colors text-left"
              >
                {copied ? <Check className="w-4 h-4 text-[#43b581]" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm">{copied ? 'Copied!' : 'Copy Username'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        serverId={server.id}
        onCategoryCreated={fetchCategories}
      />

      <CreateChannelModal
        isOpen={isCreateChannelModalOpen}
        onClose={() => {
          setIsCreateChannelModalOpen(false);
          setSelectedCategoryId(null);
        }}
        serverId={server.id}
        categoryId={selectedCategoryId}
        onChannelCreated={fetchCategories}
      />

      {renameCategory && (
        <RenameCategoryModal
          isOpen={!!renameCategory}
          onClose={() => setRenameCategory(null)}
          categoryId={renameCategory.id}
          currentName={renameCategory.name}
          onCategoryRenamed={fetchCategories}
        />
      )}
    </div>
  );
}

