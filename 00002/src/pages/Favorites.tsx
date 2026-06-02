import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { Meme } from '../types';
import { getAllMemes, deleteMeme, searchMemes } from '../db/indexedDB';
import { MemeCard } from '../components/MemeCard';

export function Favorites() {
  const navigate = useNavigate();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadMemes = async () => {
    setIsLoading(true);
    try {
      const data = await getAllMemes();
      setMemes(data);
    } catch (error) {
      console.error('Failed to load memes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchMemes(searchQuery).then(setMemes);
    } else {
      loadMemes();
    }
  }, [searchQuery]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMeme(id);
      setMemes((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error('Failed to delete meme:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回编辑器
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
              💖 我的收藏夹
            </h1>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索表情包文字..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : memes.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              收藏夹是空的
            </h2>
            <p className="text-gray-500 mb-6">
              快去制作并收藏你的第一个表情包吧！
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              开始制作
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-4">共 {memes.length} 个表情包</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {memes.map((meme) => (
                meme.id !== undefined && (
                  <MemeCard
                    key={meme.id}
                    meme={meme}
                    onDelete={handleDelete}
                  />
                )
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 py-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          Made with ❤️ | AI 表情包生成器
        </div>
      </footer>
    </div>
  );
}
