import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, Download, FileText, AlertTriangle } from 'lucide-react';
import { useStore, OrderStatus, OperationLog, UserRole } from '@/store';
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

const timeline = ['pending_quote', 'quoted', 'approved', 'contracted', 'shipping', 'inspecting', 'completed'];

type TabKey = 'basic' | 'price' | 'quote' | 'contract' | 'logs';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    orders, materials, currentUser, currentContract,
    fetchOrders, fetchMaterials, fetchContract, generateContract, signContract,
    updateOrderStatus, approveLockedOrder, getOperationLogs, operationLogs
  } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [signingRole, setSigningRole] = useState<'buyer' | 'supplier' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchMaterials();
    if (id) {
      getOperationLogs(id);
      fetchContract(id);
    }
  }, [fetchOrders, fetchMaterials, getOperationLogs, fetchContract, id]);

  const order = orders.find((o) => o.id === id);
  const currentStatusIdx = order ? timeline.indexOf(order.status) : -1;

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1B2A4A';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.stroke();
  }, []);

  const stopDraw = useCallback(() => { isDrawing.current = false; }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawing = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasDrawing) return null;
    return canvas.toDataURL('image/png');
  };

  const handleStartSign = (role: 'buyer' | 'supplier') => {
    setSigningRole(role);
    clearSignature();
  };

  const handleSign = async () => {
    if (!signingRole || !currentContract) return;
    const signature = getSignatureData();
    if (!signature) {
      alert('请先签名后再提交');
      return;
    }
    setIsSubmitting(true);
    try {
      await signContract(currentContract.id, signingRole, signature);
      setSigningRole(null);
      clearSignature();
      await fetchContract(id!);
    } catch (err) {
      console.error('签名失败:', err);
      alert('签名失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateContract = async () => {
    if (!id) return;
    try {
      await generateContract(id);
    } catch (err) {
      console.error('生成合同失败:', err);
      alert('生成合同失败，请重试');
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    await updateOrderStatus(id, 'approved');
  };

  const handleApproveLocked = async (approved: boolean) => {
    if (!id) return;
    try {
      await approveLockedOrder(id, approved);
    } catch (err) {
      console.error('审批失败:', err);
      alert('审批失败，请重试');
    }
  };

  const canSignAsBuyer = currentUser.role === 'purchaser' || currentUser.role === 'admin';
  const canSignAsSupplier = currentUser.role === 'admin';

  const displayLogs: OperationLog[] = operationLogs.length > 0 ? operationLogs : [
    { id: 'l1', orderId: order?.id || '', action: '创建订单', operator: order?.createdBy || '', detail: '创建采购订单', createdAt: order?.createdAt || new Date().toISOString() },
  ];

  if (!order) {
    return <div className="text-center py-20 text-[var(--gray-400)]">订单不存在</div>;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'basic', label: '基本信息' },
    { key: 'price', label: '建议单价分析' },
    { key: 'quote', label: '供应商报价' },
    { key: 'contract', label: '合同签署' },
    { key: 'logs', label: '操作日志' },
  ];

  const overBudgetPercent = ((order.totalAmount - order.budget) / order.budget) * 100;
  const isOverBudget = overBudgetPercent > 5;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[var(--gray-100)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-[var(--gray-700)]">{order.orderNo}</h1>
          <span className={cn('badge', statusConfig[order.status].className)}>{statusConfig[order.status].label}</span>
          {isOverBudget && (
            <span className="badge bg-[var(--red-50)] text-[var(--red-500)] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 超预算 {overBudgetPercent.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {order.status === 'pending_approval' && (
            <button onClick={handleApprove} className="btn-primary">审批通过</button>
          )}
          {order.status === 'locked' && (
            <>
              <button onClick={() => handleApproveLocked(false)} className="btn-danger">驳回</button>
              <button onClick={() => handleApproveLocked(true)} className="btn-primary">加签通过</button>
            </>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          {timeline.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  i <= currentStatusIdx ? 'bg-[var(--green-500)] text-white' : 'bg-[var(--gray-200)] text-[var(--gray-400)]'
                )}>
                  {i <= currentStatusIdx ? <CheckCircle className="w-5 h-5" /> : i}
                </div>
                <span className={cn('text-[10px] mt-1', i <= currentStatusIdx ? 'text-[var(--green-500)]' : 'text-[var(--gray-400)]')}>
                  {statusConfig[s].label}
                </span>
              </div>
              {i < timeline.length - 1 && (
                <div className={cn('w-16 h-0.5 mx-2', i < currentStatusIdx ? 'bg-[var(--green-500)]' : 'bg-[var(--gray-200)]')} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex border-b border-[var(--gray-200)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-5 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-[var(--amber-500)] text-[var(--amber-500)]'
                  : 'border-transparent text-[var(--gray-500)] hover:text-[var(--gray-700)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'basic' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-sm text-[var(--gray-400)]">订单号</span><div className="font-medium mt-1">{order.orderNo}</div></div>
                <div><span className="text-sm text-[var(--gray-400)]">供应商</span><div className="font-medium mt-1">{order.supplierName}</div></div>
                <div><span className="text-sm text-[var(--gray-400)]">创建人</span><div className="font-medium mt-1">{order.createdBy}</div></div>
                <div><span className="text-sm text-[var(--gray-400)]">创建时间</span><div className="mt-1">{new Date(order.createdAt).toLocaleString('zh-CN')}</div></div>
                <div><span className="text-sm text-[var(--gray-400)]">预算金额</span><div className="font-mono-num font-medium mt-1">¥{order.budget.toLocaleString()}</div></div>
                <div><span className="text-sm text-[var(--gray-400)]">实际金额</span><div className={cn('font-mono-num font-medium mt-1', isOverBudget ? 'text-[var(--red-500)]' : '')}>¥{order.totalAmount.toLocaleString()}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[var(--gray-400)] mb-2">预算对比</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>已用预算</span>
                        <span className="font-mono-num">{((order.totalAmount / order.budget) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[var(--gray-200)]">
                        <div
                          className={cn('h-full rounded-full', isOverBudget ? 'bg-[var(--red-500)]' : 'bg-[var(--amber-500)]')}
                          style={{ width: `${Math.min((order.totalAmount / order.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className={cn('font-mono-num text-sm font-medium', order.budget - order.totalAmount >= 0 ? 'text-[var(--green-500)]' : 'text-[var(--red-500)]')}>
                      {order.budget - order.totalAmount >= 0 ? '节省' : '超支'} ¥{Math.abs(order.budget - order.totalAmount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <table className="w-full">
                <thead><tr><th className="table-header">物料</th><th className="table-header">规格</th><th className="table-header">数量</th><th className="table-header">单价</th><th className="table-header">小计</th></tr></thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.materialId}>
                      <td className="table-cell font-medium">{item.materialName}</td>
                      <td className="table-cell text-[var(--gray-400)]">{item.spec}</td>
                      <td className="table-cell font-mono-num">{item.quantity} {item.unit}</td>
                      <td className="table-cell font-mono-num">¥{item.unitPrice.toLocaleString()}</td>
                      <td className="table-cell font-mono-num font-medium">¥{item.totalPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'price' && (
            <div className="space-y-3">
              {order.items.map((item) => {
                const mat = materials.find((m) => m.id === item.materialId);
                return (
                  <div key={item.materialId} className="p-4 rounded-lg border border-[var(--gray-200)]">
                    <div className="font-medium mb-3">{item.materialName} <span className="text-[var(--gray-400)] text-sm">{item.spec}</span></div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-[var(--gray-50)]">
                        <div className="text-xs text-[var(--gray-400)] mb-1">历史均价</div>
                        <div className="font-mono-num text-lg font-semibold">¥{mat?.historyAvgPrice.toLocaleString() || '-'}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-[var(--gray-50)]">
                        <div className="text-xs text-[var(--gray-400)] mb-1">市场行情</div>
                        <div className="font-mono-num text-lg font-semibold">¥{mat?.marketPrice.toLocaleString() || '-'}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-50">
                        <div className="text-xs text-[var(--amber-500)] mb-1">建议单价</div>
                        <div className="font-mono-num text-lg font-semibold text-[var(--amber-500)]">¥{mat?.suggestedPrice.toLocaleString() || '-'}</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-[var(--blue-50)]">
                        <div className="text-xs text-[var(--blue-500)] mb-1">实际单价</div>
                        <div className="font-mono-num text-lg font-semibold text-[var(--blue-500)]">¥{item.unitPrice.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'quote' && (
            <div>
              <table className="w-full">
                <thead><tr><th className="table-header">供应商</th><th className="table-header">报价</th><th className="table-header">交货期</th><th className="table-header">状态</th><th className="table-header">操作</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="table-cell font-medium">{order.supplierName}</td>
                    <td className="table-cell font-mono-num">¥{order.totalAmount.toLocaleString()}</td>
                    <td className="table-cell">7个工作日</td>
                    <td className="table-cell">
                      <span className={cn('badge', isOverBudget ? 'badge-danger' : 'badge-success')}>
                        {isOverBudget ? '超预算' : '已报价'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button className="text-sm text-[var(--blue-500)] hover:underline">查看详情</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'contract' && (
            <div className="space-y-4">
              {!currentContract ? (
                <div className="text-center py-12 border-2 border-dashed border-[var(--gray-200)] rounded-lg">
                  <FileText className="w-12 h-12 text-[var(--gray-300)] mx-auto mb-3" />
                  <div className="text-[var(--gray-500)] mb-4">订单已审批通过，可以生成电子合同</div>
                  {order.status === 'approved' && (
                    <button onClick={handleGenerateContract} className="btn-primary">
                      生成电子合同
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-lg border border-[var(--gray-200)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-[var(--gray-500)]">合同信息</div>
                      <span className={cn('badge',
                        currentContract.status === 'signed' ? 'badge-success' :
                        currentContract.status === 'partial_signed' ? 'badge-warning' :
                        'bg-[var(--gray-100)] text-[var(--gray-500)]'
                      )}>
                        {currentContract.status === 'signed' ? '已生效' :
                         currentContract.status === 'partial_signed' ? '部分签署' : '待签署'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-[var(--gray-400)]">合同编号：</span>CT-{order.orderNo}</div>
                      <div><span className="text-[var(--gray-400)]">合同金额：</span><span className="font-mono-num">¥{order.totalAmount.toLocaleString()}</span></div>
                      <div><span className="text-[var(--gray-400)]">甲方：</span>智采质检有限公司</div>
                      <div><span className="text-[var(--gray-400)]">乙方：</span>{order.supplierName}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-[var(--gray-200)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">甲方签名 (采购员)</span>
                        {currentContract.buyerSignedAt && (
                          <span className="text-xs text-[var(--green-500)]">
                            已签署 · {new Date(currentContract.buyerSignedAt).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                      {currentContract.buyerSignature ? (
                        <div className="h-32 bg-[var(--gray-50)] rounded flex items-center justify-center">
                          <img src={currentContract.buyerSignature} alt="买方签名" className="h-full" />
                        </div>
                      ) : (
                        <div className="h-32 bg-[var(--gray-50)] rounded flex items-center justify-center text-[var(--gray-400)] text-sm">
                          待签署
                        </div>
                      )}
                      {!currentContract.buyerSignature && canSignAsBuyer && (
                        <button
                          onClick={() => handleStartSign('buyer')}
                          className={cn('w-full mt-2 text-sm py-2 rounded-lg transition-colors',
                            signingRole === 'buyer' ? 'bg-[var(--amber-100)] text-[var(--amber-600)]' : 'btn-secondary')}
                        >
                          {signingRole === 'buyer' ? '正在签署...' : '签署'}
                        </button>
                      )}
                    </div>

                    <div className="p-4 rounded-lg border border-[var(--gray-200)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">乙方签名 (供应商)</span>
                        {currentContract.supplierSignedAt && (
                          <span className="text-xs text-[var(--green-500)]">
                            已签署 · {new Date(currentContract.supplierSignedAt).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                      </div>
                      {currentContract.supplierSignature ? (
                        <div className="h-32 bg-[var(--gray-50)] rounded flex items-center justify-center">
                          <img src={currentContract.supplierSignature} alt="卖方签名" className="h-full" />
                        </div>
                      ) : (
                        <div className="h-32 bg-[var(--gray-50)] rounded flex items-center justify-center text-[var(--gray-400)] text-sm">
                          待签署
                        </div>
                      )}
                      {!currentContract.supplierSignature && canSignAsSupplier && (
                        <button
                          onClick={() => handleStartSign('supplier')}
                          className={cn('w-full mt-2 text-sm py-2 rounded-lg transition-colors',
                            signingRole === 'supplier' ? 'bg-[var(--amber-100)] text-[var(--amber-600)]' : 'btn-secondary')}
                        >
                          {signingRole === 'supplier' ? '正在签署...' : '签署'}
                        </button>
                      )}
                    </div>
                  </div>

                  {signingRole && (
                    <div className="p-4 rounded-lg border-2 border-dashed border-[var(--amber-500)] bg-amber-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--amber-600)] font-medium">
                          {signingRole === 'buyer' ? '请签署甲方（采购员）签名' : '请签署乙方（供应商）签名'}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={clearSignature} className="btn-secondary text-sm py-1">清除</button>
                          <button onClick={handleSign} disabled={isSubmitting} className="btn-primary text-sm py-1">
                            {isSubmitting ? '提交中...' : '确认签署'}
                          </button>
                        </div>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={200}
                        className="border border-[var(--gray-200)] rounded-lg w-full bg-white cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>;
                          startDraw(mouseEvent);
                        }}
                        onTouchMove={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY } as React.MouseEvent<HTMLCanvasElement>;
                          draw(mouseEvent);
                        }}
                        onTouchEnd={stopDraw}
                      />
                      <p className="text-xs text-[var(--gray-400)] mt-2">请在上方区域用鼠标或手指签名</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              {displayLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[var(--gray-50)]">
                  <Clock className="w-4 h-4 text-[var(--gray-400)] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{log.action}</div>
                    <div className="text-xs text-[var(--gray-400)]">{log.detail} · {log.operator} · {new Date(log.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
