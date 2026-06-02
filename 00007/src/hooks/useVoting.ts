import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { VoteData } from '../types';

interface UseVotingReturn {
  getVoteData: (variantId: string) => VoteData;
  vote: (variantId: string, direction: 'up' | 'down') => void;
  getAllVotes: () => Record<string, VoteData>;
}

export function useVoting(): UseVotingReturn {
  const [votes, setVotes] = useLocalStorage<Record<string, VoteData>>('recipe_votes', {});
  const [voteHistory, setVoteHistory] = useLocalStorage<Record<string, 'up' | 'down'>>('vote_history', {});

  const getVoteData = useCallback((variantId: string): VoteData => {
    return votes[variantId] || {
      variantId,
      upvotes: Math.floor(Math.random() * 50) + 5,
      downvotes: Math.floor(Math.random() * 10),
      userVote: voteHistory[variantId] || null
    };
  }, [votes, voteHistory]);

  const vote = useCallback((variantId: string, direction: 'up' | 'down') => {
    const currentVote = voteHistory[variantId];

    setVotes(prev => {
      const current = prev[variantId] || {
        variantId,
        upvotes: Math.floor(Math.random() * 50) + 5,
        downvotes: Math.floor(Math.random() * 10),
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

      return {
        ...prev,
        [variantId]: {
          ...current,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: currentVote === direction ? null : direction
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