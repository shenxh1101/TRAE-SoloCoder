import { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore, MonthlyReport } from '@/store';

export default function Reports() {
  const { reports, fetchReports, loading } = useStore();

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const totalAmount = reports.reduce((s, r) => s + r.totalAmount, 0);
  const returnAmount = reports.reduce((s, r) => s + r.returnAmount, 0);
  const totalOrders = reports.reduce((s, r) => s + r.orderCount, 0);
  const avgReturnRate = reports.length > 0 ? reports.reduce((s, r) => s + r.returnRate, 0) / reports.length : 0;

  const summaryCards = [
    { label: '采购总额', value: totalAmount, prefix: '¥', color: 'text-[var(--amber-500)]' },
    { label: '退货金额', value: returnAmount, prefix: '¥', color: 'text-[var(--red-500)]' },
    { label: '订单数', value: totalOrders, suffix: '单', color: 'text-[var(--blue-500)]' },
    { label: '退货率', value: avgReturnRate, suffix: '%', color: 'text-[var(--green-500)]', decimals: 2 },
  ];

  if (loading.reports) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-6"><div className="skeleton h-4 w-20 mb-3" /><div className="skeleton h-8 w-32" /></div>)}
        </div>
        <div className="skeleton h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold text-[var(--gray-700)]">报表中心</h1>

      <div className="grid grid-cols-4 gap-5">
        {summaryCards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="text-sm text-[var(--gray-500)] mb-2">{card.label}</div>
            <div className={`font-mono-num text-2xl font-semibold ${card.color}`}>
              {card.prefix}{card.decimals ? card.value.toFixed(card.decimals) : card.value.toLocaleString()}{card.suffix}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-[var(--gray-700)] mb-4">月度趋势</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={reports} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} tickFormatter={(v: string) => v.slice(5) + '月'} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = { totalAmount: '采购总额', returnAmount: '退货金额' };
                return [`¥${value.toLocaleString()}`, labels[name] || name];
              }}
              labelFormatter={(label: string) => label}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)', fontSize: '13px' }}
            />
            <Line type="monotone" dataKey="totalAmount" stroke="#E8913A" strokeWidth={2} dot={{ r: 4, fill: '#E8913A' }} name="totalAmount" />
            <Line type="monotone" dataKey="returnAmount" stroke="#F04438" strokeWidth={2} dot={{ r: 4, fill: '#F04438' }} name="returnAmount" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">月份</th>
              <th className="table-header">采购总额</th>
              <th className="table-header">退货金额</th>
              <th className="table-header">订单数</th>
              <th className="table-header">退货率</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r: MonthlyReport) => (
              <tr key={r.month} className="hover:bg-[var(--gray-50)] transition-colors">
                <td className="table-cell font-medium">{r.month}</td>
                <td className="table-cell font-mono-num">¥{r.totalAmount.toLocaleString()}</td>
                <td className="table-cell font-mono-num text-[var(--red-500)]">¥{r.returnAmount.toLocaleString()}</td>
                <td className="table-cell font-mono-num">{r.orderCount}</td>
                <td className="table-cell">
                  <span className={`font-mono-num ${r.returnRate > 2.5 ? 'text-[var(--red-500)]' : 'text-[var(--green-500)]'}`}>
                    {r.returnRate.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
