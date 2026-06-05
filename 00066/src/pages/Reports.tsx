import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Filter,
  Search,
  FileDown,
  FileBarChart,
  Loader2
} from 'lucide-react';
import { reportApi } from '../services/reportApi';
import { useToast } from '../components/common/Toast';
import type { Report, PurposeCategory } from '../types';
import type { ReportStats } from '../services/reportApi';

const templateTypes = [
  { value: 'standard', label: '标准版', desc: '包含核心指标和图表' },
  { value: 'detailed', label: '详细版', desc: '完整技术数据和参数' },
  { value: 'brief', label: '简版', desc: '摘要信息快速浏览' },
];

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dateRange, setDateRange] = useState('week');
  const [purposeFilter, setPurposeFilter] = useState<PurposeCategory | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
    loadStats();
  }, [dateRange, purposeFilter]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportApi.getReports({
        templateType: purposeFilter !== 'all' ? purposeFilter as 'standard' | 'detailed' | 'brief' : undefined,
      });
      setReports(res.data.reports);
      if (res.data.reports.length > 0 && !selectedReport) {
        setSelectedReport(res.data.reports[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await reportApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load report stats:', err);
    }
  };

  const handleDownload = async (reportId: string) => {
    setDownloading(reportId);
    try {
      const blob = await reportApi.downloadReport(reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acoustic-report-${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('报告下载成功', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '下载报告失败', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleGenerateReport = async (taskId: string, templateType: 'standard' | 'detailed' | 'brief') => {
    try {
      await reportApi.generateReport(taskId, templateType);
      showToast('报告生成任务已提交', 'success');
      await loadReports();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '生成报告失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载报告数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={loadReports} className="mt-4 btn-primary">重试</button>
      </div>
    );
  }

  const weekReports = reports.filter(r => {
    const diff = Date.now() - new Date(r.generatedAt).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">报告中心</h1>
          <p className="text-gray-400 text-sm">生成、预览和导出声学模拟综合分析报告</p>
        </div>

        <button className="btn-primary flex items-center space-x-2">
          <FileDown className="w-4 h-4" />
          <span>批量导出</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <FileText className="w-8 h-8 text-acoustic-cyber mb-3" />
          <p className="text-2xl font-bold data-value text-white">{stats?.total || 0}</p>
          <p className="text-sm text-gray-400">总报告数</p>
        </div>

        <div className="glass-card p-5">
          <Calendar className="w-8 h-8 text-acoustic-neon mb-3" />
          <p className="text-2xl font-bold data-value text-white">本周新增</p>
          <p className="text-sm text-gray-400">{stats?.thisWeek || 0} 份</p>
        </div>

        <div className="glass-card p-5">
          <Download className="w-8 h-8 text-acoustic-success mb-3" />
          <p className="text-2xl font-bold data-value text-white">本月下载</p>
          <p className="text-sm text-gray-400">{stats?.totalDownloads || 0} 次</p>
        </div>

        <div className="glass-card p-5">
          <FileBarChart className="w-8 h-8 text-acoustic-data mb-3" />
          <p className="text-2xl font-bold data-value text-white">{stats?.totalStorageGB || '0.00'} GB</p>
          <p className="text-sm text-gray-400">存储占用</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">报告列表</h3>
              
              <div className="flex items-center space-x-3">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-1.5 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded text-xs 
                           text-white focus:outline-none focus:border-acoustic-cyber"
                >
                  <option value="today">今天</option>
                  <option value="week">本周</option>
                  <option value="month">本月</option>
                  <option value="quarter">本季度</option>
                </select>

                <button className="p-2 hover:bg-acoustic-steel/20 rounded transition-colors">
                  <Filter className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 group card-hover-effect
                    ${selectedReport?.id === report.id 
                      ? 'border-acoustic-cyber bg-acoustic-cyber/5 ring-2 ring-acoustic-cyber/20' 
                      : 'border-acoustic-steel/20 hover:border-acoustic-steel/40'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-3 rounded-lg ${
                        report.templateType === 'detailed' ? 'bg-blue-500/10' :
                        report.templateType === 'standard' ? 'bg-purple-500/10' :
                        'bg-green-500/10'
                      }`}>
                        <FileText className={`w-6 h-6 ${
                          report.templateType === 'detailed' ? 'text-blue-400' :
                          report.templateType === 'standard' ? 'text-purple-400' :
                          'text-green-400'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white mb-1 truncate">
                          声学模拟报告 - 任务 #{report.taskId}
                        </h4>
                        
                        <div className="flex items-center space-x-3 text-xs text-gray-400 mb-2">
                          <span className={`px-2 py-0.5 rounded font-medium ${
                            report.templateType === 'detailed' ? 'bg-blue-500/20 text-blue-400' :
                            report.templateType === 'standard' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {templateTypes.find(t => t.value === report.templateType)?.label}
                          </span>
                          <span>·</span>
                          <span>{(report.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                          <span>·</span>
                          <span>{new Date(report.generatedAt).toLocaleDateString('zh-CN')}</span>
                        </div>

                        <p className="text-xs text-gray-500">
                          包含：等声级线图 · 混响衰减曲线 · 雷达评估 · 材料方案
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(report.id)}
                        disabled={downloading === report.id}
                        className="p-2 rounded-lg bg-acoustic-cyber/20 hover:bg-acoustic-cyber/30 transition-colors"
                        title="下载"
                      >
                        <Download className="w-4 h-4 text-acoustic-success" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">数据导出选项</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 rounded-lg border border-acoustic-steel/30 hover:border-acoustic-cyber/50 
                               bg-acoustic-midnight/20 hover:bg-acoustic-cyber/5 transition-all text-left group">
                <FileDown className="w-8 h-8 text-acoustic-cyber mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-1">原始脉冲响应数据</h4>
                <p className="text-xs text-gray-500">WAV格式 · RIR时域波形</p>
              </button>

              <button className="p-4 rounded-lg border border-acoustic-steel/30 hover:border-acoustic-neon/50 
                               bg-acoustic-midnight/20 hover:bg-acoustic-neon/5 transition-all text-left group">
                <FileBarChart className="w-8 h-8 text-acoustic-neon mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-1">声学参数汇总表</h4>
                <p className="text-xs text-gray-500">CSV格式 · SPL/RT60/SWR</p>
              </button>

              <button className="p-4 rounded-lg border border-acoustic-steel/30 hover:border-acoustic-data/50 
                               bg-acoustic-midnight/20 hover:bg-acoustic-data/5 transition-all text-left group">
                <FileText className="w-8 h-8 text-acoustic-data mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-1">房间用途分类统计</h4>
                <p className="text-xs text-gray-500">Excel格式 · 多维透视表</p>
              </button>

              <button className="p-4 rounded-lg border border-acoustic-steel/30 hover:border-acoustic-warning/50 
                               bg-acoustic-midnight/20 hover:bg-acoustic-warning/5 transition-all text-left group">
                <Calendar className="w-8 h-8 text-acoustic-warning mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-1">日期范围筛选导出</h4>
                <p className="text-xs text-gray-500">自定义时间区间 · 批量打包</p>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedReport ? (
            <div className="glass-card p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-acoustic-cyber" />
                报告预览
              </h3>

              <div className="aspect-[4/3] bg-gradient-to-br from-acoustic-navy to-acoustic-midnight rounded-lg 
                          border border-acoustic-steel/30 flex items-center justify-center mb-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
                
                <div className="relative z-10 text-center p-6">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-acoustic-cyber opacity-50" />
                  <p className="text-sm text-gray-400 mb-2">PDF 报告预览</p>
                  <p className="text-xs text-gray-600 font-mono">
                    {(selectedReport.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-acoustic-cyber via-acoustic-neon to-acoustic-data"></div>
              </div>

              <dl className="space-y-3 text-sm mb-6">
                <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                  <dt className="text-gray-400">报告类型</dt>
                  <dd className="font-medium text-white">
                    {templateTypes.find(t => t.value === selectedReport.templateType)?.label}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                  <dt className="text-gray-400">文件大小</dt>
                  <dd className="data-value text-white">
                    {(selectedReport.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                  <dt className="text-gray-400">生成时间</dt>
                  <dd className="font-mono text-gray-300">
                    {new Date(selectedReport.generatedAt).toLocaleString('zh-CN')}
                  </dd>
                </div>
                <div className="flex justify-between py-2 border-b border-acoustic-steel/20">
                  <dt className="text-gray-400">关联任务</dt>
                  <dd className="text-acoustic-cyber">#{selectedReport.taskId}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <button
                  onClick={() => selectedReport && handleDownload(selectedReport.id)}
                  disabled={downloading === selectedReport?.id}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>下载PDF</span>
                </button>
                
                <button className="btn-secondary w-full flex items-center justify-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>全屏预览</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center sticky top-24">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">选择一个报告查看详情</p>
            </div>
          )}

          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
              模板说明
            </h4>
            
            <div className="space-y-3">
              {templateTypes.map((template) => (
                <div key={template.value} className="p-3 rounded-lg bg-acoustic-midnight/30">
                  <p className="text-sm font-medium text-white mb-1">{template.label}</p>
                  <p className="text-xs text-gray-500">{template.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
