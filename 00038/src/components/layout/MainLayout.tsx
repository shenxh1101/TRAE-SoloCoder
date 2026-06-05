import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { Bell, Search, Command } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate, setUser]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/simulations/') && path !== '/simulations/new' && path !== '/simulations') {
      return '模拟详情';
    }
    const titles: Record<string, string> = {
      '/dashboard': '仪表盘',
      '/simulations': '模拟任务列表',
      '/simulations/new': '新建模拟任务',
      '/compare': '多工况对比分析',
      '/notifications': '通知中心',
      '/reports': '查询与报告',
    };
    return titles[path] || '等离子体模拟平台';
  };

  return (
    <div className="min-h-screen plasma-bg grid-bg">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-display font-semibold text-text-primary">
              {pageTitle()}
            </h1>
            {user && (
              <span className="text-sm text-text-tertiary">欢迎回来，{user.name}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="搜索模拟任务... (⌘K)"
                className="w-64 pl-10 pr-4 py-2 bg-background-tertiary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:shadow-glow transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] text-text-muted bg-background rounded flex items-center gap-0.5">
                <Command size={10} /> K
              </kbd>
            </div>

            <NotificationDropdown />
          </div>
        </header>

        <main className="p-6 animate-fade-in">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
