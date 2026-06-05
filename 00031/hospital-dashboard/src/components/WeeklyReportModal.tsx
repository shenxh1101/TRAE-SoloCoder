import { useState, useEffect, useCallback } from 'react';
import { X, Download, Calendar, Users, Clock, UserCheck, Lightbulb, FileText, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { WeeklyReport } from '../types';
import { api } from '../services/api';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: WeeklyReport;
  onRefresh?: () => void;
}

export default function WeeklyReportModal({ isOpen, onClose, report: initialReport, onRefresh }: WeeklyReportModalProps) {
  const [report, setReport] = useState<WeeklyReport>(initialReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReport(initialReport);
      setError(null);
    }
  }, [isOpen, initialReport]);

  const handleRefreshReport = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const latestReport = await api.report.getWeeklyReport(report.weekStart, report.weekEnd);
      setReport(latestReport);
      onRefresh?.();
    } catch (err) {
      setError('获取最新报告失败，请稍后重试');
      console.error('Failed to refresh report:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [report.weekStart, report.weekEnd, onRefresh]);

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const newReport = await api.report.generateWeeklyReport(report.weekStart, report.weekEnd);
      setReport(newReport);
      onRefresh?.();
    } catch (err) {
      setError('生成报告失败，请稍后重试');
      console.error('Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [report.weekStart, report.weekEnd, onRefresh]);

  const handleFallbackDownload = useCallback(() => {
    const reportContent = `
医院门诊运营质量周报
=====================================
统计周期: ${report.weekStart} 至 ${report.weekEnd}
生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}
数据来源: 医院HIS系统实时数据

一、核心指标
-------------------------------------
1. 候诊时间达标率: ${report.waitingTimeCompliance}%
2. 医生人均接诊量: ${report.avgPatientsPerDoctor} 人
3. 患者流失率: ${report.patientChurnRate}%

二、各科室详情
-------------------------------------
${report.departmentStats.map(s => `
${s.departmentName}:
  - 候诊时间达标率: ${s.waitingTimeCompliance}%
  - 人均接诊量: ${s.avgPatientsPerDoctor} 人
  - 平均饱和度: ${s.saturation}%
`).join('')}

三、资源调配建议
-------------------------------------
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

=====================================
系统自动生成，仅供内部参考
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `门诊运营周报_${report.weekStart}_${report.weekEnd}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const handleDownload = useCallback(async (format: 'pdf' | 'excel' | 'txt' = 'txt') => {
    setIsDownloading(true);
    setError(null);
    setShowFormatMenu(false);
    try {
      const blob = await api.report.downloadWeeklyReport(
        report.weekStart,
        report.weekEnd,
        format
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `门诊运营周报_${report.weekStart}_${report.weekEnd}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('API download failed, using fallback:', err);
      handleFallbackDownload();
    } finally {
      setIsDownloading(false);
    }
  }, [report.weekStart, report.weekEnd, handleFallbackDownload]);

  if (!isOpen) return null;

  const complianceChartOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>候诊时间达标率: <strong>${data.value}%</strong>`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: report.departmentStats.map(s => s.departmentName),
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
        rotate: 30,
      },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%',
        color: '#6b7280',
        fontSize: 11,
      },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: report.departmentStats.map(s => ({
          value: s.waitingTimeCompliance,
          itemStyle: {
            color: s.waitingTimeCompliance >= 80 
              ? '#10b981' 
              : s.waitingTimeCompliance >= 60 
                ? '#3b82f6' 
                : '#ef4444',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: 24,
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: '#374151',
          fontSize: 11,
          fontWeight: 500,
        },
        markLine: {
          silent: true,
          lineStyle: { color: '#f59e0b', type: 'dashed' },
          data: [{ yAxis: 70, label: { formatter: '达标线 70%', color: '#f59e0b', fontSize: 10 } }],
        },
      },
    ],
  };

  const saturationChartOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0];
        const stat = report.departmentStats.find(s => s.departmentName === data.name);
        return `${data.name}<br/>
                平均饱和度: <strong>${data.value}%</strong><br/>
                人均接诊: ${stat?.avgPatientsPerDoctor}人`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      top: '5%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: {
        formatter: '{value}%',
        color: '#6b7280',
        fontSize: 11,
      },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: report.departmentStats.map(s => s.departmentName).reverse(),
      axisLabel: {
        color: '#374151',
        fontSize: 12,
        fontWeight: 500,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: report.departmentStats.map(s => ({
          value: s.saturation,
          itemStyle: {
            color: s.saturation >= 90 
              ? '#ef4444' 
              : s.saturation >= 75 
                ? '#f59e0b' 
                : '#10b981',
            borderRadius: [0, 4, 4, 0],
          },
        })).reverse(),
        barWidth: 18,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#374151',
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <div className="flex items-center">
            <FileText className="w-7 h-7 mr-3" />
            <div>
              <h2 className="text-xl font-bold">门诊运营质量周报</h2>
              <p className="text-primary-100 text-sm mt-0.5">
                <Calendar className="w-4 h-4 inline mr-1" />
                {report.weekStart} 至 {report.weekEnd}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshReport}
              disabled={isRefreshing}
              className="flex items-center px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? '生成中...' : '重新生成'}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowFormatMenu(!showFormatMenu)}
                disabled={isDownloading}
                className="flex items-center px-4 py-2 bg-white text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isDownloading ? '下载中...' : '下载报告'}
              </button>
              {showFormatMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-10">
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    下载 PDF
                  </button>
                  <button
                    onClick={() => handleDownload('excel')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    下载 Excel
                  </button>
                  <button
                    onClick={() => handleDownload('txt')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    下载 TXT
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-10 h-10 text-white/80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">候诊达标率</span>
              </div>
              <p className="text-4xl font-bold mb-1">{report.waitingTimeCompliance}%</p>
              <p className="text-blue-100 text-sm">候诊时间≤30分钟占比</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-10 h-10 text-white/80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">人均接诊</span>
              </div>
              <p className="text-4xl font-bold mb-1">{report.avgPatientsPerDoctor}</p>
              <p className="text-green-100 text-sm">医生日均接诊患者数</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <UserCheck className="w-10 h-10 text-white/80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">患者流失率</span>
              </div>
              <p className="text-4xl font-bold mb-1">{report.patientChurnRate}%</p>
              <p className="text-orange-100 text-sm">挂号后取消就诊比例</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">各科室候诊时间达标率</h3>
              <ReactECharts option={complianceChartOption} style={{ height: '320px' }} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">各科室平均饱和度</h3>
              <ReactECharts option={saturationChartOption} style={{ height: '320px' }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              资源调配建议
            </h3>
            <div className="space-y-4">
              {report.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-100"
                >
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-700 font-bold">{index + 1}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">各科室详细数据</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">科室名称</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">候诊达标率</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">人均接诊量</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">平均饱和度</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">运营评价</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.departmentStats.map((stat, index) => {
                    const score = (stat.waitingTimeCompliance * 0.4 + (100 - Math.abs(stat.saturation - 85)) * 0.3 + stat.avgPatientsPerDoctor * 1.5 * 0.3);
                    const rating = score >= 80 ? '优秀' : score >= 65 ? '良好' : score >= 50 ? '一般' : '需改进';
                    const ratingColor = score >= 80 ? 'text-green-600 bg-green-100' : 
                                       score >= 65 ? 'text-blue-600 bg-blue-100' : 
                                       score >= 50 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{stat.departmentName}</td>
                        <td className="px-4 py-4 text-sm text-center">
                          <span className={`font-medium ${
                            stat.waitingTimeCompliance >= 80 ? 'text-green-600' :
                            stat.waitingTimeCompliance >= 60 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {stat.waitingTimeCompliance}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-center text-gray-900">{stat.avgPatientsPerDoctor}人</td>
                        <td className="px-4 py-4 text-sm text-center">
                          <span className={`font-medium ${
                            stat.saturation >= 90 ? 'text-red-600' :
                            stat.saturation >= 75 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {stat.saturation}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${ratingColor}`}>
                            {rating}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm text-gray-500">
              <div className="space-y-1">
                <p className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">报告生成时间:</span>
                  {new Date(report.generatedAt).toLocaleString('zh-CN')}
                </p>
                <p className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">数据来源:</span>
                  医院HIS系统实时数据库 / 挂号系统 / 排班系统
                </p>
                <p className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">数据统计范围:</span>
                  {report.weekStart} 00:00:00 至 {report.weekEnd} 23:59:59
                </p>
              </div>
              <div className="mt-3 md:mt-0 md:text-right">
                <button
                  onClick={handleRefreshReport}
                  disabled={isRefreshing}
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '刷新中...' : '刷新数据'}
                </button>
              </div>
            </div>
            <p className="mt-3 pt-3 border-t border-gray-200 text-center text-xs text-gray-400">
              本报告由门诊流量分析系统自动计算生成，所有指标均基于实际诊疗数据，仅供内部管理参考
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
