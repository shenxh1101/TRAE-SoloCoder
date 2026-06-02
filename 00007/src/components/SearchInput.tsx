import { useState } from 'react';
import { Search, UtensilsCrossed } from 'lucide-react';

const POPULAR_DISHES = [
  '番茄炒蛋',
  '红烧肉',
  '宫保鸡丁',
  '麻婆豆腐',
  '糖醋里脊',
  '鱼香肉丝',
  '回锅肉',
  '水煮鱼'
];

interface SearchInputProps {
  onSearch: (dishName: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function SearchInput({ onSearch, isLoading, disabled = false }: SearchInputProps) {
  const [value, setValue] = useState('');
  const popularDishes = POPULAR_DISHES;
  const isDisabled = disabled || isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isDisabled) {
      onSearch(value.trim());
    }
  };

  const handleQuickSelect = (dish: string) => {
    setValue(dish);
    if (!isDisabled) {
      onSearch(dish);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <UtensilsCrossed className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={disabled ? "请先配置 AI API Key 后使用" : "输入一道家常菜名，如：番茄炒蛋"}
            className="w-full pl-14 pr-32 py-4 text-lg rounded-full border-2 border-primary-200 focus:border-primary-400 focus:outline-none bg-white shadow-lg transition-all duration-300 placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isDisabled}
          />
          <button
            type="submit"
            disabled={isDisabled || !value.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-medium flex items-center gap-2 hover:from-primary-600 hover:to-primary-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <Search className="w-5 h-5" />
            <span>生成</span>
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-gray-500">试试：</span>
        {popularDishes.slice(0, 5).map((dish) => (
          <button
            key={dish}
            type="button"
            onClick={() => handleQuickSelect(dish)}
            disabled={isDisabled}
            className="px-3 py-1.5 text-sm bg-white/70 hover:bg-white text-gray-600 hover:text-primary-600 rounded-full border border-gray-200 hover:border-primary-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dish}
          </button>
        ))}
      </div>
    </div>
  );
}