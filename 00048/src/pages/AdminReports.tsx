import { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import useAdminStore from '@/stores/adminStore';
import { get } from '@/utils/api';

const REPORT_TYPES = [
  { label: '救助统计', value: 'rescue' },
  { label: '领养统计', value: 'adoption' },
  { label: '捐赠统计', value: 'donation' },
  { label: '志愿者统计', value: 'volunteer' },
];

const CITIES = ['全部', '北京', '上海', '广州', '深圳', '成都', '杭州', '武汉'];

interface ReportRow {
  period: string;
  city: string;
  rescues: number;
  adoptions: number;
  donations: number;
}

export default function AdminReports() {
  const { exportReport } = useAdminStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [city, setCity] = useState('全部');
  const [reportType, setReportType] = useState('rescue');
  const [preview, setPreview] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (city !== '全部') params.set('city', city);
        params.set('type', reportType);
        const query = params.toString();
        const data = await get<ReportRow[]>(`/admin/reports?${query}`);
        setPreview(Array.isArray(data) ? data : []);
      } catch {
        setPreview([]);
      }
      setLoading(false);
    };
    fetchPreview();
  }, [startDate, endDate, city, reportType]);

  const handleExport = async () => {
    const filters: Record<string, string> = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (city !== '全部') filters.city = city;
    filters.type = reportType;
    await exportReport(filters);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Download className="text-primary-500" size={28} />
        <h1 className="section-title">报表导出</h1>
      </div>

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label-field">城市筛选</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-field">报表类型</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REPORT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`py-2.5 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                  reportType === type.value
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-warm-200 text-warm-600 hover:border-primary-300'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleExport} className="btn-primary w-full flex items-center justify-center gap-2">
          <FileText size={18} />
          导出报表
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-warm-100 flex items-center gap-2">
          <FileText size={18} className="text-warm-400" />
          <h2 className="font-bold text-warm-800">数据预览</h2>
          <span className="text-sm text-warm-400 ml-auto">{preview.length} 条记录</span>
        </div>
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-16 h-4 bg-warm-200 rounded" />
                <div className="w-12 h-4 bg-warm-200 rounded" />
                <div className="w-10 h-4 bg-warm-200 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-50">
                  <th className="text-left px-4 py-2.5 text-warm-500 font-medium">月份</th>
                  <th className="text-left px-4 py-2.5 text-warm-500 font-medium">城市</th>
                  <th className="text-right px-4 py-2.5 text-warm-500 font-medium">救助数</th>
                  <th className="text-right px-4 py-2.5 text-warm-500 font-medium">领养数</th>
                  <th className="text-right px-4 py-2.5 text-warm-500 font-medium">捐赠额</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-warm-50 hover:bg-warm-50 transition-colors">
                    <td className="px-4 py-2.5 text-warm-700">{row.period}</td>
                    <td className="px-4 py-2.5 text-warm-700">{row.city}</td>
                    <td className="px-4 py-2.5 text-right text-warm-600">{row.rescues}</td>
                    <td className="px-4 py-2.5 text-right text-warm-600">{row.adoptions}</td>
                    <td className="px-4 py-2.5 text-right text-warm-600">¥{row.donations.toLocaleString()}</td>
                  </tr>
                ))}
                {preview.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-warm-400">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
