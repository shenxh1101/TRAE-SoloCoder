import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import { useStore, OrderStatus, Order } from '@/store';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-[var(--gray-100)] text-[var(--gray-500)]' },
  pending_quote: { label: '待报价', className: 'bg-[var(--yellow-50)] text-[var(--yellow-500)]' },
  quoted: { label: '已报价', className: 'bg-[var(--blue-50)] text-[var(--blue-500)]' },
  locked: { label: '已锁定', className: 'bg-[var(--red-50)] text-[var(--red-500)]' },
  pending_approval: { label: '待审批', className: 'bg-[var(--yellow-50)] text-[var(--yellow-500)]' },
  approved: { label: '已审批', className: 'bg-[var(--blue-50)] text-[var(--blue-500)]' },
  purchasing: { label: '采购中', className: 'bg-purple-50 text-purple-500' },
  contracted: { label: '已签约', className: 'bg-indigo-50 text-indigo-500' },
  shipping: { label: '运输中', className: 'bg-indigo-50 text-indigo-500' },
  delivered: { label: '已到货', className: 'bg-indigo-50 text-indigo-500' },
  inspecting: { label: '质检中', className: 'bg-[var(--amber-300)]/20 text-[var(--amber-600)]' },
  partial_return: { label: '部分退货', className: 'bg-[var(--red-50)] text-[var(--red-500)]' },
  qualified: { label: '已合格', className: 'bg-[var(--green-50)] text-[var(--green-500)]' },
  unqualified: { label: '不合格', className: 'bg-[var(--red-50)] text-[var(--red-500)]' },
  returned: { label: '已退货', className: 'bg-[var(--red-50)] text-[var(--red-500)]' },
  completed: { label: '已完成', className: 'bg-[var(--green-50)] text-[var(--green-500)]' },
  rejected: { label: '已驳回', className: 'bg-[var(--gray-100)] text-[var(--gray-500)]' },
};

export default function Orders() {
  const navigate = useNavigate();
  const { orders, suppliers, fetchOrders, fetchSuppliers, loading } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, [fetchOrders, fetchSuppliers]);

  const filtered = orders.filter((o: Order) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (supplierFilter && o.supplierId !== supplierFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        o.orderNo.toLowerCase().includes(s) ||
        o.supplierName.toLowerCase().includes(s) ||
        o.items.some((item) => item.materialName.toLowerCase().includes(s))
      );
    }
    return true;
  });

  if (loading.orders) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--gray-700)]">采购订单</h1>
        <button onClick={() => navigate('/orders/create')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> 新建订单
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gray-400)]" />
            <input
              type="text"
              placeholder="搜索订单号、供应商、物料..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn-secondary flex items-center gap-2', showFilters && 'border-[var(--amber-500)] text-[var(--amber-500)]')}
          >
            <Filter className="w-4 h-4" /> 筛选
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--gray-100)]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
              className="select-field w-40"
            >
              <option value="">全部状态</option>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="select-field w-40"
            >
              <option value="">全部供应商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setStatusFilter(''); setSupplierFilter(''); }}
              className="text-sm text-[var(--amber-500)] hover:underline"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">订单号</th>
              <th className="table-header">供应商</th>
              <th className="table-header">物料</th>
              <th className="table-header">金额</th>
              <th className="table-header">状态</th>
              <th className="table-header">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="hover:bg-[var(--gray-50)] cursor-pointer transition-colors"
              >
                <td className="table-cell font-medium text-[var(--amber-500)]">{order.orderNo}</td>
                <td className="table-cell">{order.supplierName}</td>
                <td className="table-cell">
                  {order.items.length === 1
                    ? `${order.items[0].materialName} × ${order.items[0].quantity}${order.items[0].unit}`
                    : `${order.items[0].materialName} 等${order.items.length}项`}
                </td>
                <td className="table-cell font-mono-num">¥{order.totalAmount.toLocaleString()}</td>
                <td className="table-cell">
                  <span className={cn('badge', statusConfig[order.status].className)}>
                    {statusConfig[order.status].label}
                  </span>
                </td>
                <td className="table-cell text-[var(--gray-400)]">
                  {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[var(--gray-400)]">
                  暂无订单数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
