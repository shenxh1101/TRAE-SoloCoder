import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  Heart,
  HeartOff,
  Sparkles,
  MapPin,
  TrendingUp,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useBoothStore } from '../../store/useBoothStore';
import { useVisitorStore } from '../../store/useVisitorStore';
import { cn } from '../../utils/helpers';
import { recommendExhibitors } from '../../utils/recommendation';
import { PageHeader } from '../../components/ui/PageHeader';
import type { RecommendationResult } from '../../types';

const VISITOR_ID = 'visitor-1';
const ITEMS_PER_PAGE = 6;

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

const sortOptions = [
  { value: 'match', label: '匹配度优先' },
  { value: 'popularity', label: '人气优先' },
  { value: 'rating', label: '评价优先' },
];

export default function Exhibitors() {
  const { users, currentUser } = useAuthStore();
  const { booths } = useBoothStore();
  const { setRecommendations } = useVisitorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('match');
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [recommendations, setRecs] = useState<RecommendationResult[]>([]);

  const visitor = currentUser || users.find(u => u.id === VISITOR_ID);

  useEffect(() => {
    if (visitor) {
      const exhibitors = users.filter(u => u.role === 'exhibitor');
      const recs = recommendExhibitors(visitor, exhibitors, booths);
      setRecs(recs);
      setRecommendations(recs);
    }
  }, [visitor, users, booths, setRecommendations]);

  const filteredExhibitors = useMemo(() => {
    let result = [...recommendations];

    if (searchQuery) {
      result = result.filter(r =>
        r.exhibitor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.exhibitor.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedIndustries.length > 0) {
      result = result.filter(r =>
        r.exhibitor.preferences?.industries?.some(ind => selectedIndustries.includes(ind))
      );
    }

    switch (sortBy) {
      case 'match':
        result.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case 'popularity':
        result.sort((a, b) => b.booth.popularityScore - a.booth.popularityScore);
        break;
      case 'rating':
        result.sort((a, b) => (b.exhibitor.creditLevel || 0) - (a.exhibitor.creditLevel || 0));
        break;
    }

    return result;
  }, [recommendations, searchQuery, selectedIndustries, sortBy]);

  const totalPages = Math.ceil(filteredExhibitors.length / ITEMS_PER_PAGE);
  const paginatedExhibitors = filteredExhibitors.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
    setCurrentPage(1);
  };

  const toggleInterest = (exhibitorId: string) => {
    setInterestedIds(prev => {
      const next = new Set(prev);
      if (next.has(exhibitorId)) {
        next.delete(exhibitorId);
      } else {
        next.add(exhibitorId);
      }
      return next;
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="展商推荐"
        subtitle="发现优质展商，拓展商业合作"
        icon={<Building2 className="w-7 h-7" />}
      />

      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="搜索展商名称..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="input-field pl-12"
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-dark-300">
              <Filter className="w-4 h-4" />
              <span className="text-sm">行业筛选</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allIndustries.map((industry) => (
                <motion.button
                  key={industry}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleIndustry(industry)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
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
              {selectedIndustries.length > 0 && (
                <button
                  onClick={() => setSelectedIndustries([])}
                  className="px-3 py-1.5 text-xs text-dark-400 hover:text-white transition-colors"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ArrowUpDown className="w-4 h-4 text-dark-300" />
            <span className="text-sm text-dark-300">排序：</span>
            <div className="flex gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300",
                    sortBy === option.value
                      ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                      : "bg-white/5 text-dark-200 border border-transparent hover:border-white/10"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <p className="text-dark-300 text-sm">
          共找到 <span className="text-white font-medium">{filteredExhibitors.length}</span> 家展商
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {paginatedExhibitors.map((rec) => (
            <motion.div
              key={rec.exhibitor.id}
              variants={itemVariants}
              layout
              whileHover={{ y: -8 }}
              className="glass-card glass-card-hover p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-primary-400" />
                </div>
                <button
                  onClick={() => toggleInterest(rec.exhibitor.id)}
                  className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  {interestedIds.has(rec.exhibitor.id) ? (
                    <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                  ) : (
                    <HeartOff className="w-5 h-5 text-dark-400" />
                  )}
                </button>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">
                {rec.exhibitor.company}
              </h3>
              <p className="text-dark-400 text-sm mb-3">联系人：{rec.exhibitor.name}</p>

              <div className="flex flex-wrap gap-2 mb-4">
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

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <MapPin className="w-4 h-4" />
                  <span>展位号：{rec.booth.code}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <TrendingUp className="w-4 h-4" />
                  <span>人气分：{Math.round(rec.booth.popularityScore * 100)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>信用等级：{rec.exhibitor.creditLevel || 'N/A'} 级</span>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-dark-300">匹配度</span>
                  <span className="text-sm font-semibold gradient-text">{rec.matchScore}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rec.matchScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${industryColors[rec.exhibitor.preferences?.industries?.[0] || '人工智能']}, ${industryColors[rec.exhibitor.preferences?.industries?.[1] || '新能源']})`,
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-400">推荐理由</span>
                </div>
                <p className="text-xs text-dark-300">{rec.reason}</p>
              </div>

              <p className="text-sm text-dark-400 line-clamp-2 mb-4">
                {rec.exhibitor.company} 专注于{rec.exhibitor.preferences?.industries?.[0] || '科技'}领域的创新发展，致力于为客户提供优质的产品和服务。
              </p>

              <div className="flex gap-3">
                <button className="flex-1 btn-secondary py-2 text-sm">
                  查看详情
                </button>
                <button
                  onClick={() => toggleInterest(rec.exhibitor.id)}
                  className={cn(
                    "flex-1 py-2 text-sm rounded-xl font-medium transition-all duration-300",
                    interestedIds.has(rec.exhibitor.id)
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                      : "btn-primary"
                  )}
                >
                  {interestedIds.has(rec.exhibitor.id) ? '取消收藏' : '收藏'}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredExhibitors.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <p className="text-dark-300">暂无符合条件的展商</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustries([]);
            }}
            className="mt-4 text-primary-400 hover:text-primary-300 text-sm"
          >
            清除筛选条件
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "w-10 h-10 rounded-xl font-medium transition-all duration-300",
                currentPage === page
                  ? "bg-primary-500 text-white"
                  : "bg-white/5 text-dark-200 hover:bg-white/10"
              )}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
