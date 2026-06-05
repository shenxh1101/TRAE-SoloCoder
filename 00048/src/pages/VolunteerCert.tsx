import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Check, Clock, AlertCircle } from 'lucide-react';

export default function VolunteerCert() {
  const [form, setForm] = useState({
    realName: '',
    idNumber: '',
    phone: '',
    city: '',
    experience: '',
  });
  const [status, setStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.realName || !form.idNumber || !form.phone || !form.city) return;
    setStatus('pending');
    setSubmitted(true);
  };

  const statusConfig = {
    none: { icon: AlertCircle, label: '未认证', color: 'text-warm-500', bg: 'bg-warm-100', desc: '提交认证信息后，我们将尽快审核' },
    pending: { icon: Clock, label: '审核中', color: 'text-amber-500', bg: 'bg-amber-50', desc: '您的认证申请正在审核中，请耐心等待' },
    approved: { icon: Check, label: '已认证', color: 'text-success-500', bg: 'bg-success-50', desc: '您已通过志愿者认证' },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-primary-500" size={28} />
        <h1 className="section-title">志愿者认证</h1>
      </div>

      <div className={`${currentStatus.bg} rounded-2xl p-6 flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-full ${currentStatus.bg} flex items-center justify-center ${currentStatus.color}`}>
          <StatusIcon size={24} />
        </div>
        <div>
          <div className={`font-bold ${currentStatus.color}`}>{currentStatus.label}</div>
          <div className="text-sm text-warm-500">{currentStatus.desc}</div>
        </div>
      </div>

      {!submitted && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="label-field">真实姓名</label>
            <input
              type="text"
              value={form.realName}
              onChange={(e) => update('realName', e.target.value)}
              className="input-field"
              placeholder="请输入真实姓名"
            />
          </div>
          <div>
            <label className="label-field">身份证号</label>
            <input
              type="text"
              value={form.idNumber}
              onChange={(e) => update('idNumber', e.target.value)}
              className="input-field"
              placeholder="请输入身份证号"
              maxLength={18}
            />
          </div>
          <div>
            <label className="label-field">手机号码</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="input-field"
              placeholder="请输入手机号码"
              maxLength={11}
            />
          </div>
          <div>
            <label className="label-field">所在城市</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              className="input-field"
              placeholder="请输入所在城市"
            />
          </div>
          <div>
            <label className="label-field">救助经验</label>
            <textarea
              value={form.experience}
              onChange={(e) => update('experience', e.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="请描述您的动物救助经验（选填）"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.realName || !form.idNumber || !form.phone || !form.city}
            className="btn-primary w-full disabled:opacity-40"
          >
            提交认证
          </button>
        </div>
      )}

      <Link to="/profile" className="flex items-center gap-2 text-warm-500 hover:text-warm-700 transition-colors text-sm">
        <ArrowLeft size={16} />
        返回个人中心
      </Link>
    </div>
  );
}
