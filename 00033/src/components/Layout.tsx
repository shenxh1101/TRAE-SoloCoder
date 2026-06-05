import { useLocation, Link, Outlet } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  AudioLines,
  Waves,
  RotateCcw,
  Globe,
  Database,
  Bell,
  FileText,
  User,
} from "lucide-react";
import { useStore } from "@/store";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/preprocess", label: "波形预处理", icon: AudioLines },
  { path: "/forward", label: "波场正演", icon: Waves },
  { path: "/inversion", label: "震源反演", icon: RotateCcw },
  { path: "/results/demo", label: "结果可视化", icon: Globe },
  { path: "/catalog", label: "目录与推荐", icon: Database },
  { path: "/alerts", label: "告警通知", icon: Bell },
  { path: "/report", label: "报告生成", icon: FileText },
];

const pageTitles: Record<string, string> = {
  "/": "控制台",
  "/preprocess": "波形预处理",
  "/forward": "波场正演",
  "/inversion": "震源反演",
  "/results": "结果可视化",
  "/catalog": "目录与推荐",
  "/alerts": "告警通知",
  "/report": "报告生成",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/results")) return pageTitles["/results"];
  return pageTitles[pathname] || "SEISMO INVERT";
}

export default function Layout() {
  const location = useLocation();
  const unreadAlertCount = useStore((s) => s.unreadAlertCount);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-seismo-bg">
      <aside
        className="fixed left-0 top-0 bottom-0 w-64 flex flex-col z-50"
        style={{
          background: "linear-gradient(180deg, #0d1220 0%, #0f1628 100%)",
        }}
      >
        <div className="px-6 py-5 border-b border-seismo-border/30">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-seismo-cyan" />
            <div>
              <span className="text-xl font-mono font-bold text-seismo-text tracking-wider">
                SEISMO
              </span>
              <span className="text-xl font-mono font-bold text-seismo-cyan tracking-wider ml-1">
                INVERT
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                  active
                    ? "text-seismo-cyan bg-seismo-cyan/10 border-l-2 border-seismo-cyan"
                    : "text-seismo-text-dim hover:text-seismo-text hover:bg-seismo-panel/50 border-l-2 border-transparent"
                }`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
                {item.path === "/alerts" && unreadAlertCount > 0 && (
                  <span className="ml-auto bg-seismo-red text-white text-xs font-mono font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                    {unreadAlertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-seismo-border/30">
          <div className="flex items-center gap-2 text-sm text-seismo-text-dim">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>系统在线</span>
          </div>
        </div>
      </aside>

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 border-b border-seismo-border/30 bg-seismo-bg/80 backdrop-blur-xl">
          <h1 className="section-title text-base">
            {getPageTitle(location.pathname)}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-seismo-text-dim">
              <User className="w-4 h-4" />
              <span>分析师</span>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
