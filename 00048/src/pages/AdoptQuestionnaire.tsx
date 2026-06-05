import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import useAdoptStore from '@/stores/adoptStore';

const STEPS = ['居住环境', '家庭成员', '生活方式', '领养原因'];

export default function AdoptQuestionnaire() {
  const navigate = useNavigate();
  const { submitQuestionnaire } = useAdoptStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    livingSpace: 'apartment' as string,
    spaceSize: 'medium' as string,
    familyMembers: 2,
    hasChildren: false,
    hasOtherPets: false,
    workHours: 8,
    exerciseFreq: 'sometimes' as string,
    petExperience: 'some' as string,
    reason: '',
  });

  const update = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    await submitQuestionnaire(form);
    navigate('/adopt/match');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="text-primary-500" size={28} />
        <h1 className="section-title">领养问卷</h1>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i <= step ? 'bg-primary-500 text-white' : 'bg-warm-200 text-warm-500'
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i <= step ? 'text-primary-600 font-medium' : 'text-warm-400'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary-500' : 'bg-warm-200'}`} />}
            </div>
          ))}
        </div>
        <div className="w-full bg-warm-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card p-6">
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-warm-800">居住环境</h2>
            <div>
              <label className="label-field">住房类型</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'apartment', label: '公寓', desc: '高层/多层公寓' },
                  { value: 'house_with_yard', label: '有院房屋', desc: '带独立院子' },
                  { value: 'house_without_yard', label: '无院房屋', desc: '无独立院子' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update('livingSpace', opt.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.livingSpace === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-warm-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="font-medium text-warm-800">{opt.label}</div>
                    <div className="text-xs text-warm-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-field">空间大小</label>
              <div className="flex gap-3">
                {[
                  { value: 'small', label: '较小' },
                  { value: 'medium', label: '适中' },
                  { value: 'large', label: '宽敞' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update('spaceSize', opt.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                      form.spaceSize === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-warm-200 text-warm-600 hover:border-primary-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-warm-800">家庭成员</h2>
            <div>
              <label className="label-field">家庭人数: {form.familyMembers}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={form.familyMembers}
                onChange={(e) => update('familyMembers', Number(e.target.value))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-warm-400">
                <span>1人</span><span>10人</span>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasChildren}
                  onChange={(e) => update('hasChildren', e.target.checked)}
                  className="w-5 h-5 rounded accent-primary-500"
                />
                <span className="text-warm-700">家有小孩</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasOtherPets}
                  onChange={(e) => update('hasOtherPets', e.target.checked)}
                  className="w-5 h-5 rounded accent-primary-500"
                />
                <span className="text-warm-700">家有其他宠物</span>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-warm-800">生活方式</h2>
            <div>
              <label className="label-field">每日工作时间: {form.workHours}小时</label>
              <input
                type="range"
                min={4}
                max={14}
                value={form.workHours}
                onChange={(e) => update('workHours', Number(e.target.value))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-xs text-warm-400">
                <span>4小时</span><span>14小时</span>
              </div>
            </div>
            <div>
              <label className="label-field">运动频率</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'rarely', label: '很少' },
                  { value: 'sometimes', label: '偶尔' },
                  { value: 'often', label: '经常' },
                  { value: 'very_often', label: '非常频繁' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update('exerciseFreq', opt.value)}
                    className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.exerciseFreq === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-warm-200 text-warm-600 hover:border-primary-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-field">养宠经验</label>
              <div className="flex gap-3">
                {[
                  { value: 'none', label: '无经验' },
                  { value: 'some', label: '有一些' },
                  { value: 'experienced', label: '经验丰富' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update('petExperience', opt.value)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.petExperience === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-warm-200 text-warm-600 hover:border-primary-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-warm-800">领养原因</h2>
            <div>
              <label className="label-field">请描述您想领养动物的原因</label>
              <textarea
                value={form.reason}
                onChange={(e) => update('reason', e.target.value)}
                rows={5}
                className="input-field resize-none"
                placeholder="例如：我一直很喜欢动物，希望能给流浪动物一个温暖的家..."
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="btn-secondary flex items-center gap-1 disabled:opacity-40"
        >
          <ChevronLeft size={18} />
          上一步
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="btn-primary flex items-center gap-1"
          >
            下一步
            <ChevronRight size={18} />
          </button>
        ) : (
          <button onClick={handleSubmit} className="btn-primary flex items-center gap-1">
            提交问卷
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
