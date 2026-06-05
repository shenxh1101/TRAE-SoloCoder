import { useEffect, useState, useRef } from 'react';
import { ScanLine, Search, PackagePlus, CheckCircle, AlertCircle, QrCode, Barcode } from 'lucide-react';
import { useStore, InventoryItem } from '@/store';
import { cn } from '@/lib/utils';

export default function Warehouse() {
  const { inventory, materials, orders, fetchInventory, fetchMaterials, fetchOrders, createInventory } = useStore();
  const [barcode, setBarcode] = useState('');
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [showStockIn, setShowStockIn] = useState(false);
  const [stockInForm, setStockInForm] = useState({
    materialId: '', batchNo: '', quantity: '', warehouse: 'A仓', location: '', orderId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    fetchInventory();
    fetchMaterials();
    fetchOrders();
  }, [fetchInventory, fetchMaterials, fetchOrders]);

  useEffect(() => {
    if (scanMode && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scanMode]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    processBarcode(barcode.trim());
  };

  const processBarcode = (code: string) => {
    const byMaterial = materials.find((m) => m.id === code || m.name.includes(code));
    const byBatch = inventory.find((i) => i.batchNo === code);
    const byOrder = orders.find((o) => o.orderNo === code);

    if (byMaterial) {
      setScanFeedback('success');
      setStockInForm({ ...stockInForm, materialId: byMaterial.id });
      setShowStockIn(true);
    } else if (byBatch) {
      setScanFeedback('success');
      setSearch(byBatch.materialName);
    } else if (byOrder) {
      setScanFeedback('success');
      setStockInForm({ ...stockInForm, orderId: byOrder.id });
      const orderItem = byOrder.items[0];
      if (orderItem) {
        setStockInForm((prev) => ({ ...prev, materialId: orderItem.materialId }));
      }
      setShowStockIn(true);
    } else {
      setScanFeedback('error');
    }

    setTimeout(() => setScanFeedback(null), 2000);
    setBarcode('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const now = Date.now();
    if (now - lastKeyTimeRef.current < 50 && e.key.length === 1) {
      bufferRef.current += e.key;
    } else if (e.key === 'Enter' && bufferRef.current.length > 3) {
      processBarcode(bufferRef.current);
      bufferRef.current = '';
      e.preventDefault();
    } else {
      bufferRef.current = e.key.length === 1 ? e.key : '';
    }
    lastKeyTimeRef.current = now;
  };

  const filtered = inventory.filter((item: InventoryItem) => {
    if (warehouseFilter && item.warehouse !== warehouseFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        item.materialName.toLowerCase().includes(s) ||
        item.batchNo.toLowerCase().includes(s) ||
        item.spec.toLowerCase().includes(s) ||
        item.id.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const warehouses = [...new Set(inventory.map((i) => i.warehouse))];
  const qualifiedOrders = orders.filter((o) =>
    o.status === 'qualified' || o.status === 'partial_return' || o.status === 'inspecting'
  );

  const handleStockIn = async () => {
    if (!stockInForm.materialId || !stockInForm.batchNo || !stockInForm.quantity) return;
    setSubmitting(true);
    try {
      const material = materials.find((m) => m.id === stockInForm.materialId);
      await createInventory({
        materialId: stockInForm.materialId,
        materialName: material?.name || '',
        spec: material?.spec || '',
        batchNo: stockInForm.batchNo,
        quantity: parseInt(stockInForm.quantity),
        unit: material?.unit || '',
        warehouse: stockInForm.warehouse,
        location: stockInForm.location,
        orderId: stockInForm.orderId || undefined,
      });
      setShowStockIn(false);
      setStockInForm({ materialId: '', batchNo: '', quantity: '', warehouse: 'A仓', location: '', orderId: '' });
      setScanFeedback('success');
      setTimeout(() => setScanFeedback(null), 2000);
    } catch {
      alert('入库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const selectMaterialForOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order && order.items.length > 0) {
      const item = order.items[0];
      setStockInForm((prev) => ({
        ...prev,
        orderId,
        materialId: item.materialId,
        quantity: item.quantity.toString(),
      }));
    }
  };

  const stats = {
    totalItems: inventory.reduce((sum, i) => sum + i.quantity, 0),
    totalMaterials: inventory.length,
    lowStock: inventory.filter((i) => i.quantity < 10).length,
  };

  return (
    <div className="space-y-5 animate-fade-in" onKeyDown={scanMode ? handleKeyDown : undefined}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--gray-700)]">仓储入库</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setScanMode(!scanMode)}
            className={cn('btn-secondary flex items-center gap-2', scanMode && 'bg-[var(--amber-50)] text-[var(--amber-600)] border-[var(--amber-300)]')}
          >
            {scanMode ? <QrCode className="w-4 h-4 animate-pulse" /> : <Barcode className="w-4 h-4" />}
            {scanMode ? '扫码模式开启中...' : '开启扫码模式'}
          </button>
          <button onClick={() => setShowStockIn(!showStockIn)} className="btn-primary flex items-center gap-2">
            <PackagePlus className="w-4 h-4" /> 新建入库
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-[var(--gray-400)] mb-1">库存总量</div>
          <div className="text-2xl font-bold font-mono-num text-[var(--gray-700)]">{stats.totalItems.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-[var(--gray-400)] mb-1">物料种类</div>
          <div className="text-2xl font-bold font-mono-num text-[var(--blue-500)]">{stats.totalMaterials}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-[var(--gray-400)] mb-1">库存预警</div>
          <div className="text-2xl font-bold font-mono-num text-[var(--red-500)]">{stats.lowStock}</div>
        </div>
      </div>

      <div className={cn('card p-5 transition-all', scanMode && 'ring-2 ring-[var(--amber-500)] ring-offset-2')}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScanLine className={cn('w-5 h-5', scanMode ? 'text-[var(--amber-500)] animate-pulse' : 'text-[var(--gray-400)]')} />
            <span className="text-sm text-[var(--gray-500)]">
              {scanMode ? '扫码枪模式已激活：直接扫描条码即可' : '扫码/手动输入物料编码'}
            </span>
          </div>
          {scanMode && (
            <span className="text-xs text-[var(--amber-500)] bg-amber-50 px-2 py-1 rounded animate-pulse">
              监听键盘输入中...
            </span>
          )}
        </div>
        <form onSubmit={handleScan} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--amber-500)]" />
            <input
              ref={scanInputRef}
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="扫描或输入物料编码、批次号、订单号，按回车确认..."
              className="input-field pl-10 text-lg font-mono-num"
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary">查询/入库</button>
        </form>
        {scanFeedback && (
          <div className={cn('mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
            scanFeedback === 'success' ? 'bg-[var(--green-50)] text-[var(--green-500)]' : 'bg-[var(--red-50)] text-[var(--red-500)]')}>
            {scanFeedback === 'success' ? (
              <><CheckCircle className="w-4 h-4" /> 识别成功！已自动填充信息</>
            ) : (
              <><AlertCircle className="w-4 h-4" /> 未找到对应记录，请检查编码</>
            )}
          </div>
        )}
      </div>

      {showStockIn && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-[var(--gray-700)]">新建入库登记</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">关联订单</label>
              <select
                value={stockInForm.orderId}
                onChange={(e) => selectMaterialForOrder(e.target.value)}
                className="select-field"
              >
                <option value="">不关联订单</option>
                {qualifiedOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.orderNo} - {o.supplierName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">物料</label>
              <select value={stockInForm.materialId} onChange={(e) => setStockInForm({ ...stockInForm, materialId: e.target.value })} className="select-field">
                <option value="">请选择物料</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.spec})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">批次号</label>
              <input type="text" value={stockInForm.batchNo} onChange={(e) => setStockInForm({ ...stockInForm, batchNo: e.target.value })} className="input-field font-mono-num" placeholder="B2026XXXX" />
            </div>
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">数量</label>
              <input type="number" value={stockInForm.quantity} onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })} className="input-field font-mono-num" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">仓库</label>
              <select value={stockInForm.warehouse} onChange={(e) => setStockInForm({ ...stockInForm, warehouse: e.target.value })} className="select-field">
                <option value="A区主仓库">A区主仓库</option>
                <option value="B区化工仓">B区化工仓</option>
                <option value="C区电子仓">C区电子仓</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--gray-500)] mb-1">库位</label>
              <input type="text" value={stockInForm.location} onChange={(e) => setStockInForm({ ...stockInForm, location: e.target.value })} className="input-field font-mono-num" placeholder="A-01-01" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowStockIn(false)} className="btn-secondary">取消</button>
            <button onClick={handleStockIn} disabled={submitting || !stockInForm.materialId || !stockInForm.batchNo} className="btn-primary">
              {submitting ? '提交中...' : '确认入库'}
            </button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gray-400)]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索物料名称、批次号、规格..." className="input-field pl-9" />
          </div>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="select-field w-40">
            <option value="">全部仓库</option>
            {warehouses.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">物料名称</th>
              <th className="table-header">规格</th>
              <th className="table-header">批次号</th>
              <th className="table-header">数量</th>
              <th className="table-header">仓库</th>
              <th className="table-header">库位</th>
              <th className="table-header">入库日期</th>
              <th className="table-header">关联订单</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--gray-50)] transition-colors">
                <td className="table-cell font-medium">{item.materialName}</td>
                <td className="table-cell text-[var(--gray-400)]">{item.spec}</td>
                <td className="table-cell font-mono-num text-[var(--amber-500)]">{item.batchNo}</td>
                <td className="table-cell">
                  <span className={cn('font-mono-num', item.quantity < 10 && 'text-[var(--red-500)]')}>
                    {item.quantity} {item.unit}
                  </span>
                </td>
                <td className="table-cell">{item.warehouse}</td>
                <td className="table-cell font-mono-num">{item.location}</td>
                <td className="table-cell text-[var(--gray-400)]">{item.stockInDate}</td>
                <td className="table-cell">
                  {item.orderId ? (
                    <span className="text-xs bg-[var(--blue-50)] text-[var(--blue-500)] px-2 py-1 rounded">
                      {orders.find((o) => o.id === item.orderId)?.orderNo || '-'}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-[var(--gray-400)]">暂无库存数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
