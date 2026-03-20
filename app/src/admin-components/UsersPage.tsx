import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Download, RefreshCw } from 'lucide-react';
import { DataTable } from './DataTable';

const users = [
  {
    id: '1',
    name: 'SECURITY BOT',
    username: 'SECURITY BOT',
    email: 'bot@workgrid.local',
    avatar: '🤖',
    status: 'active' as const,
    role: 'Bot',
    joinedAt: '16 Mar 2026',
    stats: { messages: 0, channels: 14 },
  },
  {
    id: '2',
    name: 'memberbaru02',
    username: 'memberbaru02',
    email: 'memberbaru02@test.com',
    avatar: '👤',
    status: 'active' as const,
    role: 'MEMBER',
    joinedAt: '15 Mar 2026',
    stats: { messages: 1, channels: 1 },
  },
  {
    id: '3',
    name: 'testmember01',
    username: 'testmember01',
    email: 'testmember01@test.com',
    avatar: '👤',
    status: 'active' as const,
    role: 'MEMBER',
    joinedAt: '15 Mar 2026',
    stats: { messages: 1, channels: 0 },
  },
  {
    id: '4',
    name: 'nicolasandri',
    username: 'nicolasandri',
    email: 'jebolkasir7@gmail.com',
    avatar: '👤',
    status: 'active' as const,
    role: 'MEMBER',
    joinedAt: '14 Mar 2026',
    stats: { messages: 1, channels: 0 },
  },
  {
    id: '5',
    name: 'jebolkasir1',
    username: 'jebolkasir1',
    email: 'jebolkasir1@gmail.com',
    avatar: '👤',
    status: 'active' as const,
    role: 'MEMBER',
    joinedAt: '14 Mar 2026',
    stats: { messages: 1, channels: 2 },
  },
  {
    id: '6',
    name: 'Admin',
    username: 'Admin',
    email: 'admin@workgrid.com',
    avatar: '👤',
    status: 'active' as const,
    role: 'Admin',
    joinedAt: '14 Mar 2026',
    stats: { messages: 1, channels: 8 },
  },
];

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Pengguna</h2>
          <p className="text-gray-500">Kelola semua pengguna WorkGrid</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengguna..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/30 transition-colors"
          >
            <Filter className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/30 transition-colors"
          >
            <Download className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/30 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        users={filteredUsers}
        onEdit={(user) => console.log('Edit:', user)}
        onDelete={(user) => console.log('Delete:', user)}
        onPromote={(user) => console.log('Promote:', user)}
      />
    </div>
  );
}
