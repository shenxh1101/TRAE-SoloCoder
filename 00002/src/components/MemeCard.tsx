import React from 'react';
import { Trash2, Download } from 'lucide-react';
import { Meme } from '../types';

interface MemeCardProps {
  meme: Meme;
  onDelete: (id: number) => void;
}

export function MemeCard({ meme, onDelete }: MemeCardProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `meme-${meme.id}.png`;
    link.href = meme.imageData;
    link.click();
  };

  const handleDelete = () => {
    if (meme.id !== undefined && confirm('确定要删除这个表情包吗？')) {
      onDelete(meme.id);
    }
  };

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
      <div className="aspect-square overflow-hidden bg-gray-100">
        <img
          src={meme.imageData}
          alt={meme.textSettings.content}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-3">
        <p className="text-sm text-gray-700 font-medium truncate">
          {meme.textSettings.content || '无文字'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {meme.createdAt
            ? new Date(meme.createdAt).toLocaleDateString('zh-CN')
            : ''}
        </p>
      </div>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-orange-500 hover:text-white transition-colors"
          title="下载"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={handleDelete}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-red-500 hover:text-white transition-colors"
          title="删除"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
