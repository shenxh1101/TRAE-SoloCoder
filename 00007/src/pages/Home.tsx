import { useState } from 'react';
import { Header } from '@/components/Header';
import { SearchInput } from '@/components/SearchInput';
import { AllergenSelector } from '@/components/AllergenSelector';
import { RecipeCard } from '@/components/RecipeCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useRecipeGenerator } from '@/hooks/useRecipeGenerator';
import { useVoting } from '@/hooks/useVoting';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const { variants, isLoading, generate, clear } = useRecipeGenerator();
  const { getVoteData, vote } = useVoting();

  const handleSearch = (dishName: string) => {
    generate(dishName, selectedAllergens);
  };

  const handleNewSearch = () => {
    clear();
  };

  return (
    <div className="min-h-screen bg-texture">
      <Header />

      <main className="pb-20">
        <SearchInput onSearch={handleSearch} isLoading={isLoading} />
        <AllergenSelector
          selectedAllergens={selectedAllergens}
          onChange={setSelectedAllergens}
        />

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
                  onVote={vote}
                />
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm">
                💡 小贴士：投票数据会保存在本地，帮助 AI 优化后续推荐
              </p>
            </div>
          </div>
        )}

        {!isLoading && variants.length === 0 && (
          <div className="max-w-2xl mx-auto px-4 mt-16 text-center">
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
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-gray-400 text-sm">
        <p>🍳 AI 菜谱变形记 · 让家常菜变有趣</p>
      </footer>
    </div>
  );
}