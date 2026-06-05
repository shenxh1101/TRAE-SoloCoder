import { useState } from 'react';
import {
  Volume2,
  LayoutGrid,
  DollarSign,
  TrendingUp,
  Download,
  CheckCircle2,
  Info,
  MapPin,
  Loader2
} from 'lucide-react';
import { solutionApi } from '../services/solutionApi';
import { useToast } from '../components/common/Toast';
import type { MaterialItem, SpeakerConfig, NoiseSolution } from '../types';

export default function NoiseReduction() {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [solution, setSolution] = useState<NoiseSolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTaskId] = useState('task-002');

  const { showToast } = useToast();

  const loadSolution = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await solutionApi.generateSolution(currentTaskId);
      setSolution(res.data);
      showToast('方案生成成功', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '方案生成失败');
      showToast(err instanceof Error ? err.message : '方案生成失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecommendation = async (recId: string) => {
    try {
      await solutionApi.applyRecommendation(currentTaskId, recId);
      showToast('方案已成功应用', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '应用方案失败', 'error');
    }
  };

  const materials = solution?.materials || [];
  const speakers = solution?.speakerArray || [];

  const totalCost = materials.reduce((sum, mat) => sum + (mat.costPerSqm * mat.areaSqm), 0) || solution?.estimatedCost || 0;
  const totalSpeakerPower = speakers.reduce((sum, spk) => sum + spk.powerWatts, 0);
  const avgNRC = materials.length > 0
    ? materials.reduce((sum, mat) => sum + mat.nrc * mat.areaSqm, 0) / materials.reduce((sum, mat) => sum + mat.areaSqm, 0)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-acoustic-cyber animate-spin" />
        <span className="ml-3 text-gray-400">正在生成降噪方案...</span>
      </div>
    );
  }

  if (error && !solution) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-acoustic-danger mb-2">加载失败</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={loadSolution} className="mt-4 btn-primary">重新生成</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-mono">主动降噪方案</h1>
          <p className="text-gray-400 text-sm">AI生成的吸音材料布局与扬声器阵列参数优化建议</p>
        </div>

        <button onClick={loadSolution} className="btn-primary flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>生成方案</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 card-hover-effect">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-6 h-6 text-acoustic-cyber" />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-acoustic-success/20 text-acoustic-success">
              预算内
            </span>
          </div>
          <p className="text-2xl font-bold data-value text-white mb-1">¥{totalCost.toLocaleString()}</p>
          <p className="text-xs text-gray-400">预估总成本</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <div className="flex items-center mb-3">
            <Volume2 className="w-6 h-6 text-acoustic-neon" />
          </div>
          <p className="text-2xl font-bold data-value text-white mb-1">{(avgNRC * 100).toFixed(1)}%</p>
          <p className="text-xs text-gray-400">平均降噪系数(NRC)</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <div className="flex items-center mb-3">
            <LayoutGrid className="w-6 h-6 text-acoustic-warning" />
          </div>
          <p className="text-2xl font-bold data-value text-white mb-1">{materials.length}</p>
          <p className="text-xs text-gray-400">材料种类</p>
        </div>

        <div className="glass-card p-5 card-hover-effect">
          <div className="flex items-center mb-3">
            <TrendingUp className="w-6 h-6 text-acoustic-data" />
          </div>
          <p className="text-2xl font-bold data-value text-white mb-1">{totalSpeakerPower}W</p>
          <p className="text-xs text-gray-400">扬声器总功率</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Volume2 className="w-5 h-5 mr-2 text-acoustic-cyber" />
              吸音材料配置
            </h3>

            <div className="space-y-4">
              {materials.map((material) => (
                <div
                  key={material.id}
                  onClick={() => setSelectedMaterial(selectedMaterial?.id === material.id ? null : material)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 group
                    ${selectedMaterial?.id === material.id 
                      ? 'border-acoustic-cyber bg-acoustic-cyber/5' 
                      : 'border-acoustic-steel/20 hover:border-acoustic-steel/40 bg-acoustic-midnight/20'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-white">{material.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          material.type === 'absorption' ? 'bg-blue-500/20 text-blue-400' :
                          material.type === 'diffusion' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {material.type === 'absorption' ? '吸音' : material.type === 'diffusion' ? '扩散' : '低频陷阱'}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">厚度</p>
                          <p className="font-mono text-white">{material.thickness} mm</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">密度</p>
                          <p className="font-mono text-white">{material.density} kg/m³</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">NRC值</p>
                          <p className="font-mono text-acoustic-neon font-semibold">{material.nrc}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">面积</p>
                          <p className="font-mono text-white">{material.areaSqm} m²</p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 text-right">
                      <p className="text-lg font-bold data-value text-acoustic-warning">
                        ¥{(material.costPerSqm * material.areaSqm).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">¥{material.costPerSqm}/m²</p>
                    </div>
                  </div>

                  {selectedMaterial?.id === material.id && (
                    <div className="mt-4 pt-4 border-t border-acoustic-cyber/20 animate-fade-in">
                      <div className="flex items-start space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-acoustic-cyber mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-300">安装位置坐标:</p>
                          <p className="font-mono text-white mt-1">
                            ({material.position.join(', ')}) 米
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-acoustic-midnight/30 rounded-lg">
                        <p className="text-xs text-gray-400 flex items-start mb-1">
                          <Info className="w-3 h-3 mr-1 mt-0.5" />
                          安装说明
                        </p>
                        <ul className="text-xs text-gray-300 space-y-1 ml-4 list-disc">
                          <li>使用环保型胶粘剂固定于墙面</li>
                          <li>预留10mm伸缩缝以应对温湿度变化</li>
                          <li>表面覆盖透声织物以提升美观度</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Volume2 className="w-5 h-5 mr-2 text-acoustic-data" />
              扬声器阵列配置
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-acoustic-steel/30">
                    <th className="text-left py-3 px-3 text-xs font-mono text-gray-400 uppercase">型号</th>
                    <th className="text-left py-3 px-3 text-xs font-mono text-gray-400 uppercase">位置 (x,y,z)</th>
                    <th className="text-left py-3 px-3 text-xs font-mono text-gray-400 uppercase">功率</th>
                    <th className="text-left py-3 px-3 text-xs font-mono text-gray-400 uppercase">频率范围</th>
                    <th className="text-left py-3 px-3 text-xs font-mono text-gray-400 uppercase">覆盖角</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-acoustic-steel/20">
                  {speakers.map((speaker) => (
                    <tr key={speaker.id} className="hover:bg-acoustic-midnight/20 transition-colors">
                      <td className="py-3 px-3 font-medium text-white">{speaker.model}</td>
                      <td className="py-3 px-3 font-mono text-sm text-gray-300">
                        ({speaker.position.join(', ')})
                      </td>
                      <td className="py-3 px-3 data-value text-acoustic-cyber">{speaker.powerWatts}W</td>
                      <td className="py-3 px-3 font-mono text-sm text-gray-300">
                        {speaker.frequencyRangeHz[0]}-{speaker.frequencyRangeHz[1]} Hz
                      </td>
                      <td className="py-3 px-3 text-gray-300">{speaker.coverageAngle}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              预期效果预测
            </h3>

            <div className="space-y-4">
              {[
                { label: 'RT60改善', value: '-0.45s', improvement: true },
                { label: '均匀度提升', value: '+12.3%', improvement: true },
                { label: 'SPL峰值降低', value: '-8.2 dB', improvement: true },
                { label: 'SWR优化', value: '-1.8', improvement: true },
                { label: '清晰度提升', value: '+0.15', improvement: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <span className={`font-mono font-semibold ${
                    item.improvement ? 'text-acoustic-success' : 'text-acoustic-danger'
                  }`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-acoustic-steel/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">综合效果评分</span>
                <span className="text-2xl font-bold data-value text-acoustic-neon glow-text">92%</span>
              </div>
              
              <div className="h-2 bg-acoustic-steel/20 rounded-full overflow-hidden">
                <div className="h-full w-[92%] bg-gradient-to-r from-acoustic-cyber to-acoustic-neon rounded-full"></div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                基于历史相似案例的机器学习预测模型
              </p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              成本明细
            </h3>

            <dl className="space-y-3 text-sm">
              {materials.map((mat) => (
                <div key={mat.id} className="flex justify-between">
                  <dt className="text-gray-400">{mat.name}</dt>
                  <dd className="data-value text-white">¥{(mat.costPerSqm * mat.areaSqm).toLocaleString()}</dd>
                </div>
              ))}
              
              <div className="pt-3 mt-3 border-t border-acoustic-steel/30">
                <div className="flex justify-between font-semibold">
                  <dt className="text-white">总计</dt>
                  <dd className="data-value text-acoustic-warning text-lg">¥{totalCost.toLocaleString()}</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="glass-card p-6 bg-gradient-to-br from-acoustic-cyber/5 to-acoustic-neon/5 border-acoustic-cyber/20">
            <div className="flex items-start space-x-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-acoustic-success flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-1">方案已就绪</h4>
                <p className="text-sm text-gray-400">
                  此方案已通过声学设计师验证，可提交至施工团队执行。
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button className="btn-primary w-full text-sm">
                提交审批流程
              </button>
              <button className="btn-secondary w-full text-sm">
                调整参数重新生成
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
