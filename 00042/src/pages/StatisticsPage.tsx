import { useEffect, useState, useRef } from 'react'
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  Heart,
  FileText,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import useStatisticsStore from '@/stores/statisticsStore'
import { cn } from '@/lib/utils'

const COLORS = ['#E53935', '#FB8C00', '#43A047']

export default function StatisticsPage() {
  const { overview, departmentStats, diagnosisStats, monthlyReport, loading, fetchAll, fetchMonthlyReport } = useStatisticsStore()
  const reportRef = useRef<HTMLDivElement>(null)
  
  const now = new Date()
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0])
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1)
  const [reportYear, setReportYear] = useState(now.getFullYear())
  const [exporting, setExporting] = useState(false)
  
  useEffect(() => {
    fetchAll()
    const monthStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}`
    fetchMonthlyReport(monthStr)
  }, [fetchAll, fetchMonthlyReport, reportYear, reportMonth])

  const handleRefresh = () => {
    fetchAll()
    const monthStr = `${reportYear}-${String(reportMonth).padStart(2, '0')}`
    fetchMonthlyReport(monthStr)
  }

  const exportPDF = async () => {
    if (!reportRef.current || !monthlyReport) return
    setExporting(true)
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`急诊质量月报_${monthlyReport.month}.pdf`)
    } catch (error) {
      console.error('PDF导出失败:', error)
      alert('PDF导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }
  
  const triageData = overview ? [
    { name: '危重', value: overview.redCount, color: COLORS[0] },
    { name: '急症', value: overview.yellowCount, color: COLORS[1] },
    { name: '非急症', value: overview.greenCount, color: COLORS[2] },
  ] : []
  
  const deptChartData = departmentStats.map((d) => ({
    name: d.department,
    count: d.patientCount,
    avgStay: Math.round(d.avgStay),
  }))

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dark-700">统计分析与报表</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-dark-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-36"
            />
            <span className="text-dark-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field w-36"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            刷新数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">{overview?.totalPatients || 0}</div>
            <div className="text-sm text-dark-500">接诊总量</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-success-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">
              {overview?.avgStayMinutes ? `${Math.round(overview.avgStayMinutes)}分` : '-'}
            </div>
            <div className="text-sm text-dark-500">平均停留</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">
              {overview?.criticalRatio ? `${(overview.criticalRatio * 100).toFixed(1)}%` : '-'}
            </div>
            <div className="text-sm text-dark-500">危重占比</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center">
            <Heart className="w-6 h-6 text-danger-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-dark-700">
              {overview?.mortalityRate ? `${(overview.mortalityRate * 100).toFixed(2)}%` : '-'}
            </div>
            <div className="text-sm text-dark-500">死亡率</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="card p-4 flex flex-col">
          <h3 className="section-title">每日接诊趋势</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview?.dailyCounts || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEFF1" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#90A4AE" />
                <YAxis tick={{ fontSize: 12 }} stroke="#90A4AE" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1B6FA8"
                  strokeWidth={2}
                  dot={{ fill: '#1B6FA8' }}
                  name="接诊量"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 flex flex-col">
          <h3 className="section-title">分诊等级分布</h3>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={triageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {triageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6">
              {triageData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-dark-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-4 flex flex-col">
          <h3 className="section-title">科室接诊统计</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEFF1" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#90A4AE" />
                <YAxis tick={{ fontSize: 12 }} stroke="#90A4AE" />
                <Tooltip />
                <Bar dataKey="count" fill="#43A047" name="接诊量" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4 flex flex-col">
          <h3 className="section-title">病种统计 Top 5</h3>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="space-y-3">
              {diagnosisStats.slice(0, 5).map((item, index) => (
                <div key={item.diagnosis} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-dark-700">{item.diagnosis}</div>
                    <div className="text-xs text-dark-400">
                      危重占比 {(item.criticalRatio * 100).toFixed(0)}% · 平均停留 {Math.round(item.avgStay)}分
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary-600">{item.count}</div>
                </div>
              ))}
              {diagnosisStats.length === 0 && (
                <div className="text-center text-dark-400 py-8">暂无数据</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">急诊质量月报</h3>
          <div className="flex items-center gap-2">
            <select
              value={reportYear}
              onChange={(e) => setReportYear(parseInt(e.target.value))}
              className="select-field w-28"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(parseInt(e.target.value))}
              className="select-field w-24"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <button 
              onClick={exportPDF}
              disabled={exporting || !monthlyReport}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? '导出中...' : '导出PDF'}
            </button>
          </div>
        </div>
        
        <div ref={reportRef} className="bg-white">
          {monthlyReport ? (
            <>
              <div className="text-center mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-dark-800">急诊质量月报</h2>
                <p className="text-dark-500 mt-1">{monthlyReport.month}</p>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-4 bg-dark-50 rounded-xl">
                  <div className="text-3xl font-bold text-primary-600">{monthlyReport.totalPatients}</div>
                  <div className="text-sm text-dark-500 mt-1">总接诊量</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-xl">
                  <div className="text-3xl font-bold text-success-600">{Math.round(monthlyReport.avgStayMinutes)}分</div>
                  <div className="text-sm text-dark-500 mt-1">平均停留</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-xl">
                  <div className="text-3xl font-bold text-warning-600">
                    {(monthlyReport.criticalRatio * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-dark-500 mt-1">危重占比</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-xl">
                  <div className="text-3xl font-bold text-danger-600">
                    {(monthlyReport.mortalityRate * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-dark-500 mt-1">死亡率</div>
                </div>
                <div className="text-center p-4 bg-dark-50 rounded-xl">
                  <div className="text-3xl font-bold text-dark-600">{monthlyReport.departmentStats.length}</div>
                  <div className="text-sm text-dark-500 mt-1">覆盖科室</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold text-dark-700 mb-3">每日接诊趋势</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyReport.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ECEFF1" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#90A4AE" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#90A4AE" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#1B6FA8"
                        strokeWidth={2}
                        dot={{ fill: '#1B6FA8', r: 2 }}
                        name="接诊量"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold text-dark-700 mb-3">科室统计</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-50">
                      <th className="text-left p-2 rounded-l-lg">科室</th>
                      <th className="text-center p-2">接诊量</th>
                      <th className="text-center p-2">平均停留(分)</th>
                      <th className="text-center p-2 rounded-r-lg">危重占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyReport.departmentStats.map((dept, i) => (
                      <tr key={dept.department} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2">{dept.department}</td>
                        <td className="text-center p-2">{dept.patientCount}</td>
                        <td className="text-center p-2">{Math.round(dept.avgStay)}</td>
                        <td className="text-center p-2">{(dept.criticalRatio * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 text-right text-xs text-dark-400">
                生成时间: {new Date().toLocaleString('zh-CN')}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-dark-400">加载月报数据中...</div>
          )}
        </div>
      </div>
    </div>
  )
}
