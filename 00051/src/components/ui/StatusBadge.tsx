import { cn } from '@/lib/utils';

type StatusType = 'idle' | 'in_use' | 'maintenance' | 'disabled' | 'pending' | 'approved' | 'rejected' | 'completed' | 'in_progress' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  children?: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  idle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_use: 'bg-amber-100 text-amber-800 border-amber-200',
  maintenance: 'bg-red-100 text-red-800 border-red-200',
  disabled: 'bg-slate-100 text-slate-600 border-slate-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusLabels: Record<StatusType, string> = {
  idle: '空闲',
  in_use: '使用中',
  maintenance: '维修中',
  disabled: '已禁用',
  pending: '待审批',
  approved: '已批准',
  rejected: '已拒绝',
  completed: '已完成',
  in_progress: '进行中',
  cancelled: '已取消',
};

const StatusBadge = ({ status, children, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-medium border rounded-full',
        statusStyles[status],
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'idle' || status === 'approved' || status === 'completed'
            ? 'bg-emerald-500'
            : status === 'in_use' || status === 'in_progress' || status === 'pending'
            ? 'bg-amber-500 animate-pulse'
            : 'bg-red-500'
        )}
      />
      {children || statusLabels[status]}
    </span>
  );
};

export default StatusBadge;
