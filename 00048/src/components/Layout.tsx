import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home,
  MapPin,
  Shield,
  Heart,
  Gift,
  Scissors,
  CalendarCheck,
  BarChart3,
  User,
  Search,
  LogOut,
} from "lucide-react";
import useAuthStore from "@/stores/authStore";
import NotificationBell from "@/components/NotificationBell";

const navItems = [
  { label: "首页", icon: Home, path: "/" },
  { label: "上报流浪动物", icon: MapPin, path: "/report" },
  { label: "救助任务", icon: Shield, path: "/rescue" },
  { label: "领养中心", icon: Heart, path: "/adopt" },
  { label: "捐赠中心", icon: Gift, path: "/donate" },
  { label: "绝育筹款", icon: Scissors, path: "/fundraise" },
  { label: "回访管理", icon: CalendarCheck, path: "/followup" },
  { label: "管理看板", icon: BarChart3, path: "/admin", adminOnly: true },
  { label: "个人中心", icon: User, path: "/profile" },
];

const mobileTabs = [
  { label: "首页", icon: Home, path: "/" },
  { label: "救助", icon: Shield, path: "/rescue" },
  { label: "领养", icon: Heart, path: "/adopt" },
  { label: "捐赠", icon: Gift, path: "/donate" },
  { label: "我的", icon: User, path: "/profile" },
];

function NavLink({
  item,
  isActive,
}: {
  item: (typeof navItems)[number];
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary-50 text-primary-600 border-l-4 border-primary-500"
          : "text-warm-600 hover:bg-primary-50 hover:text-primary-600 border-l-4 border-transparent"
      }`}
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-warm-50">
      <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-white shadow-lg z-30 hidden lg:flex flex-col">
        <div className="p-6 border-b border-warm-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Heart size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-warm-800">
                流浪救助站
              </h1>
              <p className="text-xs text-warm-400">让每个生命都被温柔以待</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {filteredNavItems.map((item) => (
            <NavLink key={item.path} item={item} isActive={isActive(item.path)} />
          ))}
        </nav>

        <div className="p-4 border-t border-warm-200">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-sm">
                {user.name?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-800 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-warm-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-warm-400 hover:text-warm-600 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="btn-primary w-full text-center block text-sm"
            >
              登录
            </Link>
          )}
        </div>
      </aside>

      <div className="lg:ml-[280px] pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-warm-200 px-6 py-3 hidden lg:flex items-center gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400"
            />
            <input
              type="text"
              placeholder="搜索动物、救助任务..."
              className="w-full max-w-md pl-10 pr-4 py-2 rounded-xl border border-warm-200 bg-warm-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
            />
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link to="/profile" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium text-xs">
                  {user.name?.[0] || "U"}
                </div>
              </Link>
            </div>
          )}
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 z-30 lg:hidden">
        <div className="flex items-center justify-around py-2">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "text-primary-500"
                    : "text-warm-400 hover:text-warm-600"
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
