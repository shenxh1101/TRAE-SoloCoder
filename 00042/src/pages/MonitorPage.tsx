import { useEffect, useState } from 'react'
import {
  Users,
  UserCheck,
  BedDouble,
  Activity,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import usePatientStore from '@/stores/patientStore'
import useResourceStore from '@/stores/resourceStore'
import { TriageBadge, StatusBadge, RoomHeatBadge } from '@/components/Badges'
import type { Patient, Room } from '@/types'
import { cn } from '@/lib/utils'

const ROOM_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  '抢救室1': { x: 0, y: 0, w: 2, h: 2 },
  '抢救室2': { x: 2, y: 0, w: 2, h: 2 },
  '急诊室1': { x: 4, y: 0, w: 1, h: 1 },
  '急诊室2': { x: 5, y: 0, w: 1, h: 1 },
  '急诊室3': { x: 4, y: 1, w: 1, h: 1 },
  '急诊室4': { x: 5, y: 1, w: 1, h: 1 },
  '普通诊室1': { x: 0, y: 2, w: 2, h: 1 },
  '普通诊室2': { x: 2, y: 2, w: 2, h: 1 },
}

function getWaitTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  return Math.floor(diff / 60000)
}

function getRoomHeatColor(room: Room) {
  const ratio = room.currentLoad / room.capacity
  if (ratio > 0.8) return 'bg-danger-500 text-white'
  if (ratio > 0.5) return 'bg-warning-500 text-white'
  return 'bg-success-500 text-white'
}

export default function MonitorPage() {
  const { patients, fetchPatients, loading } = usePatientStore()
  const { rooms, doctors, equipment, beds, overview, fetchAll } = useResourceStore()
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchAll()
    fetchPatients()
    const interval = setInterval(() => {
      fetchAll()
      fetchPatients()
      setLastUpdate(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchAll, fetchPatients])

  const waitingPatients = patients
    .filter((p) => p.status === 'waiting')
    .sort((a, b) => {
      const levelOrder = { red: 0, yellow: 1, green: 2 }
      return levelOrder[a.triageLevel || 'green'] - levelOrder[b.triageLevel || 'green']
    })

  const roomQueueCount: Record<string, number> = {}
  patients.forEach((p) => {
    if (p.assignedRoomId && p.status === 'waiting') {
      const room = rooms.find((r) => r.id === p.assignedRoomId)
      if (room) roomQueueCount[room.name] = (roomQueueCount[room.name] || 0) + 1
    }
  })

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-dark-700">实时监控面板</h2>
          <span className="text-sm text-dark-400">
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </span>
        </div>
        <button
          onClick={() => {
            fetchAll()
            fetchPatients()
            setLastUpdate(new Date())
          }}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">{overview?.waitingPatients || 0}</div>
            <div className="text-sm text-dark-500">候诊人数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-success-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">{overview?.availableDoctors || 0}/{overview?.totalDoctors || 0}</div>
            <div className="text-sm text-dark-500">在岗医生</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center">
            <BedDouble className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">{overview?.occupiedBeds || 0}/{overview?.totalBeds || 0}</div>
            <div className="text-sm text-dark-500">床位占用</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center">
            <Activity className="w-6 h-6 text-danger-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">{overview?.idleEquipment || 0}/{overview?.totalEquipment || 0}</div>
            <div className="text-sm text-dark-500">空闲设备</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="col-span-2 card p-4 flex flex-col">
          <h3 className="section-title">诊室热力图</h3>
          <div className="flex-1 relative">
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-3 gap-2">
              {rooms.map((room) => {
                const pos = ROOM_LAYOUT[room.name]
                if (!pos) return null
                const queueCount = roomQueueCount[room.name] || 0
                return (
                  <div
                    key={room.id}
                    className={cn(
                      'rounded-xl p-3 flex flex-col items-center justify-center transition-all',
                      getRoomHeatColor(room),
                      room.status === 'maintenance' && 'bg-dark-300'
                    )}
                    style={{
                      gridColumn: `${pos.x + 1} / span ${pos.w}`,
                      gridRow: `${pos.y + 1} / span ${pos.h}`,
                    }}
                  >
                    <div className="font-semibold text-sm">{room.name}</div>
                    <div className="text-xs opacity-90 mt-1">
                      {room.currentLoad}/{room.capacity} 人
                    </div>
                    {queueCount > 0 && (
                      <div className="mt-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        排队 {queueCount}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-dark-100">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success-500" />
              <span className="text-sm text-dark-600">空闲 (≤50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-warning-500" />
              <span className="text-sm text-dark-600">忙碌 (50-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-danger-500" />
              <span className="text-sm text-dark-600">满载 (≥80%)</span>
            </div>
          </div>
        </div>

        <div className="card p-4 flex flex-col">
          <h3 className="section-title flex items-center justify-between">
            候诊队列
            <span className="text-xs font-normal text-dark-400">共 {waitingPatients.length} 人</span>
          </h3>
          <div className="flex-1 overflow-y-auto scrollbar-thin -mx-4 px-4 space-y-2">
            {waitingPatients.length === 0 ? (
              <div className="text-center text-dark-400 py-8">暂无候诊患者</div>
            ) : (
              waitingPatients.map((patient) => {
                const waitMinutes = getWaitTime(patient.createdAt)
                const isTimeout = waitMinutes > 30
                return (
                  <div
                    key={patient.id}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      isTimeout
                        ? 'border-danger-300 bg-danger-50 animate-pulse-red'
                        : 'border-dark-100 bg-dark-50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-dark-700">{patient.name}</span>
                          <TriageBadge level={patient.triageLevel} />
                        </div>
                        <div className="text-sm text-dark-500 mt-1 line-clamp-1">
                          {patient.chiefComplaint}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            'text-sm font-mono font-semibold',
                            isTimeout ? 'text-danger-600' : 'text-dark-600'
                          )}
                        >
                          {waitMinutes} 分
                        </div>
                        {isTimeout && (
                          <div className="flex items-center gap-1 text-xs text-danger-600 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            已超时
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="section-title">医生状态</h3>
        <div className="grid grid-cols-4 gap-3">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className={cn(
                'p-3 rounded-xl border',
                doctor.status === 'available' && 'border-success-200 bg-success-50',
                doctor.status === 'busy' && 'border-warning-200 bg-warning-50',
                doctor.status === 'off' && 'border-dark-200 bg-dark-50 opacity-60'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                  <UserCheck className="w-5 h-5 text-dark-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-dark-700 text-sm">{doctor.name}</div>
                  <div className="text-xs text-dark-500">
                    {doctor.title} · {doctor.specialty}
                  </div>
                </div>
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    doctor.status === 'available' && 'bg-success-500',
                    doctor.status === 'busy' && 'bg-warning-500',
                    doctor.status === 'off' && 'bg-dark-300'
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
