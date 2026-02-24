import { useState, useEffect, useCallback } from 'react';
import { Hash, Volume2, ChevronDown, Plus, Settings, Mic, Headphones, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryItem } from './CategoryItem';
import { CreateCategoryModal } from './CreateCategoryModal';
import { RenameCategoryModal } from './RenameCategoryModal';
import type { Channel, Server, Category } from '@/types';

interface ChannelListProps {
  server: Server | null;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onOpenSettings?: () => void;
  onOpenInvite?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

export function ChannelList({ server, channels: _channels, selectedChannelId, onSelectChannel, onOpenSettings, onOpenInvite, isMobile = false, onClose }: ChannelListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedChannels, setUncategorizedChannels] = useState<Channel[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [canManage, setCanManage] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [renameCategory, setRenameCategory] = useState<Category | null>(null);
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
          setCanManage(data.canManageChannels || data.isOwner);
        }
      } catch (error) {
        console.error('Failed to check permissions:', error);
      }
    };
    checkPermission();
    fetchCategories();
  }, [server, fetchCategories, token]);

  // Listen for socket events
  useEffect(() => {
    const socket = (window as any).socket;
    if (!socket || !server) return;

    const handleCategoryCreated = () => fetchCategories();
    const handleCategoryUpdated = () => fetchCategories();
    const handleCategoryDeleted = () => fetchCategories();
    const handleChannelMoved = () => fetchCategories();

    socket.on('category_created', handleCategoryCreated);
    socket.on('category_updated', handleCategoryUpdated);
    socket.on('category_deleted', handleCategoryDeleted);
    socket.on('channel_moved', handleChannelMoved);

    return () => {
      socket.off('category_created', handleCategoryCreated);
      socket.off('category_updated', handleCategoryUpdated);
      socket.off('category_deleted', handleCategoryDeleted);
      socket.off('channel_moved', handleChannelMoved);
    };
  }, [server, fetchCategories]);

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
    // TODO: Implement create channel modal
    console.log('Create channel in category:', categoryId);
  };

  if (!server) {
    return (
      <div className="w-60 bg-[#2f3136] flex flex-col">
        <div className="h-12 px-4 flex items-center shadow-md">
          <h2 className="text-white font-semibold">Direct Messages</h2>
        </div>
        <div className="flex-1 p-2">
          <div className="text-[#72767d] text-sm p-4 text-center">
            Pilih server untuk melihat channel
          </div>
        </div>
        
        {/* User Panel */}
        <div className="h-[52px] bg-[#292b2f] px-2 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#34373c] cursor-pointer">
            <img
              src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
              alt={user?.username}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
              }}
            />
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium truncate max-w-[100px]">{user?.username}</span>
              <span className="text-[#b9bbbe] text-xs">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
              <Mic className="w-5 h-5" />
            </button>
            <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
              <Headphones className="w-5 h-5" />
            </button>
            <button 
              onClick={onOpenSettings}
              className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#2f3136] flex flex-col">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md cursor-pointer hover:bg-[#34373c] transition-colors group">
        <h2 className="text-white font-semibold truncate">{server.name}</h2>
        <div className="flex items-center gap-2">
          {/* Invite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInvite?.();
            }}
            className="p-1.5 rounded hover:bg-[#5865f2] text-[#b9bbbe] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Invite People"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <ChevronDown className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Categories */}
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
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
          />
        ))}

        {/* Uncategorized Channels */}
        {uncategorizedChannels.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center px-2 py-1 text-[#96989d]">
              <ChevronDown className="w-3 h-3 mr-1" />
              <span className="text-xs font-semibold uppercase tracking-wide flex-1">
                LAINNYA
              </span>
            </div>
            <div className="mt-0.5">
              {uncategorizedChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                  onSelectChannel(channel.id);
                  if (isMobile) onClose?.();
                }}
                  className={`w-full flex items-center gap-2 px-6 py-1.5 rounded group ${
                    selectedChannelId === channel.id
                      ? 'bg-[#40444b] text-white'
                      : 'text-[#b9bbbe] hover:bg-[#34373c] hover:text-[#dcddde]'
                  }`}
                >
                  {channel.type === 'voice' ? (
                    <Volume2 className="w-4 h-4 text-[#72767d]" />
                  ) : (
                    <Hash className="w-4 h-4 text-[#72767d]" />
                  )}
                  <span className="text-sm truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create Category Button */}
        {canManage && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full flex items-center gap-2 px-2 py-2 mt-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Buat Kategori</span>
          </button>
        )}
      </div>

      {/* User Panel */}
      <div className="h-[52px] bg-[#292b2f] px-2 flex items-center justify-between">
        <div 
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#34373c] cursor-pointer flex-1"
        >
          <img
            src={user?.avatar?.startsWith('http') ? user?.avatar : `http://localhost:3001${user?.avatar}`}
            alt={user?.username}
            className="w-8 h-8 rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`;
            }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-white text-sm font-medium truncate">{user?.username}</span>
            <span className="text-[#b9bbbe] text-xs">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
            <Mic className="w-5 h-5" />
          </button>
          <button className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded">
            <Headphones className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#34373c] rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateCategoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        serverId={server.id}
        onCategoryCreated={fetchCategories}
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
