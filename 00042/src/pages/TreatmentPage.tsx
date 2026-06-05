import { useEffect, useState } from 'react'
import {
  Stethoscope,
  FileText,
  Activity,
  Pill,
  AlertTriangle,
  Check,
  Play,
  Bed,
  ArrowRight,
} from 'lucide-react'
import usePatientStore from '@/stores/patientStore'
import useExaminationStore from '@/stores/examinationStore'
import useResourceStore from '@/stores/resourceStore'
import { TriageBadge, StatusBadge } from '@/components/Badges'
import { cn } from '@/lib/utils'
import type { Patient } from '@/types'

export default function TreatmentPage() {
  const { patients, fetchPatients, updatePatientStatus } = usePatientStore()
  const { examinations, fetchExaminations, createExamination, submitResult } = useExaminationStore()
  const { doctors, fetchDoctors } = useResourceStore()
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showExamModal, setShowExamModal] = useState(false)
  const [examType, setExamType] = useState('lab')
  const [examName, setExamName] = useState('')
  const [examResult, setExamResult] = useState('')
  const [examValue, setExamValue] = useState('')
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  
  useEffect(() => {
    fetchPatients()
    fetchExaminations()
    fetchDoctors()
  }, [fetchPatients, fetchExaminations, fetchDoctors])
  
  const activePatients = patients.filter(
    (p) => ['treating', 'examining', 'waiting'].includes(p.status)
  ).sort((a, b) => {
    const levelOrder = { red: 0, yellow: 1, green: 2 }
    return levelOrder[a.triageLevel || 'green'] - levelOrder[b.triageLevel || 'green']
  })
  
  const patientExams = examinations.filter((e) => e.patientId === selectedPatient?.id)
  
  const handleStartTreatment = async (patientId: string) => {
    await updatePatientStatus(patientId, 'treating')
    fetchPatients()
  }
  
  const handleStartExam = async (patientId: string) => {
    await updatePatientStatus(patientId, 'examining')
    fetchPatients()
  }
  
  const handleStartObservation = async (patientId: string) => {
    await updatePatientStatus(patientId, 'observation')
    fetchPatients()
  }
  
  const handleDischarge = async (patientId: string) => {
    await updatePatientStatus(patientId, 'discharged')
    fetchPatients()
    setSelectedPatient(null)
  }
  
  const handleCreateExam = async () => {
    if (!selectedPatient || !examName) return
    const success = await createExamination({
      patientId: selectedPatient.id,
      type: examType,
      name: examName,
    })
    if (success) {
      setShowExamModal(false)
      setExamName('')
      fetchExaminations()
    }
  }
  
  const handleSubmitResult = async () => {
    if (!selectedExamId) return
    await submitResult(selectedExamId, examResult, parseFloat(examValue) || 0)
    setSelectedExamId(null)
    setExamResult('')
    setExamValue('')
    fetchExaminations()
  }

  return (
    <div className="h-full flex gap-4">
      <div className="w-80 card p-4 flex flex-col flex-shrink-0">
        <h3 className="section-title">患者列表</h3>
        <div className="flex-1 overflow-y-auto scrollbar-thin -mx-4 px-4 space-y-2">
          {activePatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className={cn(
                'p-3 rounded-xl border cursor-pointer transition-all',
                selectedPatient?.id === patient.id
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-dark-100 hover:border-primary-200 hover:bg-dark-50'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-dark-700">{patient.name}</span>
                <TriageBadge level={patient.triageLevel} />
              </div>
              <div className="text-sm text-dark-500 line-clamp-1 mb-2">
                {patient.chiefComplaint}
              </div>
              <StatusBadge status={patient.status} />
            </div>
          ))}
          {activePatients.length === 0 && (
            <div className="text-center text-dark-400 py-8">暂无待诊患者</div>
          )}
        </div>
      </div>

      <div className="flex-1 card p-4 flex flex-col">
        {selectedPatient ? (
          <>
            <div className="flex items-start justify-between pb-4 border-b border-dark-100">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-dark-700">{selectedPatient.name}</h3>
                  <TriageBadge level={selectedPatient.triageLevel} />
                  <StatusBadge status={selectedPatient.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div className="text-dark-500">身份证：<span className="text-dark-700">{selectedPatient.idCard}</span></div>
                  <div className="text-dark-500">主诉：<span className="text-dark-700">{selectedPatient.chiefComplaint}</span></div>
                  <div className="text-dark-500">体温：<span className="text-dark-700">{selectedPatient.temperature || '-'}℃</span></div>
                  <div className="text-dark-500">心率：<span className="text-dark-700">{selectedPatient.heartRate || '-'} 次/分</span></div>
                  <div className="text-dark-500">血压：<span className="text-dark-700">{selectedPatient.systolicBP || '-'}/{selectedPatient.diastolicBP || '-'} mmHg</span></div>
                  <div className="text-dark-500">血氧：<span className="text-dark-700">{selectedPatient.bloodOxygen || '-'}%</span></div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {selectedPatient.status === 'waiting' && (
                  <button
                    onClick={() => handleStartTreatment(selectedPatient.id)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    开始接诊
                  </button>
                )}
                {selectedPatient.status === 'treating' && (
                  <>
                    <button
                      onClick={() => setShowExamModal(true)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Activity className="w-4 h-4" />
                      开立检查
                    </button>
                    <button
                      onClick={() => handleStartObservation(selectedPatient.id)}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Bed className="w-4 h-4" />
                      转入留观
                    </button>
                    <button
                      onClick={() => handleDischarge(selectedPatient.id)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      办理出院
                    </button>
                  </>
                )}
                {selectedPatient.status === 'examining' && (
                  <button
                    onClick={() => handleStartTreatment(selectedPatient.id)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    检查完成
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pt-4">
              <h4 className="font-semibold text-dark-700 mb-3">检查记录</h4>
              {patientExams.length === 0 ? (
                <div className="text-center text-dark-400 py-6 bg-dark-50 rounded-xl">
                  暂无检查记录
                </div>
              ) : (
                <div className="space-y-3">
                  {patientExams.map((exam) => (
                    <div
                      key={exam.id}
                      className={cn(
                        'p-4 rounded-xl border',
                        exam.criticalValue ? 'border-danger-300 bg-danger-50' : 'border-dark-100'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-dark-700">{exam.name}</span>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              exam.type === 'lab' ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700'
                            )}>
                              {exam.type === 'lab' ? '检验' : '影像'}
                            </span>
                            {exam.criticalValue && (
                              <span className="flex items-center gap-1 text-xs text-danger-600">
                                <AlertTriangle className="w-3 h-3" />
                                危急值
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-dark-500">
                            状态：{exam.status === 'ordered' ? '已开立' : exam.status === 'in_progress' ? '检查中' : '已完成'}
                          </div>
                          {exam.result && (
                            <div className="mt-2 text-sm text-dark-600 bg-white p-2 rounded-lg border">
                              {exam.result}
                            </div>
                          )}
                        </div>
                        {exam.status !== 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedExamId(exam.id)
                              setExamResult(exam.result || '')
                              setExamValue(exam.resultValue?.toString() || '')
                            }}
                            className="btn-secondary text-sm py-1"
                          >
                            录入结果
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Stethoscope className="w-16 h-16 text-dark-200 mx-auto mb-4" />
              <p className="text-dark-400">请从左侧选择患者</p>
            </div>
          </div>
        )}
      </div>

      {showExamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-dark-700 mb-4">开立检查</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">检查类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExamType('lab')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                      examType === 'lab' ? 'bg-primary-500 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
                    )}
                  >
                    检验
                  </button>
                  <button
                    onClick={() => setExamType('imaging')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                      examType === 'imaging' ? 'bg-primary-500 text-white' : 'bg-dark-100 text-dark-600 hover:bg-dark-200'
                    )}
                  >
                    影像
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">检查项目</label>
                <select
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="select-field"
                >
                  <option value="">请选择</option>
                  {examType === 'lab' ? (
                    <>
                      <option value="血常规">血常规</option>
                      <option value="生化全项">生化全项</option>
                      <option value="血气分析">血气分析</option>
                      <option value="凝血功能">凝血功能</option>
                      <option value="心肌酶">心肌酶</option>
                    </>
                  ) : (
                    <>
                      <option value="胸部CT">胸部CT</option>
                      <option value="头部CT">头部CT</option>
                      <option value="腹部B超">腹部B超</option>
                      <option value="X光片">X光片</option>
                      <option value="心电图">心电图</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExamModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleCreateExam}
                disabled={!examName}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                确认开立
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedExamId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-dark-700 mb-4">录入检查结果</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">结果描述</label>
                <textarea
                  value={examResult}
                  onChange={(e) => setExamResult(e.target.value)}
                  placeholder="请输入检查结果..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-600 mb-1">数值结果</label>
                <input
                  type="number"
                  value={examValue}
                  onChange={(e) => setExamValue(e.target.value)}
                  placeholder="输入数值（如适用）"
                  className="input-field"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedExamId(null)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSubmitResult}
                disabled={!examResult}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                提交结果
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
