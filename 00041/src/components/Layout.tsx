import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, CalendarPlus, User, ChevronDown } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { to: '/', label: '首页', icon: Home },
    { to: '/booking', label: '预约服务', icon: CalendarPlus },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--primary)' }}>
              智
            </div>
            <span className="text-lg font-bold" style={{ color: 'var(--secondary)' }}>
              智家管家
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  style={isActive ? { background: 'var(--primary)' } : { color: 'var(--secondary)' }}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ background: 'var(--primary)' }}>
                <User size={16} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--secondary)' }}>用户</span>
              <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border py-1 animate-fade-in">
                <Link
                  to="/admin/staff"
                  className="block px-4 py-2 text-sm hover:bg-gray-50"
                  style={{ color: 'var(--text)' }}
                  onClick={() => setDropdownOpen(false)}
                >
                  管理后台
                </Link>
                <button
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  style={{ color: 'var(--danger)' }}
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
