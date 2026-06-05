import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  PlusCircle,
  BarChart3,
  Bell,
  FileText,
  LogOut,
  Atom,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSimulationStore } from '../../store/useSimulationStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { path: '/simulations', label: '模拟任务', icon: FlaskConical },
  { path: '/simulations/new', label: '新建模拟', icon: PlusCircle },
  { path: '/compare', label: '工况对比', icon: BarChart3 },
  { path: '/notifications', label: '通知中心', icon: Bell },
  { path: '/reports', label: '查询报告', icon: FileText },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const unreadCount = useSimulationStore((s) => s.getUnreadNotificationCount());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-background-secondary/95 backdrop-blur-xl border-r border-border z-50 transition-all duration-300 ease-in-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow animate-pulse-glow">
              <Atom size={24} className="text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <h1 className="font-display font-bold text-lg glow-text truncate">
                  PlasmaLab
                </h1>
                <p className="text-[10px] text-text-tertiary truncate">
                  等离子体模拟平台
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-background-tertiary transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/simulations/new' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'nav-link group relative',
                  isActive && 'active',
                  collapsed && 'justify-center px-3'
                )}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span
                    className={cn(
                      'bg-accent-red text-white text-[10px] font-bold rounded-full min-w-5 h-5 flex items-center justify-center',
                      collapsed ? 'absolute -top-1 -right-1' : ''
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-background-card border border-border rounded-lg text-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                    {item.path === '/notifications' && unreadCount > 0 && (
                      <span className="ml-2 text-accent-red">({unreadCount})</span>
                    )}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <button className="nav-link w-full" onClick={() => {}}>
            <Settings size={20} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1">系统设置</span>}
          </button>

          {user && (
            <div
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl bg-background-tertiary/50',
                collapsed && 'justify-center'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.name.charAt(0)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-text-tertiary truncate">{user.role}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-accent-red/20 text-text-secondary hover:text-accent-red transition-colors flex-shrink-0"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
