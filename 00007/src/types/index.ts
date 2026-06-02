export type VariantType = 'low-calorie' | 'luxury' | 'exotic';

export interface IngredientChange {
  original: string;
  replacement: string;
  reason: string;
}

export interface RecipeVariant {
  id: string;
  type: VariantType;
  name: string;
  originalDish: string;
  ingredientChanges: IngredientChange[];
  fullIngredients: string[];
  description: string;
}

export interface VoteData {
  variantId: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
}

export interface UserPreferences {
  allergens: string[];
}

export const ALLERGENS = [
  '无麸质',
  '不含乳制品',
  '不含坚果',
  '素食',
  '纯素',
  '低钠',
  '清真',
  '犹太洁食'
] as const;

export const VARIANT_CONFIG = {
  'low-calorie': {
    label: '低卡健康版',
    emoji: '🥗',
    bgColor: 'bg-healthy-50',
    borderColor: 'border-healthy-400',
    textColor: 'text-healthy-700',
    badgeBg: 'bg-healthy-500',
    gradient: 'from-healthy-400 to-healthy-600'
  },
  'luxury': {
    label: '豪华宴客版',
    emoji: '👑',
    bgColor: 'bg-luxury-50',
    borderColor: 'border-luxury-400',
    textColor: 'text-luxury-700',
    badgeBg: 'bg-luxury-500',
    gradient: 'from-luxury-400 to-luxury-600'
  },
  'exotic': {
    label: '异国风味版',
    emoji: '🌍',
    bgColor: 'bg-exotic-50',
    borderColor: 'border-exotic-400',
    textColor: 'text-exotic-700',
    badgeBg: 'bg-exotic-500',
    gradient: 'from-exotic-400 to-exotic-600'
  }
} as const;