import { useState, useEffect, useCallback, useRef } from 'react';
import { X, MessageCircle, Send, CornerDownRight } from 'lucide-react';
import type { Message, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalMessage: Message | null;
  serverId?: string;
  channelId?: string;
  onReply?: (content: string, replyToId: string) => void;
  socket?: any;
}

// Extended message type with replyToId
interface MessageWithReply extends Message {
  replyToId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unused = (_serverId?: string, _channelId?: string) => {};

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Use absolute URL for Electron, relative for web
const API_URL = import.meta.env.VITE_API_URL;

// Get base URL for backend (without /api) - for file URLs
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;

export function ThreadModal({ isOpen, onClose, originalMessage, serverId, channelId, onReply, socket }: ThreadModalProps) {
  const { user, token } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyCount, setReplyCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use serverId and channelId to prevent unused variable warnings
  _unused(serverId, channelId);

  // Fetch replies
  const fetchReplies = useCallback(async () => {
    if (!originalMessage?.id || !token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/messages/${originalMessage.id}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      }
      
      // Also fetch reply count
      const countResponse = await fetch(`${API_URL}/messages/${originalMessage.id}/reply-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setReplyCount(countData.count);
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    } finally {
      setLoading(false);
    }
  }, [originalMessage?.id, token]);

  // Load replies when modal opens
  useEffect(() => {
    if (isOpen && originalMessage) {
      fetchReplies();
    }
  }, [isOpen, originalMessage, fetchReplies]);

  // Listen for new replies via socket
  useEffect(() => {
    if (!socket || !originalMessage?.id) return;

    const handleNewMessage = (message: MessageWithReply) => {
      if (message.replyToId === originalMessage.id) {
        setReplies(prev => [...prev, message as Message]);
        setReplyCount(prev => prev + 1);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, originalMessage?.id]);

  // Scroll to bottom when replies change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !onReply || !originalMessage) return;
    
    setSending(true);
    try {
      await onReply(replyText.trim(), originalMessage.id);
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (!isOpen || !originalMessage) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) return 'Hari Ini';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[80vh] bg-[#1a1d24] rounded-xl border border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-[#23262b]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="text-white font-semibold">Thread</h3>
            <span className="text-gray-400 text-sm">({replyCount} balasan)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Message */}
          <div className="bg-[#23262b] rounded-lg p-4 border-l-4 border-cyan-500">
            <div className="flex items-center gap-2 mb-2">
              {originalMessage.user?.avatar ? (
                <img
                  src={originalMessage.user.avatar.startsWith('http') ? originalMessage.user.avatar : `${BASE_URL}${originalMessage.user.avatar}`}
                  alt={originalMessage.user.username}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  {(originalMessage.user?.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-cyan-400 font-medium text-sm">
                  {originalMessage.user?.displayName || originalMessage.user?.username}
                </span>
                <span className="text-gray-500 text-xs ml-2">
                  {formatDate(originalMessage.timestamp)} {formatTime(originalMessage.timestamp)}
                </span>
              </div>
            </div>
            <p className="text-gray-200 whitespace-pre-wrap">{originalMessage.content}</p>
            {originalMessage.attachments && originalMessage.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {originalMessage.attachments.map((att, idx) => (
                  <div key={idx}>
                    {att.mimetype?.startsWith('image/') ? (
                      <img
                        src={att.url?.startsWith('http') ? att.url : `${BASE_URL}${att.url}`}
                        alt="Attachment"
                        className="max-w-full max-h-48 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="bg-[#2B2D31] rounded p-2 text-sm text-gray-400">
                        📎 {att.originalName || 'Attachment'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 py-2">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-xs">{replyCount} balasan</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Replies */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada balasan</p>
              <p className="text-sm">Jadilah yang pertama membalas!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <CornerDownRight className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" />
                  <div className="flex-1 bg-[#1e2127] rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {reply.user?.avatar ? (
                        <img
                          src={reply.user.avatar.startsWith('http') ? reply.user.avatar : `${BASE_URL}${reply.user.avatar}`}
                          alt={reply.user.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold">
                          {(reply.user?.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-cyan-400 font-medium text-sm">
                        {reply.user?.displayName || reply.user?.username}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatTime(reply.timestamp)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{reply.content}</p>
                    {reply.attachments && reply.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {reply.attachments.map((att, idx) => (
                          <div key={idx}>
                            {att.mimetype?.startsWith('image/') ? (
                              <img
                                src={att.url?.startsWith('http') ? att.url : `${BASE_URL}${att.url}`}
                                alt="Attachment"
                                className="max-w-full max-h-32 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="bg-[#2B2D31] rounded p-1.5 text-xs text-gray-400">
                                📎 {att.originalName || 'Attachment'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-gray-700 bg-[#23262b]">
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Balas thread..."
              className="flex-1 bg-[#1a1d24] text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[40px] max-h-[120px]"
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || sending}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
