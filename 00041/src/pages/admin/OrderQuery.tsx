import { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useAppStore, type Order, type OrderStatus } from '@/stores/appStore';
import StatusBadge from '@/components/StatusBadge';

const serviceTypeOptions = ['全部', '日常保洁', '家电清洗', '月嫂育儿'];
const ratingOptions = ['全部', '5星', '4星及以上', '3星及以下'];

export default function OrderQuery() {
  const { fetchAdminOrders } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceType, setServiceType] = useState('全部');
  const [rating, setRating] = useState('全部');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (serviceType !== '全部') params.serviceType = serviceType;
    if (rating !== '全部') {
      if (rating === '5星') params.rating = '5';
      else if (rating === '4星及以上') params.rating = '4';
      else if (rating === '3星及以下') params.rating = '3';
    }
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    try {
      const data = await fetchAdminOrders(Object.keys(params).length > 0 ? params : undefined);
      setOrders(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--secondary)' }}>订单查询</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>筛选条件</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>服务类型</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: '#E2E8F0' }}
            >
              {serviceTypeOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>评价等级</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: '#E2E8F0' }}
            >
              {ratingOptions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>开始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>结束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={loadOrders}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'var(--primary)' }}
          >
            <Search size={14} /> 查询
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium border-b" style={{ color: 'var(--text-secondary)' }}>
                <th className="px-6 py-3">订单号</th>
                <th className="px-6 py-3">服务类型</th>
                <th className="px-6 py-3">地址</th>
                <th className="px-6 py-3">预约时间</th>
                <th className="px-6 py-3">状态</th>
                <th className="px-6 py-3">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={6} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>暂无订单</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono" style={{ color: 'var(--text)' }}>{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text)' }}>{(order as any).serviceTypeName || order.serviceTypeId}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{order.address}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{order.notes || '-'}</td>
                    <td className="px-6 py-4"><StatusBadge status={order.status as OrderStatus} /></td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(order.createdAt).toLocaleDateString('zh-CN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
