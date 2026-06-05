import { Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import type { UserRole } from '../../types';

const roleLabels: Record<UserRole, string> = {
  engineer: '声学工程师',
  designer: '声学设计师',
  manager: '项目负责人',
  constructor: '施工团队',
  chief: '首席工程师',
};

const roleColors: Record<UserRole, string> = {
  engineer: 'bg-acoustic-cyber/20 text-acoustic-cyber',
  designer: 'bg-acoustic-neon/20 text-acoustic-neon',
  manager: 'bg-acoustic-data/20 text-acoustic-data',
  constructor: 'bg-gray-500/20 text-gray-400',
  chief: 'bg-acoustic-warning/20 text-acoustic-warning',
};

export default function Header() {
  const { user, alerts } = useAppStore();
  const pendingAlertsCount = alerts.filter(a => a.status === 'pending').length;

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-acoustic-navy/80 backdrop-blur-md border-b border-acoustic-steel/30 z-30 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="搜索任务、房间、报告..."
            className="w-full pl-10 pr-4 py-2 bg-acoustic-midnight/50 border border-acoustic-steel/30 rounded-lg 
                     text-sm text-white placeholder-gray-500 focus:outline-none focus:border-acoustic-cyber/50
                     transition-all duration-200"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 rounded-lg hover:bg-acoustic-steel/20 transition-colors group">
          <Bell className="w-5 h-5 text-gray-400 group-hover:text-acoustic-cyber" />
          {pendingAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-acoustic-danger rounded-full text-xs font-bold 
                         flex items-center justify-center text-white animate-pulse-slow">
              {pendingAlertsCount}
            </span>
          )}
        </button>

        <button className="p-2 rounded-lg hover:bg-acoustic-steel/20 transition-colors group">
          <Settings className="w-5 h-5 text-gray-400 group-hover:text-acoustic-cyber" />
        </button>

        <div className="flex items-center space-x-3 pl-4 border-l border-acoustic-steel/30">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-acoustic-cyber to-acoustic-data 
                        flex items-center justify-center text-white font-semibold text-sm">
            {user?.username?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">{user?.username}</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${roleColors[user?.role || 'engineer']}`}>
              {roleLabels[user?.role || 'engineer']}
            </span>
          </div>
          <button className="p-1.5 rounded hover:bg-acoustic-danger/20 transition-colors group">
            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-acoustic-danger" />
          </button>
        </div>
      </div>
    </header>
  );
}
