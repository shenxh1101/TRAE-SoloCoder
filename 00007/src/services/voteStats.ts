import { VariantType } from '../types';
import { getLocalStorageItem } from '../hooks/useLocalStorage';

interface VoteStats {
  type: VariantType;
  totalUpvotes: number;
  totalDownvotes: number;
  score: number;
  voteCount: number;
}

interface StoredVote {
  variantId: string;
  type?: VariantType;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
}

const ALL_TYPES: VariantType[] = ['low-calorie', 'luxury', 'exotic'];

function getVariantType(vote: StoredVote): VariantType | null {
  if (vote.type) {
    return vote.type;
  }
  
  if (vote.variantId.includes('low')) return 'low-calorie';
  if (vote.variantId.includes('luxury')) return 'luxury';
  if (vote.variantId.includes('exotic')) return 'exotic';
  
  return null;
}

export function calculateVoteHistory(): Array<{ type: VariantType; score: number }> {
  const allVotes = getLocalStorageItem<Record<string, StoredVote>>('recipe_votes', {});
  const voteHistory = getLocalStorageItem<Record<string, 'up' | 'down'>>('vote_history', {});

  const typeStats: Record<VariantType, VoteStats> = {
    'low-calorie': { type: 'low-calorie', totalUpvotes: 0, totalDownvotes: 0, score: 0, voteCount: 0 },
    'luxury': { type: 'luxury', totalUpvotes: 0, totalDownvotes: 0, score: 0, voteCount: 0 },
    'exotic': { type: 'exotic', totalUpvotes: 0, totalDownvotes: 0, score: 0, voteCount: 0 },
  };

  let hasVotes = false;

  Object.entries(allVotes).forEach(([variantId, vote]) => {
    const type = getVariantType(vote);
    
    if (!type) {
      console.warn('无法识别变体类型:', variantId);
      return;
    }

    const userVote = voteHistory[variantId] || vote.userVote;
    
    if (userVote) {
      hasVotes = true;
      typeStats[type].voteCount++;
      
      if (userVote === 'up') {
        typeStats[type].score += 1;
        typeStats[type].totalUpvotes++;
      } else if (userVote === 'down') {
        typeStats[type].score -= 1;
        typeStats[type].totalDownvotes++;
      }
    }
  });

  Object.entries(voteHistory).forEach(([variantId, userVote]) => {
    if (!allVotes[variantId]) {
      let type: VariantType | null = null;
      if (variantId.includes('low')) type = 'low-calorie';
      if (variantId.includes('luxury')) type = 'luxury';
      if (variantId.includes('exotic')) type = 'exotic';
      
      if (type) {
        hasVotes = true;
        typeStats[type].voteCount++;
        if (userVote === 'up') {
          typeStats[type].score += 1;
          typeStats[type].totalUpvotes++;
        } else if (userVote === 'down') {
          typeStats[type].score -= 1;
          typeStats[type].totalDownvotes++;
        }
      }
    }
  });

  const result: Array<{ type: VariantType; score: number }> = [];
  
  ALL_TYPES.forEach(type => {
    const stat = typeStats[type];
    if (stat.voteCount > 0) {
      const normalizedScore = stat.voteCount > 0 ? stat.score / stat.voteCount : 0;
      result.push({
        type,
        score: Math.round(normalizedScore * 10) / 10
      });
    }
  });

  result.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return ALL_TYPES.indexOf(a.type) - ALL_TYPES.indexOf(b.type);
  });

  console.log('📊 投票统计结果:', hasVotes ? result : '暂无投票记录');
  return result;
}

export function getVariantTypePreference(): VariantType | null {
  const history = calculateVoteHistory();
  if (history.length === 0) return null;

  const positive = history.filter(h => h.score > 0);
  if (positive.length > 0) {
    return positive[0].type;
  }

  return null;
}

export function getVoteSummary() {
  const history = calculateVoteHistory();
  const typeLabels: Record<VariantType, string> = {
    'low-calorie': '低卡健康版',
    'luxury': '豪华宴客版',
    'exotic': '异国风味版'
  };

  return history.map(h => ({
    type: h.type,
    label: typeLabels[h.type],
    score: h.score,
    preference: h.score > 0 ? '喜欢' : h.score < 0 ? '不喜欢' : '中性'
  }));
}

export function clearVoteHistory(): void {
  localStorage.removeItem('recipe_votes');
  localStorage.removeItem('vote_history');
  localStorage.removeItem('recipe_preferences');
}
