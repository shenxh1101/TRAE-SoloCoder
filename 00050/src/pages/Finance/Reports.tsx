import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Filter, Download, Eye, RefreshCw,
  Calendar, X, FileSpreadsheet, File, ChevronDown, Check,
  Building2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatCurrency, formatDateTime, cn, generateId, downloadFile } from '../../utils/helpers';
import { PageHeader } from '../../components/ui/PageHeader';

type ReportType = 'monthly' | 'quarterly' | 'annual';
type ReportStatus = 'pending' | 'approved' | 'generating';

interface Report {
  id: string;
  name: string;
  type: ReportType;
  timeRange: string;
  createdAt: string;
  status: ReportStatus;
  hallData?: Array<{
    hallName: string;
    boothIncome: number;
    serviceIncome: number;
    utilizationRate: number;
    yoyGrowth: number;
  }>;
}

const generateMockReports = (): Report[] => {
  const types: ReportType[] = ['monthly', 'monthly', 'monthly', 'quarterly', 'annual', 'monthly'];
  const statuses: ReportStatus[] = ['approved', 'approved', 'approved', 'approved', 'approved', 'generating'];
  const names = ['6月财务月报', '5月财务月报', '4月财务月报', 'Q1季度报表', '2025年度报表', '7月财务月报'];
  const timeRanges = ['2026-06-01 ~ 2026-06-30', '2026-05-01 ~ 2026-05-31', '2026-04-01 ~ 2026-04-30', '2026-01-01 ~ 2026-03-31', '2025-01-01 ~ 2025-12-31', '2026-07-01 ~ 2026-07-31'];

  return names.map((name, index) => ({
    id: generateId(),
    name,
    type: types[index],
    timeRange: timeRanges[index],
    createdAt: new Date(2026, 5 - index, 1, 8, 0).toISOString(),
    status: statuses[index],
  }));
};

const reportTypes = [
  { key: 'all', label: '全部类型' },
  { key: 'monthly', label: '月报' },
  { key: 'quarterly', label: '季报' },
  { key: 'annual', label: '年报' },
];

const statusFilters = [
  { key: 'all', label: '全部状态' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已完成' },
  { key: 'generating', label: '生成中' },
];

export default function Reports() {
  const [reports, setReports] = useState<Report[]>(generateMockReports());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newReportType, setNewReportType] = useState<ReportType>('monthly');
  const [newReportMonth, setNewReportMonth] = useState(new Date().getMonth() + 1);

  const { pushFinanceNotification } = useNotificationStore();

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'all' || r.type === typeFilter;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [reports, searchQuery, typeFilter, statusFilter]);

  const getTypeText = (type: ReportType) => {
    const map: Record<ReportType, string> = { monthly: '月报', quarterly: '季报', annual: '年报' };
    return map[type];
  };

  const getTypeIcon = (type: ReportType) => {
    const icons = { monthly: <Calendar className="w-5 h-5" />, quarterly: <FileSpreadsheet className="w-5 h-5" />, annual: <File className="w-5 h-5" /> };
    return icons[type];
  };

  const getStatusClass = (status: ReportStatus) => {
    const map: Record<ReportStatus, string> = { pending: 'status-pending', approved: 'status-approved', generating: 'status-pending' };
    return map[status];
  };

  const getStatusText = (status: ReportStatus) => {
    const map: Record<ReportStatus, string> = { pending: '待审核', approved: '已完成', generating: '生成中' };
    return map[status];
  };

  const generateHallData = (): NonNullable<Report['hallData']> => {
    const halls = ['1号馆·科技主题馆', '2号馆·智能制造馆', '3号馆·新能源馆', '4号馆·智慧城市馆', '5号馆·综合服务馆'];
    return halls.map((hall) => ({
      hallName: hall,
      boothIncome: 800000 + Math.floor(Math.random() * 1500000),
      serviceIncome: 200000 + Math.floor(Math.random() * 500000),
      utilizationRate: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
      yoyGrowth: (Math.random() - 0.2) * 40,
    }));
  };

  const handleGenerateReport = () => {
    const typeNames: Record<ReportType, string> = { monthly: '月', quarterly: '季度', annual: '年度' };
    const newReport: Report = {
      id: generateId(),
      name: `${newReportMonth}月财务${typeNames[newReportType]}`,
      type: newReportType,
      timeRange: `2026-${String(newReportMonth).padStart(2, '0')}-01 ~ 2026-${String(newReportMonth).padStart(2, '0')}-30`,
      createdAt: new Date().toISOString(),
      status: 'generating',
      hallData: generateHallData(),
    };

    setReports([newReport, ...reports]);
    setShowModal(false);

    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) => (r.id === newReport.id ? { ...r, status: 'approved' } : r))
      );
      pushFinanceNotification('finance-1', newReport.id, '报表生成完成', `${newReport.name}已成功生成，请及时查看。`);
    }, 2000);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport({ ...report, hallData: report.hallData || generateHallData() });
    setShowPreview(true);
  };

  const handleDownload = (report: Report, format: 'pdf' | 'excel') => {
    const content = `
      ${report.name}\n
      时间范围: ${report.timeRange}\n
      生成时间: ${formatDateTime(report.createdAt)}\n
      \n
      各展馆数据:\n
      ${report.hallData?.map((h) => `
        ${h.hallName}:
          展位收入: ${formatCurrency(h.boothIncome)}
          服务费收入: ${formatCurrency(h.serviceIncome)}
          利用率: ${(h.utilizationRate * 100).toFixed(1)}%
          同比增长: ${h.yoyGrowth >= 0 ? '+' : ''}${h.yoyGrowth.toFixed(1)}%
      `).join('\n')}
    `;
    downloadFile(content, `${report.name}.${format}`, format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel');
  };

  const handleRegenerate = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'generating' as const } : r))
    );
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'approved' as const, hallData: generateHallData() } : r))
      );
    }, 2000);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="报表管理"
        subtitle="生成、查看和下载各类财务报表"
        icon={<FileText className="w-7 h-7" />}
        actions={
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            生成新报表
          </motion.button>
        }
      />

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="搜索报表..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowStatusDropdown(false); }}
            className="btn-secondary flex items-center gap-2 min-w-[130px] justify-between"
          >
            <Filter className="w-5 h-5" />
            <span>{reportTypes.find((t) => t.key === typeFilter)?.label}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showTypeDropdown && 'rotate-180')} />
          </motion.button>
          {showTypeDropdown && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 mt-2 w-full glass-card p-2 z-10">
              {reportTypes.map((type) => (
                <button
                  key={type.key}
                  onClick={() => { setTypeFilter(type.key); setShowTypeDropdown(false); }}
                  className={cn('w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center justify-between', typeFilter === type.key ? 'bg-primary-500/20 text-primary-400' : 'text-white hover:bg-white/10')}
                >
                  {type.label}
                  {typeFilter === type.key && <Check className="w-4 h-4" />}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowTypeDropdown(false); }}
            className="btn-secondary flex items-center gap-2 min-w-[130px] justify-between"
          >
            <Filter className="w-5 h-5" />
            <span>{statusFilters.find((s) => s.key === statusFilter)?.label}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', showStatusDropdown && 'rotate-180')} />
          </motion.button>
          {showStatusDropdown && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 mt-2 w-full glass-card p-2 z-10">
              {statusFilters.map((status) => (
                <button
                  key={status.key}
                  onClick={() => { setStatusFilter(status.key); setShowStatusDropdown(false); }}
                  className={cn('w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center justify-between', statusFilter === status.key ? 'bg-primary-500/20 text-primary-400' : 'text-white hover:bg-white/10')}
                >
                  {status.label}
                  {statusFilter === status.key && <Check className="w-4 h-4" />}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card glass-card-hover overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left py-4 px-6 text-dark-300 font-medium">报表名称</th>
              <th className="text-left py-4 px-6 text-dark-300 font-medium">类型</th>
              <th className="text-left py-4 px-6 text-dark-300 font-medium">时间范围</th>
              <th className="text-left py-4 px-6 text-dark-300 font-medium">生成时间</th>
              <th className="text-left py-4 px-6 text-dark-300 font-medium">状态</th>
              <th className="text-right py-4 px-6 text-dark-300 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report, index) => (
              <motion.tr
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <motion.div whileHover={{ rotate: 5 }} className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      {getTypeIcon(report.type)}
                    </motion.div>
                    <span className="text-white font-medium">{report.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-dark-300">{getTypeText(report.type)}</td>
                <td className="py-4 px-6 text-dark-300 text-sm">{report.timeRange}</td>
                <td className="py-4 px-6 text-dark-300 text-sm">{formatDateTime(report.createdAt)}</td>
                <td className="py-4 px-6">
                  <span className={cn('status-badge', getStatusClass(report.status))}>
                    {report.status === 'generating' && <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />}
                    {getStatusText(report.status)}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-2">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleViewReport(report)} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors" title="查看详情">
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    <div className="flex items-center gap-1">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDownload({ ...report, hallData: report.hallData || generateHallData() }, 'pdf')} className="p-2 rounded-lg bg-success-500/20 text-success-400 hover:bg-success-500/30 transition-colors" title="下载PDF">
                        <Download className="w-4 h-4" />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDownload({ ...report, hallData: report.hallData || generateHallData() }, 'excel')} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors" title="下载Excel">
                        <FileSpreadsheet className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRegenerate(report.id)} disabled={report.status === 'generating'} className="p-2 rounded-lg bg-warning-500/20 text-warning-400 hover:bg-warning-500/30 transition-colors disabled:opacity-50" title="重新生成">
                      <RefreshCw className={cn('w-4 h-4', report.status === 'generating' && 'animate-spin')} />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">生成新报表</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-dark-300" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-dark-300 mb-2 text-sm">报表类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['monthly', 'quarterly', 'annual'] as ReportType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewReportType(type)}
                        className={cn('p-3 rounded-xl border transition-all flex flex-col items-center gap-1', newReportType === type ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-white/5 border-white/10 text-white hover:border-white/30')}
                      >
                        {getTypeIcon(type)}
                        <span className="text-sm">{getTypeText(type)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-dark-300 mb-2 text-sm">选择月份</label>
                  <select value={newReportMonth} onChange={(e) => setNewReportMonth(Number(e.target.value))} className="input-field">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{m}月</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">取消</button>
                  <button onClick={handleGenerateReport} className="btn-primary flex-1">生成</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreview && selectedReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-8" onClick={() => setShowPreview(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="glass-card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedReport.name}</h3>
                  <p className="text-dark-300">时间范围：{selectedReport.timeRange}</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-6 h-6 text-dark-300" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <p className="text-dark-300 text-sm mb-1">展位总收入</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(selectedReport.hallData?.reduce((s, h) => s + h.boothIncome, 0) || 0)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-dark-300 text-sm mb-1">服务费总收入</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(selectedReport.hallData?.reduce((s, h) => s + h.serviceIncome, 0) || 0)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-dark-300 text-sm mb-1">平均利用率</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedReport.hallData ? ((selectedReport.hallData.reduce((s, h) => s + h.utilizationRate, 0) / selectedReport.hallData.length) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
                <div className="glass-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left py-3 px-4 text-dark-300 font-medium">展馆名称</th>
                        <th className="text-right py-3 px-4 text-dark-300 font-medium">展位收入</th>
                        <th className="text-right py-3 px-4 text-dark-300 font-medium">服务费收入</th>
                        <th className="text-right py-3 px-4 text-dark-300 font-medium">利用率</th>
                        <th className="text-right py-3 px-4 text-dark-300 font-medium">同比增长</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReport.hallData?.map((hall, index) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary-400" />
                              <span className="text-white">{hall.hallName}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 text-white">{formatCurrency(hall.boothIncome)}</td>
                          <td className="text-right py-3 px-4 text-white">{formatCurrency(hall.serviceIncome)}</td>
                          <td className="text-right py-3 px-4 text-white">{(hall.utilizationRate * 100).toFixed(1)}%</td>
                          <td className="text-right py-3 px-4">
                            <span className={cn('flex items-center justify-end gap-1', hall.yoyGrowth >= 0 ? 'text-success-400' : 'text-danger-400')}>
                              {hall.yoyGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {hall.yoyGrowth >= 0 ? '+' : ''}{hall.yoyGrowth.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => handleDownload(selectedReport, 'pdf')} className="btn-secondary flex items-center gap-2">
                    <Download className="w-5 h-5" /> 下载PDF
                  </button>
                  <button onClick={() => handleDownload(selectedReport, 'excel')} className="btn-success flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" /> 下载Excel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
