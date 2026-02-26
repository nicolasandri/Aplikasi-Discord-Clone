import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { PlusCircle, Gift, Sticker, Send, X, FileText, Image, File } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { RichTextEditor } from './RichTextEditor';
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
  serverId?: string;
  channelId?: string;
}

// BUG-017: File Size Validation
const MAX_FILE_SIZE = 10 * 1024 * 1020; // 10MB

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  return { valid: true };
}

export const MessageInput = forwardRef<{ focus: () => void }, MessageInputProps>(
  ({ onSendMessage, onTyping, disabled, replyTo, onCancelReply, isMobile = false, serverId, channelId }, ref) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      // Focus will be handled by RichTextEditor internally
      const editorElement = editorContainerRef.current?.querySelector('.ProseMirror') as HTMLElement;
      editorElement?.focus();
    }
  }));

  // Auto-focus editor when replyTo changes
  useEffect(() => {
    if (replyTo) {
      const timeoutId = setTimeout(() => {
        const editorElement = editorContainerRef.current?.querySelector('.ProseMirror') as HTMLElement;
        editorElement?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
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
  }, [message, attachments, disabled, onSendMessage, replyTo, onCancelReply]);



  const handleEditorChange = (value: string) => {
    setMessage(value);

    // Send typing indicator
    onTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      // The typing indicator will timeout on the server side
    }, 3000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // BUG-017: Validate file sizes before upload
    for (const file of Array.from(files)) {
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }
    }

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
          const errorText = await response.text();
          console.error('Upload failed:', errorText);
          alert(`Upload failed: ${errorText}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Upload error. Please try again.');
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

        {/* Rich Text Editor */}
        <div ref={editorContainerRef} className="flex-1 min-w-0">
          <RichTextEditor
            value={message}
            onChange={handleEditorChange}
            onSubmit={handleSubmit}
            placeholder={disabled ? 'Pilih channel...' : isMobile ? 'Ketik pesan...' : 'Ketik pesan...'}
            serverId={serverId}
            disabled={disabled}
            className="w-full"
          />
        </div>

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
