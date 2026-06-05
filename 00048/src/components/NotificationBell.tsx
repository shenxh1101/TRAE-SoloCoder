import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertTriangle, Heart, CalendarCheck, Gift } from 'lucide-react';
import { get } from '@/utils/api';

interface Notification {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  NEW_RESCUE_TASK: AlertTriangle,
  TASK_STATUS_UPDATE: CheckCircle,
  ADOPTION_MATCH: Heart,
  FOLLOW_UP_REMINDER: CalendarCheck,
  DONATION_THANKS: Gift,
};

const TYPE_COLOR: Record<string, string> = {
  NEW_RESCUE_TASK: 'text-amber-500',
  TASK_STATUS_UPDATE: 'text-primary-500',
  ADOPTION_MATCH: 'text-pink-500',
  FOLLOW_UP_REMINDER: 'text-blue-500',
  DONATION_THANKS: 'text-success-500',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await get<Notification[]>('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-warm-500 hover:text-primary-500 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-warm-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-100 flex items-center justify-between">
            <span className="font-medium text-warm-800">通知</span>
            {unreadCount > 0 && (
              <span className="text-xs text-primary-500">{unreadCount} 条未读</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-warm-400 text-sm">暂无通知</div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                const color = TYPE_COLOR[n.type] || 'text-warm-400';
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-warm-50 hover:bg-warm-50 transition-colors ${
                      !n.read ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={16} className={`mt-0.5 flex-shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'text-warm-800 font-medium' : 'text-warm-600'}`}>
                          {n.message}
                        </p>
                        <p className="text-xs text-warm-400 mt-1">{n.time}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
