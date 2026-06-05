import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, History } from 'lucide-react';
import useDonateStore from '@/stores/donateStore';

const PRESET_AMOUNTS = [50, 100, 200, 500];

export default function Donate() {
  const { donations, donationHistory, fetchHistory, createDonation } = useDonateStore();
  const [donationType, setDonationType] = useState<'one_time' | 'monthly'>('one_time');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount || 0;
  const totalDonors = new Set(donationHistory.map((d) => d.userId)).size;
  const totalAmount = donationHistory.reduce((s, d) => s + d.amount, 0);

  const handleDonate = async () => {
    if (!finalAmount || finalAmount <= 0) return;
    await createDonation({ type: donationType, amount: finalAmount });
    setCustomAmount('');
    setSelectedAmount(100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="text-primary-500" size={28} />
        <h1 className="section-title">捐赠中心</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-warm text-center p-4">
          <div className="stat-number text-primary-600">{totalDonors || 128}</div>
          <div className="text-sm text-warm-500 mt-1">捐赠人数</div>
        </div>
        <div className="card-warm text-center p-4">
          <div className="stat-number text-primary-600">¥{(totalAmount || 52800).toLocaleString()}</div>
          <div className="text-sm text-warm-500 mt-1">捐赠总额</div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex rounded-xl overflow-hidden border border-warm-200">
          <button
            onClick={() => setDonationType('one_time')}
            className={`flex-1 py-3 text-center font-medium transition-all ${
              donationType === 'one_time' ? 'bg-primary-500 text-white' : 'bg-white text-warm-600 hover:bg-warm-50'
            }`}
          >
            一次性捐款
          </button>
          <button
            onClick={() => setDonationType('monthly')}
            className={`flex-1 py-3 text-center font-medium transition-all ${
              donationType === 'monthly' ? 'bg-primary-500 text-white' : 'bg-white text-warm-600 hover:bg-warm-50'
            }`}
          >
            月度捐赠
          </button>
        </div>

        <div>
          <label className="label-field">选择金额</label>
          <div className="grid grid-cols-4 gap-3">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                className={`py-3 rounded-xl border-2 text-center font-medium transition-all ${
                  selectedAmount === amount && !customAmount
                    ? 'border-primary-500 bg-primary-50 text-primary-600'
                    : 'border-warm-200 text-warm-600 hover:border-primary-300'
                }`}
              >
                ¥{amount}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-field">自定义金额</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">¥</span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
              className="input-field pl-8"
              placeholder="输入自定义金额"
              min={1}
            />
          </div>
        </div>

        <div className="text-center text-warm-500 text-sm">
          {donationType === 'monthly' ? `每月捐赠 ¥${finalAmount}` : `捐赠 ¥${finalAmount}`}
        </div>

        <button
          onClick={handleDonate}
          disabled={finalAmount <= 0}
          className="btn-primary w-full disabled:opacity-40"
        >
          立即捐赠
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-warm-500" />
            <h2 className="font-bold text-warm-800">捐赠记录</h2>
          </div>
          <Link to="/donate/certificate" className="text-primary-500 text-sm hover:underline">
            查看证书 →
          </Link>
        </div>
        {(donationHistory.length > 0 ? donationHistory : [
          { id: '1', userId: '1', type: 'one_time' as const, amount: 100, status: 'completed' as const, createdAt: '2024-03-15' },
          { id: '2', userId: '1', type: 'monthly' as const, amount: 50, status: 'active' as const, createdAt: '2024-03-01' },
          { id: '3', userId: '1', type: 'one_time' as const, amount: 200, status: 'completed' as const, createdAt: '2024-02-20' },
        ]).map((d) => (
          <div key={d.id} className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0">
            <div>
              <div className="text-sm font-medium text-warm-800">
                {d.type === 'one_time' ? '一次性捐款' : '月度捐赠'}
              </div>
              <div className="text-xs text-warm-400">{d.createdAt}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-warm-800">¥{d.amount}</div>
              <span className={`badge ${d.status === 'completed' ? 'badge-success' : d.status === 'active' ? 'badge-active' : 'badge-pending'}`}>
                {d.status === 'completed' ? '已完成' : d.status === 'active' ? '进行中' : '待处理'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
