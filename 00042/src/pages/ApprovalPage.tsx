import { useEffect, useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Stethoscope,
  Home,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import usePatientStore from '@/stores/patientStore'
import useAuthStore from '@/stores/authStore'
import { TriageBadge } from '@/components/Badges'
import { cn } from '@/lib/utils'
import type { Adjustment } from '@/types'

export default function ApprovalPage() {
  const { pendingAdjustments, fetchPendingAdjustments, approveAdjustment, loading } = usePatientStore()
  const { user } = useAuthStore()
  const [selectedAdjustment, setSelectedAdjustment] = useState<Adjustment | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingAdjustments()
    const interval = setInterval(fetchPendingAdjustments, 15000)
    return () => clearInterval(interval)
  }, [fetchPendingAdjustments])

  const handleApprove = async (adjustment: Adjustment) => {
    setActionLoading(adjustment.id)
    const success = await approveAdjustment(
      adjustment.patientId,
      adjustment.id,
      true,
      user?.id
    )
    if (success) {
      setSelectedAdjustment(null)
      fetchPendingAdjustments()
    }
    setActionLoading(null)
  }

  const handleReject = async (adjustment: Adjustment) => {
    setActionLoading(adjustment.id)
    const success = await approveAdjustment(
      adjustment.patientId,
      adjustment.id,
      false,
      user?.id
    )
    if (success) {
      setSelectedAdjustment(null)
      fetchPendingAdjustments()
    }
    setActionLoading(null)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-dark-700">分诊调整审批</h2>
          {pendingAdjustments.length > 0 && (
            <span className="px-3 py-1 bg-danger-100 text-danger-600 rounded-full text-sm font-medium">
              {pendingAdjustments.length} 条待审批
            </span>
          )}
        </div>
        <button
          onClick={fetchPendingAdjustments}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          刷新
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4 flex-1 min-h-0">
        <div className="col-span-2 card p-4 flex flex-col overflow-hidden">
          <h3 className="section-title">待审批列表</h3>
          <div className="flex-1 overflow-y-auto scrollbar-thin -mx-4 px-4 space-y-3">
            {pendingAdjustments.length === 0 ? (
              <div className="text-center text-dark-400 py-12">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success-400" />
                <p>暂无待审批的调整申请</p>
              </div>
            ) : (
              pendingAdjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  onClick={() => setSelectedAdjustment(adjustment)}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all',
                    selectedAdjustment?.id === adjustment.id
                      ? 'border-primary-400 bg-primary-50 shadow-md'
                      : 'border-dark-100 bg-white hover:border-primary-200 hover:bg-dark-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-dark-400" />
                        <span className="font-semibold text-dark-700">{adjustment.patientName}</span>
                        <TriageBadge level="yellow" />
                      </div>
                      <div className="text-sm text-dark-500 mt-2 line-clamp-2">
                        {adjustment.reason}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-dark-400 mt-3">
                        <Clock className="w-3 h-3" />
                        {new Date(adjustment.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-3 card p-4 flex flex-col">
          <h3 className="section-title">调整详情</h3>
          {selectedAdjustment ? (
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="space-y-6">
                <div className="p-4 bg-dark-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-dark-700">
                        {selectedAdjustment.patientName}
                      </div>
                      <div className="text-sm text-dark-500">
                        申请时间: {new Date(selectedAdjustment.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-warning-800">调整原因</div>
                        <div className="text-sm text-warning-700 mt-1">
                          {selectedAdjustment.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-danger-200 bg-danger-50 rounded-xl">
                    <div className="text-sm text-danger-600 font-medium mb-2">当前分配</div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-danger-500" />
                        <div>
                          <div className="text-xs text-dark-500">诊室</div>
                          <div className="font-medium text-dark-700">
                            {selectedAdjustment.originalRoomName || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-danger-500" />
                        <div>
                          <div className="text-xs text-dark-500">医生</div>
                          <div className="font-medium text-dark-700">
                            {selectedAdjustment.originalDoctorName || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-success-200 bg-success-50 rounded-xl">
                    <div className="text-sm text-success-600 font-medium mb-2">申请调整为</div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-success-500" />
                        <div>
                          <div className="text-xs text-dark-500">诊室</div>
                          <div className="font-medium text-dark-700">
                            {selectedAdjustment.newRoomName || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-success-500" />
                        <div>
                          <div className="text-xs text-dark-500">医生</div>
                          <div className="font-medium text-dark-700">
                            {selectedAdjustment.newDoctorName || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4 border-t border-dark-100">
                  <button
                    onClick={() => handleReject(selectedAdjustment)}
                    disabled={actionLoading === selectedAdjustment.id}
                    className="btn-danger flex items-center gap-2 px-8 disabled:opacity-50"
                  >
                    {actionLoading === selectedAdjustment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    驳回申请
                  </button>
                  <button
                    onClick={() => handleApprove(selectedAdjustment)}
                    disabled={actionLoading === selectedAdjustment.id}
                    className="btn-success flex items-center gap-2 px-8 disabled:opacity-50"
                  >
                    {actionLoading === selectedAdjustment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    同意调整
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-dark-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-dark-300" />
                <p>请从左侧选择一条待审批记录</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
