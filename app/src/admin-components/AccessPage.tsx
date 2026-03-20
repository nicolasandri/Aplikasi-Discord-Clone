import { useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Users, Check, X, Shield } from 'lucide-react';

interface ServerAccess {
  id: string;
  name: string;
  icon: string;
  members: number;
  activeMembers: number;
  inactiveMembers: number;
}

interface MemberAccess {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: 'active' | 'inactive';
  role: string;
  hasAccess: boolean;
}

const servers: ServerAccess[] = [
  {
    id: '1',
    name: 'JEBOLTOGEL',
    icon: '🎰',
    members: 4,
    activeMembers: 4,
    inactiveMembers: 0,
  },
];

const members: MemberAccess[] = [
  {
    id: '1',
    name: 'Admin',
    username: 'admin',
    avatar: '👤',
    status: 'active',
    role: 'OWNER',
    hasAccess: true,
  },
  {
    id: '2',
    name: 'jebolkasir1',
    username: 'jebolkasir1',
    avatar: '👤',
    status: 'active',
    role: 'OPERATOR',
    hasAccess: true,
  },
  {
    id: '3',
    name: 'SYSTEM',
    username: 'system',
    avatar: '🤖',
    status: 'active',
    role: 'Bot',
    hasAccess: true,
  },
  {
    id: '4',
    name: 'testuser2024',
    username: 'testuser2024',
    avatar: '👤',
    status: 'active',
    role: 'Member',
    hasAccess: true,
  },
];

export function AccessPage() {
  const [selectedServer, setSelectedServer] = useState<string>('1');
  const [memberAccess, setMemberAccess] = useState<MemberAccess[]>(members);

  const toggleAccess = (memberId: string) => {
    setMemberAccess(prev =>
      prev.map(m =>
        m.id === memberId ? { ...m, hasAccess: !m.hasAccess } : m
      )
    );
  };

  const selectedServerData = servers.find(s => s.id === selectedServer);

  return (
    <div className="space-y-6">
      {!selectedServer ? (
        /* Server Selection */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-2xl font-bold text-white">Pilih Server</h2>
            <p className="text-gray-500">Klik server untuk mengatur akses member</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => (
              <motion.button
                key={server.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedServer(server.id)}
                className="p-6 bg-[#0d0f13] rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-2xl">
                    {server.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{server.name}</h3>
                    <p className="text-sm text-gray-500">
                      {server.members} member
                      <span className="text-green-400">({server.activeMembers} aktif</span>,
                      <span className="text-red-400">{server.inactiveMembers} nonaktif)</span>
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        /* Member Access Management */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedServer('')}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                ← Kembali
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-lg">
                  {selectedServerData?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedServerData?.name}</h2>
                  <p className="text-sm text-gray-500">Atur akses member server</p>
                </div>
              </div>
            </div>
          </div>

          {/* Members List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#0d0f13] rounded-2xl border border-white/5 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white">Daftar Member</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {memberAccess.filter(m => m.hasAccess).length} memiliki akses
                </span>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {memberAccess.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                      {member.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{member.name}</span>
                        {member.role === 'OWNER' && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">@{member.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        member.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      {member.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>

                    <button
                      onClick={() => toggleAccess(member.id)}
                      disabled={member.role === 'OWNER'}
                      className={`p-2 rounded-lg transition-colors ${
                        member.role === 'OWNER'
                          ? 'opacity-50 cursor-not-allowed bg-green-500/20 text-green-400'
                          : member.hasAccess
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {member.hasAccess ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/20 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-medium text-cyan-400 mb-1">Pengaturan Akses</h4>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                  <li>Owner tidak dapat dihapus aksesnya</li>
                  <li>Member yang dinonaktifkan tidak bisa login</li>
                  <li>Perubahan akses langsung efektif</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
