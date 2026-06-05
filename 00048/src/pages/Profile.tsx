import { Link } from 'react-router-dom';
import { User, MapPin, Shield, Heart, Gift, Scissors, LogOut, ChevronRight } from 'lucide-react';
import useAuthStore from '@/stores/authStore';

const MENU_ITEMS = [
  { label: '我的上报', icon: MapPin, path: '/report' },
  { label: '我的救助', icon: Shield, path: '/rescue' },
  { label: '我的领养', icon: Heart, path: '/adopt' },
  { label: '我的捐赠', icon: Gift, path: '/donate' },
  { label: '志愿者认证', icon: Scissors, path: '/profile/volunteer' },
];

export default function Profile() {
  const { user, logout } = useAuthStore();

  const displayUser = user || {
    id: '1',
    name: '爱心人士',
    email: 'user@example.com',
    phone: '138****1234',
    role: 'user' as const,
    isVolunteer: false,
    createdAt: '2024-01-01',
  };

  const roleLabel = { user: '普通用户', volunteer: '志愿者', hospital: '合作医院', admin: '管理员' };
  const roleBadge = { user: 'badge-info', volunteer: 'badge-success', hospital: 'badge-active', admin: 'badge-urgent' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <User className="text-primary-500" size={28} />
        <h1 className="section-title">个人中心</h1>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {displayUser.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-warm-800">{displayUser.name}</h2>
              <span className={`badge ${roleBadge[displayUser.role]}`}>
                {roleLabel[displayUser.role]}
              </span>
            </div>
            <p className="text-sm text-warm-500 mt-1">{displayUser.email}</p>
            <p className="text-sm text-warm-500">{displayUser.phone}</p>
            {displayUser.isVolunteer && (
              <span className="badge-success mt-2">已认证志愿者</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-warm text-center p-3">
          <div className="stat-number text-primary-600 text-xl">3</div>
          <div className="text-xs text-warm-500 mt-1">我的上报</div>
        </div>
        <div className="card-warm text-center p-3">
          <div className="stat-number text-success-500 text-xl">5</div>
          <div className="text-xs text-warm-500 mt-1">我的救助</div>
        </div>
        <div className="card-warm text-center p-3">
          <div className="stat-number text-primary-600 text-xl">2</div>
          <div className="text-xs text-warm-500 mt-1">我的领养</div>
        </div>
        <div className="card-warm text-center p-3">
          <div className="stat-number text-amber-500 text-xl">¥350</div>
          <div className="text-xs text-warm-500 mt-1">我的捐赠</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path + i}
              to={item.path}
              className="flex items-center gap-3 px-6 py-4 hover:bg-warm-50 transition-colors border-b border-warm-100 last:border-0"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-500">
                <Icon size={18} />
              </div>
              <span className="flex-1 text-warm-700 font-medium">{item.label}</span>
              <ChevronRight size={18} className="text-warm-300" />
            </Link>
          );
        })}
      </div>

      <button
        onClick={logout}
        className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-medium hover:bg-red-50 transition-all flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        退出登录
      </button>
    </div>
  );
}
