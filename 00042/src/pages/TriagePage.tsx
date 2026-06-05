import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserPlus,
  Thermometer,
  HeartPulse,
  Wind,
  Droplets,
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Edit3,
  FileText,
} from 'lucide-react'
import usePatientStore from '@/stores/patientStore'
import useResourceStore from '@/stores/resourceStore'
import { TriageBadge } from '@/components/Badges'
import type { TriageResult } from '@/types'

const steps = [
  { id: 1, title: '基本信息', icon: UserPlus },
  { id: 2, title: '生命体征', icon: Activity },
  { id: 3, title: '主诉与过敏史', icon: FileText },
  { id: 4, title: '分诊结果', icon: CheckCircle2 },
]

export default function TriagePage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    idCard: '',
    temperature: '',
    heartRate: '',
    respiratoryRate: '',
    systolicBP: '',
    diastolicBP: '',
    bloodOxygen: '',
    chiefComplaint: '',
    allergyHistory: '',
  })
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustReason, setAdjustReason] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [newPatientId, setNewPatientId] = useState('')
  
  const { createPatient, adjustAssignment, loading, error } = usePatientStore()
  const { rooms, doctors, fetchAll } = useResourceStore()
  
  const navigate = useNavigate()
  
  useEffect(() => {
    fetchAll()
  }, [fetchAll])
  
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }
  
  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.name && formData.idCard
      case 2: return true
      case 3: return formData.chiefComplaint
      default: return true
    }
  }
  
  const handleSubmit = async () => {
    const result = await createPatient({
      name: formData.name,
      idCard: formData.idCard,
      chiefComplaint: formData.chiefComplaint,
      temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
      respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : null,
      systolicBP: formData.systolicBP ? parseInt(formData.systolicBP) : null,
      diastolicBP: formData.diastolicBP ? parseInt(formData.diastolicBP) : null,
      bloodOxygen: formData.bloodOxygen ? parseInt(formData.bloodOxygen) : null,
      allergyHistory: formData.allergyHistory,
    })
    
    if (result) {
      setTriageResult(result.triageResult)
      setNewPatientId(result.patient.id)
      setSelectedRoomId(result.triageResult.roomId)
      setSelectedDoctorId(result.triageResult.doctorId)
      setCurrentStep(4)
    }
  }
  
  const handleAdjust = async () => {
    if (!newPatientId || !selectedRoomId || !selectedDoctorId || !adjustReason) return
    
    const success = await adjustAssignment(newPatientId, {
      roomId: selectedRoomId,
      doctorId: selectedDoctorId,
      reason: adjustReason,
    })
    
    if (success) {
      setShowAdjustModal(false)
      alert('调整申请已提交，等待急诊主任确认')
    }
  }
  
  const resetForm = () => {
    setFormData({
      name: '',
      idCard: '',
      temperature: '',
      heartRate: '',
      respiratoryRate: '',
      systolicBP: '',
      diastolicBP: '',
      bloodOxygen: '',
      chiefComplaint: '',
      allergyHistory: '',
    })
    setTriageResult(null)
    setNewPatientId('')
    setCurrentStep(1)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-dark-700">患者分诊登记</h2>
          <p className="text-sm text-dark-500 mt-1">录入患者信息，系统自动进行智能分诊</p>
        </div>
        <button onClick={() => navigate('/monitor')} className="btn-secondary">
          查看实时监控
        </button>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentStep > step.id
                    ? 'bg-success-100 text-success-700'
                    : currentStep === step.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-dark-50 text-dark-400'
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
                <span className="font-medium text-sm">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-dark-300 mx-2" />
              )}
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="section-title">患者基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <UserPlus className="w-4 h-4 inline mr-1" />
                  患者姓名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="请输入患者姓名"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  身份证号 *
                </label>
                <input
                  type="text"
                  value={formData.idCard}
                  onChange={(e) => updateField('idCard', e.target.value)}
                  placeholder="请输入身份证号"
                  className="input-field"
                  maxLength={18}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="section-title">生命体征指标</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <Thermometer className="w-4 h-4 inline mr-1" />
                  体温 (℃)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => updateField('temperature', e.target.value)}
                  placeholder="正常: 36.5-37.5"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <HeartPulse className="w-4 h-4 inline mr-1" />
                  心率 (次/分)
                </label>
                <input
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => updateField('heartRate', e.target.value)}
                  placeholder="正常: 60-100"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <Wind className="w-4 h-4 inline mr-1" />
                  呼吸频率 (次/分)
                </label>
                <input
                  type="number"
                  value={formData.respiratoryRate}
                  onChange={(e) => updateField('respiratoryRate', e.target.value)}
                  placeholder="正常: 12-20"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <Droplets className="w-4 h-4 inline mr-1" />
                  收缩压 (mmHg)
                </label>
                <input
                  type="number"
                  value={formData.systolicBP}
                  onChange={(e) => updateField('systolicBP', e.target.value)}
                  placeholder="正常: 90-140"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <Droplets className="w-4 h-4 inline mr-1" />
                  舒张压 (mmHg)
                </label>
                <input
                  type="number"
                  value={formData.diastolicBP}
                  onChange={(e) => updateField('diastolicBP', e.target.value)}
                  placeholder="正常: 60-90"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">
                  <Activity className="w-4 h-4 inline mr-1" />
                  血氧饱和度 (%)
                </label>
                <input
                  type="number"
                  value={formData.bloodOxygen}
                  onChange={(e) => updateField('bloodOxygen', e.target.value)}
                  placeholder="正常: 95-100"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="section-title">主诉与过敏史</h3>
            <div>
              <label className="block text-sm font-medium text-dark-600 mb-1">
                <AlertCircle className="w-4 h-4 inline mr-1 text-warning-500" />
                主要症状 *
              </label>
              <textarea
                value={formData.chiefComplaint}
                onChange={(e) => updateField('chiefComplaint', e.target.value)}
                placeholder="请描述患者主要症状，系统将根据关键词自动判断危重等级..."
                rows={4}
                className="input-field resize-none"
              />
              <div className="flex gap-2 mt-2">
                {['胸痛', '呼吸困难', '意识障碍', '骨折', '高热', '腹痛', '外伤'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => updateField('chiefComplaint', formData.chiefComplaint + (formData.chiefComplaint ? ' ' : '') + kw)}
                    className="px-3 py-1 text-xs bg-dark-100 text-dark-600 rounded-full hover:bg-primary-100 hover:text-primary-600 transition-colors"
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-600 mb-1">
                <AlertCircle className="w-4 h-4 inline mr-1 text-danger-500" />
                过敏史
              </label>
              <textarea
                value={formData.allergyHistory}
                onChange={(e) => updateField('allergyHistory', e.target.value)}
                placeholder="如有药物或食物过敏史，请填写..."
                rows={2}
                className="input-field resize-none"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && triageResult && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-500" />
                <span className="text-lg font-semibold text-dark-700">分诊完成</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-dark-600">危重等级：</span>
                <TriageBadge level={triageResult.level} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-50 rounded-xl p-4">
                <div className="text-sm text-dark-500 mb-2">分配诊室</div>
                <div className="text-xl font-bold text-dark-700">{triageResult.roomName}</div>
              </div>
              <div className="bg-dark-50 rounded-xl p-4">
                <div className="text-sm text-dark-500 mb-2">主治医生</div>
                <div className="text-xl font-bold text-dark-700">{triageResult.doctorName}</div>
              </div>
            </div>
            
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <div className="text-sm font-medium text-primary-700 mb-1">分诊依据</div>
              <div className="text-sm text-primary-600">{triageResult.reasoning}</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-dark-100">
          {currentStep > 1 && currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="btn-secondary"
            >
              上一步
            </button>
          ) : (
            <div />
          )}
          
          {currentStep < 3 && (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
            </button>
          )}
          
          {currentStep === 3 && (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  分诊中...
                </>
              ) : (
                '开始智能分诊'
              )}
            </button>
          )}
          
          {currentStep === 4 && (
            <div className="flex gap-3 ml-auto">
              <button
                onClick={() => setShowAdjustModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                调整分配
              </button>
              <button onClick={resetForm} className="btn-primary">
                完成，继续下一位
              </button>
            </div>
          )}
        </div>
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-dark-700 mb-4">调整分配申请</h3>
            <p className="text-sm text-dark-500 mb-4">调整分配需要急诊主任确认后生效</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">选择诊室</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="select-field"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id} disabled={room.status === 'maintenance'}>
                      {room.name} ({room.currentLoad}/{room.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">选择医生</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="select-field"
                >
                  {doctors.filter((d) => d.status !== 'off').map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.title}（{doctor.specialty}）
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">调整原因 *</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="请说明调整原因..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustReason}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
