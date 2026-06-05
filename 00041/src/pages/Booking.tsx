import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wind, Baby, ArrowLeft, ArrowRight, MapPin, Clock, Star, CheckCircle2 } from 'lucide-react';
import { useAppStore, type ServiceType, type Staff } from '@/stores/appStore';
import StarRating from '@/components/StarRating';

const iconMap: Record<string, React.ElementType> = {
  cleaning: Sparkles,
  appliance: Wind,
  maternity: Baby,
};

const timeSlots = [
  '08:00-10:00',
  '10:00-12:00',
  '12:00-14:00',
  '14:00-16:00',
  '16:00-18:00',
  '18:00-20:00',
];

export default function Booking() {
  const navigate = useNavigate();
  const { serviceTypes, fetchServiceTypes, fetchRecommendedStaff, createOrder } = useAppStore();

  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [requirements, setRequirements] = useState('');
  const [recommendedStaff, setRecommendedStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchServiceTypes();
  }, []);

  useEffect(() => {
    if (step === 2 && selectedType) {
      fetchRecommendedStaff(selectedType.name).then(setRecommendedStaff);
    }
  }, [step, selectedType]);

  const canNext = () => {
    if (step === 0) return !!selectedType;
    if (step === 1) return address.trim() !== '' && date !== '' && timeSlot !== '';
    return !!selectedStaff;
  };

  const handleConfirm = async () => {
    if (!selectedType || !selectedStaff) return;
    setSubmitting(true);
    try {
      const order = await createOrder({
        serviceTypeId: selectedType.id,
        address,
        notes: requirements,
        price: selectedType.basePrice,
      } as any);
      setSuccessOrder(order.id);
    } catch {
      alert('预约失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (successOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--success)' }}>
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>预约成功！</h2>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>您的订单号</p>
          <p className="text-lg font-mono font-bold mb-6" style={{ color: 'var(--primary)' }}>{successOrder}</p>
          <button
            onClick={() => navigate(`/order/${successOrder}`)}
            className="px-6 py-2.5 rounded-lg text-white font-medium text-sm"
            style={{ background: 'var(--primary)' }}
          >
            查看订单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        {['选择服务', '填写详情', '选择人员'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: i <= step ? 'var(--primary)' : '#E2E8F0',
                color: i <= step ? 'white' : 'var(--text-secondary)',
              }}
            >
              {i + 1}
            </div>
            <span className={`text-sm font-medium ${i <= step ? '' : ''}`} style={{ color: i <= step ? 'var(--text)' : 'var(--text-secondary)' }}>
              {label}
            </span>
            {i < 2 && <div className="w-12 h-0.5 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="grid grid-cols-3 gap-5 animate-slide-up">
          {serviceTypes.map((st) => {
            const Icon = iconMap[st.icon] || Sparkles;
            const isSelected = selectedType?.id === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedType(st)}
                className={`bg-white rounded-xl p-6 text-left border-2 transition-all hover:shadow-md ${
                  isSelected ? 'shadow-md' : 'border-transparent'
                }`}
                style={{ borderColor: isSelected ? 'var(--primary)' : undefined }}
              >
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--primary)', opacity: isSelected ? 1 : 0.85 }}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text)' }}>{st.name}</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{st.description}</p>
                <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>¥{st.basePrice}起</p>
              </button>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl p-8 max-w-xl animate-slide-up">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                <MapPin size={14} className="inline mr-1" />服务地址
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="请输入详细地址"
                className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: '#E2E8F0', '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  <Clock size={14} className="inline mr-1" />服务日期
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E2E8F0' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>时间段</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <option value="">请选择</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>特殊要求</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="如有特殊需求请在此说明"
                rows={3}
                className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                style={{ borderColor: '#E2E8F0' }}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>系统根据评分、距离和任务负荷为您推荐以下服务人员</p>
          <div className="grid grid-cols-3 gap-5">
            {recommendedStaff.map((staff) => {
              const isSelected = selectedStaff === staff.id;
              return (
                <div
                  key={staff.id}
                  className={`bg-white rounded-xl p-6 border-2 transition-all hover:shadow-md ${
                    isSelected ? 'shadow-md' : 'border-transparent'
                  }`}
                  style={{ borderColor: isSelected ? 'var(--primary)' : undefined }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'var(--primary)' }}
                    >
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold" style={{ color: 'var(--text)' }}>{staff.name}</h4>
                      <StarRating value={staff.rating} readonly size={14} />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} /> 距离 {staff.distance?.toFixed(1) || '-'}km
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} /> 预计到达 ~{staff.estimatedArrivalMin ?? 15}分钟
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star size={14} /> 已完成 {staff.totalOrders} 单
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStaff(staff.id)}
                    className="w-full mt-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                    style={{
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      color: isSelected ? 'white' : 'var(--primary)',
                      borderColor: 'var(--primary)',
                    }}
                  >
                    {isSelected ? '已选择' : '选择'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 max-w-xl">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-medium border disabled:opacity-40"
          style={{ borderColor: '#E2E8F0', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} /> 上一步
        </button>
        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--primary)' }}
          >
            下一步 <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={!canNext() || submitting}
            className="flex items-center gap-1 px-6 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--primary)' }}
          >
            确认预约
          </button>
        )}
      </div>
    </div>
  );
}
