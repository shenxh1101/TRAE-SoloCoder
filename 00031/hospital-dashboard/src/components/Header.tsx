import { Hospital, Bell, Settings, User, Upload, FileText } from 'lucide-react';
import type { Alert } from '../types';
import { formatDateTime } from '../utils/calculations';

interface HeaderProps {
  alerts: Alert[];
  currentView: string;
  onViewChange: (view: string) => void;
  onShowUpload: () => void;
  onShowReport: () => void;
}

export default function Header({ alerts, currentView, onViewChange, onShowUpload, onShowReport }: HeaderProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const unresolvedAlerts = alerts.filter(a => !a.resolved);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-lg">
              <Hospital className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">医院门诊流量与资源调度分析看板</h1>
              <p className="text-sm text-gray-500">{dateStr}</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {[
              { id: 'dashboard', label: '总览看板', icon: '📊' },
              { id: 'departments', label: '科室分析', icon: '🏥' },
              { id: 'doctors', label: '医生效率', icon: '👨‍⚕️' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === item.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={onShowUpload}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              上传排班
            </button>
            <button
              onClick={onShowReport}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              运营报告
            </button>

            <div className="relative">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5" />
                {unresolvedAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unresolvedAlerts.length}
                  </span>
                )}
              </button>
              {unresolvedAlerts.length > 0 && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">预警通知</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {unresolvedAlerts.slice(0, 5).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3 border-b border-gray-50 hover:bg-gray-50 ${
                          alert.level === 'danger' ? 'bg-danger-50/50' : 'bg-warning-50/50'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <span className={`text-lg ${alert.level === 'danger' ? 'text-danger-500' : 'text-warning-500'}`}>
                            ⚠️
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatDateTime(alert.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden lg:block">管理员</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
