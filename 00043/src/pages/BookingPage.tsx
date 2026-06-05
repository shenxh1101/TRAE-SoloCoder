import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Star,
  Check,
  Sparkles,
  Crown,
  Home,
  User,
  ChevronRight,
  Loader2,
  CreditCard,
  Shield,
  PawPrint,
} from 'lucide-react';
import { useAppStore } from '../store';
import { api } from '../services/api';
import type { Package, Caregiver, Pet } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { selectedPetId?: string };

  const {
    pets,
    packages,
    rooms,
    caregivers,
    createBooking,
    payDeposit,
    currentUser,
  } = useAppStore();

  const [selectedPetId, setSelectedPetId] = useState<string>(state?.selectedPetId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [recommendedPackageId, setRecommendedPackageId] = useState('');
  const [assignedCaregiver, setAssignedCaregiver] = useState<Caregiver | null>(null);
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [priceInfo, setPriceInfo] = useState({ days: 0, totalPrice: 0, deposit: 0, pricePerDay: 0 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [newBookingId, setNewBookingId] = useState('');

  const selectedPet = pets.find(p => p.id === selectedPetId);
  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  useEffect(() => {
    if (selectedPetId) {
      loadRecommendations();
    }
  }, [selectedPetId]);

  useEffect(() => {
    if (selectedPackageId && startDate && endDate) {
      const pkg = packages.find(p => p.id === selectedPackageId);
      if (pkg) {
        const price = api.calculatePrice(pkg.pricePerDay, startDate, endDate);
        setPriceInfo(price);
      }

      const availableRoomIds = packages
        .find(p => p.id === selectedPackageId)
        ?.roomIds.filter(rid =>
          rooms.some(r => r.id === rid && r.status === 'available')
        ) || [];
      setAvailableRooms(availableRoomIds);
      if (availableRoomIds.length > 0 && !selectedRoomId) {
        setSelectedRoomId(availableRoomIds[0]);
      }
    }
  }, [selectedPackageId, startDate, endDate, packages, rooms]);

  useEffect(() => {
    if (selectedPetId && startDate && endDate) {
      assignCaregiver();
    }
  }, [selectedPetId, startDate, endDate]);

  const loadRecommendations = async () => {
    setRecommending(true);
    try {
      const result = await api.recommendPackages(selectedPetId);
      const recommended = result.data[0];
      setRecommendedPackageId(recommended?.id || '');
      if (!selectedPackageId && recommended) {
        setSelectedPackageId(recommended.id);
      }
    } finally {
      setRecommending(false);
    }
  };

  const assignCaregiver = async () => {
    try {
      const result = await api.assignCaregiver(selectedPetId, startDate, endDate);
      setAssignedCaregiver(result.recommended);
    } catch (err) {
      console.error('Failed to assign caregiver:', err);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedPetId) return;
    if (step === 2 && (!startDate || !endDate || !selectedPackageId)) return;
    if (step === 3 && !selectedRoomId) return;
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!currentUser || !selectedPet || !selectedPackage || !assignedCaregiver) return;

    setLoading(true);
    try {
      const booking = await createBooking({
        petId: selectedPetId,
        packageId: selectedPackageId,
        roomId: selectedRoomId,
        caregiverId: assignedCaregiver.id,
        startDate,
        endDate,
        deposit: priceInfo.deposit,
        totalPrice: priceInfo.totalPrice,
        status: 'pending',
      });

      setNewBookingId(booking.id);
      setShowPaymentModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!newBookingId) return;

    setLoading(true);
    try {
      await payDeposit(newBookingId);
      setShowPaymentModal(false);
      setBookingSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  if (bookingSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-24 h-24 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-soft">
          <Check size={48} className="text-secondary-600" />
        </div>
        <h2 className="text-3xl font-bold text-neutral-800 mb-3">预约成功！</h2>
        <p className="text-neutral-500 mb-8">
          您的寄养预约已确认，房间已锁定，护理员已分配。
        </p>
        <div className="card mb-8 text-left">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-500">预约编号</p>
              <p className="font-semibold text-neutral-800">{newBookingId}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">寄养宠物</p>
              <p className="font-semibold text-neutral-800">{selectedPet?.name}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">寄养时间</p>
              <p className="font-semibold text-neutral-800">{startDate} ~ {endDate}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">套餐类型</p>
              <p className="font-semibold text-neutral-800">{selectedPackage?.name}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">房间号码</p>
              <p className="font-semibold text-neutral-800">{rooms.find(r => r.id === selectedRoomId)?.name}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">护理员</p>
              <p className="font-semibold text-neutral-800">{assignedCaregiver?.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-neutral-500">支付金额</p>
              <p className="font-bold text-2xl text-primary-500">¥{priceInfo.totalPrice}</p>
              <p className="text-xs text-neutral-400">已支付定金 ¥{priceInfo.deposit}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <Link to="/booking" className="btn-secondary">
            返回预约列表
          </Link>
          <Link to={`/booking/${newBookingId}`} className="btn-primary">
            查看详情
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">寄养预约</h2>
          <p className="text-neutral-500 mt-1">为您的爱宠选择最适合的寄养服务</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300',
                step >= s
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 text-neutral-400'
              )}
            >
              {step > s ? <Check size={18} /> : s}
            </div>
            {s < 4 && (
              <div
                className={cn(
                  'w-16 h-1 mx-2 rounded transition-all duration-300',
                  step > s ? 'bg-primary-500' : 'bg-neutral-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card animate-fade-in-up">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <PawPrint size={20} className="text-primary-500" />
            选择寄养宠物
          </h3>

          {pets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500 mb-4">您还没有添加宠物档案</p>
              <Link to="/pets/new" className="btn-primary inline-flex">
                添加宠物
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                    selectedPetId === pet.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-neutral-800">{pet.name}</h4>
                      {pet.allergies.length > 0 && (
                        <span className="badge badge-danger text-[10px]">有过敏史</span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">{pet.breed} · {pet.age}岁 · {pet.weight}kg</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {pet.vaccines.length} 条疫苗记录
                    </p>
                  </div>
                  {selectedPetId === pet.id && (
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedPet && (
            <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-primary-500" />
                <span className="font-medium text-primary-700">智能推荐依据</span>
              </div>
              <p className="text-sm text-primary-600">
                {selectedPet.name} 是一只 {selectedPet.age} 岁的 {selectedPet.breed}，
                体重 {selectedPet.weight}kg。
                {selectedPet.age > 8 && ' 由于年龄较大，'}
                {selectedPet.weight > 20 && ' 由于体型较大，'}
                {selectedPet.allergies.length > 0 && ' 由于有过敏史，'}
                系统将为您推荐最适合的寄养套餐。
              </p>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={handleNext}
              disabled={!selectedPetId}
              className="btn-primary flex items-center gap-2"
            >
              下一步 <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-primary-500" />
              选择寄养时间
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  入住日期 *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  退房日期 *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  className="input-field"
                  required
                />
              </div>
            </div>
            {startDate && endDate && (
              <div className="mt-4 p-3 bg-neutral-50 rounded-xl">
                <p className="text-sm text-neutral-600">
                  <Clock size={14} className="inline mr-1" />
                  共 <span className="font-semibold text-primary-600">{priceInfo.days}</span> 天
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                <Crown size={20} className="text-amber-500" />
                选择寄养套餐
              </h3>
              {recommending && (
                <span className="text-sm text-neutral-400 flex items-center gap-1">
                  <Loader2 size={14} className="animate-spin" />
                  智能推荐中...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => {
                const isRecommended = pkg.id === recommendedPackageId;
                const isSelected = pkg.id === selectedPackageId;
                const availableCount = pkg.roomIds.filter(rid =>
                  rooms.some(r => r.id === rid && r.status === 'available')
                ).length;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => availableCount > 0 && setSelectedPackageId(pkg.id)}
                    className={cn(
                      'relative p-5 rounded-xl border-2 transition-all duration-300',
                      isSelected
                        ? 'border-primary-500 bg-primary-50/50'
                        : availableCount > 0
                          ? 'border-neutral-200 hover:border-primary-300 cursor-pointer'
                          : 'border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed'
                    )}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Sparkles size={12} />
                        推荐
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-neutral-800 text-lg">{pkg.name}</h4>
                        <p className="text-sm text-neutral-500 mt-1">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-500">¥{pkg.pricePerDay}</p>
                        <p className="text-xs text-neutral-400">每天</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {pkg.features.map((feature, i) => (
                        <span
                          key={i}
                          className={cn(
                            'text-xs px-2 py-1 rounded-lg',
                            pkg.name.includes('豪华') || pkg.pricePerDay >= 150
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                          )}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className={cn(
                        availableCount > 0 ? 'text-secondary-600' : 'text-red-500'
                      )}>
                        {availableCount} 间可用
                      </span>
                      {isSelected && (
                        <span className="text-primary-600 font-medium flex items-center gap-1">
                          <Check size={14} /> 已选择
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={handlePrev} className="btn-secondary">
              上一步
            </button>
            <button
              onClick={handleNext}
              disabled={!startDate || !endDate || !selectedPackageId}
              className="btn-primary flex items-center gap-2"
            >
              下一步 <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <Home size={20} className="text-primary-500" />
              选择房间
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {availableRooms.map((roomId) => {
                const room = rooms.find(r => r.id === roomId);
                if (!room) return null;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={cn(
                      'p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center',
                      selectedRoomId === room.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    )}
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-neutral-100 flex items-center justify-center">
                      <span className="text-3xl">🏠</span>
                    </div>
                    <p className="font-semibold text-neutral-800">{room.name}</p>
                    <p className="text-xs text-neutral-500">{room.type === 'luxury' ? '豪华型' : '标准型'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-primary-500" />
              智能分配护理员
            </h3>

            {assignedCaregiver ? (
              <div className="flex items-start gap-4 p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={assignedCaregiver.avatar}
                    alt={assignedCaregiver.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-neutral-800">{assignedCaregiver.name}</h4>
                    <div className="flex items-center gap-0.5">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="font-medium text-neutral-700">{assignedCaregiver.rating}</span>
                      <span className="text-xs text-neutral-400">({assignedCaregiver.reviewCount}评价)</span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 mb-2">
                    {assignedCaregiver.experienceYears}年经验 · 推荐权重: {Math.round(assignedCaregiver.recommendationWeight * 100)}%
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {assignedCaregiver.specialties.map((s, i) => (
                      <span key={i} className="badge badge-secondary text-[10px]">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="w-6 h-6 bg-secondary-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <Loader2 size={32} className="mx-auto mb-2 animate-spin" />
                <p>正在为您匹配最佳护理员...</p>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={handlePrev} className="btn-secondary">
              上一步
            </button>
            <button
              onClick={handleNext}
              disabled={!selectedRoomId}
              className="btn-primary flex items-center gap-2"
            >
              下一步 <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="card">
            <h3 className="text-lg font-semibold text-neutral-800 mb-6">确认预约信息</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-neutral-100">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={selectedPet?.avatar} alt={selectedPet?.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-neutral-800">{selectedPet?.name}</h4>
                  <p className="text-sm text-neutral-500">{selectedPet?.breed} · {selectedPet?.age}岁</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-neutral-100">
                <div>
                  <p className="text-sm text-neutral-500">寄养时间</p>
                  <p className="font-medium text-neutral-800">{startDate} ~ {endDate}</p>
                  <p className="text-xs text-neutral-400">共 {priceInfo.days} 天</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">套餐类型</p>
                  <p className="font-medium text-neutral-800">{selectedPackage?.name}</p>
                  <p className="text-xs text-neutral-400">¥{selectedPackage?.pricePerDay}/天</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">房间</p>
                  <p className="font-medium text-neutral-800">{rooms.find(r => r.id === selectedRoomId)?.name}</p>
                  <p className="text-xs text-neutral-400">{rooms.find(r => r.id === selectedRoomId)?.type === 'luxury' ? '豪华型' : '标准型'}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">护理员</p>
                  <p className="font-medium text-neutral-800">{assignedCaregiver?.name}</p>
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-neutral-500">{assignedCaregiver?.rating}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">寄养费用</span>
                  <span className="text-neutral-800">¥{selectedPackage?.pricePerDay} × {priceInfo.days}天</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">服务费</span>
                  <span className="text-neutral-800">¥0</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-neutral-200">
                  <span className="font-medium text-neutral-800">总价</span>
                  <span className="font-bold text-xl text-primary-500">¥{priceInfo.totalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">需支付定金 (30%)</span>
                  <span className="font-semibold text-primary-600">¥{priceInfo.deposit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={handlePrev} className="btn-secondary">
              上一步
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  支付定金
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-in-top">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard size={28} className="text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-800">支付定金</h3>
              <p className="text-neutral-500 mt-1">请确认以下支付信息</p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-neutral-500">订单金额</span>
                <span className="font-medium">¥{priceInfo.totalPrice}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-neutral-500">支付定金</span>
                <span className="font-medium text-primary-600">¥{priceInfo.deposit}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-neutral-200">
                <span className="text-neutral-400">剩余款项</span>
                <span className="text-neutral-400">¥{priceInfo.totalPrice - priceInfo.deposit} (到店支付)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-secondary-50 rounded-xl mb-6">
              <Shield size={18} className="text-secondary-500" />
              <p className="text-sm text-secondary-700">
                您的支付信息将被安全加密处理
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handlePayment}
                disabled={loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>确认支付 ¥{priceInfo.deposit}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
