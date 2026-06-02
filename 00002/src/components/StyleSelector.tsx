import React from 'react';
import { MemeStyle } from '../types';
import { styleLabels } from '../data/textTemplates';
import { Sparkles, Briefcase, Laugh } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: MemeStyle;
  onStyleChange: (style: MemeStyle) => void;
}

const styleIcons: Record<MemeStyle, React.ReactNode> = {
  sarcastic: <Sparkles className="w-4 h-4" />,
  office: <Briefcase className="w-4 h-4" />,
  funny: <Laugh className="w-4 h-4" />,
};

const styleColors: Record<MemeStyle, string> = {
  sarcastic: 'bg-purple-500 hover:bg-purple-600 text-white',
  office: 'bg-blue-500 hover:bg-blue-600 text-white',
  funny: 'bg-orange-500 hover:bg-orange-600 text-white',
};

const styleBorders: Record<MemeStyle, string> = {
  sarcastic: 'border-purple-300',
  office: 'border-blue-300',
  funny: 'border-orange-300',
};

export function StyleSelector({ selectedStyle, onStyleChange }: StyleSelectorProps) {
  const styles: MemeStyle[] = ['sarcastic', 'office', 'funny'];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-600">选择文字风格：</h3>
      <div className="flex gap-2 flex-wrap">
        {styles.map((style) => (
          <button
            key={style}
            onClick={() => onStyleChange(style)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-200 font-medium ${
              selectedStyle === style
                ? `${styleColors[style]} ${styleBorders[style]} shadow-md scale-105`
                : `bg-white text-gray-600 ${styleBorders[style]} hover:bg-gray-50`
            }`}
          >
            {styleIcons[style]}
            {styleLabels[style]}
          </button>
        ))}
      </div>
    </div>
  );
}
