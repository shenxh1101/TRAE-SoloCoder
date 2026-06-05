import { useState, useEffect } from 'react';
import {
  Lightbulb,
  Star,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  Loader2
} from 'lucide-react';
import { recommendationApi } from '../services/recommendationApi';
import { useToast } from '../components/common/Toast';
import type { Recommendation, MaterialItem, PurposeCategory } from '../types';
import type { RecommendationStats } from '../services/recommendationApi';

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [purposeFilter, setPurposeFilter] = useState<PurposeCategory | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [currentRoomId] = useState('room-001');

  const { showToast } = useToast();

  useEffect(() => {
    loadRecommendations();
    loadStats();
  }, [currentRoomId]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recommendationApi.getRecommendations(currentRoomId);
      setRecommendations(res.data);
      if (res.data.length > 0 && !selectedRecommendation) {
        setSelectedRecommendation(res.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取推荐方案失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await recommendationApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load recommendation stats:', err);
    }
  };

  const handleApplyRecommendation = async (recId: string) => {
    try {
      showToast('方案应用成功', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '应用方案失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">加载推荐方案...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={loadRecommendations} className="mt-4 btn-primary">重试</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-acoustic-warning" />
            智能推荐引擎
          </h1>
          <p className="text-gray-400 text-sm">基于历史模拟数据的AI驱动材料组合优化与坐标智能匹配</p>
        </div>

        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-acoustic-data/20 to-purple-500/20 border border-acoustic-data/30">
          <Sparkles className="w-4 h-4 text-acoustic-data" />
          <span className="text-sm font-mono text-acoustic-data">ML模型 v2.3</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 card-hover-effect">
          <Lightbulb className="w-8 h-8 text-acoustic-warning mb-3" />
          <p className="text-2xl font-bold data-value text-white">{recommendations.length}</p>
          <p className="text-sm text-gray-400">可用推荐方案</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <Star className="w-8 h-8 text-acoustic-cyber mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-cyber">{recommendations.length > 0 ? (recommendations[0].confidenceScore * 100).toFixed(0) : 0}%</p>
          <p className="text-sm text-gray-400">最高置信度</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <TrendingUp className="w-8 h-8 text-acoustic-success mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-success">{recommendations.length > 0 ? (recommendations[0].predictedEffectiveness * 100).toFixed(0) : 0}%</p>
          <p className="text-sm text-gray-400">预期效果</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <Layers className="w-8 h-8 text-acoustic-neon mb-3" />
          <p className="text-2xl font-bold data-value text-acoustic-neon">{stats?.totalRecords || 0}</p>
          <p className="text-sm text-gray-400">历史案例库</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <span className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-acoustic-warning" />
                推荐方案列表
              </span>
              
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value as PurposeCategory | 'all')}
                className="px-3 py-1.5 bg-acoustic-midnight/50 border border-acoustic-steel/40 rounded text-xs 
                         text-white focus:outline-none focus:border-acoustic-cyber"
              >
                <option value="all">全部房间类型</option>
                <option value="concert_hall">音乐厅</option>
                <option value="recording_studio">录音棚</option>
                <option value="office">办公室</option>
              </select>
            </h3>

            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecommendation(rec)}
                  className={`p-5 rounded-lg border cursor-pointer transition-all duration-200 group card-hover-effect
                    ${selectedRecommendation?.id === rec.id 
                      ? 'border-acoustic-cyber bg-acoustic-cyber/5 ring-2 ring-acoustic-cyber/20' 
                      : 'border-acoustic-steel/20 hover:border-acoustic-steel/40'
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white' :
                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
                        'bg-gradient-to-br from-orange-600 to-red-500 text-white'
                      }`}>
                        #{index + 1}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-white">方案 {index + 1}: {
                          rec.materialCombination.map(m => m.name).join(' + ')
                        }</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          基于 {rec.basedOnTasks.length} 个相似案例 · 置信度 {(rec.confidenceScore * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                      rec.confidenceScore >= 0.9 ? 'bg-acoustic-success/20 text-acoustic-success' :
                      rec.confidenceScore >= 0.8 ? 'bg-acoustic-cyber/20 text-acoustic-cyber' :
                      'bg-acoustic-warning/20 text-acoustic-warning'
                    }`}>
                      {(rec.confidenceScore * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-acoustic-steel/20">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">预期效果</p>
                      <p className="font-mono font-semibold text-acoustic-neon">{(rec.predictedEffectiveness * 100).toFixed(0)}%</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">预估成本</p>
                      <p className="font-mono font-semibold text-acoustic-warning">¥{rec.estimatedCost.toLocaleString()}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">材料数量</p>
                      <p className="font-mono font-semibold text-white">{rec.materialCombination.length} 种</p>
                    </div>
                  </div>

                  {selectedRecommendation?.id === rec.id && (
                    <div className="mt-4 pt-4 border-t border-acoustic-cyber/20 animate-fade-in">
                      <button
                        onClick={() => handleApplyRecommendation(rec.id)}
                        className="btn-primary w-full text-sm flex items-center justify-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>应用此方案</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">算法原理说明</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
                <h4 className="font-semibold text-acoustic-cyber mb-2 text-sm">协同过滤推荐</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  基于房间几何特征向量(体积、表面积、长宽比)计算余弦相似度，
                  从历史成功案例中提取Top-K最优材料组合方案。
                </p>
              </div>

              <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
                <h4 className="font-semibold text-acoustic-neon mb-2 text-sm">加权评分机制</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  综合考虑空间相似度(40%)、历史效果得分(40%)、时间衰减因子(20%)，
                  输出0-100的置信度评分。
                </p>
              </div>

              <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
                <h4 className="font-semibold text-acoustic-warning mb-2 text-sm">遗传算法优化</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  对扬声器阵列坐标使用GA求解，种群规模100、迭代500代，
                  以声场均匀度为适应度函数。
                </p>
              </div>

              <div className="p-4 bg-acoustic-midnight/30 rounded-lg">
                <h4 className="font-semibold text-acoustic-data mb-2 text-sm">持续学习</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  每次新任务完成后自动纳入案例库，定期重训练模型以提升推荐精度。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {selectedRecommendation && (
            <div className="glass-card p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2 text-acoustic-warning" />
                方案详情 #{recommendations.indexOf(selectedRecommendation) + 1}
              </h3>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">置信度评分</span>
                  <span className="data-value text-xl font-bold text-acoustic-cyber">
                    {(selectedRecommendation.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="h-3 bg-acoustic-steel/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      selectedRecommendation.confidenceScore >= 0.9 ? 'bg-gradient-to-r from-acoustic-success to-emerald-400' :
                      selectedRecommendation.confidenceScore >= 0.8 ? 'bg-gradient-to-r from-acoustic-cyber to-blue-400' :
                      'bg-gradient-to-r from-acoustic-warning to-orange-400'
                    }`}
                    style={{ width: `${selectedRecommendation.confidenceScore * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center">
                  <Layers className="w-4 h-4 mr-2" />
                  材料配置清单
                </h4>

                {selectedRecommendation.materialCombination.map((material, idx) => (
                  <div key={material.id} className="p-3 bg-acoustic-midnight/30 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-white text-sm">{material.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {material.type === 'absorption' ? '吸音材料' : 
                           material.type === 'diffusion' ? '扩散体' : '低频陷阱'}
                        </p>
                      </div>
                      
                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-acoustic-cyber/20 text-acoustic-cyber">
                        NRC: {material.nrc}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-acoustic-steel/20">
                      <div>
                        <span className="text-gray-500">厚度:</span>{' '}
                        <span className="text-white">{material.thickness}mm</span>
                      </div>
                      <div>
                        <span className="text-gray-500">密度:</span>{' '}
                        <span className="text-white">{material.density}kg/m³</span>
                      </div>
                      <div>
                        <span className="text-gray-500">面积:</span>{' '}
                        <span className="text-white">{material.areaSqm}m²</span>
                      </div>
                      <div>
                        <span className="text-gray-500">单价:</span>{' '}
                        <span className="text-acoustic-warning">¥{material.costPerSqm}/m²</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <dl className="space-y-3 text-sm mb-6 pb-6 border-b border-acoustic-steel/30">
                <div className="flex justify-between">
                  <dt className="text-gray-400">预期降噪效果</dt>
                  <dd className="font-bold text-acoustic-neon">{selectedRecommendation.predictedEffectiveness}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">总成本估算</dt>
                  <dd className="font-bold text-acoustic-warning">¥{selectedRecommendation.estimatedCost.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">参考案例数</dt>
                  <dd className="font-mono text-white">{selectedRecommendation.basedOnTasks.length} 个</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <button
                  onClick={() => selectedRecommendation && handleApplyRecommendation(selectedRecommendation.id)}
                  className="btn-primary w-full text-sm flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>应用到当前任务</span>
                </button>
                
                <button className="btn-secondary w-full text-sm">
                  保存为模板
                </button>
              </div>
            </div>
          )}

          {selectedRecommendation && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
                相似案例参考 (基于 {selectedRecommendation.basedOnTasks.length} 个历史任务)
              </h4>
              
              <div className="space-y-2">
                {selectedRecommendation.basedOnTasks.map((taskId: string, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-acoustic-midnight/30 text-sm text-gray-300 hover:text-acoustic-cyber cursor-pointer transition-colors font-mono">
                    历史任务: {taskId}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
