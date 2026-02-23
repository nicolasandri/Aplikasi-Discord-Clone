import { useEffect, useRef } from 'react';
import { 
  Reply, 
  Forward, 
  Copy, 
  Link, 
  Trash2, 
  MoreHorizontal,
  Flag,
  Hash,
  Volume2
} from 'lucide-react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onDelete?: () => void;
  onReaction?: (emoji: string) => void;
  isOwnMessage: boolean;
}

export function MessageContextMenu({
  x,
  y,
  isOpen,
  onClose,
  onReply,
  onForward,
  onCopy,
  onCopyLink,
  onDelete,
  onReaction,
  isOwnMessage
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 250);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#18191c] rounded-lg shadow-2xl py-2 min-w-[200px] border border-[#2f3136]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Reactions */}
      <div className="flex items-center gap-1 px-2 pb-2 mb-2 border-b border-[#2f3136]">
        {['👍', '❤️', '😂', '😮', '🚀'].map((emoji) => (
          <button 
            key={emoji}
            onClick={(e) => { 
              e.stopPropagation();
              onReaction?.(emoji); 
              onClose(); 
            }}
            className="p-1.5 hover:bg-[#40444b] rounded-full text-lg transition-colors cursor-pointer select-none"
            style={{ fontFamily: '"Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Apple Color Emoji", sans-serif' }}
            type="button"
          >
            {emoji}
          </button>
        ))}
        <button 
          onClick={(e) => { 
            e.stopPropagation();
            onClose(); 
          }}
          className="p-1.5 hover:bg-[#40444b] rounded-full text-sm text-[#b9bbbe] transition-colors cursor-pointer"
          type="button"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Menu Items */}
      <div className="px-1">
        <MenuItem icon={Reply} onClick={() => { onReply(); onClose(); }}>
          Reply
        </MenuItem>

        <MenuItem icon={Forward} onClick={() => { onForward(); onClose(); }}>
          Forward
        </MenuItem>

        <div className="h-px bg-[#2f3136] my-1" />

        <MenuItem icon={Copy} onClick={() => { onCopy(); onClose(); }}>
          Copy Text
        </MenuItem>

        <MenuItem icon={Link} onClick={() => { onCopyLink(); onClose(); }}>
          Copy Message Link
        </MenuItem>

        <MenuItem icon={Hash} onClick={() => { 
          navigator.clipboard.writeText('message-id'); 
          onClose(); 
        }}>
          Copy Message ID
        </MenuItem>

        <div className="h-px bg-[#2f3136] my-1" />

        <MenuItem icon={Volume2} onClick={() => { onClose(); }}>
          Speak Message
        </MenuItem>

        <MenuItem icon={Flag} danger onClick={() => { onClose(); }}>
          Report Message
        </MenuItem>

        {isOwnMessage && (
          <>
            <div className="h-px bg-[#2f3136] my-1" />
            <MenuItem 
              icon={Trash2} 
              danger 
              onClick={() => { 
                if (confirm('Are you sure you want to delete this message?')) {
                  onDelete?.(); 
                }
                onClose(); 
              }}
            >
              Delete Message
            </MenuItem>
          </>
        )}
      </div>
    </div>
  );
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ icon: Icon, children, onClick, danger }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded mx-1 transition-colors ${
        danger
          ? 'text-[#ed4245] hover:bg-[#ed4245]/10'
          : 'text-[#b9bbbe] hover:bg-[#5865f2] hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </button>
  );
}
