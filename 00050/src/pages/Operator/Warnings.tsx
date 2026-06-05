import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  Filter,
  Clock,
  Users,
  MapPin,
  Zap,
  Shield,
  BarChart3,
  Lightbulb,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { useMonitorStore } from '../../store/useMonitorStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { cn, formatDateTime, generateId } from '../../utils/helpers';
import { useState, useMemo, useEffect } from 'react';

type WarningLevel = 'normal' | 'important' | 'urgent';
type WarningType = 'crowd' | 'booth' | 'equipment' | 'safety';
type WarningStatus = 'pending' | 'resolved';

interface Warning {
  id: string;
  hallId: string;
  hallName: string;
  type: WarningType;
  level: WarningLevel;
  title: string;
  description: string;
  time: string;
  status: WarningStatus;
  affectedArea: string;
  suggestions: string[];
}

const typeLabels: Record<WarningType, string> = {
  crowd: '人流超限',
  booth: '展位异常',
  equipment: '设备故障',
  safety: '安全隐患',
};

const levelLabels: Record<WarningLevel, string> = {
  normal: '一般',
  important: '重要',
  urgent: '紧急',
};

const levelColors: Record<WarningLevel, string> = {
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  important: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const typeIcons: Record<WarningType, React.ReactNode> = {
  crowd: <Users className="w-4 h-4" />,
  booth: <MapPin className="w-4 h-4" />,
  equipment: <Zap className="w-4 h-4" />,
  safety: <Shield className="w-4 h-4" />,
};

export default function Warnings() {
  const { realtimeData, getWarningHalls, resolveWarning, activeWarnings } = useMonitorStore();
  const { halls } = useBoothStore();
  const { pushWarningNotification } = useNotificationStore();
  const [levelFilter, setLevelFilter] = useState<'all' | WarningLevel>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | WarningType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | WarningStatus>('all');
  const [viewingWarning, setViewingWarning] = useState<Warning | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [warnings, setWarnings] = useState<Warning[]>([]);

  useEffect(() => {
    const generatedWarnings: Warning[] = [];
    const warningHalls = getWarningHalls();

    warningHalls.forEach((data) => {
      const hall = halls.find((h) => h.id === data.hallId);
      if (!hall) return;

      const level: WarningLevel =
        data.warningLevel === 'danger'
          ? 'urgent'
          : data.warningLevel === 'warning'
          ? 'important'
          : 'normal';

      generatedWarnings.push({
        id: generateId(),
        hallId: hall.id,
        hallName: hall.name,
        type: 'crowd',
        level,
        title: `${hall.name}人流超限预警`,
        description: `当前人流量已达到容量的 ${((data.currentVisitors / hall.maxCapacity) * 100).toFixed(1)}%，${level === 'urgent' ? '已超过' : '接近'}安全阈值，请及时采取限流措施。`,
        time: data.timestamp,
        status: activeWarnings.includes(hall.id) ? 'pending' : 'resolved',
        affectedArea: `${hall.name} 所有区域`,
        suggestions: [
          '立即启动限流预案，控制入口流量',
          '增加安保人员维持秩序',
          '通过广播引导观众分流',
          '开放临时疏散通道',
        ],
      });
    });

    const mockWarnings: Warning[] = [
      {
        id: generateId(),
        hallId: 'hall-2',
        hallName: '2号馆·智能制造馆',
        type: 'equipment',
        level: 'important',
        title: '2号馆照明设备故障',
        description: 'B区照明系统出现异常，部分展位照明中断，请尽快安排维修。',
        time: new Date(Date.now() - 3600000).toISOString(),
        status: 'pending',
        affectedArea: '2号馆 B区 展位201-210',
        suggestions: ['立即安排电工现场排查', '准备临时照明设备', '通知相关展位工作人员', '评估修复时间并告知展商'],
      },
      {
        id: generateId(),
        hallId: 'hall-3',
        hallName: '3号馆·新能源馆',
        type: 'safety',
        level: 'urgent',
        title: '3号馆消防通道堵塞',
        description: 'C区消防通道被违规堆放的物料堵塞，存在严重安全隐患，需立即清理。',
        time: new Date(Date.now() - 1800000).toISOString(),
        status: 'pending',
        affectedArea: '3号馆 C区 消防通道3',
        suggestions: ['立即安排人员清理通道', '联系相关展位负责人移动物料', '加强巡查防止再次发生', '记录并上报安全管理部门'],
      },
      {
        id: generateId(),
        hallId: 'hall-4',
        hallName: '4号馆·智慧城市馆',
        type: 'booth',
        level: 'normal',
        title: '4号馆展位搭建超时',
        description: '展位4015的搭建工作已超过规定时间，可能影响开展准备工作。',
        time: new Date(Date.now() - 7200000).toISOString(),
        status: 'resolved',
        affectedArea: '4号馆 D区 展位4015',
        suggestions: ['联系搭建负责人了解进度', '评估是否需要延长时间', '确保不影响整体进度', '加强施工时间管理'],
      },
      {
        id: generateId(),
        hallId: 'hall-1',
        hallName: '1号馆·科技主题馆',
        type: 'equipment',
        level: 'normal',
        title: '1号馆空调系统异常',
        description: 'A区空调制冷效果下降，现场观众反映温度偏高。',
        time: new Date(Date.now() - 5400000).toISOString(),
        status: 'resolved',
        affectedArea: '1号馆 A区',
        suggestions: ['安排暖通工程师检查', '检查设备运行参数', '必要时启用备用设备', '做好观众解释工作'],
      },
    ];

    setWarnings([...generatedWarnings, ...mockWarnings]);
  }, [realtimeData, halls, getWarningHalls, activeWarnings]);

  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      const matchLevel = levelFilter === 'all' || w.level === levelFilter;
      const matchType = typeFilter === 'all' || w.type === typeFilter;
      const matchStatus = statusFilter === 'all' || w.status === statusFilter;
      const matchSearch =
        searchQuery === '' ||
        w.hallName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLevel && matchType && matchStatus && matchSearch;
    });
  }, [warnings, levelFilter, typeFilter, statusFilter, searchQuery]);

  const statsData = useMemo(() => {
    const levelStats = { normal: 0, important: 0, urgent: 0 };
    const typeStats = { crowd: 0, booth: 0, equipment: 0, safety: 0 };

    warnings.forEach((w) => {
      if (w.status === 'pending') {
        levelStats[w.level]++;
        typeStats[w.type]++;
      }
    });

    return {
      byLevel: [
        { name: '一般', value: levelStats.normal, color: '#3B82F6' },
        { name: '重要', value: levelStats.important, color: '#F97316' },
        { name: '紧急', value: levelStats.urgent, color: '#EF4444' },
      ],
      byType: [
        { name: '人流超限', value: typeStats.crowd },
        { name: '展位异常', value: typeStats.booth },
        { name: '设备故障', value: typeStats.equipment },
        { name: '安全隐患', value: typeStats.safety },
      ],
    };
  }, [warnings]);

  const handleResolve = (warning: Warning) => {
    setWarnings((prev) =>
      prev.map((w) => (w.id === warning.id ? { ...w, status: 'resolved' as const } : w))
    );
    resolveWarning(warning.hallId);
    pushWarningNotification(
      'operator-1',
      warning.hallId,
      '预警已处理',
      `${warning.hallName}的"${warning.title}"已标记为已处理。`
    );
  };

  const pendingCount = warnings.filter((w) => w.status === 'pending').length;
  const urgentCount = warnings.filter((w) => w.status === 'pending' && w.level === 'urgent').length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen tech-grid-bg">
      <PageHeader
        title="预警管理"
        subtitle="实时监控各类预警信息，及时处理确保展馆安全"
        icon={<AlertTriangle className="w-7 h-7" />}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="待处理预警"
            value={pendingCount}
            icon={<AlertTriangle className="w-6 h-6 text-orange-400" />}
            color="orange"
            delay={0.1}
          />
          <StatCard
            title="紧急预警"
            value={urgentCount}
            icon={<Zap className="w-6 h-6 text-rose-400" />}
            color="rose"
            delay={0.2}
          />
          <StatCard
            title="已处理预警"
            value={warnings.filter((w) => w.status === 'resolved').length}
            icon={<CheckCircle className="w-6 h-6 text-green-400" />}
            color="green"
            delay={0.3}
          />
          <StatCard
            title="涉及展馆"
            value={new Set(warnings.map((w) => w.hallId)).size}
            icon={<MapPin className="w-6 h-6 text-blue-400" />}
            color="blue"
            delay={0.4}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold text-white">按级别统计</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.byLevel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#86909C" fontSize={12} />
                  <YAxis stroke="#86909C" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 26, 33, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statsData.byLevel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">按类型统计</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.byType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#86909C" fontSize={12} />
                  <YAxis stroke="#86909C" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(23, 26, 33, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="value" fill="#165DFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-card p-6 glass-card-hover">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold text-white">筛选器</h3>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  placeholder="搜索预警..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-2">预警级别</p>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'normal', 'important', 'urgent'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setLevelFilter(level)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        levelFilter === level
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/5 text-dark-300 hover:bg-white/10'
                      )}
                    >
                      {level === 'all' ? '全部' : levelLabels[level]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-2">预警类型</p>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'crowd', 'booth', 'equipment', 'safety'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        typeFilter === type
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/5 text-dark-300 hover:bg-white/10'
                      )}
                    >
                      {type === 'all' ? '全部' : typeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-dark-400 mb-2">处理状态</p>
                <div className="flex gap-2">
                  {(['all', 'pending', 'resolved'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        statusFilter === status
                          ? 'bg-primary-500 text-white'
                          : 'bg-white/5 text-dark-300 hover:bg-white/10'
                      )}
                    >
                      {status === 'all' ? '全部' : status === 'pending' ? '待处理' : '已处理'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="glass-card glass-card-hover overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">预警列表</h3>
            <p className="text-sm text-dark-400 mt-1">共 {filteredWarnings.length} 条预警记录</p>
          </div>
          <div className="divide-y divide-white/5">
            {filteredWarnings.length === 0 ? (
              <div className="p-12 text-center text-dark-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无符合条件的预警记录</p>
              </div>
            ) : (
              filteredWarnings.map((warning, index) => (
                <motion.div
                  key={warning.id}
                  variants={itemVariants}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'p-4 hover:bg-white/5 transition-colors',
                    warning.status === 'pending' && warning.level === 'urgent' && 'bg-red-500/5'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        levelColors[warning.level],
                        warning.status === 'pending' && warning.level === 'urgent' && 'animate-pulse'
                      )}
                    >
                      {typeIcons[warning.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={cn(
                                'font-medium',
                                warning.status === 'pending' ? 'text-white' : 'text-dark-400'
                              )}
                            >
                              {warning.title}
                            </h4>
                            <span className={cn('status-badge text-xs', levelColors[warning.level])}>
                              {levelLabels[warning.level]}
                            </span>
                            <span className="status-badge text-xs bg-white/10 text-dark-300">
                              {typeLabels[warning.type]}
                            </span>
                          </div>
                          <p className="text-sm text-dark-400 mt-1 line-clamp-1">{warning.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {warning.hallName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(warning.time)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {warning.status === 'pending' ? (
                            <button
                              onClick={() => handleResolve(warning)}
                              className="btn-success py-2 px-3 text-xs flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              标记已处理
                            </button>
                          ) : (
                            <span className="status-badge status-approved text-xs">已处理</span>
                          )}
                          <button
                            onClick={() => setViewingWarning(warning)}
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                          >
                            <Eye className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {viewingWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingWarning(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', levelColors[viewingWarning.level])}>
                    {typeIcons[viewingWarning.type]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">预警详情</h3>
                    <span className={cn('status-badge text-xs', levelColors[viewingWarning.level])}>
                      {levelLabels[viewingWarning.level]} · {typeLabels[viewingWarning.type]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingWarning(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-white mb-2">{viewingWarning.title}</h4>
                  <p className="text-dark-300 text-sm">{viewingWarning.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-dark-400 mb-1">所属展馆</p>
                    <p className="text-white text-sm">{viewingWarning.hallName}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-dark-400 mb-1">预警时间</p>
                    <p className="text-white text-sm">{formatDateTime(viewingWarning.time)}</p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary-400" />
                    <h5 className="font-medium text-white text-sm">影响范围</h5>
                  </div>
                  <p className="text-dark-300 text-sm">{viewingWarning.affectedArea}</p>
                </div>

                <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-primary-400" />
                    <h5 className="font-medium text-white text-sm">建议处理措施</h5>
                  </div>
                  <ul className="space-y-2">
                    {viewingWarning.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                        <span className="text-primary-400 font-mono">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {viewingWarning.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleResolve(viewingWarning);
                      setViewingWarning(null);
                    }}
                    className="btn-success w-full flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    标记为已处理
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
