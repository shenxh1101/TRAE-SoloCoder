import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchInput } from '@/components/SearchInput';
import { AllergenSelector } from '@/components/AllergenSelector';
import { RecipeCard } from '@/components/RecipeCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRecipeGenerator } from '@/hooks/useRecipeGenerator';
import { useVoting } from '@/hooks/useVoting';
import { Sparkles, AlertTriangle, Settings, CheckCircle, XCircle, Key, Terminal, FileCode, Copy, Check } from 'lucide-react';
import { isAIConfigured, getAIConfig } from '@/services/aiService';
import { getVoteSummary, clearVoteHistory } from '@/services/voteStats';
import { VariantType } from '@/types';

export default function Home() {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const { variants, isLoading, error, generate, clear } = useRecipeGenerator();
  const { getVoteData, vote } = useVoting();
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string; maskedKey: string }>({ configured: false, model: '', maskedKey: '' });
  const [voteSummary, setVoteSummary] = useState<Array<{ type: VariantType; label: string; score: number; preference: string }>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const config = getAIConfig();
    setAiStatus({ configured: config.hasKey, model: config.model, maskedKey: config.maskedKey });
  }, []);

  useEffect(() => {
    setVoteSummary(getVoteSummary());
  }, [variants]);

  const handleSearch = (dishName: string) => {
    if (!aiStatus.configured) {
      return;
    }
    generate(dishName, selectedAllergens);
  };

  const handleCopyEnvExample = async () => {
    const example = `# AI 菜谱变形记 - 环境配置
VITE_AI_API_URL=https://api.openai.com/v1
VITE_AI_API_KEY=sk-你的API密钥
VITE_AI_MODEL=gpt-4o-mini`;
    try {
      await navigator.clipboard.writeText(example);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleClearVotes = () => {
    if (confirm('确定要清除所有投票数据吗？')) {
      clearVoteHistory();
      setVoteSummary([]);
    }
  };

  const handleNewSearch = () => {
    clear();
    setVoteSummary(getVoteSummary());
  };

  const handleVote = (variantId: string, direction: 'up' | 'down', variantType?: VariantType) => {
    vote(variantId, direction, variantType);
    setTimeout(() => {
      setVoteSummary(getVoteSummary());
    }, 100);
  };

  return (
    <div className="min-h-screen bg-texture">
      <Header />

      <main className="pb-20">
        <div className="max-w-7xl mx-auto px-4 mt-2">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              aiStatus.configured
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {aiStatus.configured ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {aiStatus.configured
                ? `AI 已连接 · ${aiStatus.model} · ${aiStatus.maskedKey}`
                : '⚠️ 未配置 AI API Key，请先配置'}
            </div>

            {voteSummary.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                <Settings className="w-4 h-4" />
                <span>用户偏好：
                  {voteSummary.map((v, i) => (
                    <span key={v.type} className={i > 0 ? 'ml-1' : ''}>
                      {i > 0 && ' · '}{v.label} {v.preference === '喜欢' ? '↑' : '↓'} ({v.score > 0 ? '+' : ''}{v.score})
                    </span>
                  ))}
                </span>
                <button
                  onClick={handleClearVotes}
                  className="ml-2 hover:bg-blue-100 rounded px-1.5 py-0.5 text-[10px] transition-colors"
                  title="清除投票数据"
                >
                  清除
                </button>
              </div>
            )}
          </div>
        </div>

        <SearchInput onSearch={handleSearch} isLoading={isLoading} disabled={!aiStatus.configured} />
        <AllergenSelector
          selectedAllergens={selectedAllergens}
          onChange={setSelectedAllergens}
        />

        {error && (
          <div className="max-w-2xl mx-auto px-4 mt-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">生成失败</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                {!aiStatus.configured && (
                  <p className="text-red-500 text-xs mt-2">
                    请在 .env 文件中配置 VITE_AI_API_KEY 以使用真实AI生成，或检查网络连接。
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading && <LoadingSpinner />}

        {variants.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 mt-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary-500" />
                <h2 className="font-serif text-2xl font-bold text-gray-800">
                  为你生成的创意变体
                </h2>
              </div>
              <button
                onClick={handleNewSearch}
                className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
              >
                重新生成
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {variants.map((variant, index) => (
                <RecipeCard
                  key={variant.id}
                  variant={variant}
                  index={index}
                  voteData={getVoteData(variant.id)}
                  allergens={selectedAllergens}
                  onVote={handleVote}
                />
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm">
                💡 小贴士：投票数据会保存在本地，帮助 AI 优化后续推荐排序
              </p>
              {voteSummary.length > 0 && (
                <p className="text-gray-400 text-xs mt-2">
                  系统已根据您的投票偏好调整了本次生成顺序
                </p>
              )}
            </div>
          </div>
          )}

        {!isLoading && variants.length === 0 && (
          <div className="max-w-3xl mx-auto px-4 mt-12">
            {!aiStatus.configured ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-amber-200">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                    <Key className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    请先配置 AI API Key
                  </h3>
                  <p className="text-gray-500">
                    为了使用真实 AI 生成菜谱变体，需要配置大模型 API 密钥
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Terminal className="w-5 h-5" />
                      配置步骤
                    </h4>
                    <ol className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        <div>
                          <p className="font-medium">在项目根目录创建 <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">.env</code> 文件</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        <div>
                          <p className="font-medium">将以下配置复制到 <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">.env</code> 文件中：</p>
                          <div className="mt-2 bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                            <p>VITE_AI_API_URL=https://api.openai.com/v1</p>
                            <p>VITE_AI_API_KEY=sk-你的API密钥</p>
                            <p>VITE_AI_MODEL=gpt-4o-mini</p>
                          </div>
                          <button
                            onClick={handleCopyEnvExample}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs transition-colors"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? '已复制' : '复制配置模板'}
                          </button>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        <div>
                          <p className="font-medium">将 <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">sk-你的API密钥</code> 替换为你的真实 API Key</p>
                          <p className="text-gray-500 text-xs mt-1">支持 OpenAI、DeepSeek、通义千问、智谱 AI 等所有 OpenAI 兼容接口</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        <div>
                          <p className="font-medium">重启开发服务器（Ctrl+C 后重新运行 <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">npm run dev</code>）</p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-5">
                    <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <FileCode className="w-5 h-5" />
                      支持的 API 提供商
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-blue-600">
                      <div>• OpenAI (gpt-4o, gpt-4o-mini)</div>
                      <div>• DeepSeek (deepseek-chat)</div>
                      <div>• 通义千问 (qwen-plus, qwen-max)</div>
                      <div>• 智谱 AI (glm-4, glm-4-flash)</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-6">👨‍🍳</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">
                  准备好开始了吗？
                </h3>
                <p className="text-gray-500">
                  在上方输入你想变形的家常菜名，点击生成按钮即可获得三种创意版本
                </p>
                
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-healthy-50 rounded-xl">
                    <div className="text-3xl mb-2">🥗</div>
                    <p className="text-sm text-healthy-700 font-medium">低卡健康版</p>
                    <p className="text-xs text-healthy-600 mt-1">减脂期友好</p>
                  </div>
                  <div className="p-4 bg-luxury-50 rounded-xl">
                    <div className="text-3xl mb-2">👑</div>
                    <p className="text-sm text-luxury-700 font-medium">豪华宴客版</p>
                    <p className="text-xs text-luxury-600 mt-1">宴请倍有面</p>
                  </div>
                  <div className="p-4 bg-exotic-50 rounded-xl">
                    <div className="text-3xl mb-2">🌍</div>
                    <p className="text-sm text-exotic-700 font-medium">异国风味版</p>
                    <p className="text-xs text-exotic-600 mt-1">尝鲜新体验</p>
                  </div>
                </div>

                {selectedAllergens.length > 0 && (
                  <div className="mt-6 p-4 bg-primary-50 rounded-xl text-left">
                    <p className="text-sm text-primary-700 font-medium mb-2">
                      ⚠️ 当前忌口设置：
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAllergens.map(a => (
                        <span key={a} className="px-2 py-0.5 bg-white text-primary-600 text-xs rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-primary-600 mt-2">
                      AI 生成时会自动避开以上食材
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-gray-400 text-sm">
        <p>🍳 AI 菜谱变形记 · 让家常菜变有趣</p>
      </footer>
    </div>
  );
}