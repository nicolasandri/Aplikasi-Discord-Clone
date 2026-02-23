import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { PlusCircle, Gift, Sticker, Send, X, FileText, Image, File } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import type { Message, FileAttachment } from '@/types';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron 
  ? 'http://localhost:3001/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

interface MessageInputProps {
  onSendMessage: (content: string, replyTo?: Message | null, attachments?: FileAttachment[]) => void;
  onTyping: () => void;
  disabled?: boolean;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  isMobile?: boolean;
}

export const MessageInput = forwardRef<{ focus: () => void }, MessageInputProps>(
  ({ onSendMessage, onTyping, disabled, replyTo, onCancelReply, isMobile = false }, ref) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
      console.log('Focus called on textarea');
    }
  }));

  // Auto-focus textarea when replyTo changes
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
        console.log('Auto-focused textarea for reply');
      }, 100);
    }
  }, [replyTo]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled) return;

    onSendMessage(trimmedMessage || ' ', replyTo, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    onCancelReply?.();
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachments, disabled, onSendMessage, replyTo, onCancelReply]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }

    // Send typing indicator
    onTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('token');
      const authHeader = token ? `Bearer ${token}` : '';
    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newAttachments.push(data.file);
        } else {
          console.error('Upload failed:', await response.text());
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimetype === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  return (
    <form onSubmit={handleSubmit} className={`${isMobile ? 'px-2 pb-2' : 'px-4 pb-4'}`}>
      {/* Reply Indicator */}
      {replyTo && (
        <div className="bg-[#40444b] rounded-t-lg px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#b9bbbe]">
            <span>Replying to</span>
            <span className="text-[#5865f2] font-medium">{replyTo.user?.username}</span>
            <span className="truncate max-w-md">: {replyTo.content}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-[#b9bbbe] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className={`bg-[#40444b] px-4 py-2 flex flex-wrap gap-2 ${replyTo ? '' : 'rounded-t-lg'}`}>
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-[#2f3136] rounded px-2 py-1 text-sm">
              <span className="text-[#b9bbbe]">{getFileIcon(file.mimetype)}</span>
              <span className="text-white truncate max-w-[150px]">{file.originalName}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-[#b9bbbe] hover:text-[#ed4245]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className={`bg-[#40444b] flex items-end ${attachments.length > 0 || replyTo ? 'rounded-b-lg' : 'rounded-lg'}`}>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-[#b9bbbe] hover:text-[#dcddde] transition-colors disabled:opacity-50"
          disabled={disabled || uploading}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-[#b9bbbe] border-t-transparent rounded-full animate-spin" />
          ) : (
            <PlusCircle className="w-6 h-6" />
          )}
        </button>

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoFocus={!!replyTo}
          placeholder={disabled ? 'Pilih channel...' : isMobile ? 'Ketik pesan...' : 'Ketik pesan...'}
          disabled={disabled}
          className={`flex-1 bg-transparent text-white placeholder:text-[#72767d] resize-none outline-none max-h-[200px] ${isMobile ? 'py-2 px-2 min-h-[48px] text-base' : 'py-3 px-2 min-h-[44px]'}`}
          style={{ fontFamily: '"Whitney", "Helvetica Neue", Helvetica, Arial, "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif' }}
          rows={1}
        />

        {/* Action Buttons */}
        <div className={`flex items-center ${isMobile ? 'pr-1' : 'pr-2'}`}>
          {!isMobile && (
            <>
              <button
                type="button"
                className="p-2 text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
                disabled={disabled}
              >
                <Gift className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="p-2 text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
                disabled={disabled}
              >
                <Sticker className="w-5 h-5" />
              </button>
            </>
          )}
          <div className={`text-[#b9bbbe] hover:text-[#dcddde] transition-colors ${isMobile ? 'p-1' : 'p-2'}`}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
          <button
            type="submit"
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            className={`text-[#5865f2] hover:text-[#4752c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1 ${isMobile ? 'p-2' : 'p-2'}`}
          >
            <Send className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
          </button>
        </div>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';
