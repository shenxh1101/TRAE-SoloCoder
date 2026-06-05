import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

export type AlertSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface Alert {
  type: string;
  message: string;
  severity: AlertSeverity;
}

export interface TopBarProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  info: 'text-cyan-glow',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
};

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const w = weekdays[date.getDay()];
  return `${y}-${m}-${d} 周${w}`;
}

export default function TopBar({ alerts, onAlertClick }: TopBarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-dark-border bg-dark-card">
      <div className="flex-1 overflow-hidden">
        {alerts.length > 0 ? (
          <div
            className="flex cursor-pointer items-center px-4"
            onClick={() => alerts.length > 0 && onAlertClick(alerts[0])}
          >
            <div className="animate-marquee flex items-center gap-6 whitespace-nowrap">
              {alerts.map((alert, idx) => (
                <span
                  key={idx}
                  className={`flex items-center gap-1.5 text-xs ${SEVERITY_STYLES[alert.severity]}`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {alert.message}
                </span>
              ))}
              {alerts.map((alert, idx) => (
                <span
                  key={`dup-${idx}`}
                  className={`flex items-center gap-1.5 text-xs ${SEVERITY_STYLES[alert.severity]}`}
                  aria-hidden
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                  {alert.message}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="px-4 text-xs text-primary-light/40">暂无告警信息</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 border-l border-dark-border pl-4 pr-5">
        <span className="text-xs text-primary-light/60">{formatDate(now)}</span>
        <span className="font-mono text-sm text-cyan-glow">{formatTime(now)}</span>

        <div className="relative">
          <Bell className="h-[18px] w-[18px] text-primary-light/60" />
          {alerts.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {alerts.length > 99 ? '99+' : alerts.length}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
