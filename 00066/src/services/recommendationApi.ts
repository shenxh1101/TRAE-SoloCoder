import { get, post } from './api';
import type {
  Recommendation
} from '../types';
import type { ApiResponse } from './api';

export interface RoomFeatureVector {
  volumeM3: number;
  surfaceAreaM2: number;
  purposeCategory: string;
}

export interface RecommendationStats {
  totalRecords: number;
  uniqueRooms: number;
  averageEffectiveness: number;
  categoryDistribution: Record<string, number>;
}

export const recommendationApi = {
  async getRecommendations(
    roomId: string
  ): Promise<ApiResponse<Recommendation[]>> {
    return get<Recommendation[]>(`/recommendations/room/${roomId}`);
  },

  async generateRecommendations(
    roomId: string,
    roomData?: object
  ): Promise<ApiResponse<Recommendation[]>> {
    return post<Recommendation[]>(`/recommendations/generate/${roomId}`, { roomData });
  },

  async getStats(): Promise<ApiResponse<RecommendationStats>> {
    return get<RecommendationStats>('/recommendations/stats');
  },

  async applyRecommendation(
    recommendationId: string
  ): Promise<ApiResponse<Recommendation>> {
    return post<Recommendation>(`/recommendations/${recommendationId}/apply`);
  },
};

export default recommendationApi;
