import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Calendar } from 'lucide-react';
import useAdoptStore from '@/stores/adoptStore';

const ANIMAL_IMG = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20adoptable%20cat%20or%20dog%20warm%20portrait&image_size=square';

function ScoreCircle({ score }: { score: number }) {
  const color = score > 80 ? 'text-success-500' : score > 60 ? 'text-amber-500' : 'text-warm-400';
  const bg = score > 80 ? 'bg-success-50' : score > 60 ? 'bg-amber-50' : 'bg-warm-100';
  const border = score > 80 ? 'border-success-400' : score > 60 ? 'border-amber-400' : 'border-warm-300';
  return (
    <div className={`w-16 h-16 rounded-full border-4 ${border} ${bg} flex items-center justify-center`}>
      <span className={`text-lg font-bold ${color}`}>{score}</span>
    </div>
  );
}

export default function AdoptMatch() {
  const navigate = useNavigate();
  const { matches, fetchMatches } = useAdoptStore();

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (matches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="text-primary-500" size={28} />
          <h1 className="section-title">智能匹配</h1>
        </div>
        <div className="card p-12 text-center">
          <Sparkles className="w-12 h-12 text-warm-300 mx-auto mb-3" />
          <p className="text-warm-500 mb-2">暂无匹配结果</p>
          <p className="text-warm-400 text-sm mb-4">请先完成领养问卷，系统将为您智能匹配合适的动物</p>
          <Link to="/adopt/questionnaire" className="btn-primary inline-block">
            填写领养问卷
          </Link>
        </div>
      </div>
    );
  }

  const sorted = [...matches].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="text-primary-500" size={28} />
        <h1 className="section-title">智能匹配</h1>
      </div>

      <div className="card-warm p-4 text-center">
        <p className="text-warm-600">根据您的问卷结果，为您匹配到 <span className="font-bold text-primary-600">{sorted.length}</span> 只合适的动物</p>
      </div>

      <div className="space-y-4">
        {sorted.map((match, index) => (
          <div key={match.animalId} className="card p-4 flex gap-4 items-center">
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={match.animal?.photos?.[0] || ANIMAL_IMG}
                  alt={match.animal?.name || ''}
                  className="w-20 h-20 rounded-xl object-cover"
                />
                {index === 0 && (
                  <span className="absolute -top-2 -left-2 bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    最佳匹配
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-warm-800">{match.animal?.name || '未知'}</h3>
                <span className={`badge ${match.animal?.type === 'cat' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {match.animal?.type === 'cat' ? '猫咪' : match.animal?.type === 'dog' ? '狗狗' : '其他'}
                </span>
              </div>
              {match.matchReasons && match.matchReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {match.matchReasons.map((reason) => (
                    <span key={reason} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
              {match.animal?.personality && match.animal.personality.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {match.animal.personality.map((p) => (
                    <span key={p} className="text-xs text-warm-500">{p}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <ScoreCircle score={match.matchScore} />
              <span className="text-xs text-warm-500">匹配度</span>
              <button
                onClick={() => navigate('/adopt/appointment')}
                className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"
              >
                <Calendar size={14} />
                预约探访
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
