import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Shield,
  MapPin,
  Users,
  ArrowRight,
  Clock,
  AlertTriangle,
  ChevronRight,
  Activity,
  Building2,
  PawPrint,
  Star,
} from 'lucide-react';
import useAnimalStore from '@/stores/animalStore';
import useAdoptStore from '@/stores/adoptStore';
import useAdminStore from '@/stores/adminStore';

interface TaskItem {
  id: string;
  animalType: string;
  address: string;
  urgency: string;
  status: string;
  createdAt: string;
}

interface AnimalItem {
  id: string;
  name: string;
  type: string;
  personality: string[];
  photo: string;
  matchScore: number;
}

const fallbackTasks: TaskItem[] = [
  { id: '1', animalType: 'cat', address: '朝阳区望京SOHO附近', urgency: 'critical', status: 'pending', createdAt: '2026-06-03T08:00:00Z' },
  { id: '2', animalType: 'dog', address: '海淀区中关村大街', urgency: 'high', status: 'pending', createdAt: '2026-06-03T07:30:00Z' },
  { id: '3', animalType: 'cat', address: '西城区金融街购物中心', urgency: 'medium', status: 'pending', createdAt: '2026-06-03T06:00:00Z' },
];

const fallbackAnimals: AnimalItem[] = [
  { id: '1', name: '小橘', type: 'cat', personality: ['温顺', '亲人', '爱撒娇'], photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20orange%20tabby%20cat%20portrait%20warm%20lighting&image_size=square', matchScore: 95 },
  { id: '2', name: '旺财', type: 'dog', personality: ['活泼', '忠诚', '爱玩'], photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20golden%20retriever%20puppy%20portrait%20warm%20lighting&image_size=square', matchScore: 88 },
  { id: '3', name: '花花', type: 'cat', personality: ['安静', '独立', '优雅'], photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20orange%20cat%20portrait&image_size=square', matchScore: 82 },
  { id: '4', name: '大黄', type: 'dog', personality: ['友善', '乖巧', '粘人'], photo: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20golden%20retriever%20puppy%20portrait%20warm%20lighting&image_size=square', matchScore: 78 },
];

const recentActivities = [
  { id: '1', type: 'rescue', text: '志愿者小李在朝阳区成功救助了一只受伤的橘猫', time: '10分钟前', icon: Shield },
  { id: '2', type: 'adopt', text: '小橘被张女士领养，开始新生活', time: '30分钟前', icon: Heart },
  { id: '3', type: 'report', text: '新上报：海淀区发现流浪犬，需要救助', time: '1小时前', icon: AlertTriangle },
  { id: '4', type: 'rescue', text: '旺财已完成绝育手术，恢复良好', time: '2小时前', icon: Activity },
  { id: '5', type: 'adopt', text: '花花通过审核，等待领养家庭确认', time: '3小时前', icon: Star },
];

function UrgencyBadge({ urgency }: { urgency: string }) {
  const config: Record<string, { label: string; cls: string; pulse: string }> = {
    critical: { label: '紧急', cls: 'badge-urgent', pulse: 'bg-red-500' },
    high: { label: '高优', cls: 'badge-urgent', pulse: 'bg-amber-500' },
    medium: { label: '中等', cls: 'badge-pending', pulse: 'bg-amber-400' },
    low: { label: '一般', cls: 'badge-active', pulse: 'bg-primary-400' },
  };
  const c = config[urgency] || config.low;
  return (
    <span className={`${c.cls} flex items-center gap-1`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-pulse-ring absolute inline-flex h-full w-full rounded-full ${c.pulse} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${c.pulse}`} />
      </span>
      {c.label}
    </span>
  );
}

function AnimalIcon({ type }: { type: string }) {
  if (type === 'cat') return <span className="text-lg">🐱</span>;
  if (type === 'dog') return <span className="text-lg">🐕</span>;
  return <PawPrint size={18} className="text-warm-500" />;
}

export default function Home() {
  const { rescueTasks, fetchRescueTasks } = useAnimalStore();
  const { availableAnimals, fetchAvailable } = useAdoptStore();
  const { dashboardData, fetchDashboard } = useAdminStore();
  const [tasks, setTasks] = useState<TaskItem[]>(fallbackTasks);
  const [animals, setAnimals] = useState<AnimalItem[]>(fallbackAnimals);

  useEffect(() => {
    fetchRescueTasks('pending').catch(() => {});
    fetchAvailable().catch(() => {});
    fetchDashboard().catch(() => {});
  }, [fetchRescueTasks, fetchAvailable, fetchDashboard]);

  const displayStats = [
    { label: '救助总数', value: dashboardData?.totalRescues?.toLocaleString() || '0', icon: Shield, gradient: 'from-primary-400 to-primary-600' },
    { label: '领养成功率', value: `${dashboardData?.adoptionRate || 0}%`, icon: Heart, gradient: 'from-rose-400 to-rose-600' },
    { label: '活跃志愿者', value: dashboardData?.activeVolunteers?.toLocaleString() || '0', icon: Users, gradient: 'from-amber-400 to-amber-600' },
    { label: '待处理任务', value: dashboardData?.pendingTasks?.toLocaleString() || '0', icon: Clock, gradient: 'from-emerald-400 to-emerald-600' },
  ];

  useEffect(() => {
    if (rescueTasks.length > 0) {
      setTasks(
        rescueTasks.slice(0, 3).map((t) => ({
          id: t.id,
          animalType: t.animalType || 'other',
          address: t.address,
          urgency: t.urgency,
          status: t.status,
          createdAt: t.createdAt,
        }))
      );
    }
  }, [rescueTasks]);

  useEffect(() => {
    if (availableAnimals.length > 0) {
      setAnimals(
        availableAnimals.slice(0, 4).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          personality: a.personality,
          photo: a.photos[0] || fallbackAnimals[0].photo,
          matchScore: Math.floor(Math.random() * 20 + 75),
        }))
      );
    }
  }, [availableAnimals]);

  return (
    <div className="space-y-8">
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-12"><PawPrint size={60} /></div>
          <div className="absolute bottom-6 right-16"><Heart size={48} /></div>
          <div className="absolute top-20 right-40"><PawPrint size={36} /></div>
          <div className="absolute bottom-16 left-48"><Heart size={28} /></div>
        </div>
        <div className="relative px-8 py-12 lg:py-16">
          <h1 className="text-3xl lg:text-4xl font-serif font-bold mb-3">
            让每个生命都被温柔以待
          </h1>
          <p className="text-primary-100 text-lg max-w-xl mb-6 leading-relaxed">
            流浪动物救助平台 — 连接爱心人士、志愿者与合作医院，为流浪动物提供从发现、救助到领养的全链路守护。
          </p>
          <Link to="/report" className="inline-flex items-center gap-2 bg-white text-primary-600 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
            上报流浪动物
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-5 animate-count-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <div className="stat-number text-warm-800">{stat.value}</div>
              <div className="text-sm text-warm-500 mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-500" />
            紧急救助任务
          </h2>
          <Link to="/rescue" className="text-primary-500 text-sm font-medium flex items-center gap-1 hover:text-primary-600 transition-colors">
            查看全部 <ChevronRight size={16} />
          </Link>
        </div>
        <div className="grid gap-3">
          {tasks.map((task) => (
            <div key={task.id} className="card p-4 flex items-center gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <AnimalIcon type={task.animalType} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-warm-800">
                    {task.animalType === 'cat' ? '流浪猫' : task.animalType === 'dog' ? '流浪犬' : '流浪动物'}
                  </span>
                  <UrgencyBadge urgency={task.urgency} />
                </div>
                <div className="flex items-center gap-1 text-xs text-warm-500">
                  <MapPin size={12} />
                  <span className="truncate">{task.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-warm-400 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(task.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <Link to="/rescue" className="btn-primary text-xs !px-3 !py-1.5 !rounded-lg">
                  立即接单
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title flex items-center gap-2">
            <Star size={22} className="text-amber-500" />
            领养推荐
          </h2>
          <Link to="/adopt" className="text-primary-500 text-sm font-medium flex items-center gap-1 hover:text-primary-600 transition-colors">
            更多萌宠 <ChevronRight size={16} />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
          {animals.map((animal) => (
            <Link
              key={animal.id}
              to={`/animal/${animal.id}`}
              className="card flex-shrink-0 w-[200px] animate-slide-in"
            >
              <div className="h-[160px] overflow-hidden bg-warm-100">
                <img
                  src={animal.photo}
                  alt={animal.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-warm-800">{animal.name}</span>
                  <span className="text-xs font-bold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">
                    {animal.matchScore}%匹配
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {animal.personality.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] bg-warm-100 text-warm-600 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title flex items-center gap-2 mb-4">
          <Activity size={22} className="text-primary-500" />
          最近动态
        </h2>
        <div className="card p-5">
          <div className="space-y-0">
            {recentActivities.map((act, i) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      act.type === 'rescue' ? 'bg-primary-100 text-primary-500' :
                      act.type === 'adopt' ? 'bg-rose-100 text-rose-500' :
                      act.type === 'report' ? 'bg-amber-100 text-amber-500' :
                      'bg-success-100 text-success-500'
                    }`}>
                      <Icon size={14} />
                    </div>
                    {i < recentActivities.length - 1 && (
                      <div className="w-px flex-1 bg-warm-200 my-1" />
                    )}
                  </div>
                  <div className={`pb-4 ${i === recentActivities.length - 1 ? 'pb-0' : ''}`}>
                    <p className="text-sm text-warm-700 leading-relaxed">{act.text}</p>
                    <span className="text-xs text-warm-400">{act.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
