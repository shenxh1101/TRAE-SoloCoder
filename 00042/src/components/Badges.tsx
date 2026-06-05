import { cn } from '@/lib/utils'
import type { TriageLevel, PatientStatus, AlertLevel, UserRole } from '@/types'

export function TriageBadge({ level }: { level: TriageLevel | null | undefined }) {
  if (!level) return <span className="text-dark-400 text-xs">未分级</span>
  
  const config = {
    red: { className: 'badge-red', label: '危重' },
    yellow: { className: 'badge-yellow', label: '急症' },
    green: { className: 'badge-green', label: '非急症' },
  }
  
  return <span className={config[level].className}>{config[level].label}</span>
}

export function StatusBadge({ status }: { status: PatientStatus }) {
  const config: Record<PatientStatus, { className: string; label: string }> = {
    waiting: { className: 'badge-yellow', label: '候诊中' },
    treating: { className: 'badge-red', label: '诊治中' },
    examining: { className: 'badge-yellow', label: '检查中' },
    observation: { className: 'badge-green', label: '留观中' },
    transfer: { className: 'badge-yellow', label: '转院' },
    discharged: { className: 'badge-green', label: '已离院' },
  }
  
  return <span className={config[status].className}>{config[status].label}</span>
}

export function AlertBadge({ level }: { level: AlertLevel }) {
  const config: Record<AlertLevel, { className: string; label: string }> = {
    warning: { className: 'badge-yellow', label: '警告' },
    urgent: { className: 'badge-yellow', label: '紧急' },
    critical: { className: 'badge-red', label: '危急' },
  }
  
  return <span className={config[level].className}>{config[level].label}</span>
}

export function RoleBadge({ role }: { role: UserRole }) {
  const config = {
    nurse: { className: 'bg-primary-100 text-primary-700 border-primary-200', label: '护士' },
    doctor: { className: 'bg-success-100 text-success-700 border-success-200', label: '医生' },
    director: { className: 'bg-danger-100 text-danger-700 border-danger-200', label: '主任' },
    cashier: { className: 'bg-warning-100 text-warning-700 border-warning-200', label: '收费员' },
    admin: { className: 'bg-dark-100 text-dark-700 border-dark-200', label: '管理员' },
  }
  
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', config[role].className)}>
      {config[role].label}
    </span>
  )
}

export function RoomHeatBadge({ status, load, capacity }: { status: string; load: number; capacity: number }) {
  const ratio = load / capacity
  let heatColor = 'bg-success-400'
  if (ratio > 0.8) heatColor = 'bg-danger-400'
  else if (ratio > 0.5) heatColor = 'bg-warning-400'
  
  return <div className={cn('w-3 h-3 rounded-full', heatColor)} />
}
