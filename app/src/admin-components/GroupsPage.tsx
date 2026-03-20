import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Hash, Edit2, Trash2 } from 'lucide-react';

interface GroupCode {
  id: string;
  code: string;
  server: string;
  serverIcon: string;
  channelDefault: string;
  createdBy: string;
  isConfigured: boolean;
}

const groupCodes: GroupCode[] = [
  {
    id: '1',
    code: 'JEBOLTOGEL',
    server: 'JEBOLTOGEL',
    serverIcon: '🎰',
    channelDefault: 'Sudah diatur',
    createdBy: 'Admin',
    isConfigured: true,
  },
];

export function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = groupCodes.filter(group =>
    group.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.server.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Kode Grup</h2>
          <p className="text-gray-500">Kelola kode grup untuk registrasi user</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Buat Kode Grup
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari kode grup..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#0d0f13] border border-white/10 rounded-xl text-white placeholder-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {/* Groups Table */}
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
                  Kode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel Default
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dibuat Oleh
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGroups.map((group, index) => (
                <motion.tr
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium">
                      <Hash className="w-4 h-4" />
                      {group.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{group.serverIcon}</span>
                      <span className="font-medium text-white">{group.server}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {group.isConfigured ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        <Hash className="w-3 h-3" />
                        {group.channelDefault}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Belum diatur</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-300">{group.createdBy}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
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
