import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Users, Clock } from 'lucide-react';
import useDonateStore from '@/stores/donateStore';

const ANIMAL_IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20stray%20cat%20or%20dog%20needs%20surgery&image_size=square';

function Countdown({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return <span>{days > 0 ? `${days}天` : '已截止'}</span>;
}

export default function Fundraise() {
  const { fundraises, fetchFundraises } = useDonateStore();

  useEffect(() => {
    fetchFundraises();
  }, [fetchFundraises]);

  const displayFundraises = fundraises.length > 0 ? fundraises : [
    { id: '1', initiatorId: '1', animalId: '1', animalName: '小橘', animalPhoto: '', hospitalId: '1', hospitalName: '爱心动物医院', targetAmount: 2000, currentAmount: 1500, deadline: '2024-12-31', status: 'active' as const, participants: 23, createdAt: '2024-03-01' },
    { id: '2', initiatorId: '2', animalId: '2', animalName: '大黄', animalPhoto: '', hospitalId: '2', hospitalName: '和平宠物诊所', targetAmount: 3500, currentAmount: 2100, deadline: '2024-12-25', status: 'active' as const, participants: 15, createdAt: '2024-03-05' },
    { id: '3', initiatorId: '3', animalId: '3', animalName: '花花', animalPhoto: '', hospitalId: '1', hospitalName: '爱心动物医院', targetAmount: 1500, currentAmount: 1500, deadline: '2024-11-30', status: 'funded' as const, participants: 32, createdAt: '2024-02-20' },
    { id: '4', initiatorId: '4', animalId: '4', animalName: '旺财', animalPhoto: '', hospitalId: '3', hospitalName: '阳光宠物医院', targetAmount: 4000, currentAmount: 800, deadline: '2024-12-20', status: 'active' as const, participants: 8, createdAt: '2024-03-10' },
    { id: '5', initiatorId: '5', animalId: '5', animalName: '小白', animalPhoto: '', hospitalId: '2', hospitalName: '和平宠物诊所', targetAmount: 1800, currentAmount: 1200, deadline: '2024-12-28', status: 'active' as const, participants: 18, createdAt: '2024-03-08' },
    { id: '6', initiatorId: '6', animalId: '6', animalName: '豆豆', animalPhoto: '', hospitalId: '1', hospitalName: '爱心动物医院', targetAmount: 2500, currentAmount: 2500, deadline: '2024-11-15', status: 'completed' as const, participants: 40, createdAt: '2024-02-01' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scissors className="text-primary-500" size={28} />
          <h1 className="section-title">绝育筹款</h1>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Scissors size={18} />
          发起筹款
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayFundraises.map((f) => {
          const progress = Math.min(100, Math.round((f.currentAmount / f.targetAmount) * 100));
          return (
            <Link key={f.id} to={`/fundraise/${f.id}`} className="card group">
              <div className="aspect-video overflow-hidden bg-warm-100">
                <img
                  src={f.animalPhoto || ANIMAL_IMG}
                  alt={f.animalName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-warm-800">{f.animalName}</h3>
                  <span className={`badge ${f.status === 'active' ? 'badge-active' : f.status === 'funded' ? 'badge-success' : 'badge-info'}`}>
                    {f.status === 'active' ? '进行中' : f.status === 'funded' ? '已筹齐' : '已完成'}
                  </span>
                </div>
                <p className="text-sm text-warm-500">{f.hospitalName}</p>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-600 font-medium">¥{f.currentAmount.toLocaleString()}</span>
                    <span className="text-warm-400">/ ¥{f.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-warm-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-warm-400">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {f.participants}人参与
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    <Countdown deadline={f.deadline} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
