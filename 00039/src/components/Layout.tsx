import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ShieldCheck, Warehouse, BarChart3,
  FileText, MessageSquare, ChevronLeft, ChevronRight, Bell, ChevronDown,
} from 'lucide-react';
import { useStore, UserRole } from '@/store';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/orders', label: '采购订单', icon: ShoppingCart },
  { path: '/quality', label: '质检管理', icon: ShieldCheck },
  { path: '/warehouse', label: '仓储入库', icon: Warehouse },
  { path: '/suppliers', label: '供应商绩效', icon: BarChart3 },
  { path: '/reports', label: '报表中心', icon: FileText },
  { path: '/messages', label: '消息中心', icon: MessageSquare, badge: true },
];

const roleLabels: Record<UserRole, string> = {
  purchaser: '采购员',
  quality: '质检员',
  warehouse: '仓管员',
  admin: '管理员',
};

const roleColors: Record<UserRole, string> = {
  purchaser: 'bg-[var(--amber-500)]',
  quality: 'bg-[var(--green-500)]',
  warehouse: 'bg-[var(--blue-500)]',
  admin: 'bg-purple-500',
};

const breadcrumbMap: Record<string, string> = {
  '/': '工作台',
  '/orders': '采购订单',
  '/orders/create': '创建订单',
  '/quality': '质检管理',
  '/warehouse': '仓储入库',
  '/suppliers': '供应商绩效',
  '/reports': '报表中心',
  '/messages': '消息中心',
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const location = useLocation();
  const { currentUser, switchRole, messages } = useStore();
  const unreadCount = messages.filter((m) => !m.read).length;

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = ['/'];
  let currentPath = '';
  for (const seg of pathSegments) {
    currentPath += '/' + seg;
    breadcrumbs.push(currentPath);
  }
  if (breadcrumbs.length > 1 && breadcrumbs[1] === '/') breadcrumbs.splice(1, 1);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'flex flex-col bg-[var(--navy-900)] text-white transition-all duration-300 shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className={cn('flex items-center h-16 border-b border-white/10 px-4', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-8 h-8 rounded-lg bg-[var(--amber-500)] flex items-center justify-center font-bold text-sm shrink-0">
            IQ
          </div>
          {!collapsed && <span className="font-semibold text-base tracking-wide">智采质检</span>}
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center mx-2 my-0.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                  isActive
                    ? 'bg-[var(--amber-500)] text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                  collapsed && 'justify-center px-0'
                )
              }
              end={item.path === '/'}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="ml-3">{item.label}</span>}
              {item.badge && unreadCount > 0 && (
                <span
                  className={cn(
                    'absolute flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-[var(--red-500)] rounded-full',
                    collapsed ? 'top-1 right-0' : 'right-2'
                  )}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="relative">
            <button
              onClick={() => setRoleOpen(!roleOpen)}
              className={cn(
                'flex items-center w-full rounded-lg px-2 py-2 hover:bg-white/10 transition-colors',
                collapsed ? 'justify-center' : 'gap-2'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--navy-700)] flex items-center justify-center text-sm font-medium shrink-0">
                {currentUser.name[0]}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{currentUser.name}</div>
                    <span className={cn('inline-block mt-0.5 px-1.5 py-0 rounded text-[10px] text-white', roleColors[currentUser.role])}>
                      {roleLabels[currentUser.role]}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50" />
                </>
              )}
            </button>

            {roleOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-xl border border-[var(--gray-200)] overflow-hidden z-50">
                {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => { switchRole(role); setRoleOpen(false); }}
                    className={cn(
                      'w-full px-4 py-2 text-sm text-left hover:bg-[var(--gray-50)] transition-colors',
                      currentUser.role === role ? 'text-[var(--amber-500)] font-medium' : 'text-[var(--gray-700)]'
                    )}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-[var(--gray-200)] shrink-0">
          <div className="flex items-center gap-2 text-sm text-[var(--gray-500)]">
            {breadcrumbs.map((path, i) => (
              <span key={path} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={i === breadcrumbs.length - 1 ? 'text-[var(--gray-700)] font-medium' : ''}>
                  {breadcrumbMap[path] || path.split('/').pop()}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-[var(--gray-100)] transition-colors">
              <Bell className="w-5 h-5 text-[var(--gray-500)]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--red-500)] rounded-full" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-[var(--gray-50)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
