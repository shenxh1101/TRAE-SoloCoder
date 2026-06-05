import { useRef, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import type { Notification } from '@/types';

interface NotificationCenterProps {
  onClose?: () => void;
}

const typeIcons = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
  success: CheckCircle,
};

const typeColors = {
  info: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
  warning: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  danger: 'text-red-400 bg-red-500/20 border-red-500/30',
  success: 'text-green-400 bg-green-500/20 border-green-500/30',
};

export default function NotificationCenter({
  onClose,
}: NotificationCenterProps) {
  const notifications = useAppStore((state) => state.notifications);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);
  const markAllNotificationsAsRead = useAppStore((state) => state.markAllNotificationsAsRead);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleMarkAsRead = (id: string) => {
    markNotificationRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-20 right-4 w-96 max-h-[500px] bg-cyber-panel border border-cyber-border rounded-lg shadow-cyber backdrop-blur-sm z-50 overflow-hidden"
    >
          <div className="flex items-center justify-between p-4 border-b border-cyber-border">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-bold text-cyan-300">通知中心</h4>
              <span className="px-1.5 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {unreadCount} 条未读
              </span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  全部已读
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length > 0 ? (
              <div className="divide-y divide-cyber-border/50">
                {notifications.map((notification) => {
                  const Icon = typeIcons[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 transition-all duration-300 cursor-pointer relative",
                        "hover:bg-cyan-500/5",
                        !notification.read && "bg-cyan-500/5"
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      {!notification.read && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      )}

                      <div className="flex gap-3 pl-4">
                        <div className={cn(
                          "w-10 h-10 rounded flex items-center justify-center shrink-0 border",
                          typeColors[notification.type]
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h5 className={cn(
                              "text-sm font-medium",
                              !notification.read ? "text-cyan-200" : "text-cyan-400"
                            )}>
                              {notification.title}
                            </h5>
                            <span className="text-xs text-cyan-600 shrink-0">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-cyan-500/70 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>

                        {!notification.read && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-cyan-500/50">
                <Info className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">暂无通知</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-cyber-border text-center">
            <button onClick={onClose} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              关闭
            </button>
          </div>

          <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 m-1 rounded" />
    </div>
  );
}
