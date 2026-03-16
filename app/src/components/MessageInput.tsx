import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import { PlusCircle, Gift, Send, X, FileText, Image, File, Smile, AtSign } from 'lucide-react';
import type { Message, FileAttachment } from '@/types';
import { GIFPicker } from './GIFPicker';
import { MentionAutocomplete } from './MentionAutocomplete';

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

// Helper function to format message content for display (replace mentions)
function formatContentForDisplay(content: string): string {
  if (!content) return '';
  
  // Replace user mentions: <@userId> -> @user
  let formatted = content.replace(/<@([a-f0-9-]+)>/gi, '@user');
  
  // Replace role mentions: <@&roleId> -> @role
  formatted = formatted.replace(/<@&([a-f0-9-]+)>/gi, '@role');
  
  // Replace @everyone and @here
  formatted = formatted.replace(/<@everyone>/gi, '@everyone');
  formatted = formatted.replace(/<@here>/gi, '@here');
  
  return formatted;
}

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
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Keep focus on input after sending - track previous disabled state
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    // Focus when transitioning from disabled to enabled
    const wasDisabled = prevDisabledRef.current;
    const isNowEnabled = !disabled;
    
    if (wasDisabled && isNowEnabled) {
      console.log('[MessageInput] Was disabled, now enabled - scheduling focus');
      // Use multiple RAF to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (textareaRef.current && document.activeElement !== textareaRef.current) {
              textareaRef.current.focus();
              console.log('[MessageInput] Focus applied to textarea, activeElement:', document.activeElement?.tagName);
            }
          }, 50);
        });
      });
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

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
    const value = e.target.value;
    setMessage(value);
    onTyping();

    // Check for mention trigger
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's a space before @ or it's at the start
      const isValidMention = lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ';
      
      if (isValidMention && !textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setShowMentionAutocomplete(true);
      } else {
        setShowMentionAutocomplete(false);
      }
    } else {
      setShowMentionAutocomplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't submit if mention autocomplete is open
    if (e.key === 'Enter' && !e.shiftKey && !showMentionAutocomplete) {
      e.preventDefault();
      handleSubmit();
      // Focus will be restored by useEffect when disabled changes back to false
    }
  };

  const handleMentionSelect = (mention: string) => {
    if (mentionStartIndex !== -1) {
      const beforeMention = message.substring(0, mentionStartIndex);
      const afterMention = message.substring(mentionStartIndex + mentionQuery.length + 1);
      const newMessage = beforeMention + mention + ' ' + afterMention;
      setMessage(newMessage);
      setShowMentionAutocomplete(false);
      
      // Focus back to textarea after selection
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPosition = beforeMention.length + mention.length + 1;
        textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  const handleMentionClose = () => {
    setShowMentionAutocomplete(false);
    textareaRef.current?.focus();
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
          newAttachments.push(data);
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

  const getFileIcon = (mimetype: string = 'application/octet-stream') => {
    if (mimetype?.startsWith('image/')) return <Image className="w-4 h-4" />;
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

  // Handle GIF selection
  const handleGIFSelect = useCallback((gif: { url: string; title: string; width?: number }) => {
    // Add GIF as attachment with size info
    const gifAttachment: FileAttachment = {
      url: gif.url,
      filename: `gif_${Date.now()}.gif`,
      originalName: gif.title || 'GIF',
      mimetype: 'image/gif',
      size: 0, // Size not available from GIPHY
      width: gif.width,
    };
    const newAttachments = [...attachments, gifAttachment];
    setAttachments(newAttachments);
    // Auto send message with GIF
    onSendMessage('', replyTo, newAttachments);
    setAttachments([]);
    onCancelReply?.();
    // Keep focus on input after sending GIF
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [onSendMessage, replyTo, attachments, onCancelReply]);

  // Click on input area to focus
  const handleInputAreaClick = () => {
    textareaRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} onClick={handleInputAreaClick} className={`${isMobile ? 'fixed bottom-[60px] left-0 right-0 px-2 py-2 bg-[#0a0c10] border-t border-white/5 z-40 cursor-text' : 'px-6 pb-6 cursor-text bg-[#050608]'}`}>
      {/* Reply Indicator */}
      {replyTo && (
        <div className={`bg-[#111318] px-3 py-1.5 flex items-center justify-between ${isMobile ? 'rounded-t-xl' : 'rounded-t-xl'}`}>
          <div className={`flex items-center gap-2 text-[#a0a0b0] ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <span>Membalas</span>
            <span className="text-cyan-400 font-medium truncate max-w-[120px]">{replyTo.user?.displayName || replyTo.user?.username}</span>
            <span className="truncate max-w-[150px]">: {formatContentForDisplay(replyTo.content)}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-[#a0a0b0] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className={`bg-[#111318] px-3 py-1.5 flex flex-wrap gap-2 ${replyTo ? '' : isMobile ? 'rounded-t-xl' : 'rounded-t-xl'}`}>
          {attachments.map((file, index) => (
            <div key={index} className={`flex items-center gap-2 bg-[#0a0c10] rounded text-sm ${isMobile ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}>
              <span className="text-[#a0a0b0]">{getFileIcon(file.mimetype || 'application/octet-stream')}</span>
              <span className="text-white truncate max-w-[100px]">{file.originalName}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-[#a0a0b0] hover:text-[#ed4245]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className={`bg-[#0d0f13] flex items-center min-h-[60px] ${attachments.length > 0 || replyTo ? isMobile ? 'rounded-b-2xl' : 'rounded-b-2xl' : isMobile ? 'rounded-2xl' : 'rounded-2xl'} border border-white/10 hover:border-cyan-500/30 transition-all duration-200 shadow-lg`}>
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
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={`flex-shrink-0 text-[#71717a] hover:text-cyan-400 transition-colors disabled:opacity-50 flex items-center justify-center ${isMobile ? 'w-10 h-10' : 'w-11 h-11'}`}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <div className="border-2 border-[#b9bbbe] border-t-transparent rounded-full animate-spin w-6 h-6" />
          ) : (
            <PlusCircle className="w-6 h-6" />
          )}
        </button>

        {/* Textarea Input with Mention Autocomplete */}
        <div className="flex-1 min-w-0 relative flex items-center">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={getPlaceholder()}
            rows={1}
            className="w-full bg-transparent text-[#e4e4e7] placeholder-[#52525b] resize-none outline-none min-h-[28px] max-h-[140px] overflow-y-auto disabled:opacity-50 py-3.5 text-[15px]"
            style={{ 
              fontFamily: 'inherit',
              fontSize: isMobile ? '14px' : '15px',
              lineHeight: '1.5'
            }}
          />
          
          {/* Mention Autocomplete */}
          {showMentionAutocomplete && serverId && (
            <MentionAutocomplete
              query={mentionQuery}
              serverId={serverId}
              onSelect={handleMentionSelect}
              onClose={handleMentionClose}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className={`grid grid-cols-5 place-items-center flex-shrink-0 ${isMobile ? 'pr-1 gap-0' : 'pr-2'}`} style={{ width: isMobile ? '160px' : '168px' }}>
          {!isMobile && (
            <>
              {/* Gift */}
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 flex items-center justify-center text-[#71717a] hover:text-cyan-400 transition-colors"
                disabled={disabled}
              >
                <Gift className="w-5 h-5" />
              </button>
              {/* GIF Picker */}
              <div className="w-8 h-8 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <GIFPicker onSelect={handleGIFSelect} />
              </div>
            </>
          )}
          
          {/* Emoji Picker -- Mobile only */}
          {isMobile && (
            <div className="w-8 h-8 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <GIFPicker onSelect={handleGIFSelect} />
            </div>
          )}
          
          {/* Emoji */}
          <div className="relative w-8 h-8 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={disabled}
              className="w-full h-full flex items-center justify-center text-[#71717a] hover:text-cyan-400 transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <>
                <div className={`absolute bottom-full right-0 mb-2 z-50 bg-[#1a1d24] rounded-lg shadow-xl border border-white/5 p-3 ${isMobile ? 'min-w-[180px]' : 'min-w-[200px]'}`}>
                  <div className="text-xs text-gray-400 mb-2">Emoji cepat</div>
                  <div className={`grid gap-1 ${isMobile ? 'grid-cols-5' : 'grid-cols-5'}`}>
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="p-2 text-lg hover:bg-white/10 rounded transition-colors"
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

          {/* Mention Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const cursorPosition = textareaRef.current?.selectionStart || message.length;
              const newMessage = message.substring(0, cursorPosition) + '@' + message.substring(cursorPosition);
              setMessage(newMessage);
              setMentionQuery('');
              setMentionStartIndex(cursorPosition);
              setShowMentionAutocomplete(true);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            disabled={disabled}
            className="w-8 h-8 flex items-center justify-center text-[#71717a] hover:text-cyan-400 transition-colors disabled:opacity-50"
          >
            <AtSign className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            onClick={(e) => e.stopPropagation()}
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            className="w-8 h-8 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';

