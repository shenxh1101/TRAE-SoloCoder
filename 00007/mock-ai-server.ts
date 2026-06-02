import type { Plugin, ViteDevServer } from 'vite';
import { VariantType } from './src/types';

interface ParsedPrompt {
  dishName: string;
  allergens: string[];
  voteHistory: Array<{ type: VariantType; score: number }>;
}

function parsePrompt(content: string): ParsedPrompt {
  const result: ParsedPrompt = {
    dishName: '',
    allergens: [],
    voteHistory: []
  };

  const dishMatch = content.match(/为"([^"]+)"这道菜/);
  if (dishMatch) {
    result.dishName = dishMatch[1];
  }

  const allergenMatch = content.match(/避开以下食材和饮食限制：([^。]+)/);
  if (allergenMatch) {
    result.allergens = allergenMatch[1].split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  }

  const voteSectionMatch = content.match(/用户偏好参考（基于历史投票评分[^]*?排序要求：/s);
  if (voteSectionMatch) {
    const voteText = voteSectionMatch[0];
    const voteMatches = voteText.matchAll(/(低卡健康版|豪华宴客版|异国风味版):\s*(喜欢|不喜欢|中性)\s*\(评分:\s*([^)]+)\)/g);
    
    const typeMap: Record<string, VariantType> = {
      '低卡健康版': 'low-calorie',
      '豪华宴客版': 'luxury',
      '异国风味版': 'exotic'
    };

    for (const match of voteMatches) {
      const type = typeMap[match[1]];
      const score = parseFloat(match[3]);
      if (type && !isNaN(score)) {
        result.voteHistory.push({ type, score });
      }
    }
  }

  return result;
}

const ALLERGEN_MAP: Record<string, string[]> = {
  '不含乳制品': ['牛奶', '奶油', '芝士', '黄油', '酸奶'],
  '不含坚果': ['花生', '杏仁', '核桃', '腰果', '松子'],
  '无麸质': ['面粉', '面包糠', '小麦', '淀粉'],
  '素食': ['猪肉', '牛肉', '鸡肉', '鱼肉', '虾', '五花肉', '鸡胸肉', '伊比利亚黑猪'],
  '纯素': ['鸡蛋', '牛奶', '蜂蜜', '鱼露', '鲍鱼汁'],
  '低钠': ['酱油', '盐', '味精', '豆瓣酱', '鱼露'],
  '清真': ['猪肉', '猪油', '五花肉'],
  '犹太洁食': ['猪肉', '贝类']
};

const SAFE_REPLACEMENTS: Record<string, string> = {
  '淀粉': '藕粉',
  '面粉': '大米粉',
  '面包糠': '燕麦糠',
  '小麦': '藜麦',
  '酱油': '椰子酱油',
  '盐': '低钠盐',
  '味精': '香菇粉',
  '鸡蛋': '亚麻籽粉',
  '牛奶': '燕麦奶',
  '奶油': '椰奶',
  '芝士': '营养酵母',
  '黄油': '椰子油',
  '猪肉': '杏鲍菇',
  '牛肉': '猴头菇',
  '鸡肉': '鹰嘴豆',
  '鱼肉': '海带',
  '虾': '魔芋丝',
  '五花肉': '冬笋',
  '鸡胸肉': '老豆腐',
  '伊比利亚黑猪': '黑松露',
  '鱼露': '海苔碎',
  '鲍鱼汁': '菌菇高汤',
  '蜂蜜': '枫糖浆'
};

function isAllergenFree(ingredient: string, allergens: string[]): boolean {
  if (allergens.length === 0) return true;
  return !allergens.some(a => {
    const forbidden = ALLERGEN_MAP[a] || [];
    return forbidden.some(f => ingredient.includes(f));
  });
}

function getSafeReplacement(ingredient: string, allergens: string[]): string | null {
  if (isAllergenFree(ingredient, allergens)) return ingredient;
  
  for (const [key, value] of Object.entries(SAFE_REPLACEMENTS)) {
    if (ingredient.includes(key) && isAllergenFree(value, allergens)) {
      return value;
    }
  }
  return null;
}

function filterAllergens(ingredients: string[], allergens: string[]): string[] {
  const result: string[] = [];
  for (const ing of ingredients) {
    if (isAllergenFree(ing, allergens)) {
      result.push(ing);
    } else {
      const replacement = getSafeReplacement(ing, allergens);
      if (replacement) {
        result.push(replacement);
      }
    }
  }
  return result.filter(Boolean);
}

function generateIngredientChanges(dishName: string, type: VariantType, allergens: string[]): Array<{ original: string; replacement: string; reason: string }> {
  const changes = {
    'low-calorie': [
      { original: '食用油', replacement: '橄榄油喷雾', reason: '减少约80%的油脂摄入，降低热量' },
      { original: '白糖', replacement: '木糖醇', reason: '用天然甜味剂替代精制糖，降低升糖指数' },
      { original: '五花肉', replacement: '鸡胸肉', reason: '减少饱和脂肪摄入，增加优质蛋白质' },
      { original: '淀粉', replacement: '魔芋粉', reason: '降低碳水化合物含量，增加膳食纤维' },
      { original: '油炸', replacement: '空气炸', reason: '减少油脂使用，保持酥脆口感' }
    ],
    'luxury': [
      { original: '普通食用油', replacement: '松露油', reason: '增添奢华的松露香气，提升菜品档次' },
      { original: '普通猪肉', replacement: '伊比利亚黑猪', reason: '选用顶级肉质，口感更加鲜嫩多汁' },
      { original: '普通调味', replacement: '鲍鱼汁', reason: '加入珍贵海味提鲜，层次更加丰富' },
      { original: '普通菌菇', replacement: '松茸', reason: '使用珍稀菌菇，增添独特香气' },
      { original: '普通装饰', replacement: '金箔点缀', reason: '提升视觉效果，彰显尊贵品质' }
    ],
    'exotic': [
      { original: '传统调味', replacement: '椰浆+青柠汁', reason: '注入东南亚经典的酸甜椰香风味' },
      { original: '普通香料', replacement: '香茅+南姜', reason: '增添异国料理的灵魂香料组合' },
      { original: '普通辣椒', replacement: '鸟眼辣椒', reason: '带来正宗东南亚菜的鲜辣刺激' },
      { original: '中式烹饪', replacement: '低温慢煮', reason: '采用西式烹饪技法，保持食材原汁原味' },
      { original: '酱油', replacement: '鱼露', reason: '使用东南亚特色调味料，风味更地道' }
    ]
  };

  const available = changes[type].filter(c => {
    const originalOk = isAllergenFree(c.original, allergens);
    const replacementOk = isAllergenFree(c.replacement, allergens);
    return originalOk && replacementOk;
  });

  return available.slice(0, 3);
}

function generateFullIngredients(
  dishName: string,
  type: VariantType,
  changes: Array<{ replacement: string }>,
  allergens: string[]
): string[] {
  const baseIngredients: Record<string, string[]> = {
    '番茄炒蛋': ['番茄', '鸡蛋', '食用油', '盐', '葱花'],
    '红烧肉': ['五花肉', '酱油', '冰糖', '料酒', '八角', '姜片'],
    '宫保鸡丁': ['鸡胸肉', '花生米', '干辣椒', '花椒', '葱姜蒜', '酱油'],
    '麻婆豆腐': ['嫩豆腐', '牛肉末', '豆瓣酱', '花椒粉', '葱姜蒜'],
    '糖醋里脊': ['猪里脊肉', '番茄酱', '白糖', '醋', '淀粉', '鸡蛋'],
    '鱼香肉丝': ['猪肉丝', '木耳', '胡萝卜', '青椒', '豆瓣酱', '葱姜蒜'],
    '回锅肉': ['五花肉', '青蒜', '豆瓣酱', '甜面酱', '酱油', '姜片'],
    '水煮鱼': ['草鱼', '豆芽', '干辣椒', '花椒', '豆瓣酱', '葱姜蒜'],
  };

  const extras = {
    'low-calorie': ['西兰花', '胡萝卜', '香菇', '蒜末', '黑胡椒'],
    'luxury': ['松茸', '羊肚菌', '金箔', '鱼子酱', '松露片'],
    'exotic': ['椰浆', '香茅', '青柠叶', '鱼露', '罗勒叶']
  };

  const base = baseIngredients[dishName] || ['主要食材', '配菜', '调味料', '食用油', '盐'];
  const replacements = changes.map(c => c.replacement);
  const extraIngredients = extras[type];
  
  const allIngredients = [...new Set([...base, ...replacements, ...extraIngredients])];
  
  const filtered = filterAllergens(allIngredients, allergens);
  
  return filtered.slice(0, 12);
}

function generateName(dishName: string, type: VariantType, allergens: string[]): string {
  const typeNames: Record<VariantType, string> = {
    'low-calorie': '低卡健康版',
    'luxury': '豪华宴客版',
    'exotic': '泰式风情'
  };

  const allergenSuffix = allergens.length > 0 ? `(${allergens[0]})` : '';
  return `${typeNames[type]}${dishName}${allergenSuffix}`;
}

function generateDescription(type: VariantType, hasAllergens: boolean): string {
  const descriptions: Record<VariantType, string> = {
    'low-calorie': '采用健康烹饪方式和低卡食材，在保留美味的同时大幅降低热量，适合健康饮食和减脂人群享用。',
    'luxury': '甄选顶级食材，精工细作，口感与视觉的双重享受，是宴请宾朋的绝佳选择，彰显主人品味。',
    'exotic': '融合泰国料理的独特风味，酸辣鲜香，带来全新的味觉体验，让家常菜焕发国际魅力。'
  };

  let desc = descriptions[type];
  if (hasAllergens) {
    desc += '已严格避开您指定的过敏原食材，安心享用。';
  }
  return desc;
}

function generateMockResponse(parsed: ParsedPrompt) {
  const { dishName, allergens, voteHistory } = parsed;

  console.log('🤖 [MOCK AI] 收到请求:');
  console.log('   菜名:', dishName);
  console.log('   过敏原:', allergens);
  console.log('   投票历史:', voteHistory);

  const allTypes: VariantType[] = ['low-calorie', 'luxury', 'exotic'];
  let orderedTypes = [...allTypes];

  if (voteHistory.length > 0) {
    const typeScores: Record<VariantType, number> = {
      'low-calorie': 0,
      'luxury': 0,
      'exotic': 0
    };
    voteHistory.forEach(v => {
      typeScores[v.type] = v.score;
    });
    orderedTypes.sort((a, b) => typeScores[b] - typeScores[a]);
    console.log('   根据投票调整排序:', orderedTypes);
  }

  const variants = orderedTypes.map(type => {
    const ingredientChanges = generateIngredientChanges(dishName, type, allergens);
    const fullIngredients = generateFullIngredients(dishName, type, ingredientChanges, allergens);
    
    return {
      type,
      name: generateName(dishName, type, allergens),
      description: generateDescription(type, allergens.length > 0),
      ingredientChanges,
      fullIngredients
    };
  });

  const response = {
    id: 'mock-' + Date.now(),
    object: 'chat.completion',
    created: Date.now() / 1000,
    model: 'mock-ai-model',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({ variants })
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 500,
      completion_tokens: 800,
      total_tokens: 1300
    }
  };

  console.log('✅ [MOCK AI] 返回响应，变体顺序:', orderedTypes);
  return response;
}

export function mockAIServerPlugin(): Plugin {
  return {
    name: 'mock-ai-server',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/mock-ai/v1/chat/completions', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const userMessage = data.messages?.find((m: any) => m.role === 'user')?.content || '';
            const parsed = parsePrompt(userMessage);
            
            if (!parsed.dishName) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: '无法解析菜名' }));
              return;
            }

            const response = generateMockResponse(parsed);
            
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(response));
          } catch (error) {
            console.error('Mock AI Error:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ 
              error: { 
                message: error instanceof Error ? error.message : 'Internal server error' 
              } 
            }));
          }
        });
      });

      console.log('🤖 Mock AI Server 已启动: /mock-ai/v1/chat/completions');
    }
  };
}
