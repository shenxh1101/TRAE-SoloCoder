import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Check } from 'lucide-react';
import useAdoptStore from '@/stores/adoptStore';

const AGREEMENT_TEXT = `流浪动物领养协议书

一、领养人承诺
1. 领养人保证已年满18周岁，具有完全民事行为能力。
2. 领养人承诺以人道方式对待领养动物，不得虐待、遗弃。
3. 领养人承诺为领养动物提供适当的食物、饮水、住所和医疗照护。

二、领养人义务
1. 定期带领养动物进行健康检查和疫苗接种。
2. 在规定时间内完成绝育手术（如未绝育）。
3. 配合本机构进行领养回访（第1、3、6个月）。
4. 如无法继续饲养，须优先联系本机构协商处理，不得擅自转赠或遗弃。

三、机构权利
1. 本机构有权对领养人的饲养条件进行评估和回访。
2. 如发现领养动物受到虐待或被遗弃，本机构有权收回动物。
3. 如领养人严重违反本协议条款，本机构有权解除领养关系。

四、免责条款
1. 领养时动物的健康状况已如实告知，领养后发现的健康问题由领养人承担。
2. 因不可抗力导致的问题，本机构不承担责任。

五、其他
1. 本协议一式两份，领养人和机构各持一份。
2. 本协议自双方签署之日起生效。`;

export default function AdoptAgreement() {
  const navigate = useNavigate();
  const { signAgreement } = useAdoptStore();
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleSign = async () => {
    if (!agreed || signed) return;
    await signAgreement({ questionnaire_id: '', terms: AGREEMENT_TEXT });
    setSigned(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-primary-500" size={28} />
        <h1 className="section-title">领养协议</h1>
      </div>

      <div className="card border-2 border-warm-300 p-6 max-h-[400px] overflow-y-auto scrollbar-thin">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-warm-700 leading-relaxed text-sm">
            {AGREEMENT_TEXT}
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-primary-500"
          />
          <span className="text-warm-700 text-sm">
            我已阅读并同意以上条款，承诺善待领养动物，接受机构的回访监督。
          </span>
        </label>

        <div>
          <label className="label-field">签名确认</label>
          <button
            onClick={handleSign}
            disabled={!agreed || signed}
            className={`w-full py-4 rounded-xl border-2 text-center font-medium transition-all ${
              signed
                ? 'border-success-400 bg-success-50 text-success-600'
                : agreed
                ? 'border-primary-500 bg-primary-50 text-primary-600 hover:bg-primary-100'
                : 'border-warm-200 bg-warm-50 text-warm-400 cursor-not-allowed'
            }`}
          >
            {signed ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={20} />
                已签署
              </span>
            ) : (
              '点击此处签名'
            )}
          </button>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          返回
        </button>
        <button
          onClick={() => navigate('/followup')}
          disabled={!signed}
          className="btn-primary disabled:opacity-40"
        >
          完成领养
        </button>
      </div>
    </div>
  );
}
