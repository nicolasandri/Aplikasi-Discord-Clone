import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, Code, Strikethrough, List, ListOrdered, Quote, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { SuggestionProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  serverId?: string;
  className?: string;
  disabled?: boolean;
}

interface MentionListProps {
  items: Array<{ id: string; username: string; avatar?: string }>;
  command: (item: { id: string; label: string }) => void;
}

// Mention List Component for dropdown
const MentionList = ({ items, command }: MentionListProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item) {
          command({ id: item.id, label: item.username });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, command]);

  if (items.length === 0) return null;

  return (
    <div className="bg-[#2B2D31] rounded-lg shadow-xl border border-[#1E1F22] overflow-hidden min-w-[200px]">
      {items.map((item, index) => (
        <button
          key={item.id}
          onClick={() => command({ id: item.id, label: item.username })}
          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-[#404249] transition-colors ${
            index === selectedIndex ? 'bg-[#404249]' : ''
          }`}
        >
          <img
            src={item.avatar || '/default-avatar.png'}
            alt={item.username}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-white text-sm">@{item.username}</span>
        </button>
      ))}
    </div>
  );
};

export function RichTextEditor({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ketik pesan...',
  serverId,
  className,
  disabled = false
}: RichTextEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { token } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch mention suggestions
  const fetchMentions = useCallback(async (query: string) => {
    if (!query || query.length < 1) return [];
    
    try {
      const params = new URLSearchParams({ q: query });
      if (serverId) params.append('server_id', serverId);
      
      const response = await fetch(
        `${API_URL}/users/search?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      
      return data.users || [];
    } catch (error) {
      console.error('Failed to fetch mentions:', error);
      return [];
    }
  }, [serverId, token]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty'
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-[#5865F2]/20 text-[#5865F2] rounded px-1 font-medium cursor-pointer'
        },
        suggestion: {
          items: async ({ query }) => {
            return await fetchMentions(query);
          },
          render: () => {
            let component: ReactRenderer<any>;
            let popup: any;

            return {
              onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(MentionList, {
                  props: {
                    items: props.items as any[],
                    command: props.command
                  },
                  editor: props.editor
                });

                if (!props.clientRect) return;

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'top-start'
                });
              },
              onUpdate: (props: SuggestionProps) => {
                component.updateProps({
                  items: props.items as any[],
                  command: props.command
                });

                if (!props.clientRect) return;

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect
                });
              },
              onKeyDown: (props): boolean => {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide();
                  return true;
                }
                return component.ref?.onKeyDown?.(props.event) || false;
              },
              onExit: () => {
                popup[0].destroy();
                component.destroy();
              }
            };
          }
        }
      })
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[20px] max-h-[200px] overflow-y-auto px-3 py-2'
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      }
    }
  });

  // Sync external value with editor
  useEffect(() => {
    if (editor && value !== editor.getText()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  };

  // Common emojis for quick picker
  const commonEmojis = ['😀', '😂', '🥰', '😭', '😡', '👍', '👎', '❤️', '🎉', '🔥', '😊', '🤔', '👀', '✨', '🙏', '💯'];

  if (!editor) return null;

  return (
    <div className={`relative ${className}`} ref={editorRef}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#383A40] border-b border-[#2B2D31] rounded-t-lg">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bold') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Bold (Ctrl+B)"
          type="button"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('italic') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Italic (Ctrl+I)"
          type="button"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('strike') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Strikethrough"
          type="button"
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('code') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Inline Code"
          type="button"
        >
          <Code className="w-4 h-4" />
        </button>
        
        <div className="w-px h-5 bg-gray-600 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('bulletList') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Bullet List"
          type="button"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('orderedList') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Numbered List"
          type="button"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          className={`p-1.5 rounded transition-colors ${
            editor.isActive('blockquote') 
              ? 'bg-[#5865F2] text-white' 
              : 'text-gray-400 hover:bg-[#404249] hover:text-white'
          } disabled:opacity-50`}
          title="Quote"
          type="button"
        >
          <Quote className="w-4 h-4" />
        </button>
        
        <div className="flex-1" />
        
        {/* Emoji Picker */}
        <div className="relative">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="p-1.5 rounded text-gray-400 hover:bg-[#404249] hover:text-yellow-400 transition-colors disabled:opacity-50"
            title="Emoji"
            type="button"
          >
            <Smile className="w-4 h-4" />
          </button>
          
          {showEmojiPicker && (
            <>
              <div className="absolute bottom-full right-0 mb-2 z-50 bg-[#2B2D31] rounded-lg shadow-xl border border-[#1E1F22] p-3 min-w-[200px]">
                <div className="text-xs text-gray-400 mb-2">Emoji cepat</div>
                <div className="grid grid-cols-8 gap-1">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="p-1.5 text-lg hover:bg-[#404249] rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-[#404249] text-xs text-gray-500 text-center">
                  Ketik @ untuk mention user
                </div>
              </div>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowEmojiPicker(false)}
              />
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-[#383A40] rounded-b-lg">
        <EditorContent editor={editor} />
      </div>

      {/* Helper text */}
      <div className="mt-1.5 px-2 flex justify-between items-center text-xs text-gray-500">
        <span>
          <strong className="text-gray-400">Bold</strong> • <em className="text-gray-400">Italic</em> • <code className="text-gray-400">Code</code> • @Mention
        </span>
        <span>Enter untuk kirim, Shift+Enter untuk baris baru</span>
      </div>
    </div>
  );
}
