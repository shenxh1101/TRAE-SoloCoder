import React from 'react';
import { Sparkles, Brain } from 'lucide-react';

interface TextSuggestionsProps {
  texts: string[];
  isLoading: boolean;
  onSelectText: (text: string) => void;
  onRefresh: () => void;
}

export function TextSuggestions({ texts, isLoading, onSelectText, onRefresh }: TextSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Brain className="w-4 h-4 animate-pulse text-purple-500" />
            AI 正在生成配文...
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-3 bg-gray-100 rounded-xl animate-pulse h-12"
            />
          ))}
        </div>
      </div>
    );
  }

  if (texts.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        点击上方「AI 智能配文」按钮生成配文
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">
          <Sparkles className="w-4 h-4 inline mr-1 text-yellow-500" />
          AI 推荐配文
        </h3>
        <button
          onClick={onRefresh}
          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
        >
          换一批
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {texts.map((text, index) => (
          <button
            key={index}
            onClick={() => onSelectText(text)}
            className="p-3 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 text-left group"
          >
            <span className="text-gray-400 text-xs mr-2">{index + 1}.</span>
            <span className="text-gray-700 group-hover:text-orange-600 transition-colors">
              {text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
