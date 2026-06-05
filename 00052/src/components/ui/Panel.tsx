import React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  className,
  title,
  icon,
  collapsible = false,
  defaultCollapsed = false
}) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={cn(
      'bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-xl',
      className
    )}>
      {title && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b border-slate-700/50',
            collapsible && 'cursor-pointer hover:bg-slate-800/50 transition-colors'
          )}
          onClick={() => collapsible && setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            {icon && <span className="text-blue-400">{icon}</span>}
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          </div>
          {collapsible && (
            <span className="text-slate-400 text-xs">
              {collapsed ? '展开' : '收起'}
            </span>
          )}
        </div>
      )}
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
};
