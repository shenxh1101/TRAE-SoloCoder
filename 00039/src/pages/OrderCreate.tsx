import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useStore, OrderItem } from '@/store';
import { cn } from '@/lib/utils';

export default function OrderCreate() {
  const navigate = useNavigate();
  const { suppliers, materials, fetchSuppliers, fetchMaterials, createOrder } = useStore();
  const [supplierId, setSupplierId] = useState('');
  const [budget, setBudget] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialPicker, setShowMaterialPicker] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchMaterials();
  }, [fetchSuppliers, fetchMaterials]);

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const budgetNum = parseFloat(budget) || 0;

  const addMaterialItem = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (!material) return;
    if (items.some((i) => i.materialId === materialId)) return;
    setItems([
      ...items,
      {
        materialId: material.id,
        materialName: material.name,
        spec: material.spec,
        unit: material.unit,
        quantity: 1,
        unitPrice: material.suggestedPrice,
        totalPrice: material.suggestedPrice,
      },
    ]);
    setShowMaterialPicker(null);
    setMaterialSearch('');
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: number | string) => {
    setItems(
      items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const filteredMaterials = materials.filter(
    (m) =>
      !items.some((i) => i.materialId === m.id) &&
      (m.name.includes(materialSearch) || m.spec.includes(materialSearch))
  );

  const handleSubmit = async () => {
    if (!supplierId || items.length === 0) return;
    setSubmitting(true);
    try {
      const supplier = suppliers.find((s) => s.id === supplierId);
      await createOrder({
        supplierId,
        supplierName: supplier?.name || '',
        items,
        totalAmount,
        budget: budgetNum,
        status: 'pending_approval',
        createdBy: useStore.getState().currentUser.name,
      });
      navigate('/orders');
    } catch {
      alert('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const trendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-[var(--red-500)]" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-[var(--green-500)]" />;
    return <Minus className="w-3.5 h-3.5 text-[var(--gray-400)]" />;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[var(--gray-100)] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-[var(--gray-700)]">创建采购订单</h1>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-[var(--gray-700)] mb-4">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--gray-500)] mb-1">供应商</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="select-field">
                  <option value="">请选择供应商</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--gray-500)] mb-1">预算金额（元）</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="输入预算金额"
                  className="input-field font-mono-num"
                />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[var(--gray-700)]">物料清单</h2>
              <button onClick={() => setShowMaterialPicker(items.length)} className="btn-secondary flex items-center gap-1 text-sm">
                <Plus className="w-4 h-4" /> 添加物料
              </button>
            </div>

            {showMaterialPicker !== null && (
              <div className="mb-4 p-3 border border-[var(--gray-200)] rounded-lg bg-[var(--gray-50)]">
                <input
                  type="text"
                  placeholder="搜索物料名称或规格..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="input-field mb-2"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredMaterials.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addMaterialItem(m.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white text-left transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-[var(--gray-400)] ml-2">{m.spec}</span>
                      </div>
                      <span className="text-sm font-mono-num text-[var(--amber-500)]">¥{m.suggestedPrice.toLocaleString()}/{m.unit}</span>
                    </button>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <div className="text-sm text-[var(--gray-400)] text-center py-3">无匹配物料</div>
                  )}
                </div>
              </div>
            )}

            {items.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">物料</th>
                    <th className="table-header">规格</th>
                    <th className="table-header">数量</th>
                    <th className="table-header">单价</th>
                    <th className="table-header">小计</th>
                    <th className="table-header w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.materialId}>
                      <td className="table-cell font-medium">{item.materialName}</td>
                      <td className="table-cell text-[var(--gray-400)]">{item.spec}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                            className="input-field w-20 font-mono-num text-center py-1"
                          />
                          <span className="text-xs text-[var(--gray-400)]">{item.unit}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="input-field w-24 font-mono-num text-center py-1"
                        />
                      </td>
                      <td className="table-cell font-mono-num font-medium">¥{item.totalPrice.toLocaleString()}</td>
                      <td className="table-cell">
                        <button onClick={() => removeItem(idx)} className="p-1 text-[var(--gray-400)] hover:text-[var(--red-500)] transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {items.length === 0 && (
              <div className="text-center py-10 text-[var(--gray-400)]">请添加物料</div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-[var(--gray-700)] mb-4">建议价格</h2>
            <div className="space-y-3">
              {items.map((item) => {
                const mat = materials.find((m) => m.id === item.materialId);
                if (!mat) return null;
                return (
                  <div key={item.materialId} className="p-3 rounded-lg border border-[var(--gray-200)]">
                    <div className="font-medium text-sm mb-2">{item.materialName}</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--gray-400)]">历史均价</span>
                        <div className="flex items-center gap-1 font-mono-num">
                          ¥{mat.historyAvgPrice.toLocaleString()} {trendIcon(mat.priceTrend)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--gray-400)]">市场行情</span>
                        <div className="flex items-center gap-1 font-mono-num">
                          ¥{mat.marketPrice.toLocaleString()} {trendIcon(mat.priceTrend)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-[var(--amber-500)]">建议单价</span>
                        <span className="font-mono-num text-[var(--amber-500)]">¥{mat.suggestedPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <div className="text-sm text-[var(--gray-400)] text-center py-4">添加物料后查看</div>}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-[var(--gray-700)] mb-4">费用汇总</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-400)]">物料总额</span>
                <span className="font-mono-num">¥{totalAmount.toLocaleString()}</span>
              </div>
              {budgetNum > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--gray-400)]">预算金额</span>
                    <span className="font-mono-num">¥{budgetNum.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[var(--gray-200)] pt-2 flex justify-between text-sm font-medium">
                    <span>预算余额</span>
                    <span className={cn('font-mono-num', budgetNum - totalAmount >= 0 ? 'text-[var(--green-500)]' : 'text-[var(--red-500)]')}>
                      ¥{(budgetNum - totalAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--gray-200)] mt-1">
                    <div
                      className={cn('h-full rounded-full transition-all', totalAmount / budgetNum > 1 ? 'bg-[var(--red-500)]' : 'bg-[var(--amber-500)]')}
                      style={{ width: `${Math.min((totalAmount / budgetNum) * 100, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!supplierId || items.length === 0 || submitting}
              className="btn-primary w-full mt-5"
            >
              {submitting ? '提交中...' : '提交订单'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
