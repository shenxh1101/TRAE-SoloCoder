import React from 'react';
import { presetEmojis } from '../data/presetEmojis';

interface PresetEmojisProps {
  onSelectEmoji: (emoji: string) => void;
}

export function PresetEmojis({ onSelectEmoji }: PresetEmojisProps) {
  const handleEmojiClick = (emoji: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, 200, 200);
      ctx.font = '120px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 100, 100);
      const dataUrl = canvas.toDataURL();
      onSelectEmoji(dataUrl);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-600 mb-3">或选择预设表情：</h3>
      <div className="grid grid-cols-6 gap-2">
        {presetEmojis.slice(0, 24).map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleEmojiClick(preset.emoji)}
            className="text-3xl p-2 bg-white rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all duration-200 hover:scale-110"
            title={preset.name}
          >
            {preset.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
