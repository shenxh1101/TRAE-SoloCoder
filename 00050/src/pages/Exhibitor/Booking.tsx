import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Lock,
  Sparkles,
  TrendingUp,
  Map as MapIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { calculateDynamicPrice, formatCurrency } from '../../utils/pricing';
import { cn } from '../../utils/helpers';
import type { Booth, PricingResult } from '../../types';

export default function Booking() {
  const { currentUser } = useAuthStore();
  const {
    halls,
    booths,
    selectedHallId,
    selectedBoothIds,
    selectHall,
    toggleBoothSelection,
    clearBoothSelection,
    createBooking,
    getHallById,
    getBoothById,
  } = useBoothStore();
  const { pushBookingNotification } = useNotificationStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoveredBooth, setHoveredBooth] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentDemand = 65;

  const selectedHall = selectedHallId ? getHallById(selectedHallId) : null;
  const hallBooths = useMemo(
    () => (selectedHallId ? booths.filter((b) => b.hallId === selectedHallId) : []),
    [selectedHallId, booths]
  );

  const pricingResults = useMemo(() => {
    if (!startDate) return new globalThis.Map<string, PricingResult>();
    const results = new globalThis.Map<string, PricingResult>();
    const selectedDate = new Date(startDate);
    hallBooths.forEach((booth) => {
      const adjacentBooths = booth.adjacentBooths
        .map((id) => getBoothById(id))
        .filter((b): b is Booth => b !== undefined);
      const result = calculateDynamicPrice(
        booth,
        selectedDate,
        currentDemand,
        adjacentBooths,
        selectedBoothIds
      );
      results.set(booth.id, result);
    });
    return results;
  }, [hallBooths, startDate, selectedBoothIds, getBoothById]);

  const selectedBoothsData = selectedBoothIds
    .map((id) => getBoothById(id))
    .filter((b): b is Booth => b !== undefined);

  const totalPrice = selectedBoothsData.reduce((sum, booth) => {
    const pricing = pricingResults.get(booth.id);
    return sum + (pricing?.finalPrice || booth.basePrice);
  }, 0);

  const totalDiscount = selectedBoothsData.reduce((sum, booth) => {
    const pricing = pricingResults.get(booth.id);
    return sum + (pricing?.discount || 0);
  }, 0);

  const getBoothColor = (booth: Booth) => {
    if (selectedBoothIds.includes(booth.id)) return '#165DFF';
    if (booth.status === 'occupied') return '#EF4444';
    if (booth.status === 'reserved') return '#F59E0B';
    if (booth.status === 'locked') return '#6B7280';
    return '#10B981';
  };

  const handleSubmit = () => {
    if (!currentUser || selectedBoothsData.length === 0 || !startDate || !endDate) return;

    selectedBoothsData.forEach((booth) => {
      const pricing = pricingResults.get(booth.id);
      const booking = createBooking({
        exhibitorId: currentUser.id,
        boothId: booth.id,
        boothCode: booth.code,
        hallName: selectedHall?.name || '',
        startDate,
        endDate,
        totalPrice: pricing?.finalPrice || booth.basePrice,
        discountApplied: pricing?.discount || 0,
        companyName: currentUser.company,
      });

      pushBookingNotification(
        currentUser.id,
        booking.id,
        '展位预订提交成功',
        `您预订的${selectedHall?.name} ${booth.code}号展位已提交，等待审核。`
      );
    });

    setShowSuccess(true);
    clearBoothSelection();
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const hoveredBoothData = hoveredBooth ? getBoothById(hoveredBooth) : null;
  const hoveredPricing = hoveredBooth ? pricingResults.get(hoveredBooth) : null;

  const recommendedAdjacent = hoveredBoothData && hoveredPricing?.recommendedAdjacent
    ? hoveredPricing.recommendedAdjacent
    : [];

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="展位预订"
        subtitle="选择心仪的展位，开启您的参展之旅"
        icon={<MapPin className="w-7 h-7" />}
      />

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 glass-card-hover"
        >
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">选择展馆</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {halls.map((hall, index) => (
              <motion.button
                key={hall.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectHall(hall.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'p-4 rounded-xl border transition-all duration-300 text-left',
                  selectedHallId === hall.id
                    ? 'bg-primary-500/20 border-primary-500/50 shadow-lg shadow-primary-500/20'
                    : 'bg-white/5 border-white/10 hover:border-primary-500/30 hover:bg-white/10'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold gradient-text">{hall.name.charAt(0)}</span>
                  {selectedHallId === hall.id && (
                    <CheckCircle className="w-5 h-5 text-primary-400" />
                  )}
                </div>
                <p className="text-white font-medium text-sm">{hall.name.split('·')[1]}</p>
                <p className="text-xs text-dark-400 mt-1">{hall.area}㎡ · {hall.boothCount}个展位</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {selectedHall && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 glass-card p-6 glass-card-hover"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MapIcon className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-white">{selectedHall.name} 展位图</h3>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-success-500" />
                    <span className="text-dark-300">可预订</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-warning-500" />
                    <span className="text-dark-300">已预留</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-danger-500" />
                    <span className="text-dark-300">已占用</span>
                  </div>
                </div>
              </div>

              <div className="relative bg-white/5 rounded-xl p-4 overflow-hidden" style={{ minHeight: '400px' }}>
                <svg width="100%" height="400" viewBox="0 0 550 400">
                  <defs>
                    <pattern id="grid" width="80" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 80 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    </pattern>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {hallBooths.map((booth, index) => {
                    const isHovered = hoveredBooth === booth.id;
                    const isSelected = selectedBoothIds.includes(booth.id);
                    const x = booth.location.x;
                    const y = booth.location.y;
                    const width = 70;
                    const height = 50;

                    return (
                      <g key={booth.id}>
                        <motion.rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          rx={6}
                          fill={getBoothColor(booth)}
                          fillOpacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.3}
                          stroke={getBoothColor(booth)}
                          strokeWidth={isSelected || isHovered ? 2 : 1}
                          filter={isHovered || isSelected ? 'url(#glow)' : undefined}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => booth.status === 'available' && toggleBoothSelection(booth.id)}
                          onMouseEnter={() => setHoveredBooth(booth.id)}
                          onMouseLeave={() => setHoveredBooth(null)}
                          className={cn(
                            booth.status === 'available' ? 'cursor-pointer' : 'cursor-not-allowed'
                          )}
                        />
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 4}
                          textAnchor="middle"
                          className="text-xs font-medium fill-white pointer-events-none"
                        >
                          {booth.code}
                        </text>
                        {booth.status === 'locked' && (
                          <Lock
                            x={x + width / 2 - 6}
                            y={y + 8}
                            className="w-3 h-3 fill-white/80 pointer-events-none"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                <AnimatePresence>
                  {hoveredBoothData && hoveredPricing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute top-4 right-4 w-64 glass-card p-4 z-10"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-semibold">{hoveredBoothData.code}</span>
                        <span className={cn('status-badge', hoveredBoothData.status === 'available' ? 'status-approved' : 'status-pending')}>
                          {hoveredBoothData.status === 'available' ? '可预订' : '不可用'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-dark-400">面积</span>
                          <span className="text-white">{hoveredBoothData.area}㎡</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">区域</span>
                          <span className="text-white">{hoveredBoothData.zone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">基础价格</span>
                          <span className="text-white">{formatCurrency(hoveredPricing.basePrice)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-dark-400">人气系数</span>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-orange-400" />
                            <span className="text-orange-400">x{hoveredPricing.popularityMultiplier}</span>
                          </div>
                        </div>
                        <div className="border-t border-white/10 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-dark-400">预估价格</span>
                            <motion.span
                              key={hoveredPricing.finalPrice}
                              initial={{ scale: 1.2 }}
                              animate={{ scale: 1 }}
                              className="text-lg font-bold gradient-text"
                            >
                              {formatCurrency(hoveredPricing.finalPrice)}
                            </motion.span>
                          </div>
                          {hoveredPricing.discount > 0 && (
                            <div className="flex justify-between text-success-400">
                              <span>已优惠</span>
                              <span>-{formatCurrency(hoveredPricing.discount)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {recommendedAdjacent.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-1 mb-2">
                            <Sparkles className="w-4 h-4 text-warning-400" />
                            <span className="text-sm font-medium text-warning-400">相邻优惠</span>
                          </div>
                          {recommendedAdjacent.map((rec) => (
                            <div
                              key={rec.booth.id}
                              className="p-2 bg-warning-500/10 rounded-lg mb-2 last:mb-0"
                            >
                              <div className="flex justify-between text-sm">
                                <span className="text-white">{rec.booth.code}</span>
                                <span className="text-success-400">省{formatCurrency(rec.saving)}</span>
                              </div>
                              <div className="text-xs text-dark-400">
                                组合价 {formatCurrency(rec.combinedPrice)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="glass-card p-6 glass-card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-white">预订时间</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">开始日期</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-300 mb-2">结束日期</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 glass-card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-semibold text-white">价格明细</h3>
                </div>
                {selectedBoothsData.length === 0 ? (
                  <div className="text-center py-6 text-dark-400">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">请选择展位查看价格</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedBoothsData.map((booth, index) => {
                      const pricing = pricingResults.get(booth.id);
                      return (
                        <motion.div
                          key={booth.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 bg-white/5 rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{booth.code}</span>
                            <button
                              onClick={() => toggleBoothSelection(booth.id)}
                              className="text-dark-400 hover:text-danger-400 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-sm text-dark-400 space-y-1">
                            <div className="flex justify-between">
                              <span>基础价</span>
                              <span className="text-white">{formatCurrency(pricing?.basePrice || booth.basePrice)}</span>
                            </div>
                            {pricing && pricing.discount > 0 && (
                              <div className="flex justify-between text-success-400">
                                <span>优惠</span>
                                <span>-{formatCurrency(pricing.discount)}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    <div className="border-t border-white/10 pt-4 space-y-2">
                      <div className="flex justify-between text-dark-300">
                        <span>已选展位</span>
                        <span>{selectedBoothsData.length}个</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-success-400">
                          <span>总优惠</span>
                          <span>-{formatCurrency(totalDiscount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-white font-semibold">应付总价</span>
                        <motion.span
                          key={totalPrice}
                          initial={{ scale: 1.2 }}
                          animate={{ scale: 1 }}
                          className="text-2xl font-bold gradient-text"
                        >
                          {formatCurrency(totalPrice)}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={selectedBoothsData.length === 0 || !startDate || !endDate}
                className={cn(
                  'w-full btn-primary flex items-center justify-center gap-2',
                  (selectedBoothsData.length === 0 || !startDate || !endDate) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <CheckCircle className="w-5 h-5" />
                提交预订申请
              </motion.button>
            </motion.div>
          </div>
        )}

        {!selectedHall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <Building2 className="w-16 h-16 mx-auto mb-4 text-dark-500" />
            <h3 className="text-xl font-semibold text-white mb-2">请先选择展馆</h3>
            <p className="text-dark-400">点击上方展馆卡片开始选择您的展位</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-card p-6 flex items-center gap-4 border border-success-500/30 bg-success-500/10"
          >
            <div className="w-12 h-12 bg-success-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">预订提交成功</h4>
              <p className="text-sm text-dark-300">您的预订申请已提交，等待审核中</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
