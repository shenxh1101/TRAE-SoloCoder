import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'rose';
  delay?: number;
}

const colorClasses: Record<string, string> = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
  green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
};

export function StatCard({ title, value, icon, trend, color = 'blue', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className={`glass-card p-6 border bg-gradient-to-br ${colorClasses[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-300 mb-2">{title}</p>
          <p className="text-3xl font-bold text-white font-display">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-success-400' : 'text-danger-400'}`}>
              {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
              <span className="text-dark-400 ml-1">较上周</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
