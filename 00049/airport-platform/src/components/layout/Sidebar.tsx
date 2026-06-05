import { useState } from 'react';
import {
  LayoutDashboard,
  Plane,
  ClipboardList,
  ShieldCheck,
  Package,
  AlertTriangle,
  Users,
  FileBarChart,
  ChevronDown,
  Menu,
  X,
  PlaneTakeoff,
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'flights'
  | 'checkin'
  | 'security'
  | 'baggage'
  | 'delay'
  | 'ground'
  | 'reports';

export type UserRole = '旅客' | '地勤人员' | '航司代表' | '机场管理员';

export interface SidebarProps {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: '实时概览', icon: LayoutDashboard },
  { id: 'flights', label: '航班与机位', icon: Plane },
  { id: 'checkin', label: '值机分配', icon: ClipboardList },
  { id: 'security', label: '安检调度', icon: ShieldCheck },
  { id: 'baggage', label: '行李追踪', icon: Package },
  { id: 'delay', label: '延误处置', icon: AlertTriangle },
  { id: 'ground', label: '地勤排班', icon: Users },
  { id: 'reports', label: '报表中心', icon: FileBarChart },
];

const ROLES: UserRole[] = ['旅客', '地勤人员', '航司代表', '机场管理员'];

export default function Sidebar({
  activePage,
  onPageChange,
  userRole,
  onRoleChange,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleNavClick = (id: PageId) => {
    onPageChange(id);
    setMobileOpen(false);
  };

  const handleRoleSelect = (role: UserRole) => {
    onRoleChange(role);
    setRoleDropdownOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-dark">
      <div className="flex items-center gap-3 border-b border-dark-border px-5 py-5">
        <PlaneTakeoff className="h-7 w-7 text-cyan-glow" />
        <span className="text-lg font-bold tracking-wide text-primary-light">
          智慧机场调度平台
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleNavClick(id)}
                  className={`flex w-full items-center gap-3 rounded-r-md px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-l-[3px] border-cyan-glow bg-dark-hover text-cyan-glow'
                      : 'border-l-[3px] border-transparent text-primary-light/70 hover:bg-dark-hover hover:text-primary-light'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative border-t border-dark-border px-4 py-4">
        <button
          type="button"
          onClick={() => setRoleDropdownOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-md bg-dark-card px-3 py-2 text-sm text-primary-light transition-colors hover:bg-dark-hover"
        >
          <span className="truncate">{userRole}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-primary-light/60 transition-transform ${
              roleDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {roleDropdownOpen && (
          <ul className="absolute bottom-full left-4 right-4 mb-1 overflow-hidden rounded-md border border-dark-border bg-dark-card shadow-lg">
            {ROLES.map((role) => (
              <li key={role}>
                <button
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                    role === userRole
                      ? 'bg-dark-hover text-cyan-glow'
                      : 'text-primary-light/70 hover:bg-dark-hover hover:text-primary-light'
                  }`}
                >
                  {role}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-dark-card p-2 text-primary-light shadow-lg md:hidden"
        aria-label="打开导航"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 md:relative md:z-auto md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-4 z-50 text-primary-light/60 hover:text-primary-light md:hidden"
            aria-label="关闭导航"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {sidebarContent}
      </aside>
    </>
  );
}
