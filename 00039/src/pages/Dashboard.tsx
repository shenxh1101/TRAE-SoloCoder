import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Clock, AlertTriangle, Package, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '@/store';

function AnimatedCounter({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 1000;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);

  return (
    <span ref={ref} className="font-mono-num font-semibold">
      {prefix}{value.toLocaleString()}{suffix}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { orders, messages, fetchOrders, fetchMessages, loading } = useStore();

  useEffect(() => {
    fetchOrders();
    fetchMessages();
  }, [fetchOrders, fetchMessages]);

  const pendingOrders = orders.filter((o) => o.status === 'pending_approval').length;
  const unqualifiedBatches = orders.filter((o) => o.status === 'unqualified').length;
  const totalPurchase = orders
    .filter((o) => o.createdAt.startsWith('2026-05'))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const lowStock = 2;

  const metricCards = [
    { label: '当月采购额', value: totalPurchase, prefix: '¥', icon: ShoppingCart, color: 'text-[var(--amber-500)]', bg: 'bg-amber-50' },
    { label: '待审批订单', value: pendingOrders, suffix: '单', icon: Clock, color: 'text-[var(--yellow-500)]', bg: 'bg-yellow-50' },
    { label: '不合格批次', value: unqualifiedBatches, suffix: '批', icon: AlertTriangle, color: 'text-[var(--red-500)]', bg: 'bg-red-50' },
    { label: '库存预警', value: lowStock, suffix: '项', icon: Package, color: 'text-[var(--blue-500)]', bg: 'bg-blue-50' },
  ];

  const pendingTasks = [
    { label: '审批订单 PO-2026-0001', action: () => navigate('/orders'), urgent: true },
    { label: '质检 PO-2026-0002 到货', action: () => navigate('/quality'), urgent: true },
    { label: '确认入库批次 B20260501', action: () => navigate('/warehouse'), urgent: false },
  ];

  const recentMessages = messages.slice(0, 4);

  if (loading.orders) {
    return (
      <div className="grid grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="skeleton h-4 w-20 mb-3" />
            <div className="skeleton h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--gray-700)]">工作台</h1>
        <div className="flex gap-3">
          <button onClick={() => navigate('/orders/create')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> 新建订单
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-5">
        {metricCards.map((card) => (
          <div key={card.label} className="card p-5 animate-count-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--gray-500)]">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl">
              <AnimatedCounter target={card.value} prefix={card.prefix} suffix={card.suffix} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 card">
          <div className="px-5 py-4 border-b border-[var(--gray-100)]">
            <h2 className="font-semibold text-[var(--gray-700)]">待办事项</h2>
          </div>
          <div className="p-3">
            {pendingTasks.map((task, i) => (
              <button
                key={i}
                onClick={task.action}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--gray-50)] transition-colors text-left"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${task.urgent ? 'bg-[var(--red-500)]' : 'bg-[var(--yellow-500)]'}`} />
                <span className="text-sm text-[var(--gray-700)] flex-1">{task.label}</span>
                <ArrowRight className="w-4 h-4 text-[var(--gray-400)]" />
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-100)]">
            <h2 className="font-semibold text-[var(--gray-700)]">最新消息</h2>
            <button onClick={() => navigate('/messages')} className="text-sm text-[var(--amber-500)] hover:underline">
              查看全部
            </button>
          </div>
          <div className="divide-y divide-[var(--gray-100)]">
            {recentMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[var(--gray-50)] transition-colors">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${msg.read ? 'bg-[var(--gray-300)]' : 'bg-[var(--amber-500)]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--gray-700)] truncate">{msg.title}</div>
                  <div className="text-xs text-[var(--gray-400)] mt-0.5 truncate">{msg.content}</div>
                </div>
                <span className="text-xs text-[var(--gray-400)] shrink-0">
                  {new Date(msg.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-[var(--gray-700)] mb-4">快捷操作</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '创建订单', icon: ShoppingCart, action: () => navigate('/orders/create') },
            { label: '质检登记', icon: AlertTriangle, action: () => navigate('/quality') },
            { label: '扫码入库', icon: Package, action: () => navigate('/warehouse') },
            { label: '查看报表', icon: Clock, action: () => navigate('/reports') },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--gray-200)] hover:border-[var(--amber-500)] hover:bg-amber-50/50 transition-all group"
            >
              <btn.icon className="w-6 h-6 text-[var(--gray-400)] group-hover:text-[var(--amber-500)] transition-colors" />
              <span className="text-sm text-[var(--gray-600)] group-hover:text-[var(--amber-500)]">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
