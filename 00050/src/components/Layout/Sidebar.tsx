import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  Monitor,
  Wrench,
  DollarSign,
  Bell,
  LogOut,
  LayoutDashboard,
  Calendar,
  MapPin,
  BarChart3,
  FileText,
  AlertTriangle,
  ClipboardList,
  Route,
  Ticket,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import type { UserRole } from '../../types';

interface SidebarProps {
  role: UserRole;
}

const roleNavItems: Record<UserRole, Array<{ to: string; icon: React.ElementType; label: string }>> = {
  exhibitor: [
    { to: '/exhibitor', icon: LayoutDashboard, label: '工作台' },
    { to: '/exhibitor/booking', icon: MapPin, label: '展位预订' },
    { to: '/exhibitor/services', icon: Wrench, label: '服务申请' },
    { to: '/exhibitor/statistics', icon: BarChart3, label: '数据统计' },
    { to: '/exhibitor/contracts', icon: FileText, label: '合同管理' },
  ],
  visitor: [
    { to: '/visitor', icon: LayoutDashboard, label: '首页' },
    { to: '/visitor/exhibitors', icon: Building2, label: '展商推荐' },
    { to: '/visitor/forums', icon: Calendar, label: '论坛预约' },
    { to: '/visitor/route', icon: Route, label: '参观路线' },
  ],
  operator: [
    { to: '/operator', icon: LayoutDashboard, label: '监控中心' },
    { to: '/operator/monitor', icon: Monitor, label: '实时监控' },
    { to: '/operator/reviews', icon: ClipboardList, label: '预订审核' },
    { to: '/operator/warnings', icon: AlertTriangle, label: '预警处理' },
  ],
  provider: [
    { to: '/provider', icon: LayoutDashboard, label: '工作台' },
    { to: '/provider/orders', icon: Ticket, label: '订单大厅' },
    { to: '/provider/tickets', icon: ClipboardList, label: '工单管理' },
  ],
  finance: [
    { to: '/finance', icon: LayoutDashboard, label: '财务中心' },
    { to: '/finance/income', icon: DollarSign, label: '收入统计' },
    { to: '/finance/reports', icon: FileText, label: '报表中心' },
  ],
};

const roleIcons: Record<UserRole, React.ElementType> = {
  exhibitor: Building2,
  visitor: Users,
  operator: Monitor,
  provider: Wrench,
  finance: DollarSign,
};

const roleLabels: Record<UserRole, string> = {
  exhibitor: '展商',
  visitor: '观众',
  operator: '运营管理',
  provider: '服务商',
  finance: '财务',
};

export function Sidebar({ role }: SidebarProps) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const unreadCount = useNotificationStore((state) =>
    currentUser ? state.getUnreadCount(currentUser.id) : 0
  );

  const navItems = roleNavItems[role];
  const RoleIcon = roleIcons[role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      className="fixed left-0 top-0 h-screen w-64 bg-dark-800/95 backdrop-blur-xl border-r border-white/10 flex flex-col z-50"
    >
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center glow-effect">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-display">智慧会展中心</h1>
            <div className="flex items-center gap-1 text-xs text-dark-300">
              <RoleIcon className="w-3 h-3" />
              <span>{roleLabels[role]}端</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-dark-300 truncate">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${role}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-dark-200 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <NavLink
          to="/notifications"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-dark-200 hover:bg-white/5 hover:text-white transition-all duration-300"
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="font-medium">消息中心</span>
          {unreadCount > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-danger-500/20 text-danger-400 text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-dark-300 hover:bg-danger-500/10 hover:text-danger-400 transition-all duration-300"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">退出登录</span>
        </button>
      </div>
    </motion.aside>
  );
}
