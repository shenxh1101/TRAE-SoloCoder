import { RecipeVariant, VariantType } from '../types';

interface BaseRecipe {
  name: string;
  baseIngredients: string[];
}

const baseRecipes: Record<string, BaseRecipe> = {
  '番茄炒蛋': {
    name: '番茄炒蛋',
    baseIngredients: ['番茄', '鸡蛋', '食用油', '盐', '糖', '葱花']
  },
  '红烧肉': {
    name: '红烧肉',
    baseIngredients: ['五花肉', '酱油', '冰糖', '料酒', '八角', '桂皮', '姜片', '葱段']
  },
  '宫保鸡丁': {
    name: '宫保鸡丁',
    baseIngredients: ['鸡胸肉', '花生米', '干辣椒', '花椒', '葱姜蒜', '酱油', '醋', '糖', '淀粉']
  },
  '麻婆豆腐': {
    name: '麻婆豆腐',
    baseIngredients: ['嫩豆腐', '牛肉末', '豆瓣酱', '花椒粉', '辣椒面', '葱姜蒜', '酱油', '淀粉']
  },
  '糖醋里脊': {
    name: '糖醋里脊',
    baseIngredients: ['猪里脊肉', '番茄酱', '白糖', '醋', '淀粉', '面粉', '鸡蛋', '盐']
  },
  '鱼香肉丝': {
    name: '鱼香肉丝',
    baseIngredients: ['猪肉丝', '木耳', '胡萝卜', '青椒', '豆瓣酱', '葱姜蒜', '酱油', '醋', '糖']
  },
  '回锅肉': {
    name: '回锅肉',
    baseIngredients: ['五花肉', '青蒜', '豆瓣酱', '甜面酱', '酱油', '白糖', '姜片']
  },
  '水煮鱼': {
    name: '水煮鱼',
    baseIngredients: ['草鱼', '豆芽', '干辣椒', '花椒', '豆瓣酱', '葱姜蒜', '蛋清', '淀粉']
  }
};

const lowCalorieTemplates: Record<string, { changes: Array<{ original: string; replacement: string; reason: string }>; extraIngredients: string[]; description: string }> = {
  default: {
    changes: [
      { original: '食用油', replacement: '橄榄油喷雾', reason: '减少约80%的油脂摄入，降低热量' },
      { original: '白糖', replacement: '木糖醇', reason: '用天然甜味剂替代，减少精制糖摄入' },
      { original: '淀粉', replacement: '魔芋粉', reason: '降低碳水化合物，增加膳食纤维' }
    ],
    extraIngredients: ['西兰花', '胡萝卜', '香菇'],
    description: '采用健康食材替换，在保留美味的同时大幅降低热量，适合减脂期享用。'
  }
};

const luxuryTemplates: Record<string, { changes: Array<{ original: string; replacement: string; reason: string }>; extraIngredients: string[]; description: string }> = {
  default: {
    changes: [
      { original: '普通食用油', replacement: '松露油', reason: '增添奢华的松露香气，提升菜品档次' },
      { original: '普通肉类', replacement: '和牛/伊比利亚黑猪', reason: '选用顶级肉质，口感更加鲜嫩多汁' },
      { original: '普通调味料', replacement: '鲍鱼汁/瑶柱', reason: '加入珍贵海味提鲜，层次更加丰富' }
    ],
    extraIngredients: ['松茸', '羊肚菌', '金箔点缀', '鱼子酱'],
    description: '甄选顶级食材，精工细作，是宴请宾朋的绝佳选择。'
  }
};

const exoticTemplates: Record<string, { cuisine: string; changes: Array<{ original: string; replacement: string; reason: string }>; extraIngredients: string[]; description: string }[]> = {
  default: [
    {
      cuisine: '泰式',
      changes: [
        { original: '传统调味料', replacement: '椰浆+青柠汁', reason: '注入泰国经典的酸甜椰香风味' },
        { original: '普通香料', replacement: '香茅+南姜+柠檬叶', reason: '泰式菜肴的灵魂香料组合' },
        { original: '普通辣椒', replacement: '鸟眼辣椒', reason: '带来正宗泰国菜的鲜辣刺激' }
      ],
      extraIngredients: ['罗勒叶', '鱼露', '棕榈糖'],
      description: '融合泰国街头美食的热情风味，酸辣鲜香，令人回味无穷。'
    },
    {
      cuisine: '意式',
      changes: [
        { original: '传统烹饪', replacement: '橄榄油+香草烹饪', reason: '地中海健康烹饪方式' },
        { original: '普通调味', replacement: '帕玛森芝士+黑松露', reason: '意大利经典的浓郁风味' },
        { original: '普通配菜', replacement: '意面/risotto', reason: '搭配意大利经典主食' }
      ],
      extraIngredients: ['罗勒', '迷迭香', '百里香', '白葡萄酒'],
      description: '融合意大利料理的优雅与浪漫，带给您纯正的地中海味觉体验。'
    },
    {
      cuisine: '日式',
      changes: [
        { original: '传统调味', replacement: '味醂+清酒+酱油', reason: '日式料理的经典调味三宝' },
        { original: '普通烹饪', replacement: '低温慢煮/蒸', reason: '保留食材原汁原味的日式技法' },
        { original: '普通配料', replacement: '山葵+柚子皮', reason: '增添日式料理的清新层次感' }
      ],
      extraIngredients: ['味噌', '木鱼花', '昆布', '柚子醋'],
      description: '秉承日本料理的"旬"之美学，呈现食材最本真的美味。'
    }
  ]
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRecipeVariants(
  dishName: string,
  allergens: string[] = []
): RecipeVariant[] {
  const baseRecipe = baseRecipes[dishName] || {
    name: dishName,
    baseIngredients: ['主要食材', '配菜', '调味料', '食用油', '盐']
  };

  const variants: RecipeVariant[] = [];
  const types: VariantType[] = ['low-calorie', 'luxury', 'exotic'];

  types.forEach((type, index) => {
    const variant = createVariant(type, baseRecipe, allergens, index);
    variants.push(variant);
  });

  return variants;
}

function createVariant(
  type: VariantType,
  baseRecipe: BaseRecipe,
  allergens: string[],
  index: number
): RecipeVariant {
  let changes: Array<{ original: string; replacement: string; reason: string }>;
  let extraIngredients: string[];
  let description: string;
  let variantName: string;

  switch (type) {
    case 'low-calorie': {
      const template = lowCalorieTemplates.default;
      changes = template.changes.slice(0, 3);
      extraIngredients = template.extraIngredients;
      description = template.description;
      variantName = `低卡${baseRecipe.name}`;
      break;
    }
    case 'luxury': {
      const template = luxuryTemplates.default;
      changes = template.changes.slice(0, 3);
      extraIngredients = template.extraIngredients;
      description = template.description;
      variantName = `豪华${baseRecipe.name}`;
      break;
    }
    case 'exotic': {
      const template = getRandomItem(exoticTemplates.default);
      changes = template.changes.slice(0, 3);
      extraIngredients = template.extraIngredients;
      description = template.description;
      variantName = `${template.cuisine}风${baseRecipe.name}`;
      break;
    }
  }

  const filteredExtras = filterAllergens(extraIngredients, allergens);
  const fullIngredients = [...baseRecipe.baseIngredients, ...filteredExtras];

  return {
    id: generateId(),
    type,
    name: variantName,
    originalDish: baseRecipe.name,
    ingredientChanges: changes,
    fullIngredients,
    description
  };
}

function filterAllergens(ingredients: string[], allergens: string[]): string[] {
  const allergenMap: Record<string, string[]> = {
    '不含乳制品': ['牛奶', '奶油', '芝士', '黄油', '酸奶'],
    '不含坚果': ['花生', '杏仁', '核桃', '腰果', '松子'],
    '无麸质': ['面粉', '面包糠', '小麦'],
    '素食': ['猪肉', '牛肉', '鸡肉', '鱼肉', '虾'],
    '纯素': ['鸡蛋', '牛奶', '蜂蜜', '任何肉类'],
    '低钠': ['酱油', '盐', '味精', '豆瓣酱'],
    '清真': ['猪肉', '猪油', '非清真肉类'],
    '犹太洁食': ['猪肉', '贝类', '混肉奶']
  };

  return ingredients.filter(ing => {
    return !allergens.some(allergen => {
      const forbidden = allergenMap[allergen] || [];
      return forbidden.some(f => ing.includes(f));
    });
  });
}

export function getPopularDishes(): string[] {
  return Object.keys(baseRecipes);
}

export function getBaseIngredients(dishName: string): string[] {
  return baseRecipes[dishName]?.baseIngredients || [];
}