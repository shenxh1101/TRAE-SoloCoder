import { useEffect, useCallback } from 'react';
import { useTypewriter } from '../hooks/useTypewriter';
import { useStoryStore, useCurrentNode } from '../store/useStoryStore';
import { ChoiceButton } from './ChoiceButton';
import { loadLLMConfig } from '../engine/llm';
import { Sparkles, Bot, FileCode } from 'lucide-react';

export function StoryCard() {
  const currentNode = useCurrentNode();
  const { isGenerating, transitionState, generationMode, actions } = useStoryStore();
  const { error } = useStoryStore();

  const { displayText, isComplete, isTyping, skip } = useTypewriter(
    currentNode?.content || '',
    {
      speed: 25,
      startDelay: 300,
    }
  );

  useEffect(() => {
    skip();
  }, [transitionState]);

  const handleChoiceClick = useCallback(
    (choiceId: string) => {
      const llmConfig = loadLLMConfig();
      if (!isComplete && !isGenerating) {
        skip();
        setTimeout(() => {
          actions.makeChoice(choiceId, llmConfig);
        }, 300);
      } else {
        actions.makeChoice(choiceId, llmConfig);
      }
    },
    [isComplete, isGenerating, actions, skip]
  );

  if (!currentNode) return null;

  const getTransitionClass = () => {
    switch (transitionState) {
      case 'leaving':
        return 'animate-slide-out-left';
      case 'entering':
        return 'animate-slide-in-right';
      default:
        return '';
    }
  };

  const getChoiceColor = (index: number) => {
    const colors = [
      {
        bg: 'bg-gradient-to-br from-amber-gold/20 to-amber-gold/5',
        border: 'border-amber-gold/50 hover:border-amber-gold',
        text: 'text-amber-gold hover:text-amber-gold',
        glow: 'hover:shadow-amber-gold/30',
      },
      {
        bg: 'bg-gradient-to-br from-crimson/20 to-crimson/5',
        border: 'border-crimson/50 hover:border-crimson',
        text: 'text-crimson hover:text-crimson',
        glow: 'hover:shadow-crimson/30',
      },
      {
        bg: 'bg-gradient-to-br from-forest/30 to-forest/10',
        border: 'border-forest/50 hover:border-forest',
        text: 'text-forest hover:text-forest',
        glow: 'hover:shadow-forest/30',
      },
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${getTransitionClass()}`}>
      <div className="parchment-bg vintage-border rounded-2xl p-6 md:p-10 relative overflow-hidden mb-8">
        <div className="corner-decoration top-left" />
        <div className="corner-decoration top-right" />
        <div className="corner-decoration bottom-left" />
        <div className="corner-decoration bottom-right" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            {generationMode === 'llm' ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-forest bg-forest/10 px-3 py-1 rounded-full">
                <Bot className="w-3.5 h-3.5" />
                AI 生成
              </span>
            ) : generationMode === 'template' ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-crimson bg-crimson/10 px-3 py-1 rounded-full">
                <FileCode className="w-3.5 h-3.5" />
                模板生成
              </span>
            ) : null}
          </div>
          <span className="text-ink/50 text-sm font-display">
            第 {currentNode.depth + 1} 章
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-ink text-lg md:text-xl leading-relaxed font-body whitespace-pre-wrap min-h-[120px]">
            {displayText}
            {isTyping && <span className="typewriter-cursor" />}
          </p>
        </div>

        {isTyping && (
          <div className="mt-4 relative z-10">
            <button
              onClick={skip}
              className="text-ink/50 hover:text-ink/70 text-sm transition-colors"
            >
              点击跳过动画 →
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-crimson/10 border border-crimson/30 rounded-xl text-crimson text-center">
          {error}
          <button
            onClick={actions.clearError}
            className="ml-3 underline hover:no-underline"
          >
            关闭
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentNode.choices.map((choice, index) => {
          const colors = getChoiceColor(index);
          return (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              index={index}
              colors={colors}
              disabled={isGenerating || !isComplete}
              onClick={() => handleChoiceClick(choice.id)}
              style={{ animationDelay: `${0.1 * index + 0.3}s` }}
            />
          );
        })}
      </div>

      {isGenerating && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-3 bg-deep-indigo/80 backdrop-blur-sm text-amber-gold px-6 py-3 rounded-full border border-amber-gold/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="font-display">命运正在编织...</span>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
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
          </div>
        </div>
      )}
    </div>
  );
}
