import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  MapPin,
  Building2,
  Sparkles,
  ChevronRight,
  Edit3,
  Users,
  TrendingUp,
  Clock,
  Map,
  Flame,
  Star,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { formatDateTime, cn } from '../../utils/helpers';
import { recommendExhibitors, recommendForums } from '../../utils/recommendation';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import type { RecommendationResult, Forum } from '../../types';

interface ForumRecommendation extends Forum {
  matchScore: number;
  reason: string;
}

const VISITOR_ID = 'visitor-1';

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

const chartData = [
  { name: '1号馆', visitors: 4500 },
  { name: '2号馆', visitors: 3800 },
  { name: '3号馆', visitors: 4200 },
  { name: '4号馆', visitors: 3200 },
  { name: '5号馆', visitors: 2800 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, users } = useAuthStore();
  const { booths } = useBoothStore();
  const { forums, reservations, setRecommendations } = useVisitorStore();
  const { pushForumNotification } = useNotificationStore();
  const [recommendations, setRecs] = useState<RecommendationResult[]>([]);
  const [forumRecs, setForumRecs] = useState<ForumRecommendation[]>([]);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  const visitor = currentUser || users.find(u => u.id === VISITOR_ID);
  const myReservations = reservations.filter(r => r.visitorId === VISITOR_ID);
  const confirmedCount = myReservations.filter(r => r.status === 'confirmed').length;
  const waitingCount = myReservations.filter(r => r.status === 'waiting').length;

  useEffect(() => {
    if (visitor) {
      const exhibitors = users.filter(u => u.role === 'exhibitor');
      const recs = recommendExhibitors(visitor, exhibitors, booths);
      setRecs(recs);
      setRecommendations(recs);
      setSelectedIndustries(visitor.preferences?.industries || []);

      const forumList = forums.map(f => ({
        id: f.id,
        title: f.title,
        industry: f.industry,
        availableSeats: f.availableSeats,
        matchScore: 0,
        reason: '',
      }));
      const forumRecsResult = recommendForums(visitor, forumList);
      const forumRecsWithDetails = forumRecsResult
        .map(rec => {
          const forum = forums.find(f => f.id === rec.id);
          return forum ? { ...rec, ...forum } : null;
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);
      setForumRecs(forumRecsWithDetails.slice(0, 3));
    }
  }, [visitor, users, booths, forums, setRecommendations]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'exhibitors':
        navigate('/visitor/exhibitors');
        break;
      case 'forums':
        navigate('/visitor/forums');
        break;
      case 'route':
        navigate('/visitor/route');
        break;
    }
  };

  const handleReserveForum = (forum: Forum) => {
    pushForumNotification(
      VISITOR_ID,
      forum.id,
      '论坛预约成功',
      `您已成功预约"${forum.title}"，请准时参加。`
    );
  };

  if (!visitor) return null;

  return (
    <div className="min-h-screen">
      <PageHeader
        title={`欢迎回来，${visitor.name}`}
        subtitle="探索智慧会展，发现无限商机"
        icon={<Home className="w-7 h-7" />}
      />

      <div className="mb-6">
        <div className="glass-card glass-card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">我的行业偏好</h3>
            </div>
            <button
              onClick={() => setIsEditingPreferences(!isEditingPreferences)}
              className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              {isEditingPreferences ? '完成' : '编辑'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {visitor.preferences?.industries?.map((industry) => (
              <motion.button
                key={industry}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (isEditingPreferences) {
                    setSelectedIndustries(prev =>
                      prev.includes(industry)
                        ? prev.filter(i => i !== industry)
                        : [...prev, industry]
                    );
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                  selectedIndustries.includes(industry)
                    ? "bg-gradient-to-r from-primary-500/30 to-primary-600/30 border border-primary-500/50 text-white"
                    : "bg-white/5 border border-white/10 text-dark-200 hover:border-primary-500/30"
                )}
                style={{
                  borderColor: selectedIndustries.includes(industry)
                    ? industryColors[industry]
                    : undefined,
                }}
              >
                {industry}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="已预约论坛"
          value={`${confirmedCount} 场`}
          icon={<Calendar className="w-6 h-6 text-blue-400" />}
          trend={{ value: 12, isPositive: true }}
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="推荐展商"
          value={recommendations.length}
          icon={<Building2 className="w-6 h-6 text-green-400" />}
          trend={{ value: 8, isPositive: true }}
          color="green"
          delay={0.2}
        />
        <StatCard
          title="我的预约"
          value={`${confirmedCount + waitingCount} 场`}
          icon={<TrendingUp className="w-6 h-6 text-orange-400" />}
          trend={{ value: waitingCount, isPositive: true }}
          color="orange"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickAction('exhibitors')}
          className="glass-card glass-card-hover p-6 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">查看全部展商</h4>
              <p className="text-dark-300 text-sm">发现更多优质展商</p>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickAction('forums')}
          className="glass-card glass-card-hover p-6 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">预约论坛</h4>
              <p className="text-dark-300 text-sm">精彩论坛抢先预约</p>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleQuickAction('route')}
          className="glass-card glass-card-hover p-6 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center">
              <Map className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">生成路线</h4>
              <p className="text-dark-300 text-sm">智能规划参观路线</p>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-400" />
          </div>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-bold text-white">为您推荐</h2>
            </div>
            <button
              onClick={() => navigate('/visitor/exhibitors')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {recommendations.slice(0, 6).map((rec, index) => (
              <motion.div
                key={rec.exhibitor.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 8 }}
                className="glass-card glass-card-hover p-5 cursor-pointer"
                onClick={() => navigate('/visitor/exhibitors')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{rec.exhibitor.company}</h4>
                      <p className="text-dark-300 text-sm">展位号：{rec.booth.code}</p>
                      <div className="flex gap-2 mt-2">
                        {rec.exhibitor.preferences?.industries?.slice(0, 2).map((ind) => (
                          <span
                            key={ind}
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: `${industryColors[ind]}20`,
                              color: industryColors[ind],
                            }}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold gradient-text">
                      {rec.matchScore}%
                    </div>
                    <div className="text-xs text-dark-400">匹配度</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-dark-400">
                    <Star className="w-3 h-3 inline mr-1 text-yellow-400" />
                    {rec.reason}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-bold text-white">今日热门论坛</h2>
            </div>
            <button
              onClick={() => navigate('/visitor/forums')}
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {forumRecs.map((forum, index) => (
              <motion.div
                key={forum.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: -8 }}
                className="glass-card glass-card-hover p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-white font-medium flex-1">{forum.title}</h4>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: `${industryColors[forum.industry]}20`,
                      color: industryColors[forum.industry],
                    }}
                  >
                    {forum.industry}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-dark-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDateTime(forum.startTime).split(' ')[1]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{forum.hallName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{forum.speaker}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>剩余 {forum.availableSeats} 座</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleReserveForum(forum)}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    立即预约
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">各馆人流热度</h2>
            </div>
            <div className="glass-card p-6">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#E5E7EB' }}
                  />
                  <Bar dataKey="visitors" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][index]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
