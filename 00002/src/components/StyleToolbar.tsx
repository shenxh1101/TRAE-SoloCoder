import React from 'react';
import { Type, Palette, Circle, Minus, Plus } from 'lucide-react';
import { TextSettings } from '../types';

interface StyleToolbarProps {
  textSettings: TextSettings;
  onSettingsChange: (settings: Partial<TextSettings>) => void;
}

const colorPresets = [
  '#ffffff',
  '#000000',
  '#ff6b35',
  '#8b5cf6',
  '#10b981',
  '#fbbf24',
  '#ef4444',
  '#3b82f6',
];

export function StyleToolbar({ textSettings, onSettingsChange }: StyleToolbarProps) {
  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(80, textSettings.fontSize + delta));
    onSettingsChange({ fontSize: newSize });
  };

  const handleStrokeWidthChange = (delta: number) => {
    const newWidth = Math.max(0, Math.min(10, textSettings.strokeWidth + delta));
    onSettingsChange({ strokeWidth: newWidth });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
      <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
        <Type className="w-4 h-4" />
        文字样式
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">字体大小</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFontSizeChange(-2)}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-medium">{textSettings.fontSize}px</span>
            <button
              onClick={() => handleFontSizeChange(2)}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-500 flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4" />
            文字颜色
          </span>
          <div className="flex gap-2 flex-wrap">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => onSettingsChange({ color })}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  textSettings.color === color ? 'border-orange-500 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={textSettings.color}
              onChange={(e) => onSettingsChange({ color: e.target.value })}
              className="w-8 h-8 rounded-full cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">描边宽度</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStrokeWidthChange(-1)}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-medium">{textSettings.strokeWidth}px</span>
            <button
              onClick={() => handleStrokeWidthChange(1)}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <span className="text-sm text-gray-500 flex items-center gap-2 mb-2">
            <Circle className="w-4 h-4" />
            描边颜色
          </span>
          <div className="flex gap-2 flex-wrap">
            {colorPresets.map((color) => (
              <button
                key={color}
                onClick={() => onSettingsChange({ strokeColor: color })}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  textSettings.strokeColor === color ? 'border-orange-500 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={textSettings.strokeColor}
              onChange={(e) => onSettingsChange({ strokeColor: e.target.value })}
              className="w-8 h-8 rounded-full cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
