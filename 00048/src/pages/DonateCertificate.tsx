import { useState } from 'react';
import { Award, Download, Star, Heart } from 'lucide-react';
import useDonateStore from '@/stores/donateStore';
import useAuthStore from '@/stores/authStore';

export default function DonateCertificate() {
  const { donationHistory } = useDonateStore();
  const { user } = useAuthStore();
  const [selectedDonation, setSelectedDonation] = useState(0);

  const displayDonations = donationHistory.length > 0 ? donationHistory : [
    { id: '1', userId: '1', type: 'one_time' as const, amount: 100, status: 'completed' as const, createdAt: '2024-03-15' },
    { id: '2', userId: '1', type: 'one_time' as const, amount: 200, status: 'completed' as const, createdAt: '2024-02-20' },
  ];

  const current = displayDonations[selectedDonation] || displayDonations[0];

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(0, 0, 800, 600);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 760, 560);
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, 730, 530);
    ctx.fillStyle = '#292524';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('爱心捐赠证书', 400, 120);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#57534e';
    ctx.fillText(`致 ${user?.name || '爱心人士'}`, 400, 200);
    ctx.font = '18px sans-serif';
    ctx.fillText(`感谢您捐赠 ¥${current?.amount || 100}`, 400, 260);
    ctx.fillText('您的善举为流浪动物带来了温暖与希望', 400, 300);
    ctx.fillText(`捐赠日期：${current?.createdAt || new Date().toLocaleDateString()}`, 400, 370);
    ctx.fillStyle = '#78716c';
    ctx.font = '14px sans-serif';
    ctx.fillText('流浪救助站 颁发', 400, 450);
    const link = document.createElement('a');
    link.download = '爱心证书.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Award className="text-primary-500" size={28} />
        <h1 className="section-title">爱心证书</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {displayDonations.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setSelectedDonation(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedDonation === i
                ? 'bg-primary-500 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            }`}
          >
            ¥{d.amount} - {d.createdAt}
          </button>
        ))}
      </div>

      <div className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl border-4 border-amber-300 p-8 shadow-lg overflow-hidden">
        <div className="absolute top-4 left-4 text-amber-300 opacity-50">
          <Star size={40} />
        </div>
        <div className="absolute top-4 right-4 text-amber-300 opacity-50">
          <Star size={40} />
        </div>
        <div className="absolute bottom-4 left-4 text-primary-200 opacity-50">
          <Heart size={30} />
        </div>
        <div className="absolute bottom-4 right-4 text-primary-200 opacity-50">
          <Heart size={30} />
        </div>

        <div className="text-center space-y-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-primary-500 shadow-lg">
            <Award size={32} className="text-white" />
          </div>

          <h2 className="text-3xl font-serif font-bold text-warm-800">爱心捐赠证书</h2>

          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />

          <div className="space-y-2">
            <p className="text-warm-500">此证颁发给</p>
            <p className="text-2xl font-bold text-primary-600">{user?.name || '爱心人士'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-warm-600">感谢您慷慨捐赠</p>
            <p className="text-4xl font-serif font-bold text-warm-800">¥{current?.amount || 100}</p>
          </div>

          <p className="text-warm-500 text-sm max-w-md mx-auto">
            您的善举为流浪动物带来了温暖与希望，让每一个生命都能被温柔以待。
          </p>

          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />

          <div className="flex items-center justify-between text-sm text-warm-400 px-8">
            <span>颁发日期：{current?.createdAt || new Date().toLocaleDateString()}</span>
            <span>流浪救助站</span>
          </div>
        </div>
      </div>

      <button onClick={handleDownload} className="btn-primary w-full flex items-center justify-center gap-2">
        <Download size={18} />
        下载证书
      </button>
    </div>
  );
}
