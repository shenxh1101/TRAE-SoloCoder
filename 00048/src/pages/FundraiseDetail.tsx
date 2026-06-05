import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Building2, CheckCircle, PartyPopper } from 'lucide-react';
import useDonateStore from '@/stores/donateStore';

const ANIMAL_IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20stray%20cat%20or%20dog%20needs%20surgery&image_size=square';

interface Participant {
  name: string;
  amount: number;
  time: string;
}

export default function FundraiseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentFundraise, fetchFundraise, donateToFundraise } = useDonateStore();
  const [amount, setAmount] = useState('');
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    if (id) fetchFundraise(id);
  }, [id, fetchFundraise]);

  const data = currentFundraise;
  const progress = data ? Math.min(100, Math.round((data.currentAmount / data.targetAmount) * 100)) : 0;
  const participants: Participant[] = (data as any)?.participants_list || [];
  const hospitalName = data?.hospitalName || '';
  const disbursementDate = (data as any)?.disbursement_date || (data as any)?.disbursedAt || '';
  const isCompleted = data?.status === 'completed' || data?.status === 'disbursed';

  const handleDonate = async () => {
    const val = Number(amount);
    if (!val || val <= 0 || !id) return;
    const result = await donateToFundraise(id, val);
    setAmount('');
    if ((result as any)?.status === 'completed') {
      setShowCongrats(true);
    }
  };

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (progress / 100) * circumference;

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-20">
        <p className="text-warm-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-warm-500 hover:text-warm-700 transition-colors">
        <ArrowLeft size={20} />
        返回
      </button>

      {showCongrats && (
        <div className="card p-6 bg-success-50 border border-success-200 text-center space-y-3">
          <PartyPopper className="w-10 h-10 text-success-500 mx-auto" />
          <h3 className="font-bold text-success-700 text-lg">恭喜！筹款已满</h3>
          <p className="text-success-600 text-sm">感谢您的慷慨捐赠，款项已自动拨款至合作医院</p>
          <button onClick={() => setShowCongrats(false)} className="btn-outline text-sm">
            关闭
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="aspect-video bg-warm-100">
          <img src={data.animalPhoto || ANIMAL_IMG} alt={data.animalName} className="w-full h-full object-cover" />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-warm-800">{data.animalName} 绝育筹款</h2>
            <span className={`badge ${data.status === 'active' ? 'badge-active' : data.status === 'funded' ? 'badge-success' : 'badge-info'}`}>
              {data.status === 'active' ? '进行中' : data.status === 'funded' ? '已筹齐' : data.status === 'disbursed' ? '已拨款' : '已完成'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-warm-500">
            <Building2 size={16} />
            <span className="text-sm">{data.hospitalName}</span>
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <svg width="128" height="128" className="-rotate-90">
                <circle cx="64" cy="64" r="54" stroke="#e7e5e4" strokeWidth="8" fill="none" />
                <circle
                  cx="64" cy="64" r="54"
                  stroke={progress >= 100 ? '#22c55e' : '#f97316'}
                  strokeWidth="8" fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-warm-800">{progress}%</span>
                <span className="text-xs text-warm-400">已筹</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between text-center">
            <div>
              <div className="stat-number text-primary-600">¥{data.currentAmount.toLocaleString()}</div>
              <div className="text-xs text-warm-400">已筹金额</div>
            </div>
            <div>
              <div className="stat-number text-warm-800">¥{data.targetAmount.toLocaleString()}</div>
              <div className="text-xs text-warm-400">目标金额</div>
            </div>
            <div>
              <div className="stat-number text-warm-700">{data.participants}</div>
              <div className="text-xs text-warm-400">参与人数</div>
            </div>
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className="card p-6 space-y-3 bg-success-50 border border-success-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success-500" />
            <h3 className="font-bold text-success-700">筹款已满，已自动拨款至合作医院</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-success-600">
            <Building2 size={14} />
            <span>医院：{hospitalName}</span>
          </div>
          {disbursementDate && (
            <p className="text-sm text-success-600">拨款时间：{new Date(disbursementDate).toLocaleString('zh-CN')}</p>
          )}
        </div>
      )}

      {data.status === 'active' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-warm-800">参与筹款</h3>
          <div className="flex gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field flex-1"
              placeholder="输入捐赠金额"
              min={1}
            />
            <button onClick={handleDonate} disabled={!amount || Number(amount) <= 0} className="btn-primary disabled:opacity-40">
              参与筹款
            </button>
          </div>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-warm-500" />
          <h3 className="font-bold text-warm-800">参与者</h3>
        </div>
        {participants.length === 0 ? (
          <div className="text-center py-6 text-warm-400 text-sm">暂无参与者</div>
        ) : (
          <div className="space-y-3">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-medium">
                    {p.name[0]}
                  </div>
                  <span className="text-sm text-warm-700">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-warm-800">¥{p.amount}</span>
                  <span className="text-xs text-warm-400 ml-2">{p.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
