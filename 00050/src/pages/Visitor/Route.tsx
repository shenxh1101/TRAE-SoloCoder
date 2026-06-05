import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  MapPin,
  Clock,
  Sparkles,
  Download,
  Save,
  RefreshCw,
  GripVertical,
  Trash2,
  Play,
  ChevronRight,
  Zap,
  Navigation,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import { cn, downloadFile } from '../../utils/helpers';
import { recommendExhibitors, generateVisitingRoute } from '../../utils/recommendation';
import { PageHeader } from '../../components/ui/PageHeader';
import type { VisitingRoute } from '../../types';

const VISITOR_ID = 'visitor-1';

const allIndustries = [
  '人工智能',
  '新能源',
  '智能制造',
  '智慧城市',
  '物联网',
  '大数据',
  '环保科技',
  '新材料',
];

const industryColors: Record<string, string> = {
  '人工智能': '#3B82F6',
  '新能源': '#10B981',
  '智能制造': '#F59E0B',
  '智慧城市': '#8B5CF6',
  '物联网': '#EC4899',
  '大数据': '#06B6D4',
  '环保科技': '#22C55E',
  '新材料': '#F97316',
};

export default function Route() {
  const { users, currentUser } = useAuthStore();
  const { booths, halls } = useBoothStore();
  const { generateRoute: saveRoute } = useVisitorStore();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [route, setRoute] = useState<VisitingRoute | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const visitor = currentUser || users.find(u => u.id === VISITOR_ID);

  useEffect(() => {
    if (visitor && selectedIndustries.length === 0) {
      setSelectedIndustries(visitor.preferences?.industries || []);
    }
  }, [visitor, selectedIndustries.length]);

  const exhibitorBooths = useMemo(() => {
    return booths.filter(b => b.status === 'occupied' || b.status === 'locked');
  }, [booths]);

  const getHallLayout = () => {
    const hall = halls[0];
    return {
      width: 600,
      height: 400,
      name: hall?.name || '1号馆',
    };
  };

  const handleGenerateRoute = () => {
    if (!visitor) return;
    setIsGenerating(true);

    setTimeout(() => {
      const exhibitors = users.filter(u => u.role === 'exhibitor');
      const recs = recommendExhibitors(visitor, exhibitors, booths);
      const filteredRecs = selectedIndustries.length > 0
        ? recs.filter(r =>
            r.exhibitor.preferences?.industries?.some(ind => selectedIndustries.includes(ind))
          )
        : recs;

      const hallLayout = getHallLayout();
      const newRoute = generateVisitingRoute(visitor, filteredRecs, hallLayout);
      setRoute(newRoute);
      saveRoute(newRoute);
      setIsGenerating(false);
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 2000);
    }, 1000);
  };

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !route) return;

    const newPoints = [...route.points];
    const [removed] = newPoints.splice(dragIndex, 1);
    newPoints.splice(index, 0, removed);

    const reorderedPoints = newPoints.map((p, i) => ({ ...p, order: i + 1 }));
    setRoute({ ...route, points: reorderedPoints });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleRemovePoint = (index: number) => {
    if (!route) return;
    const newPoints = route.points
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, order: i + 1 }));
    const newDuration = newPoints.reduce((sum, p) => sum + p.estimatedTime + 5, 0);
    setRoute({ ...route, points: newPoints, totalDuration: newDuration });
  };

  const handleSaveRoute = () => {
    if (!route || !visitor) return;
    saveRoute(route);
  };

  const handleExportRoute = () => {
    if (!route) return;

    const svgContent = generateRouteSVG();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>参观路线图 - ${route.name}</title>
        <style>
          body { font-family: 'PingFang SC', sans-serif; padding: 40px; max-width: 1000px; margin: 0 auto; background: #08090C; color: #E5E6EB; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #fff; margin-bottom: 10px; }
          .header p { color: #9CA3AF; }
          .route-info { display: flex; justify-content: center; gap: 40px; margin-bottom: 30px; }
          .info-item { text-align: center; }
          .info-value { font-size: 24px; font-weight: bold; color: #3B82F6; }
          .info-label { font-size: 14px; color: #6B7280; }
          .points { margin-top: 30px; }
          .point { display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 10px; }
          .order { width: 32px; height: 32px; background: #3B82F6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
          .point-details { flex: 1; }
          .point-title { color: white; font-weight: 500; }
          .point-meta { color: #6B7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${route.name}</h1>
          <p>生成时间：${new Date(route.createdAt).toLocaleString('zh-CN')}</p>
        </div>
        <div class="route-info">
          <div class="info-item">
            <div class="info-value">${route.points.length}</div>
            <div class="info-label">参观展位</div>
          </div>
          <div class="info-item">
            <div class="info-value">${Math.floor(route.totalDuration / 60)}小时${route.totalDuration % 60}分钟</div>
            <div class="info-label">预计时长</div>
          </div>
        </div>
        <div style="display: flex; justify-content: center;">
          ${svgContent}
        </div>
        <div class="points">
          ${route.points.map((p, i) => `
            <div class="point">
              <div class="order">${i + 1}</div>
              <div class="point-details">
                <div class="point-title">${p.exhibitorName}</div>
                <div class="point-meta">展位号：${p.boothCode} | 预计停留：${p.estimatedTime}分钟 | 行业：${p.industry}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    downloadFile(htmlContent, `参观路线-${route.name}.html`, 'text/html');
  };

  const generateRouteSVG = () => {
    if (!route) return '';

    const hallLayout = getHallLayout();
    const padding = 40;
    const maxX = Math.max(...exhibitorBooths.map(b => b.location.x)) + 100;
    const maxY = Math.max(...exhibitorBooths.map(b => b.location.y)) + 100;
    const scaleX = (hallLayout.width - padding * 2) / maxX;
    const scaleY = (hallLayout.height - padding * 2) / maxY;

    const getPosition = (boothId: string) => {
      const booth = exhibitorBooths.find(b => b.id === boothId);
      if (!booth) return { x: padding, y: padding };
      return {
        x: padding + booth.location.x * scaleX,
        y: padding + booth.location.y * scaleY,
      };
    };

    const pathData = route.points.map((p, i) => {
      const pos = getPosition(p.boothId);
      return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
    }).join(' ');

    const pointElements = route.points.map((p, idx) => {
      const pos = getPosition(p.boothId);
      const color = industryColors[p.industry] || '#3B82F6';
      return `
        <circle cx="${pos.x}" cy="${pos.y}" r="12" fill="${color}" opacity="0.9"/>
        <text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${idx + 1}</text>
        <text x="${pos.x + 16}" y="${pos.y + 4}" fill="#9CA3AF" font-size="10">${p.boothCode}</text>
      `;
    }).join('');

    return `
      <svg width="${hallLayout.width}" height="${hallLayout.height}" viewBox="0 0 ${hallLayout.width} ${hallLayout.height}">
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="#171A21" rx="12"/>
        ${exhibitorBooths.map(b => {
          const x = padding + b.location.x * scaleX;
          const y = padding + b.location.y * scaleY;
          return `<rect x="${x - 15}" y="${y - 10}" width="30" height="20" fill="#374151" rx="4" opacity="0.5"/>`;
        }).join('')}
        <path d="${pathData}" fill="none" stroke="url(#routeGradient)" stroke-width="3" stroke-dasharray="8,4" opacity="0.8"/>
        ${pointElements}
      </svg>
    `;
  };

  const renderMapSVG = () => {
    if (!route) return null;

    const hallLayout = getHallLayout();
    const padding = 40;
    const maxX = Math.max(...exhibitorBooths.map(b => b.location.x)) + 100;
    const maxY = Math.max(...exhibitorBooths.map(b => b.location.y)) + 100;
    const scaleX = (hallLayout.width - padding * 2) / maxX;
    const scaleY = (hallLayout.height - padding * 2) / maxY;

    const getPosition = (boothId: string) => {
      const booth = exhibitorBooths.find(b => b.id === boothId);
      if (!booth) return { x: padding, y: padding };
      return {
        x: padding + booth.location.x * scaleX,
        y: padding + booth.location.y * scaleY,
      };
    };

    const pathData = route.points.map((p, i) => {
      const pos = getPosition(p.boothId);
      return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
    }).join(' ');

    return (
      <svg width="100%" height={hallLayout.height} viewBox={`0 0 ${hallLayout.width} ${hallLayout.height}`}>
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="#171A21" rx="12" />

        {exhibitorBooths.map((b) => {
          const x = padding + b.location.x * scaleX;
          const y = padding + b.location.y * scaleY;
          return (
            <rect
              key={b.id}
              x={x - 15}
              y={y - 10}
              width="30"
              height="20"
              fill="#374151"
              rx="4"
              opacity="0.5"
            />
          );
        })}

        {route.points.length > 1 && (
          <motion.path
            d={pathData}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity="0.8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: showAnimation ? 1 : 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        )}

        {route.points.map((p, i) => {
          const pos = getPosition(p.boothId);
          const color = industryColors[p.industry] || '#3B82F6';
          return (
            <g key={p.boothId}>
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r="12"
                fill={color}
                opacity="0.9"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 + 0.5 }}
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {i + 1}
              </text>
              <text
                x={pos.x + 16}
                y={pos.y + 4}
                fill="#9CA3AF"
                fontSize="10"
              >
                {p.boothCode}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="参观路线"
        subtitle="智能规划，高效观展"
        icon={<Map className="w-7 h-7" />}
        actions={
          route && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveRoute}
                className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存路线
              </button>
              <button
                onClick={handleExportRoute}
                className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                导出路线图
              </button>
            </div>
          )
        }
      />

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">选择行业偏好</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {allIndustries.map((industry) => (
            <motion.button
              key={industry}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleIndustry(industry)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                selectedIndustries.includes(industry)
                  ? "text-white border"
                  : "bg-white/5 border border-white/10 text-dark-200 hover:border-primary-500/30"
              )}
              style={{
                backgroundColor: selectedIndustries.includes(industry)
                  ? `${industryColors[industry]}30`
                  : undefined,
                borderColor: selectedIndustries.includes(industry)
                  ? industryColors[industry]
                  : undefined,
                color: selectedIndustries.includes(industry)
                  ? industryColors[industry]
                  : undefined,
              }}
            >
              {industry}
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleGenerateRoute}
            disabled={isGenerating}
            className="btn-primary flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5" />
            )}
            {isGenerating ? '生成中...' : '生成智能路线'}
          </button>
          {selectedIndustries.length > 0 && (
            <button
              onClick={() => setSelectedIndustries([])}
              className="text-sm text-dark-400 hover:text-white transition-colors"
            >
              清除选择
            </button>
          )}
        </div>
      </div>

      {route ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">路线可视化</h3>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-dark-300" />
                <span className="text-sm text-dark-300">
                  总时长：<span className="text-white font-medium">
                    {Math.floor(route.totalDuration / 60)}小时{route.totalDuration % 60}分钟
                  </span>
                </span>
              </div>
            </div>

            <div className="glass-card p-6">
              {renderMapSVG()}

              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">推荐理由</span>
                </div>
                <p className="text-sm text-dark-300">
                  基于您的行业偏好（{selectedIndustries.join('、')}），
                  智能规划了{route.points.length}个优质展商的参观路线，
                  按照展位位置优化了参观顺序，预计总时长{Math.floor(route.totalDuration / 60)}小时{route.totalDuration % 60}分钟。
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">路线点列表</h3>
              </div>
              <span className="text-sm text-dark-300">
                共 <span className="text-white font-medium">{route.points.length}</span> 个展位
              </span>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {route.points.map((point, index) => (
                  <motion.div
                    key={point.boothId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.1 }}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "glass-card glass-card-hover p-4 cursor-move",
                      dragIndex === index && "ring-2 ring-primary-500"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-5 h-5 text-dark-400" />

                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor: industryColors[point.industry] || '#3B82F6',
                        }}
                      >
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <h4 className="text-white font-medium">{point.exhibitorName}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-dark-300">
                            展位号：{point.boothCode}
                          </span>
                          <span
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: `${industryColors[point.industry]}20`,
                              color: industryColors[point.industry],
                            }}
                          >
                            {point.industry}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-dark-300">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{point.estimatedTime}分钟</span>
                      </div>

                      <button
                        onClick={() => handleRemovePoint(index)}
                        className="p-2 rounded-xl hover:bg-danger-500/20 text-dark-400 hover:text-danger-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {route.points.length === 0 && (
              <div className="text-center py-16 glass-card">
                <MapPin className="w-16 h-16 text-dark-500 mx-auto mb-4" />
                <p className="text-dark-300">暂无路线点</p>
                <button
                  onClick={handleGenerateRoute}
                  className="mt-4 text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 mx-auto"
                >
                  重新生成路线 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {route.points.length > 0 && (
              <div className="mt-6 glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-400" />
                    <span className="text-dark-300">总预计时长</span>
                  </div>
                  <span className="text-2xl font-bold gradient-text">
                    {Math.floor(route.totalDuration / 60)}小时{route.totalDuration % 60}分钟
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-24 glass-card">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Map className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">还没有参观路线</h3>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            选择您感兴趣的行业，点击"生成智能路线"按钮，
            系统将为您规划最优参观路线。
          </p>
          <button
            onClick={handleGenerateRoute}
            disabled={isGenerating}
            className="btn-primary inline-flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {isGenerating ? '生成中...' : '生成智能路线'}
          </button>
        </div>
      )}
    </div>
  );
}
