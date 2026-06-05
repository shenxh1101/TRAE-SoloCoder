import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Users, ClipboardList, BarChart3, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

const menuItems = [
  { to: '/admin/staff', label: '人员管理', icon: Users },
  { to: '/admin/orders', label: '订单查询', icon: ClipboardList },
  { to: '/admin/reports', label: '报表导出', icon: BarChart3 },
];

export default function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const getBreadcrumb = () => {
    if (location.pathname === '/admin/staff') return '人员管理';
    if (location.pathname === '/admin/orders') return '订单查询';
    if (location.pathname === '/admin/reports') return '报表导出';
    return '管理后台';
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <aside
        className="sticky top-0 h-screen flex flex-col bg-white shadow-sm transition-all duration-300"
        style={{ width: collapsed ? 64 : 240 }}
      >
        <div className="h-16 flex items-center px-4 border-b">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--primary)' }}>
                智
              </div>
              <span className="text-lg font-bold" style={{ color: 'var(--secondary)' }}>管理后台</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto" style={{ background: 'var(--primary)' }}>
              智
            </div>
          )}
        </div>

        <nav className="flex-1 py-4">
          <Link
            to="/"
            className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100`}
            style={{ color: 'var(--text-secondary)' }}
          >
            <Home size={20} />
            {!collapsed && <span>首页</span>}
          </Link>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'hover:bg-gray-100'
                }`}
                style={isActive ? { background: 'var(--primary)' } : { color: 'var(--text-secondary)' }}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 flex items-center justify-center border-t hover:bg-gray-50 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Menu size={20} />
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>管理后台</span>
            <span style={{ color: 'var(--text-secondary)' }}>/</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{getBreadcrumb()}</span>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
