import { get, post } from './api';
import type {
  NoiseSolution
} from '../types';
import type { ApiResponse } from './api';

export const solutionApi = {
  async generateSolution(
    taskId: string
  ): Promise<ApiResponse<NoiseSolution>> {
    return post<NoiseSolution>(`/solutions/generate/${taskId}`);
  },

  async applyRecommendation(
    taskId: string,
    recId: string
  ): Promise<ApiResponse<void>> {
    return post<void>(`/solutions/${taskId}/apply/${recId}`);
  }
};

export default solutionApi;
