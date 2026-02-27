import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { PlusCircle, Gift, Send, X, FileText, Image, File, Smile } from 'lucide-react';
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
  placeholder?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Ukuran file melebihi 10MB' };
  }
  return { valid: true };
}

export const MessageInput = forwardRef<{ focus: () => void }, MessageInputProps>(
  ({ onSendMessage, onTyping, disabled, replyTo, onCancelReply, isMobile = false, serverId, channelId: _channelId, placeholder }, ref) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || disabled) return;

    onSendMessage(trimmedMessage || ' ', replyTo, attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
    onCancelReply?.();
  }, [message, attachments, disabled, onSendMessage, replyTo, onCancelReply]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
          alert(`Upload gagal: ${errorText}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Upload error. Silakan coba lagi.');
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(false);
    
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

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (disabled) return 'Pilih channel...';
    return isMobile ? 'Ketik pesan...' : 'Ketik pesan...';
  };

  // Common emojis
  const commonEmojis = ['😀', '😂', '🥰', '😭', '😡', '👍', '👎', '❤️', '🎉', '🔥'];
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className={`${isMobile ? 'fixed bottom-[60px] left-0 right-0 px-2 py-2 bg-[#36393f] border-t border-[#202225] z-40' : 'px-4 pb-4'}`}>
      {/* Reply Indicator */}
      {replyTo && (
        <div className={`bg-[#40444b] px-3 py-1.5 flex items-center justify-between ${isMobile ? 'rounded-t-md' : 'rounded-t-lg'}`}>
          <div className={`flex items-center gap-2 text-[#b9bbbe] ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <span>Membalas</span>
            <span className="text-[#5865f2] font-medium truncate max-w-[120px]">{replyTo.user?.displayName || replyTo.user?.username}</span>
            <span className="truncate max-w-[150px]">: {replyTo.content}</span>
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
        <div className={`bg-[#40444b] px-3 py-1.5 flex flex-wrap gap-2 ${replyTo ? '' : isMobile ? 'rounded-t-md' : 'rounded-t-lg'}`}>
          {attachments.map((file, index) => (
            <div key={index} className={`flex items-center gap-2 bg-[#2f3136] rounded text-sm ${isMobile ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
              <span className="text-[#b9bbbe]">{getFileIcon(file.mimetype)}</span>
              <span className="text-white truncate max-w-[100px]">{file.originalName}</span>
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
      
      <div className={`bg-[#40444b] flex items-end ${attachments.length > 0 || replyTo ? isMobile ? 'rounded-b-md' : 'rounded-b-lg' : isMobile ? 'rounded-md' : 'rounded-lg'}`}>
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
          className={`text-[#b9bbbe] hover:text-[#dcddde] transition-colors disabled:opacity-50 flex-shrink-0 ${isMobile ? 'p-2' : 'p-3'}`}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <div className={`border-2 border-[#b9bbbe] border-t-transparent rounded-full animate-spin ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
          ) : (
            <PlusCircle className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} />
          )}
        </button>

        {/* Textarea Input */}
        <div className={`flex-1 min-w-0 ${isMobile ? 'py-2' : 'py-3'}`}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={getPlaceholder()}
            rows={1}
            className="w-full bg-transparent text-[#dcddde] placeholder-[#72767d] resize-none outline-none min-h-[24px] max-h-[120px] overflow-y-auto disabled:opacity-50"
            style={{ 
              fontFamily: 'inherit',
              fontSize: isMobile ? '14px' : '15px',
              lineHeight: '1.5'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center gap-1 flex-shrink-0 ${isMobile ? 'pr-1' : 'pr-2'}`}>
          {!isMobile && (
            <button
              type="button"
              className="p-2 text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
              disabled={disabled}
            >
              <Gift className="w-5 h-5" />
            </button>
          )}
          
          {/* Emoji Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              className={`text-[#b9bbbe] hover:text-yellow-400 transition-colors ${isMobile ? 'p-1.5' : 'p-2'}`}
            >
              <Smile className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5'}`} />
            </button>
            
            {showEmojiPicker && (
              <>
                <div className={`absolute bottom-full right-0 mb-2 z-50 bg-[#2B2D31] rounded-lg shadow-xl border border-[#1E1F22] p-3 ${isMobile ? 'min-w-[180px]' : 'min-w-[200px]'}`}>
                  <div className="text-xs text-gray-400 mb-2">Emoji cepat</div>
                  <div className={`grid gap-1 ${isMobile ? 'grid-cols-5' : 'grid-cols-5'}`}>
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="p-2 text-lg hover:bg-[#404249] rounded transition-colors"
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowEmojiPicker(false)}
                />
              </>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            className={`text-[#5865f2] hover:text-[#4752c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1 ${isMobile ? 'p-1.5' : 'p-2'}`}
          >
            <Send className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5'}`} />
          </button>
        </div>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';
