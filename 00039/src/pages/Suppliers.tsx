import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore, Supplier } from '@/store';
import { cn } from '@/lib/utils';

export default function Suppliers() {
  const { suppliers, fetchSuppliers, loading } = useStore();

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const onTimeData = suppliers.map((s) => ({ name: s.name, value: s.onTimeRate }));
  const passRateData = suppliers.map((s) => ({ name: s.name, value: s.passRate }));

  const barColors = ['#E8913A', '#2E90FA', '#12B76A', '#F79009'];

  if (loading.suppliers) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-10 w-48" />
        <div className="grid grid-cols-2 gap-5">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-xl font-semibold text-[var(--gray-700)]">供应商绩效</h1>

      <div className="grid grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-semibold text-[var(--gray-700)] mb-4">准时交货率对比</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={onTimeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} unit="%" />
              <Tooltip
                formatter={(value: number) => [`${value}%`, '准时率']}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)', fontSize: '13px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {onTimeData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-[var(--gray-700)] mb-4">合格率对比</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={passRateData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} unit="%" />
              <Tooltip
                formatter={(value: number) => [`${value}%`, '合格率']}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--gray-200)', fontSize: '13px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {passRateData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {suppliers.map((supplier: Supplier) => (
          <div key={supplier.id} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--gray-700)]">{supplier.name}</h3>
                <div className="text-sm text-[var(--gray-400)] mt-0.5">{supplier.contactPerson} · {supplier.phone}</div>
              </div>
              <span className={cn(
                'badge',
                supplier.onTimeRate >= 90 && supplier.passRate >= 95 ? 'badge-success' :
                supplier.onTimeRate >= 80 && supplier.passRate >= 90 ? 'badge-pending' : 'badge-danger'
              )}>
                {supplier.onTimeRate >= 90 && supplier.passRate >= 95 ? '优秀' :
                 supplier.onTimeRate >= 80 && supplier.passRate >= 90 ? '良好' : '待改进'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-[var(--gray-50)]">
                <div className="text-xs text-[var(--gray-400)]">准时率</div>
                <div className={cn('font-mono-num text-lg font-semibold mt-0.5', supplier.onTimeRate >= 90 ? 'text-[var(--green-500)]' : 'text-[var(--yellow-500)]')}>
                  {supplier.onTimeRate}%
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[var(--gray-50)]">
                <div className="text-xs text-[var(--gray-400)]">合格率</div>
                <div className={cn('font-mono-num text-lg font-semibold mt-0.5', supplier.passRate >= 95 ? 'text-[var(--green-500)]' : 'text-[var(--yellow-500)]')}>
                  {supplier.passRate}%
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[var(--gray-50)]">
                <div className="text-xs text-[var(--gray-400)]">订单数</div>
                <div className="font-mono-num text-lg font-semibold mt-0.5">{supplier.totalOrders}</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-[var(--gray-50)]">
                <div className="text-xs text-[var(--gray-400)]">总金额</div>
                <div className="font-mono-num text-sm font-semibold mt-0.5">¥{(supplier.totalAmount / 10000).toFixed(0)}万</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
