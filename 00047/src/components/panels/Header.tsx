import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, LogOut, FileText, Settings, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { UserRole } from '@/types';

interface HeaderProps {
  onToggleNotifications?: () => void;
}

const roleNames: Record<UserRole, string> = {
  traffic_police: '交通警察',
  command_director: '指挥中心主任',
  transport_bureau: '交通局官员',
};

export default function Header({
  onToggleNotifications,
}: HeaderProps) {
  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.currentUser);
  const notifications = useAppStore((state) => state.notifications);
  const logout = useAppStore((state) => state.logout);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    });
  };

  return (
    <header className="h-16 bg-cyber-panel border-b border-cyber-border flex items-center justify-between px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-cyber-glow/5 via-transparent to-cyber-glow/5" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-glow to-transparent" />
      
      <div className="flex items-center gap-3 z-10">
        <div className="relative">
          <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-cyber-glow via-cyan-300 to-cyan-500 bg-clip-text text-transparent tracking-wider">
            智慧城市交通管控平台
          </h1>
          <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-cyber-glow/0 via-cyber-glow to-cyber-glow/0" />
        </div>
        <span className="ml-4 px-2 py-0.5 text-xs font-mono text-cyber-glow border border-cyber-glow/30 rounded bg-cyber-glow/10 animate-pulse-glow" style={{ color: '#38bdf8' }}>
          V3.0
        </span>
      </div>

      <div className="flex items-center gap-6 z-10">
        <div className="flex items-center gap-2 text-cyber-glow font-mono text-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          <span className="tracking-wider">{formatTime(currentTime)}</span>
        </div>

        <div className="h-6 w-px bg-cyber-border" />

        <button
          onClick={onToggleNotifications}
          className={cn(
            "relative flex items-center gap-2 px-3 py-1.5 rounded",
            "text-cyan-400 hover:text-cyan-300",
            "border border-cyber-border hover:border-cyan-500/50",
            "transition-all duration-300",
            "bg-cyber-glow/5 hover:bg-cyber-glow/10"
          )}
        >
          <Bell className="w-4 h-4" />
          <span className="text-sm">通知</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded",
            "text-cyan-400 hover:text-cyan-300",
            "border border-cyber-border hover:border-cyan-500/50",
            "transition-all duration-300",
            "bg-cyber-glow/5 hover:bg-cyber-glow/10"
          )}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
            <User className="w-4 h-4 text-cyber-bg" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium">{currentUser?.name || '管理员'}</div>
            <div className="text-xs text-cyan-500/70">
              {currentUser?.role ? roleNames[currentUser.role] : '系统管理员'}
            </div>
          </div>
          <Settings className="w-4 h-4" />
        </button>

        {showUserMenu && (
          <div className={cn(
            "absolute top-full right-0 mt-2 w-48 rounded",
            "bg-cyber-panel border border-cyber-border",
            "shadow-cyber backdrop-blur-sm",
            "z-50"
          )}>
            <div className="p-3 border-b border-cyber-border">
              <div className="text-sm font-medium text-cyan-300">{currentUser?.name || '管理员'}</div>
              <div className="text-xs text-cyan-500/70">{currentUser?.department || '系统管理部'}</div>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2.5",
                "text-red-400 hover:text-red-300",
                "hover:bg-red-500/10 transition-colors"
              )}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">退出登录</span>
            </button>
          </div>
        )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </header>
  );
}
