import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { useStore, Inspection, InspectionItem } from '@/store';
import { cn } from '@/lib/utils';

export default function Quality() {
  const navigate = useNavigate();
  const { inspections, orders, fetchInspections, fetchOrders, createInspection } = useStore();
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [formItems, setFormItems] = useState<InspectionItem[]>([
    { name: '', standard: '', actual: '', passed: null },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInspections();
    fetchOrders();
  }, [fetchInspections, fetchOrders]);

  const pendingInspections = inspections.filter((i) => i.result === 'pending');
  const completedInspections = inspections.filter((i) => i.result !== 'pending');

  const addFormItem = () => {
    setFormItems([...formItems, { name: '', standard: '', actual: '', passed: null }]);
  };

  const removeFormItem = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const updateFormItem = (idx: number, field: keyof InspectionItem, value: string | boolean | null) => {
    setFormItems(formItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const autoJudge = (): 'qualified' | 'unqualified' => {
    if (formItems.some((i) => i.passed === false)) return 'unqualified';
    if (formItems.every((i) => i.passed === true)) return 'qualified';
    return 'unqualified';
  };

  const handleSubmit = async () => {
    if (!selectedOrder || !batchNo || formItems.some((i) => !i.name)) return;
    setSubmitting(true);
    try {
      const order = orders.find((o) => o.id === selectedOrder);
      await createInspection({
        orderId: selectedOrder,
        orderNo: order?.orderNo || '',
        supplierName: order?.supplierName || '',
        batchNo,
        items: formItems,
        result: autoJudge(),
        inspector: useStore.getState().currentUser.name,
      });
      setShowForm(false);
      setSelectedOrder('');
      setBatchNo('');
      setFormItems([{ name: '', standard: '', actual: '', passed: null }]);
    } catch {
      alert('提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderInspection = (insp: Inspection) => (
    <div key={insp.id} className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-medium">{insp.orderNo}</span>
          <span className="text-sm text-[var(--gray-400)] ml-3">{insp.supplierName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--gray-400)]">批次: {insp.batchNo}</span>
          {insp.result === 'qualified' ? (
            <span className="badge badge-success">合格</span>
          ) : insp.result === 'unqualified' ? (
            <span className="badge badge-danger">不合格</span>
          ) : (
            <span className="badge badge-pending">待检</span>
          )}
        </div>
      </div>
      {insp.items.length > 0 && (
        <table className="w-full mt-3">
          <thead>
            <tr>
              <th className="table-header">检验项</th>
              <th className="table-header">标准</th>
              <th className="table-header">实测</th>
              <th className="table-header">结果</th>
            </tr>
          </thead>
          <tbody>
            {insp.items.map((item, i) => (
              <tr key={i}>
                <td className="table-cell">{item.name}</td>
                <td className="table-cell text-[var(--gray-400)]">{item.standard}</td>
                <td className="table-cell font-mono-num">{item.actual}</td>
                <td className="table-cell">
                  {item.passed === true && <CheckCircle2 className="w-5 h-5 text-[var(--green-500)]" />}
                  {item.passed === false && <XCircle className="w-5 h-5 text-[var(--red-500)]" />}
                  {item.passed === null && <span className="text-[var(--gray-400)]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {insp.result === 'unqualified' && (
        <div className="flex justify-end mt-3">
          <button className="btn-danger flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" /> 触发退货
          </button>
        </div>
      )}
      {insp.result === 'pending' && insp.items.length === 0 && (
        <div className="text-center py-6 text-[var(--gray-400)]">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-[var(--gray-300)]" />
          等待质检登记
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--gray-700)]">质检管理</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" /> 质检登记
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-[var(--gray-700)]">新增质检记录</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">关联订单</label>
              <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className="select-field">
                <option value="">请选择订单</option>
                {orders.filter((o) => ['delivered', 'inspecting'].includes(o.status)).map((o) => (
                  <option key={o.id} value={o.id}>{o.orderNo} - {o.supplierName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">批次号</label>
              <input type="text" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="输入批次号" className="input-field" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--gray-500)]">检验项目</span>
              <button onClick={addFormItem} className="text-sm text-[var(--amber-500)] hover:underline">+ 添加项目</button>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">检验项名称</th>
                  <th className="table-header">标准值</th>
                  <th className="table-header">实测值</th>
                  <th className="table-header">合格</th>
                  <th className="table-header">不合格</th>
                  <th className="table-header w-12"></th>
                </tr>
              </thead>
              <tbody>
                {formItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="table-cell"><input type="text" value={item.name} onChange={(e) => updateFormItem(idx, 'name', e.target.value)} className="input-field py-1" placeholder="项目名称" /></td>
                    <td className="table-cell"><input type="text" value={item.standard} onChange={(e) => updateFormItem(idx, 'standard', e.target.value)} className="input-field py-1" placeholder="标准值" /></td>
                    <td className="table-cell"><input type="text" value={item.actual} onChange={(e) => updateFormItem(idx, 'actual', e.target.value)} className="input-field py-1 font-mono-num" placeholder="实测值" /></td>
                    <td className="table-cell text-center">
                      <input type="radio" name={`pass-${idx}`} checked={item.passed === true} onChange={() => updateFormItem(idx, 'passed', true)} className="w-4 h-4 accent-[var(--green-500)]" />
                    </td>
                    <td className="table-cell text-center">
                      <input type="radio" name={`pass-${idx}`} checked={item.passed === false} onChange={() => updateFormItem(idx, 'passed', false)} className="w-4 h-4 accent-[var(--red-500)]" />
                    </td>
                    <td className="table-cell">
                      {formItems.length > 1 && (
                        <button onClick={() => removeFormItem(idx)} className="text-[var(--gray-400)] hover:text-[var(--red-500)]"><XCircle className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {formItems.every((i) => i.passed !== null) && (
            <div className={cn('flex items-center justify-center gap-3 p-4 rounded-xl', autoJudge() === 'qualified' ? 'bg-[var(--green-50)]' : 'bg-[var(--red-50)]')}>
              {autoJudge() === 'qualified' ? (
                <><CheckCircle2 className="w-12 h-12 text-[var(--green-500)]" /><span className="text-xl font-bold text-[var(--green-500)]">判定合格</span></>
              ) : (
                <><XCircle className="w-12 h-12 text-[var(--red-500)]" /><span className="text-xl font-bold text-[var(--red-500)]">判定不合格</span></>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="btn-secondary">取消</button>
            <button onClick={handleSubmit} disabled={submitting || !selectedOrder || !batchNo} className="btn-primary">
              {submitting ? '提交中...' : '提交质检结果'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab('pending')} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'pending' ? 'bg-[var(--amber-500)] text-white' : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]')}>
          待质检 ({pendingInspections.length})
        </button>
        <button onClick={() => setTab('completed')} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'completed' ? 'bg-[var(--amber-500)] text-white' : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]')}>
          已完成 ({completedInspections.length})
        </button>
      </div>

      <div className="space-y-4">
        {tab === 'pending' ? pendingInspections.map(renderInspection) : completedInspections.map(renderInspection)}
        {(tab === 'pending' ? pendingInspections : completedInspections).length === 0 && (
          <div className="text-center py-16 text-[var(--gray-400)]">暂无数据</div>
        )}
      </div>
    </div>
  );
}
