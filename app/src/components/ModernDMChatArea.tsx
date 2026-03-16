import { useEffect, useRef, useState } from 'react';
import { Phone, Video, Users, UserPlus, MoreVertical, LogOut, Plus, X, Send } from 'lucide-react';
import { EmojiStickerGIFPicker } from './EmojiStickerGIFPicker';
import { ImageViewer } from './ImageViewer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DMChannel, DMMessage, User, FileAttachment } from '@/types';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const API_URL = isElectron
  ? 'http://localhost:3001/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');
const BASE_URL = isElectron ? 'http://localhost:3001' : '';

const statusColors = {
  online: 'bg-[#3ba55d]',
  offline: 'bg-[#747f8d]',
  idle: 'bg-[#faa61a]',
  dnd: 'bg-[#ed4245]',
};

interface ModernDMChatAreaProps {
  channel: DMChannel | null;
  currentUser: User | null;
  onBack?: () => void;
  onAddMember?: (channelId: string) => void;
  onLeaveGroup?: (channelId: string) => void;
  onFocusInput?: () => void;
  isMobile?: boolean;
}

function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });
}

export function ModernDMChatArea({
  channel,
  currentUser,
  onBack,
  onAddMember,
  onLeaveGroup,
  onFocusInput,
  isMobile = false
}: ModernDMChatAreaProps) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef(localStorage.getItem('token'));

  // Load messages when channel changes
  useEffect(() => {
    if (!channel || !tokenRef.current) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/dm/${channel.id}/messages`, {
          headers: { Authorization: `Bearer ${tokenRef.current}` },
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [channel?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (!channel || !tokenRef.current) return;

    try {
      const response = await fetch(`${API_URL}/dm/${channel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          content: inputText.trim(),
          attachments: attachments,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        setAttachments([]);
        setShowEmojiPicker(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!channel) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 bg-gradient-to-br from-[#0d0d14] via-[#15172d] to-[#0a0c14] flex items-center justify-center relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-center z-10"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/20"
          >
            <span className="text-5xl">💬</span>
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-3">Pesan Langsung</h2>
          <p className="text-white/60 text-lg">Pilih teman untuk mulai mengobrol</p>
        </motion.div>
      </motion.div>
    );
  }

  const isGroup = channel.type === 'group';
  const friendName = isGroup
    ? (channel.name || `Grup (${channel.members?.length || 0})`)
    : (channel.friend?.displayName || channel.friend?.username || 'Unknown');

  return (
    <div className="flex-1 bg-gradient-to-br from-[#0d0d14] via-[#15172d] to-[#0a0c14] flex flex-col min-h-0 relative overflow-hidden">
      {/* Header */}
      {!isMobile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-xl"
        >
          <div className="flex items-center gap-4">
            {isGroup ? (
              <>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/40 to-blue-500/40 flex items-center justify-center border border-cyan-500/30">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{friendName}</h3>
                  <p className="text-xs text-white/40">{channel.members?.length || 0} anggota</p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <img
                    src={channel.friend?.avatar
                      ? (channel.friend.avatar?.startsWith('http') ? channel.friend.avatar : `${BASE_URL}${channel.friend.avatar}`)
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.friend?.username || 'user'}`}
                    alt={channel.friend?.username || 'User'}
                    className="w-10 h-10 rounded-lg ring-2 ring-white/10"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[channel.friend?.status || 'offline']} rounded-full border-2 border-[#15172d]`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{friendName}</h3>
                  <p className="text-xs text-white/40">
                    {channel.friend?.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <Phone className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <Video className="w-5 h-5" />
            </motion.button>
            {isGroup && onAddMember && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAddMember(channel.id)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <UserPlus className="w-5 h-5" />
              </motion.button>
            )}
            {isGroup && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1f2e] border border-white/10">
                  {onLeaveGroup && (
                    <DropdownMenuItem
                      onClick={() => onLeaveGroup(channel.id)}
                      className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Tinggalkan Grup
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </motion.div>
      )}

      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-8"
            >
              <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </motion.div>
          )}

          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20"
              >
                <span className="text-3xl">👋</span>
              </motion.div>
              <p className="text-white/60">Belum ada pesan. Mulai percakapan!</p>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex gap-3 ${msg.userId === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <img
                src={msg.userId === currentUser?.id
                  ? (currentUser?.avatar ? `${BASE_URL}${currentUser.avatar}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'user'}`)
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username || 'user'}`}
                alt={msg.username || 'User'}
                className="w-8 h-8 rounded-lg ring-1 ring-white/10 flex-shrink-0"
              />
              <div className={`flex flex-col gap-1 max-w-xs ${msg.userId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-xs font-medium text-white/60">{msg.username || 'Unknown'}</span>
                  <span className="text-xs text-white/40">{formatTime(msg.createdAt)}</span>
                </div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`px-4 py-2.5 rounded-xl max-w-xs ${
                    msg.userId === currentUser?.id
                      ? 'bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white rounded-br-sm'
                      : 'bg-white/5 text-white/90 border border-white/10 rounded-bl-sm hover:bg-white/[0.08]'
                  } transition-all backdrop-blur-sm`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                </motion.div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.attachments.map((att, i) => (
                      <motion.img
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        src={att.url}
                        alt={att.filename}
                        className="max-w-xs rounded-lg border border-white/10 cursor-pointer hover:border-white/20 transition-all"
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-xl"
      >
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 mb-4 flex-wrap"
          >
            {attachments.map((att, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="relative group"
              >
                <img
                  src={att.url}
                  alt={att.filename}
                  className="h-16 rounded-lg border border-white/20 object-cover"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-2 -right-2 bg-red-500/80 hover:bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3 text-white" />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="flex gap-3 items-end">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <Plus className="w-5 h-5" />
          </motion.button>

          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-cyan-500/50 focus-within:bg-white/[0.08] transition-all">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ketik pesan..."
              className="w-full bg-transparent text-white placeholder-white/40 text-sm resize-none focus:outline-none max-h-24"
              rows={1}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!inputText.trim() && attachments.length === 0}
            className="p-2.5 rounded-lg bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-500 hover:to-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
