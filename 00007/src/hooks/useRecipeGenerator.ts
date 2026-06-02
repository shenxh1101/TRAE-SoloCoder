import { useState, useCallback } from 'react';
import { RecipeVariant } from '../types';
import { generateRecipeVariantsWithAI } from '../services/aiService';
import { calculateVoteHistory } from '../services/voteStats';
import { getLocalStorageItem } from './useLocalStorage';

interface UseRecipeGeneratorReturn {
  variants: RecipeVariant[];
  isLoading: boolean;
  error: string | null;
  generate: (dishName: string, allergens: string[]) => void;
  clear: () => void;
}

export function useRecipeGenerator(): UseRecipeGeneratorReturn {
  const [variants, setVariants] = useState<RecipeVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (dishName: string, allergens: string[]) => {
    if (!dishName.trim()) return;

    setIsLoading(true);
    setVariants([]);
    setError(null);

    try {
      const voteHistory = calculateVoteHistory();

      const storedPreferences = getLocalStorageItem<{
        lastGeneratedVariants: RecipeVariant[];
      }>('recipe_preferences', { lastGeneratedVariants: [] });

      const enrichedVoteHistory = [...voteHistory];

      if (storedPreferences.lastGeneratedVariants.length > 0) {
        storedPreferences.lastGeneratedVariants.forEach(v => {
          const votes = getLocalStorageItem<Record<string, any>>('recipe_votes', {});
          const variantVote = votes[v.id];
          if (variantVote?.userVote) {
            const existing = enrichedVoteHistory.find(h => h.type === v.type);
            if (existing) {
              existing.score += variantVote.userVote === 'up' ? 0.5 : -0.5;
            }
          }
        });
      }

      const result = await generateRecipeVariantsWithAI({
        dishName: dishName.trim(),
        allergens,
        voteHistory: enrichedVoteHistory.length > 0 ? enrichedVoteHistory : undefined
      });

      setVariants(result);

      setLocalStorageItem('recipe_preferences', {
        lastGeneratedVariants: result,
        lastDishName: dishName.trim(),
        lastAllergens: allergens
      });

    } catch (err) {
      console.error('生成菜谱失败:', err);
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setVariants([]);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    variants,
    isLoading,
    error,
    generate,
    clear
  };
}

function setLocalStorageItem<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage key "${key}":`, error);
  }
}