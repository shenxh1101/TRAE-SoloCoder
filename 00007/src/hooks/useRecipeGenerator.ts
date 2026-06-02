import { useState, useCallback } from 'react';
import { RecipeVariant } from '../types';
import { generateRecipeVariants } from '../data/recipeTemplates';

interface UseRecipeGeneratorReturn {
  variants: RecipeVariant[];
  isLoading: boolean;
  generate: (dishName: string, allergens: string[]) => void;
  clear: () => void;
}

export function useRecipeGenerator(): UseRecipeGeneratorReturn {
  const [variants, setVariants] = useState<RecipeVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generate = useCallback(async (dishName: string, allergens: string[]) => {
    if (!dishName.trim()) return;

    setIsLoading(true);
    setVariants([]);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = generateRecipeVariants(dishName.trim(), allergens);
    setVariants(result);
    setIsLoading(false);
  }, []);

  const clear = useCallback(() => {
    setVariants([]);
    setIsLoading(false);
  }, []);

  return {
    variants,
    isLoading,
    generate,
    clear
  };
}