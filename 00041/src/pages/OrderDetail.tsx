import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin, Clock, MessageCircle, Send, AlertTriangle, Play, CheckCircle2, Star, Gift } from 'lucide-react';
import { useAppStore, type Order, type Message, type UserCoupon } from '@/stores/appStore';
import StatusBadge from '@/components/StatusBadge';
import AMapTracker from '@/components/AMapTracker';

const statusTimeline = ['pending', 'assigned', 'checked_in', 'in_service', 'completed'] as const;
const statusTimelineLabels: Record<string, string> = {
  pending: '待接单',
  assigned: '已指派',
  checked_in: '已签到',
  in_service: '服务中',
  completed: '已完成',
};

function formatTimer(seconds: number) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchOrder, checkinOrder, startOrder, completeOrder, fetchLocation, fetchMessages, sendMessage, fetchOrderNotifications } = useAppStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [timer, setTimer] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [showCouponBanner, setShowCouponBanner] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchOrder(id);
      setOrder(data);
      if (data.status === 'in_service' && data.serviceStartTime) {
        const elapsed = Math.floor((Date.now() - new Date(data.serviceStartTime).getTime()) / 1000);
        setTimer(elapsed);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id, fetchOrder]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!order || order.status !== 'in_service') return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [order?.status]);

  useEffect(() => {
    if (!id || !order) return;
    if (order.status === 'in_service' || order.status === 'checked_in') {
      fetchLocation(id).then((loc) => {
        if (loc) setLocation(loc as any);
      }).catch(() => {});
      fetchMessages(id).then(setMessages).catch(() => {});

      const interval = setInterval(() => {
        fetchLocation(id).then((loc) => {
          if (loc) setLocation(loc as any);
        }).catch(() => {});
        fetchMessages(id).then(setMessages).catch(() => {});
        fetchOrderNotifications(id).then((data) => {
          if (data?.coupons?.length > 0) {
            setCoupons(data.coupons);
            const hasNew = data.coupons.some((c: UserCoupon) => !coupons.some(oc => oc.id === c.id));
            if (hasNew) setShowCouponBanner(true);
          }
        }).catch(() => {});
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [id, order?.status]);

  useEffect(() => {
    if (!id || !order || order.status !== 'in_service') return;
    fetchOrderNotifications(id).then((data) => {
      if (data?.coupons?.length > 0) {
        setCoupons(data.coupons);
        setShowCouponBanner(true);
      }
    }).catch(() => {});
  }, [id, order?.status]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!id || !msgInput.trim()) return;
    await sendMessage(id, msgInput.trim());
    setMsgInput('');
    fetchMessages(id).then(setMessages);
  };

  const handleAction = async (action: 'checkin' | 'start' | 'complete') => {
    if (!id) return;
    if (action === 'checkin') await checkinOrder(id);
    if (action === 'start') await startOrder(id);
    if (action === 'complete') await completeOrder(id);
    loadOrder();
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-20" style={{ color: 'var(--text-secondary)' }}>订单不存在</div>;
  }

  const isOverdue = timer > 15 * 60;
  const timelineIdx = statusTimeline.indexOf(order.status as typeof statusTimeline[number]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--secondary)' }}>订单详情</h1>
        <StatusBadge status={order.status} pulsing={order.status === 'in_service'} />
      </div>

      {showCouponBanner && coupons.length > 0 && (
        <div
          className="rounded-xl p-5 shadow-sm border flex items-start gap-4 animate-slide-up"
          style={{ background: 'linear-gradient(135deg, #FFF5EB 0%, #FFE8D6 100%)', borderColor: '#FFD4B0' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
            <Gift size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm" style={{ color: 'var(--primary-dark)' }}>超时补偿优惠券</h4>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              因服务超时15分钟，系统已自动为您发放补偿
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: 'white', border: '1px solid #FFD4B0' }}
                >
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>¥{c.amount}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>优惠券码: {c.code}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowCouponBanner(false)}
            className="text-xs px-2 py-1 rounded hover:bg-white/50 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            关闭
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>订单信息</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>服务类型</span><span style={{ color: 'var(--text)' }}>{order.serviceTypeName || order.serviceTypeId}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>服务地址</span><span style={{ color: 'var(--text)' }}>{order.address}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>创建时间</span><span style={{ color: 'var(--text)' }}>{new Date(order.createdAt).toLocaleString('zh-CN')}</span></div>
            {order.notes && (
              <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>特殊要求</span><span style={{ color: 'var(--text)' }}>{order.notes}</span></div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border flex flex-col items-center justify-center">
          <QRCodeSVG value={order.qrCode || order.id} size={140} />
          <p className="text-xs mt-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{order.id}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold mb-5" style={{ color: 'var(--text)' }}>状态进度</h3>
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-gray-200" />
          {statusTimeline.map((status, idx) => {
            const isDone = idx <= timelineIdx;
            const isCurrent = idx === timelineIdx;
            return (
              <div key={status} className="relative flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent ? 'animate-pulse-dot' : ''
                  }`}
                  style={{
                    background: isDone ? 'var(--primary)' : '#E2E8F0',
                    color: isDone ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {idx + 1}
                </div>
                <span className="text-xs mt-2 font-medium" style={{ color: isDone ? 'var(--primary)' : 'var(--text-secondary)' }}>
                  {statusTimelineLabels[status]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(order.status === 'in_service') && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>服务计时</h3>
          <div className="flex items-center gap-4">
            <Clock size={24} style={{ color: isOverdue ? 'var(--danger)' : 'var(--success)' }} />
            <span className="text-4xl font-mono font-bold" style={{ color: isOverdue ? 'var(--danger)' : 'var(--success)' }}>
              {formatTimer(timer)}
            </span>
          </div>
          {isOverdue && !showCouponBanner && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg" style={{ background: '#FFF5F5' }}>
              <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
              <span className="text-sm" style={{ color: 'var(--danger)' }}>服务已超时15分钟，系统将发放补偿优惠券</span>
            </div>
          )}
          {isOverdue && showCouponBanner && coupons.length > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg" style={{ background: '#F0FFF4' }}>
              <Gift size={16} style={{ color: 'var(--success)' }} />
              <span className="text-sm" style={{ color: 'var(--success)' }}>已发放补偿优惠券 ¥{coupons[0].amount}（码：{coupons[0].code}）</span>
            </div>
          )}
        </div>
      )}

      {(order.status === 'in_service' || order.status === 'checked_in') && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>
              <MapPin size={16} className="inline mr-1" />实时位置
            </h3>
            <div className="h-56 rounded-lg overflow-hidden" style={{ background: '#EDF2F7' }}>
              {location && location.lat && location.lng ? (
                <AMapTracker
                  lat={location.lat}
                  lng={location.lng}
                  label={location.name || order.staffName || '服务人员'}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>获取位置中...</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border flex flex-col">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>
              <MessageCircle size={16} className="inline mr-1" />临时消息
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 max-h-40">
              {messages.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-secondary)' }}>暂无消息</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                      msg.senderType === 'user' ? 'text-white' : ''
                    }`}
                    style={{
                      background: msg.senderType === 'user' ? 'var(--primary)' : msg.senderType === 'system' ? '#FEF3C7' : '#EDF2F7',
                      color: msg.senderType === 'user' ? 'white' : msg.senderType === 'system' ? '#92400E' : 'var(--text)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="输入消息..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: '#E2E8F0' }}
              />
              <button
                onClick={handleSendMessage}
                className="px-3 py-2 rounded-lg text-white"
                style={{ background: 'var(--primary)' }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {order.status === 'checked_in' && (
          <>
            <button
              onClick={() => handleAction('checkin')}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--primary)' }}
            >
              签到
            </button>
            <button
              onClick={() => handleAction('start')}
              className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--success)' }}
            >
              <Play size={16} /> 开始服务
            </button>
          </>
        )}
        {order.status === 'in_service' && (
          <button
            onClick={() => handleAction('complete')}
            className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--success)' }}
          >
            <CheckCircle2 size={16} /> 完成服务
          </button>
        )}
        {order.status === 'completed' && (
          <button
            onClick={() => navigate(`/review/${order.id}`)}
            className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--primary)' }}
          >
            <Star size={16} /> 去评价
          </button>
        )}
      </div>
    </div>
  );
}
