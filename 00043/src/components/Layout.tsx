import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PawPrint,
  CalendarPlus,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  ChevronRight,
  Users,
  Package,
  Calendar,
  FileText,
  BarChart3,
  HeartHandshake,
} from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: ('user' | 'admin')[];
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentUser, logout, dashboardStats } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const userNavItems: NavItem[] = [
    { path: '/', label: '首页看板', icon: <LayoutDashboard size={20} /> },
    { path: '/pets', label: '宠物档案', icon: <PawPrint size={20} /> },
    { path: '/booking', label: '寄养预约', icon: <CalendarPlus size={20} /> },
  ];

  const adminNavItems: NavItem[] = [
    { path: '/', label: '首页看板', icon: <LayoutDashboard size={20} />, roles: ['user', 'admin'] },
    { path: '/admin/pets', label: '宠物管理', icon: <PawPrint size={20} />, roles: ['admin'] },
    { path: '/admin/caregivers', label: '护理员管理', icon: <HeartHandshake size={20} />, roles: ['admin'] },
    { path: '/admin/packages', label: '套餐管理', icon: <Package size={20} />, roles: ['admin'] },
    { path: '/admin/schedule', label: '排班管理', icon: <Calendar size={20} />, roles: ['admin'] },
    { path: '/admin/reports', label: '报表中心', icon: <BarChart3 size={20} />, roles: ['admin'] },
  ];

  const navItems = currentUser?.role === 'admin' 
    ? adminNavItems 
    : userNavItems;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-neutral-200 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20 overflow-hidden'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200">
          <div className={cn('flex items-center gap-3', !sidebarOpen && 'lg:justify-center')}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <PawPrint className="text-white" size={22} />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-neutral-800">宠物寄养</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1 hover:bg-neutral-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
                  !sidebarOpen && 'lg:justify-center lg:px-2'
                )}
              >
                <span className={cn('flex-shrink-0', isActive && 'text-primary-500')}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight size={16} />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-neutral-200 bg-white">
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200',
              !sidebarOpen && 'lg:justify-center lg:px-2'
            )}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {!sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-neutral-800 hidden sm:block">
              {navItems.find(item => location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path)))?.label || '首页看板'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="p-2 hover:bg-neutral-100 rounded-xl transition-colors relative">
                <Bell size={20} className="text-neutral-600" />
                {dashboardStats && dashboardStats.pendingReminders > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {dashboardStats.pendingReminders}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-neutral-200">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-neutral-800">{currentUser?.name}</p>
                <p className="text-xs text-neutral-500">
                  {currentUser?.role === 'admin' ? '管理员' : '普通用户'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
