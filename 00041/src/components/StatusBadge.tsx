import type { OrderStatus } from '@/stores/appStore';

const statusConfig: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: '待接单', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  assigned: { label: '已指派', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  checked_in: { label: '已签到', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  in_service: { label: '服务中', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400' },
  completed: { label: '已完成', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  cancelled: { label: '已取消', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400' },
};

interface StatusBadgeProps {
  status: OrderStatus;
  pulsing?: boolean;
}

export default function StatusBadge({ status, pulsing }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${pulsing ? 'animate-pulse-dot' : ''}`} />
      {config.label}
    </span>
  );
}
