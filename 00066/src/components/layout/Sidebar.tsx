import { useState } from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  PlusCircle, 
  Activity, 
  AlertTriangle, 
  Volume2,
  FileText, 
  BarChart3, 
  Lightbulb, 
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Waves
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

const menuItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, path: '/' },
  { id: 'tasks', label: '任务管理', icon: ListTodo, path: '/tasks' },
  { id: 'new-task', label: '新建任务', icon: PlusCircle, path: '/tasks/new' },
  { id: 'visualization', label: '声场可视化', icon: Waves, path: '/visualization' },
  { id: 'monitoring', label: '实时监控', icon: Activity, path: '/monitoring' },
  { id: 'alerts', label: '预警中心', icon: AlertTriangle, path: '/alerts' },
  { id: 'solution', label: '降噪方案', icon: Volume2, path: '/solution' },
  { id: 'approvals', label: '审批流程', icon: CheckSquare, path: '/approvals' },
  { id: 'reports', label: '报告中心', icon: FileText, path: '/reports' },
  { id: 'analytics', label: '数据分析', icon: BarChart3, path: '/analytics' },
  { id: 'recommendations', label: '智能推荐', icon: Lightbulb, path: '/recommendations' },
];

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-acoustic-navy border-r border-acoustic-steel/30 
                  transition-all duration-300 z-40 flex flex-col
                  ${sidebarOpen ? 'w-64' : 'w-20'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-acoustic-steel/30">
        {sidebarOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-acoustic-cyber to-acoustic-neon rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-acoustic-deep" />
            </div>
            <span className="font-mono font-bold text-lg glow-text text-acoustic-cyber">
              AcousticSim
            </span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-acoustic-steel/20 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <li key={item.id}>
                <a
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveItem(item.id);
                  }}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gradient-to-r from-acoustic-cyber/20 to-transparent border-l-2 border-acoustic-cyber text-acoustic-cyber' 
                      : 'text-gray-400 hover:text-white hover:bg-acoustic-steel/10'
                    }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-acoustic-cyber' : 'group-hover:text-acoustic-cyber'}`} />
                  {sidebarOpen && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {sidebarOpen && (
        <div className="p-4 border-t border-acoustic-steel/30">
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400">系统状态</span>
              <span className="status-dot status-running"></span>
            </div>
            <div className="text-xs text-gray-500 font-mono">v2.1.0 · 在线</div>
          </div>
        </div>
      )}
    </aside>
  );
}
