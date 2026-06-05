import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSimulationStore } from '../../store/useSimulationStore';
import { StatusBadge } from './StatusBadge';
import { Link } from 'react-router-dom';

export const NotificationDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { notifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } =
    useSimulationStore();
  const unreadCount = getUnreadNotificationCount();
  const containerRef = useRef<HTMLDivElement>(null);

  const recentNotifications = notifications.slice(0, 5);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef}>
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="relative p-2.5 rounded-xl hover:bg-background-tertiary transition-colors group">
            <Bell
              size={20}
              className={`text-text-secondary group-hover:text-text-primary transition-colors ${unreadCount > 0 ? 'animate-pulse' : ''}`}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="w-96 bg-background-card border border-border rounded-2xl shadow-xl backdrop-blur-xl z-50 overflow-hidden animate-slide-down"
            align="end"
            sideOffset={8}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-text-primary">通知中心</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsRead()}
                  className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={14} />
                  全部已读
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="mx-auto text-text-muted mb-2 opacity-50" />
                  <p className="text-text-tertiary text-sm">暂无通知</p>
                </div>
              ) : (
                recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-border/50 hover:bg-background-tertiary/50 transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <StatusBadge status={notification.type} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-text-primary line-clamp-1">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-text-tertiary mt-2 font-mono">
                          {new Date(notification.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border">
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="block w-full text-center py-2 text-sm text-primary hover:text-primary-light hover:bg-background-tertiary/50 rounded-xl transition-colors"
              >
                查看全部通知
              </Link>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
};
