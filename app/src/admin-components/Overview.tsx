import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Server, MessageSquare, Hash, TrendingUp, Activity, Loader2 } from 'lucide-react';
import { StatCard } from './StatCard';

interface DashboardStats {
  total_users: number;
  total_servers: number;
  total_channels: number;
  total_messages: number;
  total_dm_messages: number;
  total_memberships: number;
  total_friendships: number;
  online_users: number;
}

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
}

export function Overview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [activityData, setActivityData] = useState<number[]>([40, 65, 45, 80, 55, 70, 90]);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch statistics
      const statsResponse = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent activity (using users endpoint as fallback)
      const usersResponse = await fetch(`${API_URL}/admin/users?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Generate recent activity from users data
        const activities: ActivityItem[] = usersData.users?.slice(0, 5).map((user: any, index: number) => ({
          id: user.id,
          action: index === 0 ? 'User login' : index === 1 ? 'User registrasi' : 'Update profil',
          user: user.username,
          time: formatTimeAgo(new Date(user.created_at))
        })) || [];
        setRecentActivity(activities);
      }

      // Simulate activity data (will be replaced with real data when endpoint is available)
      setActivityData(generateActivityData());
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateActivityData = () => {
    // Generate random activity data for the last 7 days
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} jam yang lalu`;
    return `${Math.floor(diffInMinutes / 1440)} hari yang lalu`;
  };

  const statCards = stats ? [
    {
      title: 'Total Pengguna',
      value: stats.total_users.toString(),
      subtitle: `${stats.online_users} online`,
      icon: Users,
      color: 'cyan' as const,
      trend: { value: 12, isPositive: true },
    },
    {
      title: 'Total Server',
      value: stats.total_servers.toString(),
      subtitle: `${stats.total_channels} channel`,
      icon: Server,
      color: 'purple' as const,
      trend: { value: 5, isPositive: true },
    },
    {
      title: 'Total Pesan',
      value: (stats.total_messages + stats.total_dm_messages).toString(),
      subtitle: `${stats.total_dm_messages} DM`,
      icon: MessageSquare,
      color: 'green' as const,
      trend: { value: 23, isPositive: true },
    },
    {
      title: 'Memberships',
      value: stats.total_memberships.toString(),
      subtitle: `${stats.total_friendships} pertemanan`,
      icon: Hash,
      color: 'orange' as const,
    },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat data dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-[#0d0f13] rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-white">Aktivitas Server</h3>
              <p className="text-sm text-gray-500">Pesan per hari</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm text-cyan-400">
                <TrendingUp className="w-4 h-4" />
                +23%
              </span>
            </div>
          </div>

          {/* Simple Bar Chart */}
          <div className="h-48 flex items-end gap-3">
            {activityData.map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex-1 bg-gradient-to-t from-cyan-500/50 to-cyan-400 rounded-t-lg hover:from-cyan-400 hover:to-cyan-300 transition-colors cursor-pointer group relative"
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1d24] px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {height}
                </div>
              </motion.div>
            ))}
          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0d0f13] rounded-2xl border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white">Aktivitas Terbaru</h3>
            <Activity className="w-5 h-5 text-gray-500" />
          </div>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{activity.action}</p>
                    <p className="text-xs text-cyan-400">{activity.user}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Tidak ada aktivitas terbaru</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#0d0f13] rounded-2xl border border-white/5 p-6"
      >
        <h3 className="font-semibold text-white mb-4">Aksi Cepat</h3>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Tambah Pengguna
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Server className="w-4 h-4" />
            Buat Server
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Broadcast Pesan
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
