import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Hash, Volume2 } from 'lucide-react';
import type { Category, Channel } from '@/types';

interface CategoryItemProps {
  category: Category;
  channels: Channel[];
  isExpanded: boolean;
  selectedChannelId: string | null;
  canManage: boolean;
  onToggle: () => void;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onDeleteCategory: () => void;
  onRenameCategory: () => void;
}

export function CategoryItem({
  category,
  channels,
  isExpanded,
  selectedChannelId,
  canManage,
  onToggle,
  onSelectChannel,
  onCreateChannel,
  onDeleteCategory,
  onRenameCategory,
}: CategoryItemProps) {
  const [_showMenu, _setShowMenu] = useState(false);

  return (
    <div className="mb-2">
      {/* Category Header */}
      <div
        className="flex items-center px-2 py-1 text-[#96989d] hover:text-[#dcddde] cursor-pointer group"
        onClick={onToggle}
      >
        {/* Expand/Collapse Icon */}
        <button className="mr-1 p-0.5 hover:bg-[#34373c] rounded">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {/* Category Name (ALL CAPS like Discord) */}
        <span className="text-xs font-semibold uppercase tracking-wide flex-1 truncate">
          {category.name}
        </span>

        {/* Manage Buttons (hover) */}
        {canManage && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateChannel();
              }}
              className="p-1 hover:bg-[#34373c] rounded text-[#b9bbbe] hover:text-white"
              title="Buat Channel"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameCategory();
              }}
              className="p-1 hover:bg-[#34373c] rounded text-[#b9bbbe] hover:text-white"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            {channels.length === 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Hapus kategori "${category.name}"?`)) {
                    onDeleteCategory();
                  }
                }}
                className="p-1 hover:bg-[#ed4245]/20 rounded text-[#b9bbbe] hover:text-[#ed4245]"
                title="Hapus"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Channels List */}
      {isExpanded && (
        <div className="mt-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
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
      )}
    </div>
  );
}
