import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Car,
  FilePlus,
  CheckSquare,
  KeyRound,
  History,
  BarChart3,
  Wrench,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { canAccessRoute } from '@/utils/permissions';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: '首页看板', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
    { path: '/vehicles', label: '车辆管理', icon: Car, roles: ['admin'] },
    { path: '/application', label: '用车申请', icon: FilePlus, roles: ['employee', 'manager', 'admin'] },
    { path: '/approval', label: '审批管理', icon: CheckSquare, roles: ['manager', 'admin'] },
    { path: '/return', label: '还车管理', icon: KeyRound, roles: ['employee', 'manager', 'admin'] },
    { path: '/history', label: '历史记录', icon: History, roles: ['employee', 'manager', 'admin'] },
    { path: '/reports', label: '报表中心', icon: BarChart3, roles: ['manager', 'admin'] },
    { path: '/maintenance', label: '维修管理', icon: Wrench, roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter((item) => canAccessRoute(item.path, user.role));

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Car className="text-blue-400" size={28} />
          车辆调度系统
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <Icon size={20} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.department}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={20} />
          退出登录
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
