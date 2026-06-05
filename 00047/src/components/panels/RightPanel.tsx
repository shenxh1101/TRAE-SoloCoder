import { useState } from 'react';
import { Clock, Zap, AlertTriangle, FileCheck, FileBarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import SignalTimingPanel from './SignalTimingPanel';
import EmergencyPanel from './EmergencyPanel';
import EventPanel from './EventPanel';
import ApprovalPanel from './ApprovalPanel';
import ReportPanel from './ReportPanel';

type TabType = 'timing' | 'emergency' | 'event' | 'approval' | 'report';

interface TabConfig {
  key: TabType;
  name: string;
  icon: typeof Clock;
  color: string;
}

const tabs: TabConfig[] = [
  { key: 'timing', name: '配时控制', icon: Clock, color: 'text-cyan-400' },
  { key: 'emergency', name: '应急调度', icon: Zap, color: 'text-yellow-400' },
  { key: 'event', name: '事件处置', icon: AlertTriangle, color: 'text-red-400' },
  { key: 'approval', name: '审批中心', icon: FileCheck, color: 'text-purple-400' },
  { key: 'report', name: '报表中心', icon: FileBarChart, color: 'text-green-400' },
];

interface RightPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export default function RightPanel({ collapsed = false, onToggleCollapse, className }: RightPanelProps) {
  const selectedIntersection = useAppStore((state) => state.selectedIntersection);
  const [activeTab, setActiveTab] = useState<TabType>('timing');
  const isCollapsed = collapsed;

  const renderContent = () => {
    switch (activeTab) {
      case 'timing':
        return <SignalTimingPanel intersection={selectedIntersection} />;
      case 'emergency':
        return <EmergencyPanel />;
      case 'event':
        return <EventPanel />;
      case 'approval':
        return <ApprovalPanel />;
      case 'report':
        return <ReportPanel />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "h-full bg-cyber-panel border-l border-cyber-border flex flex-col relative overflow-hidden",
        isCollapsed ? "w-12" : "w-[480px]",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-glow/3 via-transparent to-transparent pointer-events-none" />

      {!isCollapsed && (
        <div className="flex border-b border-cyber-border relative z-10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2",
                  "transition-all duration-300 relative",
                  "hover:bg-cyber-glow/5",
                  isActive && "bg-cyber-glow/10"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? tab.color : "text-cyan-600"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  isActive ? tab.color : "text-cyan-600"
                )}>
                  {tab.name}
                </span>
                {isActive && (
                  <>
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent"
                      style={{ color: tab.color.replace('text-', '') === 'cyan-400' ? '#22d3ee' :
                        tab.color.replace('text-', '') === 'yellow-400' ? '#facc15' :
                        tab.color.replace('text-', '') === 'red-400' ? '#f87171' :
                        tab.color.replace('text-', '') === 'purple-400' ? '#c084fc' : '#4ade80' }}
                    />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: tab.color.replace('text-', '') === 'cyan-400' ? '#22d3ee' :
                        tab.color.replace('text-', '') === 'yellow-400' ? '#facc15' :
                        tab.color.replace('text-', '') === 'red-400' ? '#f87171' :
                        tab.color.replace('text-', '') === 'purple-400' ? '#c084fc' : '#4ade80' }}
                    />
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center py-3 gap-4 relative z-10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  onToggleCollapse?.();
                }}
                className={cn(
                  "p-2 rounded transition-all duration-300 relative group",
                  isActive ? "bg-cyber-glow/20" : "hover:bg-cyber-glow/10"
                )}
                title={tab.name}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isActive ? tab.color : "text-cyan-600"
                )} />
                <div className="absolute left-full ml-2 px-2 py-1 rounded bg-cyber-panel border border-cyber-border text-xs text-cyan-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {tab.name}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20",
          "w-5 h-12 flex items-center justify-center",
          "bg-cyber-panel border border-cyber-border rounded-l",
          "text-cyan-400 hover:text-cyan-300 hover:bg-cyber-glow/10",
          "transition-all duration-300",
          isCollapsed ? "left-0" : "-left-5"
        )}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      <div className="flex-1 overflow-hidden relative z-10">
        {!isCollapsed && renderContent()}
      </div>

      <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 m-1 rounded" />
    </div>
  );
}
