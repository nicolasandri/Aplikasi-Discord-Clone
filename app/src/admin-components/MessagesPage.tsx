import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, MessageSquare } from 'lucide-react';

interface DMChannel {
  id: string;
  participants: string[];
  participantAvatars: string[];
  messageCount: number;
  type: 'direct' | 'group';
  lastMessage: string;
}

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

const dmChannels: DMChannel[] = [
  {
    id: '1',
    participants: ['Admin', 'jebolkasir1'],
    participantAvatars: ['👤', '👤'],
    messageCount: 28,
    type: 'direct',
    lastMessage: 'OKE Bos',
  },
];

const messages: Message[] = [
  { id: '1', sender: 'jebolkasir1', senderAvatar: '👤', content: 'Aaa', timestamp: '18 Mar, 08:29', isOwn: false },
  { id: '2', sender: 'Admin', senderAvatar: '👤', content: 'Hallo', timestamp: '18 Mar, 08:29', isOwn: true },
  { id: '3', sender: 'Admin', senderAvatar: '👤', content: 'aaaa', timestamp: '18 Mar, 08:29', isOwn: true },
  { id: '4', sender: 'Admin', senderAvatar: '👤', content: 'asdas', timestamp: '18 Mar, 08:29', isOwn: true },
  { id: '5', sender: 'Admin', senderAvatar: '👤', content: 'Aa', timestamp: '18 Mar, 08:29', isOwn: true },
  { id: '6', sender: 'Admin', senderAvatar: '👤', content: 'asda', timestamp: '19 Mar, 11:57', isOwn: true },
  { id: '7', sender: 'Admin', senderAvatar: '👤', content: 'Aaa', timestamp: '19 Mar, 11:57', isOwn: true },
  { id: '8', sender: 'jebolkasir1', senderAvatar: '👤', content: 'Oke', timestamp: '19 Mar, 12:41', isOwn: false },
  { id: '9', sender: 'jebolkasir1', senderAvatar: '👤', content: 'hi', timestamp: '20 Mar, 04:16', isOwn: false },
];

export function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('1');

  const filteredChannels = dmChannels.filter(channel =>
    channel.participants.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedChannelData = dmChannels.find(c => c.id === selectedChannel);

  return (
    <div className="space-y-6 h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">DM Monitor</h2>
          <p className="text-gray-500">Pantau semua direct message</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/30 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>

      {/* DM Layout */}
      <div className="flex gap-4 h-full">
        {/* DM List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 bg-[#0d0f13] rounded-2xl border border-white/5 flex flex-col"
        >
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">SEMUA DM ({dmChannels.length})</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari DM channel..."
                className="w-full pl-9 pr-3 py-2 bg-[#1a1d24] border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={`w-full p-4 flex items-center gap-3 transition-colors ${
                  selectedChannel === channel.id
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-500'
                    : 'hover:bg-white/5 border-l-2 border-transparent'
                }`}
              >
                <div className="flex -space-x-2">
                  {channel.participantAvatars.map((avatar, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-sm border-2 border-[#0d0f13]"
                    >
                      {avatar}
                    </div>
                  ))}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-white">
                    {channel.participants.join(', ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {channel.messageCount} pesan • {channel.type === 'direct' ? 'direct' : 'group'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-[#0d0f13] rounded-2xl border border-white/5 flex flex-col"
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {selectedChannelData?.participantAvatars.map((avatar, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-sm border-2 border-[#0d0f13]"
                  >
                    {avatar}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-medium text-white">
                  {selectedChannelData?.participants.join(' 🔹 ')}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedChannelData?.participants.length} anggota • {selectedChannelData?.messageCount} pesan
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.isOwn ? 'flex-row-reverse' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-sm flex-shrink-0">
                  {message.senderAvatar}
                </div>
                <div className={`max-w-[70%] ${message.isOwn ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">{message.sender}</span>
                    <span className="text-xs text-gray-600">{message.timestamp}</span>
                  </div>
                  <div
                    className={`inline-block px-4 py-2 rounded-2xl ${
                      message.isOwn
                        ? 'bg-cyan-500 text-white rounded-tr-none'
                        : 'bg-[#1a1d24] text-white rounded-tl-none'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
