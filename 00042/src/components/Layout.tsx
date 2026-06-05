import {
  Stethoscope,
  LayoutDashboard,
  Users,
  Activity,
  BedDouble,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  Bell,
  Settings,
  FileCheck,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import useAuthStore from '@/stores/authStore'
import useAlertStore from '@/stores/alertStore'
import usePatientStore from '@/stores/patientStore'
import { useEffect, useState } from 'react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { path: '/triage', icon: Stethoscope, label: '分诊工作台', roles: ['nurse', 'director', 'admin'] },
  { path: '/monitor', icon: LayoutDashboard, label: '实时监控', roles: ['nurse', 'doctor', 'director', 'admin'] },
  { path: '/treatment', icon: Activity, label: '诊治管理', roles: ['doctor', 'director', 'admin'] },
  { path: '/observation', icon: BedDouble, label: '留观管理', roles: ['doctor', 'nurse', 'director', 'admin'] },
  { path: '/billing', icon: CreditCard, label: '费用结算', roles: ['cashier', 'director', 'admin'] },
  { path: '/approval', icon: FileCheck, label: '审批管理', roles: ['director', 'admin'] },
  { path: '/statistics', icon: BarChart3, label: '统计报表', roles: ['director', 'admin'] },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { pendingAdjustments, fetchPendingAdjustments } = usePatientStore()
  const navigate = useNavigate()
  
  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role))
  
  useEffect(() => {
    if (user && (user.role === 'director' || user.role === 'admin')) {
      fetchPendingAdjustments()
      const interval = setInterval(fetchPendingAdjustments, 15000)
      return () => clearInterval(interval)
    }
  }, [user, fetchPendingAdjustments])
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-dark-700 text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-dark-600">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary-400" />
            <span className="font-bold text-base">急诊分诊系统</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'p-1.5 rounded-lg hover:bg-dark-600 transition-colors',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path
          const showBadge = item.path === '/approval' && pendingAdjustments.length > 0
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-all relative',
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-dark-300 hover:bg-dark-600 hover:text-white'
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {showBadge && collapsed && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                    {pendingAdjustments.length}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {showBadge && (
                    <span className="px-2 py-0.5 bg-danger-500 text-white text-xs rounded-full flex-shrink-0">
                      {pendingAdjustments.length}
                    </span>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </nav>
      
      <div className="border-t border-dark-600 p-2">
        {!collapsed && user && (
          <div className="px-2 py-2 mb-2">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-dark-400">{user.department}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-2 rounded-lg text-dark-300 hover:bg-dark-600 hover:text-white transition-colors',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">退出登录</span>}
        </button>
      </div>
    </div>
  )
}

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuthStore()
  const { alerts, fetchAlerts, acknowledgeAlert } = useAlertStore()
  const [showAlerts, setShowAlerts] = useState(false)
  
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged)
  
  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [fetchAlerts])
  
  return (
    <header className="h-16 bg-white border-b border-dark-100 flex items-center px-6 gap-4">
      <h1 className="text-lg font-semibold text-dark-700">{title}</h1>
      
      <div className="flex-1" />
      
      <div className="relative">
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="relative p-2 rounded-lg hover:bg-dark-50 transition-colors"
        >
          <Bell className="w-5 h-5 text-dark-500" />
          {unacknowledgedAlerts.length > 0 && (
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
              {unacknowledgedAlerts.length}
            </span>
          )}
        </button>
        
        {showAlerts && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-dark-100 z-50 animate-slide-in">
            <div className="p-3 border-b border-dark-100">
              <h3 className="font-semibold text-dark-700">告警通知</h3>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {unacknowledgedAlerts.length === 0 ? (
                <div className="p-4 text-center text-dark-400">暂无未处理告警</div>
              ) : (
                unacknowledgedAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 border-b border-dark-50 hover:bg-dark-50 cursor-pointer"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                          alert.level === 'critical' && 'bg-danger-500',
                          alert.level === 'urgent' && 'bg-warning-500',
                          alert.level === 'warning' && 'bg-primary-500'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-dark-700 line-clamp-2">{alert.message}</p>
                        <p className="text-xs text-dark-400 mt-1">
                          {new Date(alert.createdAt).toLocaleTimeString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-dark-700">{user?.name}</div>
          <div className="text-xs text-dark-400">{user?.department}</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary-600" />
        </div>
      </div>
    </header>
  )
}

interface LayoutProps {
  children: React.ReactNode
  title: string
}

export default function Layout({ children, title }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  
  return (
    <div className="flex h-screen bg-dark-50 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">{children}</main>
      </div>
    </div>
  )
}
