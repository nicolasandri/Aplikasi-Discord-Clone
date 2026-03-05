import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Hash, Volume2, GripVertical } from 'lucide-react';
import type { Category, Channel } from '@/types';

// Dnd-kit imports
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableChannelItemProps {
  channel: Channel;
  selectedChannelId: string | null;
  canManage: boolean;
  onSelectChannel: (channelId: string) => void;
  onDeleteChannel?: (channelId: string) => void;
  unreadCounts?: Record<string, { count: number; hasMention: boolean }>;
}

// Individual sortable channel item
function SortableChannelItem({
  channel,
  selectedChannelId,
  canManage,
  onSelectChannel,
  onDeleteChannel,
  unreadCounts = {},
}: SortableChannelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: channel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const unread = unreadCounts[channel.id];
  const hasUnread = unread && unread.count > 0;
  const hasMention = unread?.hasMention;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer ${
        selectedChannelId === channel.id
          ? 'bg-[#2a2b3d] text-white'
          : hasUnread
            ? 'bg-[#232438] text-white'
            : 'text-[#a0a0b0] hover:bg-[#34373c] hover:text-[#dcddde]'
      }`}
    >
      {/* Drag Handle */}
      {canManage && (
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 hover:bg-[#4f545c] rounded opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-3 h-3 text-[#6a6a7a]" />
        </button>
      )}

      {/* Channel Button */}
      <button
        onClick={() => onSelectChannel(channel.id)}
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
              : 'bg-[#b9bbbe] text-[#2f3136]'
          }`}>
            {unread.count > 99 ? '99+' : unread.count}
          </span>
        )}
      </button>

      {/* Delete Channel Button (hover) */}
      {canManage && onDeleteChannel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Hapus channel "#${channel.name}"?`)) {
              onDeleteChannel(channel.id);
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
}

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
  onDeleteChannel?: (channelId: string) => void;
  unreadCounts?: Record<string, { count: number; hasMention: boolean }>;
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
  onDeleteChannel,
  unreadCounts = {},
}: CategoryItemProps) {
  const [_showMenu, _setShowMenu] = useState(false);

  // Sort channels by position if available
  const sortedChannels = [...channels].sort((a, b) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    return posA - posB;
  });

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
              className="p-1 hover:bg-[#34373c] rounded text-[#a0a0b0] hover:text-white"
              title="Buat Channel"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenameCategory();
              }}
              className="p-1 hover:bg-[#34373c] rounded text-[#a0a0b0] hover:text-white"
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
                className="p-1 hover:bg-[#ed4245]/20 rounded text-[#a0a0b0] hover:text-[#ed4245]"
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
          <SortableContext
            items={sortedChannels.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedChannels.map((channel) => (
              <SortableChannelItem
                key={channel.id}
                channel={channel}
                selectedChannelId={selectedChannelId}
                canManage={canManage}
                onSelectChannel={onSelectChannel}
                onDeleteChannel={onDeleteChannel}
                unreadCounts={unreadCounts}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

