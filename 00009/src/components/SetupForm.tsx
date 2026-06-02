import { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Mountain, User, Sunset } from 'lucide-react';
import { useStoryStore } from '../store/useStoryStore';
import { updateLLMConfig, loadLLMConfig } from '../engine/llm';
import type { StoryPremise, LLMConfig } from '../engine/types';

const examplePresets: { background: string; character: string; scene: string }[] = [
  {
    background: '一个被远古魔法笼罩的遗忘王国',
    character: '一位失去记忆的年轻魔法师',
    scene: '暴风雨之夜，古城堡的大门缓缓打开',
  },
  {
    background: '2150年，人类在火星建立的第一个殖民城市',
    character: '一位发现异常信号的首席科学家',
    scene: '深夜的实验室里，屏幕上突然闪烁起未知代码',
  },
  {
    background: '一座永远笼罩在迷雾中的维多利亚式城市',
    character: '一位收到匿名信的私家侦探',
    scene: '雨夜的小巷中，一扇从未见过的门出现在墙上',
  },
  {
    background: '诸神黄昏后的破碎世界',
    character: '一个背负诅咒的流浪战士',
    scene: '废墟神殿中，一尊石像突然睁开了眼睛',
  },
];

export function SetupForm() {
  const [background, setBackground] = useState('');
  const [character, setCharacter] = useState('');
  const [scene, setScene] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.deepseek.com/v1/chat/completions');
  const [model, setModel] = useState('deepseek-chat');
  const [showApiConfig, setShowApiConfig] = useState(false);
  const { actions, isGenerating, error } = useStoryStore();

  useEffect(() => {
    const saved = loadLLMConfig();
    if (saved.apiKey) setApiKey(saved.apiKey);
    if (saved.endpoint) setEndpoint(saved.endpoint);
    if (saved.model) setModel(saved.model);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const llmConfig: Partial<LLMConfig> = {};
    if (apiKey.trim()) {
      llmConfig.apiKey = apiKey.trim();
    }
    if (endpoint.trim()) {
      llmConfig.endpoint = endpoint.trim();
    }
    if (model.trim()) {
      llmConfig.model = model.trim();
    }
    if (Object.keys(llmConfig).length > 0) {
      updateLLMConfig(llmConfig);
    }
    const premise: StoryPremise = {
      background: background.trim(),
      character: character.trim(),
      scene: scene.trim(),
    };
    await actions.initStory(premise, loadLLMConfig());
  };

  const handlePresetClick = (preset: typeof examplePresets[0]) => {
    setBackground(preset.background);
    setCharacter(preset.character);
    setScene(preset.scene);
  };

  const isFormValid = background.trim() && character.trim() && scene.trim();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-gold/20 to-amber-gold/5 mb-6 animate-float">
            <BookOpen className="w-10 h-10 text-amber-gold" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-amber-gold mb-4 text-shadow-gold font-display">
            命运编织者
          </h1>
          <p className="text-parchment/80 text-lg font-body">
            构建你的世界，开启属于你的传奇故事
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="parchment-bg vintage-border rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="corner-decoration top-left" />
            <div className="corner-decoration top-right" />
            <div className="corner-decoration bottom-left" />
            <div className="corner-decoration bottom-right" />

            <div className="relative z-10 space-y-5">
              <label className="block">
                <span className="text-ink/80 font-semibold font-display text-lg flex items-center gap-2">
                  <Mountain className="w-5 h-5 text-amber-gold" />
                  故事背景
                </span>
                <input
                  type="text"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="例如：一个被远古魔法笼罩的遗忘王国..."
                  className="mt-2 w-full px-4 py-3 bg-parchment/50 border-2 border-amber-gold/30 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-amber-gold focus:ring-2 focus:ring-amber-gold/20 font-body text-lg transition-all"
                  disabled={isGenerating}
                />
              </label>

              <div className="border-t border-amber-gold/20" />

              <label className="block">
                <span className="text-ink/80 font-semibold font-display text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-crimson" />
                  主角
                </span>
                <input
                  type="text"
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  placeholder="例如：一位失去记忆的年轻魔法师..."
                  className="mt-2 w-full px-4 py-3 bg-parchment/50 border-2 border-crimson/30 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-crimson focus:ring-2 focus:ring-crimson/20 font-body text-lg transition-all"
                  disabled={isGenerating}
                />
              </label>

              <div className="border-t border-amber-gold/20" />

              <label className="block">
                <span className="text-ink/80 font-semibold font-display text-lg flex items-center gap-2">
                  <Sunset className="w-5 h-5 text-forest" />
                  初始场景
                </span>
                <input
                  type="text"
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  placeholder="例如：暴风雨之夜，古城堡的大门缓缓打开..."
                  className="mt-2 w-full px-4 py-3 bg-parchment/50 border-2 border-forest/30 rounded-xl text-ink placeholder-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 font-body text-lg transition-all"
                  disabled={isGenerating}
                />
              </label>

              {error && (
                <div className="text-crimson text-sm bg-crimson/10 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <p className="text-ink/60 text-sm mb-2 font-display">
                  ✨ 灵感预设：
                </p>
                <div className="flex flex-wrap gap-2">
                  {examplePresets.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className="text-xs md:text-sm px-3 py-1.5 bg-amber-gold/10 hover:bg-amber-gold/20 text-ink/70 hover:text-ink rounded-full border border-amber-gold/20 transition-all duration-200"
                    >
                      {preset.character.slice(0, 12)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="text-parchment/60 hover:text-parchment text-sm transition-colors"
            >
              {showApiConfig ? '隐藏' : '显示'} AI 配置（可选，配置后故事更精彩）
            </button>

            {showApiConfig && (
              <div className="bg-deep-indigo/50 backdrop-blur-sm border border-amber-gold/20 rounded-xl p-4 space-y-4">
                <label className="block">
                  <span className="text-parchment/80 text-sm">API Endpoint</span>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.deepseek.com/v1/chat/completions"
                    className="mt-2 w-full px-4 py-2 bg-parchment/10 border border-amber-gold/30 rounded-lg text-parchment placeholder-parchment/30 focus:outline-none focus:border-amber-gold transition-colors text-sm font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-parchment/80 text-sm">Model</span>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="deepseek-chat"
                    className="mt-2 w-full px-4 py-2 bg-parchment/10 border border-amber-gold/30 rounded-lg text-parchment placeholder-parchment/30 focus:outline-none focus:border-amber-gold transition-colors text-sm font-mono"
                  />
                </label>
                <label className="block">
                  <span className="text-parchment/80 text-sm">API Key</span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="mt-2 w-full px-4 py-2 bg-parchment/10 border border-amber-gold/30 rounded-lg text-parchment placeholder-parchment/30 focus:outline-none focus:border-amber-gold transition-colors text-sm"
                  />
                  <p className="text-parchment/50 text-xs mt-2">
                    支持 OpenAI 兼容格式的 API（如 DeepSeek、Moonshot、智谱等）。配置后使用 AI 生成更有创意的故事内容，不配置则使用本地模板。
                  </p>
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isGenerating || !isFormValid}
            className="w-full py-4 px-8 bg-gradient-to-r from-amber-gold to-amber-gold/80 hover:from-amber-gold/90 hover:to-amber-gold/70 text-deep-indigo font-bold text-lg rounded-xl font-display transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-gold/30 active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                正在编织命运...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                开启故事之旅
              </>
            )}
          </button>
        </form>

        <p className="text-center text-parchment/40 text-sm mt-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          你的故事进度将自动保存在浏览器中
        </p>
      </div>
    </div>
  );
}
