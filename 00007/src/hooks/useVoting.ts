import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { VoteData, VariantType } from '../types';

interface UseVotingReturn {
  getVoteData: (variantId: string) => VoteData;
  vote: (variantId: string, direction: 'up' | 'down', variantType?: VariantType) => void;
  getAllVotes: () => Record<string, VoteData & { type?: VariantType }>;
}

export function useVoting(): UseVotingReturn {
  const [votes, setVotes] = useLocalStorage<Record<string, VoteData & { type?: VariantType }>>('recipe_votes', {});
  const [voteHistory, setVoteHistory] = useLocalStorage<Record<string, 'up' | 'down'>>('vote_history', {});

  const getVoteData = useCallback((variantId: string): VoteData => {
    const stored = votes[variantId];
    if (stored) {
      return {
        variantId: stored.variantId,
        upvotes: stored.upvotes,
        downvotes: stored.downvotes,
        userVote: stored.userVote
      };
    }
    return {
      variantId,
      upvotes: 0,
      downvotes: 0,
      userVote: voteHistory[variantId] || null
    };
  }, [votes, voteHistory]);

  const vote = useCallback((variantId: string, direction: 'up' | 'down', variantType?: VariantType) => {
    const currentVote = voteHistory[variantId];

    setVotes(prev => {
      const current = prev[variantId] || {
        variantId,
        type: variantType,
        upvotes: 0,
        downvotes: 0,
        userVote: null
      };

      let newUpvotes = current.upvotes;
      let newDownvotes = current.downvotes;

      if (currentVote) {
        if (currentVote === 'up') newUpvotes--;
        if (currentVote === 'down') newDownvotes--;
      }

      if (currentVote !== direction) {
        if (direction === 'up') newUpvotes++;
        if (direction === 'down') newDownvotes++;
      }

      const newUserVote = currentVote === direction ? null : direction;

      return {
        ...prev,
        [variantId]: {
          ...current,
          type: variantType || current.type,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote
        }
      };
    });

    setVoteHistory(prev => {
      const newHistory = { ...prev };
      if (currentVote === direction) {
        delete newHistory[variantId];
      } else {
        newHistory[variantId] = direction;
      }
      return newHistory;
    });
  }, [voteHistory, setVotes, setVoteHistory]);

  const getAllVotes = useCallback(() => votes, [votes]);

  return {
    getVoteData,
    vote,
    getAllVotes
  };
}