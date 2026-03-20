import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, RefreshCw, Trash2, Settings } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  icon: string;
  owner: string;
  members: number;
  channels: number;
  messages: number;
  createdAt: string;
}

const servers: Server[] = [
  {
    id: '1',
    name: 'JEBOLTOGEL',
    icon: '🎰',
    owner: 'Admin',
    members: 4,
    channels: 9,
    messages: 160,
    createdAt: '18 Mar 2026',
  },
];

export function ServersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Server</h2>
          <p className="text-gray-500">Kelola semua server WorkGrid</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Server
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari server..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-cyan-500/30 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Servers Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#0d0f13] rounded-2xl border border-white/5 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pemilik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pesan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dibuat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredServers.map((server, index) => (
                <motion.tr
                  key={server.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-lg">
                        {server.icon}
                      </div>
                      <span className="font-medium text-white">{server.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-300">{server.owner}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">{server.members}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">{server.channels}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">{server.messages}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">{server.createdAt}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
