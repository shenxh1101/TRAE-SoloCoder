import { useEffect, useState } from 'react';
import { Download, BarChart3, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAppStore, type MonthlyReport, type StaffReport } from '@/stores/appStore';
import StarRating from '@/components/StarRating';

const mockMonthlyData = [
  { month: '1月', orders: 120, completed: 115, avgRating: 4.8, revenue: 36000 },
  { month: '2月', orders: 98, completed: 95, avgRating: 4.7, revenue: 29400 },
  { month: '3月', orders: 135, completed: 130, avgRating: 4.9, revenue: 40500 },
  { month: '4月', orders: 142, completed: 138, avgRating: 4.8, revenue: 42600 },
  { month: '5月', orders: 156, completed: 150, avgRating: 4.9, revenue: 46800 },
  { month: '6月', orders: 168, completed: 162, avgRating: 4.8, revenue: 50400 },
];

const mockStaffData = [
  { staffId: 's1', staffName: '王阿姨', totalOrders: 48, completedOrders: 47, avgRating: 4.9 },
  { staffId: 's2', staffName: '李师傅', totalOrders: 35, completedOrders: 34, avgRating: 4.7 },
  { staffId: 's3', staffName: '张姐', totalOrders: 42, completedOrders: 41, avgRating: 4.8 },
  { staffId: 's4', staffName: '刘阿姨', totalOrders: 30, completedOrders: 29, avgRating: 4.6 },
];

export default function Reports() {
  const { fetchMonthlyReport } = useAppStore();
  const [month, setMonth] = useState('');
  const [activeTab, setActiveTab] = useState<'monthly' | 'staff'>('monthly');

  useEffect(() => {
    fetchMonthlyReport(month || undefined).catch(() => {});
  }, [month]);

  const handleExport = () => {
    window.open('/api/admin/reports/export', '_blank');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--secondary)' }}>报表导出</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'var(--primary)' }}
        >
          <Download size={16} /> 一键导出
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'monthly' ? 'text-white' : ''
          }`}
          style={activeTab === 'monthly' ? { background: 'var(--primary)' } : { background: '#EDF2F7', color: 'var(--text-secondary)' }}
        >
          <BarChart3 size={16} /> 月度质量分析
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'staff' ? 'text-white' : ''
          }`}
          style={activeTab === 'staff' ? { background: 'var(--primary)' } : { background: '#EDF2F7', color: 'var(--text-secondary)' }}
        >
          <Users size={16} /> 个人服务记录
        </button>
      </div>

      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>总订单</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{mockMonthlyData.reduce((s, d) => s + d.orders, 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={18} style={{ color: 'var(--success)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>已完成</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{mockMonthlyData.reduce((s, d) => s + d.completed, 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>⭐ 平均评分</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
                {(mockMonthlyData.reduce((s, d) => s + d.avgRating, 0) / mockMonthlyData.length).toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>💰 总营收</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>¥{mockMonthlyData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>月度订单趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} name="总订单" />
                <Bar dataKey="completed" fill="var(--success)" radius={[4, 4, 0, 0]} name="已完成" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>评分趋势</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={mockMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[4, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgRating" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} name="平均评分" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium border-b" style={{ color: 'var(--text-secondary)' }}>
                  <th className="px-6 py-3">姓名</th>
                  <th className="px-6 py-3">总订单</th>
                  <th className="px-6 py-3">已完成</th>
                  <th className="px-6 py-3">完成率</th>
                  <th className="px-6 py-3">评分</th>
                </tr>
              </thead>
              <tbody>
                {mockStaffData.map((row) => (
                  <tr key={row.staffId} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text)' }}>{row.staffName}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text)' }}>{row.totalOrders}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text)' }}>{row.completedOrders}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text)' }}>
                      {((row.completedOrders / row.totalOrders) * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <StarRating value={row.avgRating} readonly size={14} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
