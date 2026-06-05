import { useEffect, useState } from 'react'
import {
  BedDouble,
  Clock,
  CreditCard,
  FileText,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import { useObservationStore, useBillingStore } from '@/stores/observationStore'
import usePatientStore from '@/stores/patientStore'
import useResourceStore from '@/stores/resourceStore'
import { StatusBadge } from '@/components/Badges'
import { cn } from '@/lib/utils'
import type { BillingCategory, PaymentMethod } from '@/types'

function formatHours(hours: number) {
  if (hours < 1) return `${Math.floor(hours * 60)}分钟`
  if (hours < 24) return `${Math.floor(hours)}小时`
  return `${Math.floor(hours / 24)}天${Math.floor(hours % 24)}小时`
}

function getCategoryLabel(category: BillingCategory) {
  const labels = {
    drug: '药品',
    examination: '检查',
    observation: '留观',
    other: '其他',
  }
  return labels[category]
}

export default function ObservationPage() {
  const { observations, fetchObservations, startObservation, endObservation, loading } = useObservationStore()
  const { summary, fetchBilling, settleBilling } = useBillingStore()
  const { patients, fetchPatients } = usePatientStore()
  const { beds, fetchBeds } = useResourceStore()
  
  const [selectedObsId, setSelectedObsId] = useState<string | null>(null)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedBedId, setSelectedBedId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [insuranceCovered, setInsuranceCovered] = useState(0)
  
  useEffect(() => {
    fetchObservations()
    fetchPatients()
    fetchBeds()
  }, [fetchObservations, fetchPatients, fetchBeds])
  
  useEffect(() => {
    if (selectedObsId) {
      const obs = observations.find((o) => o.id === selectedObsId)
      if (obs) fetchBilling(obs.patientId)
    }
  }, [selectedObsId, fetchBilling, observations])
  
  const activeObs = observations.filter((o) => !o.endedAt).map((obs) => {
    const hours = (Date.now() - new Date(obs.startedAt).getTime()) / 3600000
    return { ...obs, observationHours: hours }
  })
  
  const treatablePatients = patients.filter(
    (p) => p.status === 'treating' || p.status === 'examining'
  )
  
  const emptyBeds = beds.filter((b) => b.status === 'empty')
  
  const handleStartObs = async () => {
    if (!selectedPatientId || !selectedBedId) return
    const success = await startObservation(selectedPatientId, selectedBedId)
    if (success) {
      setShowStartModal(false)
      setSelectedPatientId('')
      setSelectedBedId('')
      fetchObservations()
      fetchBeds()
    }
  }
  
  const handleEndObs = async (id: string) => {
    await endObservation(id)
    fetchObservations()
    fetchBeds()
    if (selectedObsId === id) setSelectedObsId(null)
  }
  
  const handleSettle = async () => {
    const obs = observations.find((o) => o.id === selectedObsId)
    if (!obs) return
    const success = await settleBilling(obs.patientId, paymentMethod, paymentMethod === 'insurance' ? insuranceCovered : 0)
    if (success) {
      setShowBillingModal(false)
      setInsuranceCovered(0)
      alert('结算成功！发票已生成')
    }
  }

  return (
    <div className="h-full flex gap-4">
      <div className="w-96 card p-4 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">留观患者</h3>
          <button
            onClick={() => setShowStartModal(true)}
            className="btn-primary text-sm py-1.5 px-3"
          >
            新入留观
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-thin -mx-4 px-4 space-y-2">
          {activeObs.map((obs) => {
            const patient = patients.find((p) => p.id === obs.patientId)
            const bed = beds.find((b) => b.id === obs.bedId)
            const isOver24h = (obs.observationHours || 0) > 24
            return (
              <div
                key={obs.id}
                onClick={() => setSelectedObsId(obs.id)}
                className={cn(
                  'p-3 rounded-xl border cursor-pointer transition-all',
                  selectedObsId === obs.id
                    ? 'border-primary-400 bg-primary-50'
                    : isOver24h
                    ? 'border-warning-300 bg-warning-50'
                    : 'border-dark-100 hover:border-primary-200 hover:bg-dark-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-dark-700">{patient?.name || '-'}</span>
                  {isOver24h && (
                    <span className="flex items-center gap-1 text-xs text-warning-600">
                      <AlertCircle className="w-3 h-3" />
                      超24小时
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-dark-500">
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-4 h-4" />
                    {bed?.number || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatHours(obs.observationHours || 0)}
                  </span>
                </div>
              </div>
            )
          })}
          {activeObs.length === 0 && (
            <div className="text-center text-dark-400 py-8">暂无留观患者</div>
          )}
        </div>
      </div>

      <div className="flex-1 card p-4 flex flex-col">
        {selectedObsId ? (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-dark-100">
              <div>
                <h3 className="text-lg font-bold text-dark-700">费用明细</h3>
                <p className="text-sm text-dark-500 mt-1">
                  留观时长: {formatHours(
                    observations.find((o) => o.id === selectedObsId)?.observationHours || 0
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEndObs(selectedObsId)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  结束留观
                </button>
                <button
                  onClick={() => setShowBillingModal(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  费用结算
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pt-4">
              {summary ? (
                <div>
                  <div className="bg-dark-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-dark-600">费用总计</span>
                      <span className="text-2xl font-bold text-primary-600">
                        ¥{summary.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-dark-500">
                      共 {summary.items.length} 项收费
                    </div>
                  </div>

                  <div className="space-y-2">
                    {summary.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-dark-100"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              item.category === 'drug' && 'bg-primary-500',
                              item.category === 'examination' && 'bg-success-500',
                              item.category === 'observation' && 'bg-warning-500',
                              item.category === 'other' && 'bg-dark-400'
                            )}
                          />
                          <div>
                            <div className="font-medium text-dark-700">{item.name}</div>
                            <div className="text-xs text-dark-400">{getCategoryLabel(item.category)}</div>
                          </div>
                        </div>
                        <div className="font-semibold text-dark-700">¥{item.amount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <div className="text-dark-400">加载费用信息中...</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-dark-200 mx-auto mb-4" />
              <p className="text-dark-400">请从左侧选择留观患者</p>
            </div>
          </div>
        )}
      </div>

      {showStartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-dark-700 mb-4">新入留观</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">选择患者</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="select-field"
                >
                  <option value="">请选择</option>
                  {treatablePatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.chiefComplaint}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">选择床位</label>
                <select
                  value={selectedBedId}
                  onChange={(e) => setSelectedBedId(e.target.value)}
                  className="select-field"
                >
                  <option value="">请选择</option>
                  {emptyBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      床位 {b.number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleStartObs}
                disabled={!selectedPatientId || !selectedBedId}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                确认入观
              </button>
            </div>
          </div>
        </div>
      )}

      {showBillingModal && summary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold text-dark-700 mb-4">费用结算</h3>
            
            <div className="bg-dark-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-dark-600">应付金额</span>
                <span className="text-3xl font-bold text-danger-600">
                  ¥{summary.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-2">支付方式</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'insurance', 'credit_card'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        'py-3 px-2 rounded-xl text-sm font-medium transition-colors border',
                        paymentMethod === method
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-dark-600 border-dark-200 hover:border-primary-300'
                      )}
                    >
                      {method === 'cash' && '现金'}
                      {method === 'insurance' && '医保'}
                      {method === 'credit_card' && '信用卡'}
                    </button>
                  ))}
                </div>
              </div>
              
              {paymentMethod === 'insurance' && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-700">医保报销金额</span>
                    <input
                      type="number"
                      min="0"
                      max={summary.totalAmount}
                      step="0.01"
                      value={insuranceCovered}
                      onChange={(e) => setInsuranceCovered(Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-primary-300 rounded text-right text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-primary-700">自付金额</span>
                    <span className="font-medium text-primary-700">
                      ¥{(summary.totalAmount - insuranceCovered).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBillingModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSettle}
                className="flex-1 btn-primary"
              >
                确认结算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
