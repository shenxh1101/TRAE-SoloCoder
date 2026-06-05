import { useEffect, useState } from 'react'
import {
  CreditCard,
  FileText,
  Search,
  Receipt,
  Download,
  Filter,
} from 'lucide-react'
import usePatientStore from '@/stores/patientStore'
import { useBillingStore } from '@/stores/observationStore'
import { StatusBadge } from '@/components/Badges'
import { cn } from '@/lib/utils'
import type { BillingCategory, PaymentMethod } from '@/types'

function getCategoryLabel(category: BillingCategory) {
  const labels = {
    drug: '药品',
    examination: '检查',
    observation: '留观',
    other: '其他',
  }
  return labels[category]
}

function getPaymentLabel(method: string) {
  const labels: Record<string, string> = {
    cash: '现金',
    insurance: '医保',
    credit_card: '信用卡',
  }
  return labels[method] || method
}

export default function BillingPage() {
  const { patients, fetchPatients } = usePatientStore()
  const { summary, fetchBilling, settleBilling, billingItems, loading } = useBillingStore()
  
  const [searchText, setSearchText] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [insuranceCovered, setInsuranceCovered] = useState(0)
  
  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])
  
  useEffect(() => {
    if (selectedPatientId) {
      fetchBilling(selectedPatientId)
    }
  }, [selectedPatientId, fetchBilling])
  
  const filteredPatients = patients.filter(
    (p) =>
      p.name.includes(searchText) ||
      p.idCard.includes(searchText)
  )
  
  const unsettledPatients = filteredPatients.filter((p) => p.status !== 'discharged')
  
  const handleSettle = async () => {
    if (!selectedPatientId) return
    const success = await settleBilling(selectedPatientId, paymentMethod, paymentMethod === 'insurance' ? insuranceCovered : 0)
    if (success) {
      setShowSettleModal(false)
      alert('结算成功！发票已生成')
      fetchPatients()
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dark-700">费用结算中心</h2>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-80 card p-4 flex flex-col flex-shrink-0">
          <h3 className="section-title">待结算患者</h3>
          
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索患者姓名或身份证..."
              className="input-field pl-9"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin -mx-4 px-4 space-y-2">
            {unsettledPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatientId(patient.id)}
                className={cn(
                  'p-3 rounded-xl border cursor-pointer transition-all',
                  selectedPatientId === patient.id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-dark-100 hover:border-primary-200 hover:bg-dark-50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-dark-700">{patient.name}</span>
                  <StatusBadge status={patient.status} />
                </div>
                <div className="text-xs text-dark-500 truncate">
                  {patient.idCard}
                </div>
              </div>
            ))}
            {unsettledPatients.length === 0 && (
              <div className="text-center text-dark-400 py-8">暂无待结算患者</div>
            )}
          </div>
        </div>

        <div className="flex-1 card p-4 flex flex-col">
          {selectedPatientId ? (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-dark-100">
                <div>
                  <h3 className="text-lg font-bold text-dark-700">
                    {patients.find((p) => p.id === selectedPatientId)?.name}
                  </h3>
                  <p className="text-sm text-dark-500 mt-1">费用明细</p>
                </div>
                <button
                  onClick={() => setShowSettleModal(true)}
                  disabled={!summary || summary.hasSettled}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-4 h-4" />
                  {summary?.hasSettled ? '已结算' : '立即结算'}
                </button>
              </div>

              {summary ? (
                <div className="flex-1 overflow-y-auto scrollbar-thin pt-4">
                  <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-6">
                    <div className="text-primary-100 text-sm mb-1">费用总计</div>
                    <div className="text-4xl font-bold">¥{summary.totalAmount.toFixed(2)}</div>
                    <div className="flex items-center gap-4 mt-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Receipt className="w-4 h-4" />
                        {summary.items.length} 项收费
                      </span>
                      {summary.hasSettled && (
                        <span className="flex items-center gap-1 text-success-300">
                          ✓ 已结算
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {summary.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-dark-100"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              item.category === 'drug' && 'bg-primary-100',
                              item.category === 'examination' && 'bg-success-100',
                              item.category === 'observation' && 'bg-warning-100',
                              item.category === 'other' && 'bg-dark-100'
                            )}
                          >
                            {item.category === 'drug' && (
                              <span className="text-primary-600 font-bold text-xs">药</span>
                            )}
                            {item.category === 'examination' && (
                              <span className="text-success-600 font-bold text-xs">检</span>
                            )}
                            {item.category === 'observation' && (
                              <span className="text-warning-600 font-bold text-xs">留</span>
                            )}
                            {item.category === 'other' && (
                              <span className="text-dark-600 font-bold text-xs">其</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-dark-700">{item.name}</div>
                            <div className="text-xs text-dark-400">
                              {getCategoryLabel(item.category)}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-dark-700">
                          ¥{item.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {summary.settlement && (
                    <div className="mt-6 p-4 bg-success-50 border border-success-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-5 h-5 text-success-600" />
                        <span className="font-medium text-success-700">结算信息</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-success-600">支付方式：{getPaymentLabel(summary.settlement.paymentMethod)}</div>
                        <div className="text-success-600">发票号：{summary.settlement.invoiceNumber}</div>
                        <div className="text-success-600">医保报销：¥{summary.settlement.insuranceCovered.toFixed(2)}</div>
                        <div className="text-success-600">自付：¥{summary.settlement.selfPaid.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-dark-400">加载费用信息中...</div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Receipt className="w-16 h-16 text-dark-200 mx-auto mb-4" />
                <p className="text-dark-400">请从左侧选择患者</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSettleModal && summary && (
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
                      {getPaymentLabel(method)}
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
                    <span className="font-bold text-primary-700">
                      ¥{(summary.totalAmount - insuranceCovered).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettleModal(false)}
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
