import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'cyan' | 'purple' | 'green' | 'orange';
}

const colorVariants = {
  cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'cyan' 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative p-6 rounded-2xl bg-gradient-to-br ${colorVariants[color]} border backdrop-blur-sm overflow-hidden`}
    >
      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
            {subtitle && (
              <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-3 bg-white/5 rounded-xl">
            <Icon className="w-6 h-6" />
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-gray-500 text-xs">vs minggu lalu</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '65%' }}
            transition={{ duration: 1, delay: 0.3 }}
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
