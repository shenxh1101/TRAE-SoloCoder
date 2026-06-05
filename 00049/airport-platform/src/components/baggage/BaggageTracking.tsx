import { useState, useMemo } from 'react';
import { useAirport } from '../../context/AirportContext';
import type { Baggage } from '../../types';
import {
  Luggage,
  Search,
  MapPin,
  Clock,
  Plane,
  RotateCw,
  User,
  ArrowLeft,
  RefreshCw,
  Check,
} from 'lucide-react';

const STATUS_STEPS: Baggage['status'][] = [
  'checked_in',
  'screening',
  'sorted',
  'loaded',
  'transit',
  'arrived',
  'claimed',
];

const STATUS_LABELS: Record<Baggage['status'], string> = {
  checked_in: '已值机',
  screening: '安检中',
  sorted: '已分拣',
  loaded: '已装舱',
  transit: '运输中',
  arrived: '已到达',
  claimed: '已提取',
};

const STATUS_COLORS: Record<Baggage['status'], string> = {
  checked_in: 'bg-primary-light/20 text-primary-light',
  screening: 'bg-amber-glow/20 text-amber-glow',
  sorted: 'bg-cyan-glow/20 text-cyan-glow',
  loaded: 'bg-success/20 text-success',
  transit: 'bg-warning/20 text-warning',
  arrived: 'bg-success/20 text-success',
  claimed: 'bg-slate-500/20 text-slate-400',
};

const STATUS_DOT_COLORS: Record<Baggage['status'], string> = {
  checked_in: 'bg-primary-light',
  screening: 'bg-amber-glow',
  sorted: 'bg-cyan-glow',
  loaded: 'bg-success',
  transit: 'bg-warning',
  arrived: 'bg-success',
  claimed: 'bg-slate-500',
};

const APP_STATUS_ICONS: Record<Baggage['status'], string> = {
  checked_in: '🛎️',
  screening: '🔍',
  sorted: '📦',
  loaded: '✈️',
  transit: '🚀',
  arrived: '🎉',
  claimed: '✅',
};

function generateTimeline(baggage: Baggage) {
  const currentIdx = STATUS_STEPS.indexOf(baggage.status);
  const baseTime = new Date(baggage.lastUpdate);
  const stepMinutes = [0, 8, 15, 25, 40, 65, 75];

  return STATUS_STEPS.map((step, idx) => {
    const isCompleted = idx < currentIdx;
    const isCurrent = idx === currentIdx;
    const isFuture = idx > currentIdx;
    const time = new Date(baseTime.getTime() - (currentIdx - idx) * stepMinutes[idx] * 60000);

    return {
      step,
      label: STATUS_LABELS[step],
      timestamp: time,
      location: getLocationForStep(baggage, step),
      isCompleted,
      isCurrent,
      isFuture,
    };
  });
}

function getLocationForStep(baggage: Baggage, step: Baggage['status']): string {
  if (step === baggage.status) return baggage.location;
  const locMap: Partial<Record<Baggage['status'], string>> = {
    checked_in: '值机柜台',
    screening: '安检线',
    sorted: '分拣厅',
    loaded: '机坪货舱',
    transit: '运输中',
    arrived: '行李提取转盘',
    claimed: '行李提取出口',
  };
  return locMap[step] || '';
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatFullTime(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

export default function BaggageTracking() {
  const {
    baggages,
    baggageCarousels,
    flights,
    terminals,
    currentRole,
    selectedPassengerId,
    getBaggageByTag,
    getBaggageByPassenger,
    filterBaggageByRole,
  } = useAirport();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<string>('T1');
  const [viewMode, setViewMode] = useState<'admin' | 'app'>('admin');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const filteredBaggages = useMemo(() => {
    let result = filterBaggageByRole(baggages);

    if (currentRole === 'passenger') {
      result = getBaggageByPassenger(selectedPassengerId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const byTag = getBaggageByTag(q);
      if (byTag) {
        result = [byTag];
      } else {
        result = result.filter(
          (b) =>
            b.tagId.toLowerCase().includes(q) ||
            b.passengerId.toLowerCase().includes(q),
        );
      }
    }

    return result;
  }, [baggages, searchQuery, currentRole, selectedPassengerId, filterBaggageByRole, getBaggageByPassenger, getBaggageByTag, refreshKey]);

  const terminalCarousels = useMemo(
    () => baggageCarousels.filter((c) => c.terminalId === activeTerminal),
    [activeTerminal, baggageCarousels],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STATUS_STEPS) counts[s] = 0;
    for (const b of filteredBaggages) counts[b.status]++;
    return counts;
  }, [filteredBaggages]);

  function getFlightNo(flightId: string): string {
    return flights.find((f) => f.id === flightId)?.flightNo || flightId;
  }

  function getCarouselNo(carouselId: string | null): string {
    if (!carouselId) return '-';
    return baggageCarousels.find((c) => c.id === carouselId)?.carouselNo || '-';
  }

  const passengerBaggages = useMemo(() => {
    if (currentRole === 'passenger') {
      return getBaggageByPassenger(selectedPassengerId);
    }
    return [];
  }, [currentRole, selectedPassengerId, getBaggageByPassenger, refreshKey]);

  const appSelectedBaggage = selectedBaggage || passengerBaggages[0] || null;
  const appTimeline = appSelectedBaggage ? generateTimeline(appSelectedBaggage) : [];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Luggage className="h-7 w-7 text-cyan-glow" />
          <h1 className="text-2xl font-bold text-white">行李追踪</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('admin')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              viewMode === 'admin'
                ? 'bg-primary-light text-white shadow-lg shadow-primary-light/25'
                : 'bg-dark-card text-slate-400 hover:bg-dark-hover hover:text-white'
            }`}
          >
            管理视图
          </button>
          {currentRole === 'passenger' && (
            <button
              onClick={() => setViewMode('app')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                viewMode === 'app'
                  ? 'bg-primary-light text-white shadow-lg shadow-primary-light/25'
                  : 'bg-dark-card text-slate-400 hover:bg-dark-hover hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                APP旅客端
              </span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'app' && currentRole === 'passenger' ? (
        <div className="flex justify-center py-8">
          <div className="relative">
            <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50">
              <div className="relative bg-white rounded-[2.5rem] overflow-hidden" style={{ width: '375px', height: '667px' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-50" />
                
                <div className="h-full flex flex-col bg-gray-50 pt-6">
                  <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-800 flex-1">行李追踪</h2>
                    <button 
                      onClick={handleRefresh}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <RefreshCw className="h-5 w-5 text-gray-700" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {appSelectedBaggage ? (
                      <div className="p-4 space-y-4">
                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">电子标签</div>
                              <div className="font-mono text-sm font-bold text-blue-600">{appSelectedBaggage.tagId}</div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              appSelectedBaggage.status === 'arrived' 
                                ? 'bg-green-100 text-green-700'
                                : appSelectedBaggage.status === 'claimed'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-700'
                            }`}>
                              {STATUS_LABELS[appSelectedBaggage.status]}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Plane className="h-4 w-4" />
                            <span>航班 {getFlightNo(appSelectedBaggage.flightId)}</span>
                          </div>

                          {appSelectedBaggage.carouselId && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <span className="text-lg">🎠</span>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">提取转盘</div>
                                  <div className="font-bold text-orange-600">{getCarouselNo(appSelectedBaggage.carouselId)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                          <h3 className="font-semibold text-gray-800 mb-4">运输进度</h3>
                          <div className="overflow-x-auto pb-2">
                            <div className="flex items-start gap-1" style={{ minWidth: 'max-content' }}>
                              {appTimeline.map((item, idx) => (
                                <div key={item.step} className="flex flex-col items-center" style={{ width: '48px' }}>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                    item.isCompleted 
                                      ? 'bg-green-100'
                                      : item.isCurrent
                                        ? 'bg-blue-100 ring-2 ring-blue-400 ring-offset-2'
                                        : 'bg-gray-100'
                                  }`}>
                                    {item.isCompleted ? (
                                      <Check className="h-5 w-5 text-green-600" />
                                    ) : (
                                      APP_STATUS_ICONS[item.step]
                                    )}
                                  </div>
                                  <div className={`mt-2 text-[10px] text-center leading-tight ${
                                    item.isCompleted 
                                      ? 'text-green-600 font-medium'
                                      : item.isCurrent
                                        ? 'text-blue-600 font-medium'
                                        : 'text-gray-400'
                                  }`}>
                                    {item.label}
                                  </div>
                                  {idx < appTimeline.length - 1 && (
                                    <div className={`absolute top-5 h-0.5 w-12 ml-12 ${
                                      item.isCompleted ? 'bg-green-400' : 'bg-gray-200'
                                    }`} style={{ marginLeft: '48px' }} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <MapPin className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">当前位置</div>
                              <div className="font-semibold text-gray-800">{appSelectedBaggage.location}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>最后更新: {formatFullTime(appSelectedBaggage.lastUpdate)}</span>
                          </div>
                        </div>

                        <button 
                          onClick={handleRefresh}
                          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          刷新状态
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                        <Luggage className="h-16 w-16 mb-4 text-gray-300" />
                        <p className="text-center">暂无行李信息</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border-t border-gray-100 h-1" />
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-300 rounded-full" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索电子标签 (EID-XXXXX) 或旅客ID (PXXX)"
                className="w-full rounded-lg border border-dark-border bg-dark-card py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-cyan-glow focus:ring-1 focus:ring-cyan-glow/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {STATUS_STEPS.map((s) => (
              <div key={s} className="rounded-xl border border-dark-border bg-dark-card p-3 text-center">
                <div className={`mx-auto mb-1.5 h-2 w-2 rounded-full ${STATUS_DOT_COLORS[s]}`} />
                <div className="text-lg font-bold text-white">{statusCounts[s]}</div>
                <div className="text-xs text-slate-400">{STATUS_LABELS[s]}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <h2 className="mb-4 text-base font-semibold text-white">行李列表</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-border text-slate-400">
                        <th className="pb-3 text-left font-medium">电子标签</th>
                        <th className="pb-3 text-left font-medium">航班</th>
                        <th className="pb-3 text-left font-medium">状态</th>
                        <th className="pb-3 text-left font-medium">转盘</th>
                        <th className="pb-3 text-left font-medium">位置</th>
                        <th className="pb-3 text-left font-medium">更新时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBaggages.map((bag) => (
                        <tr
                          key={bag.id}
                          onClick={() => setSelectedBaggage(bag)}
                          className={`cursor-pointer border-b border-dark-border/50 transition-colors hover:bg-dark-hover ${
                            selectedBaggage?.id === bag.id ? 'bg-dark-hover' : ''
                          }`}
                        >
                          <td className="py-3 font-mono text-cyan-glow">{bag.tagId}</td>
                          <td className="py-3 text-white">{getFlightNo(bag.flightId)}</td>
                          <td className="py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[bag.status]}`}>
                              {STATUS_LABELS[bag.status]}
                            </span>
                          </td>
                          <td className="py-3 text-slate-300">{getCarouselNo(bag.carouselId)}</td>
                          <td className="py-3 text-slate-300">{bag.location}</td>
                          <td className="py-3 text-slate-400">
                            {formatTime(new Date(bag.lastUpdate))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {currentRole === 'passenger' && filteredBaggages.length > 0 && (
                <div className="space-y-4">
                  {filteredBaggages.map((bag) => {
                    const timeline = generateTimeline(bag);
                    return (
                      <div key={bag.id} className="rounded-xl border border-dark-border bg-dark-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <span className="font-mono text-cyan-glow">{bag.tagId}</span>
                            <span className="ml-3 text-sm text-slate-400">
                              航班 {getFlightNo(bag.flightId)}
                            </span>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[bag.status]}`}>
                            {STATUS_LABELS[bag.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {timeline.map((item, idx) => (
                            <div key={item.step} className="flex items-center">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`h-4 w-4 rounded-full border-2 ${
                                    item.isCompleted
                                      ? 'border-success bg-success'
                                      : item.isCurrent
                                        ? 'animate-pulse-glow border-cyan-glow bg-cyan-glow'
                                        : 'border-slate-600 bg-dark'
                                  }`}
                                />
                                <span
                                  className={`mt-1.5 text-xs ${
                                    item.isCompleted
                                      ? 'text-success'
                                      : item.isCurrent
                                        ? 'text-cyan-glow'
                                        : 'text-slate-600'
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>
                              {idx < timeline.length - 1 && (
                                <div
                                  className={`mx-1 h-0.5 w-6 ${
                                    item.isCompleted ? 'bg-success' : 'bg-slate-700'
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span>当前位置: {bag.location}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-5">
              {selectedBaggage && (
                <div className="rounded-xl border border-cyan-glow/30 bg-dark-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">追踪时间线</h2>
                    <span className="font-mono text-xs text-cyan-glow">
                      {selectedBaggage.tagId}
                    </span>
                  </div>
                  <div className="space-y-0">
                    {generateTimeline(selectedBaggage).map((item, idx) => (
                      <div key={item.step} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-4 w-4 rounded-full border-2 ${
                              item.isCompleted
                                ? 'border-success bg-success'
                                : item.isCurrent
                                  ? 'animate-pulse-glow border-cyan-glow bg-cyan-glow'
                                  : 'border-slate-600 bg-dark'
                            }`}
                          />
                          {idx < STATUS_STEPS.length - 1 && (
                            <div
                              className={`w-0.5 flex-1 ${
                                item.isCompleted ? 'bg-success' : 'bg-slate-700'
                              }`}
                              style={{ minHeight: '2rem' }}
                            />
                          )}
                        </div>
                        <div className="pb-5">
                          <div
                            className={`text-sm font-medium ${
                              item.isCompleted
                                ? 'text-success'
                                : item.isCurrent
                                  ? 'text-cyan-glow'
                                  : 'text-slate-600'
                            }`}
                          >
                            {item.label}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(item.timestamp)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            <span>{item.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedBaggage && (
                <div className="flex flex-col items-center rounded-xl border border-dark-border bg-dark-card py-10 text-slate-500">
                  <Luggage className="mb-2 h-10 w-10 text-slate-600" />
                  <span className="text-sm">点击行李行查看追踪时间线</span>
                </div>
              )}

              <div className="rounded-xl border border-dark-border bg-dark-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <RotateCw className="h-5 w-5 text-cyan-glow" />
                  <h2 className="text-base font-semibold text-white">转盘状态</h2>
                </div>
                <div className="mb-3 flex gap-2">
                  {terminals.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTerminal(t.id)}
                      className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                        activeTerminal === t.id
                          ? 'bg-primary-light text-white'
                          : 'bg-dark text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.code}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {terminalCarousels.map((carousel) => {
                    const flightNo = carousel.flightId
                      ? getFlightNo(carousel.flightId)
                      : null;
                    return (
                      <div
                        key={carousel.id}
                        className={`rounded-lg border p-3 transition-all ${
                          carousel.status === 'active'
                            ? 'border-cyan-glow/30 bg-cyan-glow/5'
                            : carousel.status === 'maintenance'
                              ? 'border-danger/30 bg-danger/5'
                              : 'border-dark-border bg-dark/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {carousel.terminalId} - {carousel.carouselNo}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                carousel.status === 'active'
                                  ? 'bg-cyan-glow/20 text-cyan-glow'
                                  : carousel.status === 'maintenance'
                                    ? 'bg-danger/20 text-danger'
                                    : 'bg-slate-500/20 text-slate-400'
                              }`}
                            >
                              {carousel.status === 'active'
                                ? '运行中'
                                : carousel.status === 'maintenance'
                                  ? '维护中'
                                  : '空闲'}
                            </span>
                          </div>
                          {carousel.status === 'active' && (
                            <div className="flex items-center gap-1 text-xs text-cyan-glow">
                              <span className="inline-block h-1.5 w-1.5 animate-pulse-glow rounded-full bg-cyan-glow" />
                              活跃
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Plane className="h-3 w-3" />
                            <span>{flightNo || '无航班'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Luggage className="h-3 w-3" />
                            <span>{carousel.baggageCount} 件</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
