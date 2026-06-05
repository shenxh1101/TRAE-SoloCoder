import React, { useState } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Notification, NotificationType } from '../../shared/types';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Check,
  X,
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const typeFilters: { value: NotificationType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '全部通知' },
  { value: 'PERFORMANCE_ALERT', label: '性能预警' },
  { value: 'CONVERGENCE_ISSUE', label: '收敛问题' },
  { value: 'SIMULATION_COMPLETE', label: '模拟完成' },
  { value: 'SUGGESTION', label: '优化建议' },
  { value: 'INSTABILITY_ALERT', label: '不稳定性告警' },
];

export default function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useSimulationStore();
  const [filter, setFilter] = useState<NotificationType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = notifications.filter((n) => {
    const matchesType = filter === 'ALL' || n.type === filter;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">
            通知中心
          </h2>
          <p className="text-text-secondary mt-1">
            查看所有系统通知和优化建议
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="btn-secondary flex items-center gap-2"
          >
            <CheckCheck size={16} />
            全部标记已读 ({unreadCount})
          </button>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="搜索通知..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background-tertiary/50 border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-tertiary" />
            <Tabs.Root
              value={filter}
              onValueChange={(v) => setFilter(v as NotificationType | 'ALL')}
              className="flex gap-1"
            >
              {typeFilters.map((f) => (
                <Tabs.Trigger
                  key={f.value}
                  value={f.value}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    filter === f.value
                      ? 'bg-primary text-white shadow-glow'
                      : 'bg-background-tertiary text-text-secondary hover:bg-background-secondary hover:text-text-primary'
                  )}
                >
                  {f.label}
                </Tabs.Trigger>
              ))}
            </Tabs.Root>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-tertiary flex items-center justify-center">
              <Bell size={32} className="text-text-muted opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
              暂无通知
            </h3>
            <p className="text-text-tertiary">
              {notifications.length === 0
                ? '系统运行正常，暂无新通知'
                : '没有符合筛选条件的通知'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markNotificationRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => Promise<void>;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkRead }) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = async () => {
    if (!notification.read) {
      await onMarkRead(notification.id);
    }
  };

  return (
    <div
      className={cn(
        'p-4 hover:bg-background-tertiary/30 transition-all relative group cursor-pointer',
        !notification.read && 'bg-primary/5'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {!notification.read && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            notification.read
              ? 'bg-background-tertiary text-text-tertiary'
              : 'bg-primary/20 text-primary'
          )}
        >
          <StatusBadge status={notification.type} size="sm" showIcon={false} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4
                  className={cn(
                    'font-medium truncate',
                    notification.read ? 'text-text-secondary' : 'text-text-primary'
                  )}
                >
                  {notification.title}
                </h4>
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-text-secondary line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-text-tertiary font-mono">
                  {new Date(notification.createdAt).toLocaleString('zh-CN')}
                </span>
                {notification.simulationId && (
                  <Link
                    to={`/simulations/${notification.simulationId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary hover:text-primary-light hover:underline"
                  >
                    查看模拟
                  </Link>
                )}
              </div>
            </div>
            {hovered && (
              <div className="flex items-center gap-1">
                {!notification.read && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onMarkRead(notification.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-background-secondary text-text-tertiary hover:text-accent-green transition-colors"
                    title="标记已读"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg hover:bg-background-secondary text-text-tertiary hover:text-accent-red transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
