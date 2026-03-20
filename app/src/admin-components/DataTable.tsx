import { motion } from 'framer-motion';
import { Edit2, Trash2, Shield, Crown, MoreHorizontal } from 'lucide-react';

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  status: 'active' | 'inactive';
  role: string;
  joinedAt: string;
  stats: {
    messages: number;
    channels: number;
  };
}

interface DataTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onPromote?: (user: User) => void;
}

function MemberItem({ member }: { member: User }) {
  const isOnline = member.status === 'active';

  return (
    <motion.button
      whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors group"
    >
      <div className="relative">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isOnline
            ? 'bg-gradient-to-br from-cyan-500 to-cyan-600'
            : 'bg-gradient-to-br from-gray-600 to-gray-700'
        }`}>
          <span className="text-sm">{member.avatar}</span>
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111318] ${
          isOnline ? 'bg-green-500' : 'bg-gray-500'
        }`} />
      </div>

      <div className="flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium ${
            isOnline ? 'text-white group-hover:text-cyan-400' : 'text-gray-500'
          } transition-colors`}>
            {member.name}
          </span>
          {member.role === 'Admin' && (
            <Crown className="w-3.5 h-3.5 text-yellow-500" />
          )}
        </div>
        <span className="text-xs text-gray-600">{member.role}</span>
      </div>
    </motion.button>
  );
}

export function DataTable({ users, onEdit, onDelete, onPromote }: DataTableProps) {
  return (
    <div className="bg-[#0d0f13] rounded-2xl border border-white/5 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-semibold text-white">Daftar Pengguna</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Total: {users.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pengguna
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kontak
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statistik
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bergabung
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="hover:bg-white/[0.02] transition-colors group"
              >
                {/* User Info */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                        <span className="text-lg">{user.avatar}</span>
                      </div>
                      {user.role === 'Admin' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-300">{user.email}</p>
                </td>

                {/* Stats */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                      <span className="text-sm text-gray-400">{user.stats.messages}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span className="text-sm text-gray-400">{user.stats.channels}</span>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.role === 'Admin'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : user.role === 'SPV'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {user.role === 'Admin' && <Shield className="w-3 h-3" />}
                    {user.role}
                  </span>
                </td>

                {/* Joined */}
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-400">{user.joinedAt}</p>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      user.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onPromote?.(user)}
                      className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                      title="Promote"
                    >
                      <Crown className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEdit?.(user)}
                      className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete?.(user)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
