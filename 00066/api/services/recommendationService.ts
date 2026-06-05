import { v4 as uuidv4 } from 'uuid';
import type {
  Recommendation,
  MaterialItem,
  Room,
  PurposeCategory,
  CalculationResult,
} from '../../src/types/index';

interface RoomFeatureVector {
  volume: number;
  surfaceArea: number;
  aspectRatio: number;
  heightToWidth: number;
  purposeCategory: number[];
}

interface HistoryRecord {
  roomId: string;
  roomFeatures: RoomFeatureVector;
  result: CalculationResult;
  solutionUsed?: MaterialItem[];
  effectivenessScore: number;
  timestamp: string;
}

interface SimilarRoom {
  roomId: string;
  similarityScore: number;
  roomFeatures: RoomFeatureVector;
  result: CalculationRecord;
  effectivenessScore: number;
}

interface ScoredSolution {
  materialCombination: MaterialItem[];
  similarityScore: number;
  effectivenessScore: number;
  recencyFactor: number;
  confidenceScore: number;
  basedOnRoomIds: string[];
  predictedEffectiveness: number;
  estimatedCost: number;
}

interface RecommendationParams {
  roomId: string;
  roomFeatures: RoomFeatureVector;
  topK?: number;
}

const PURPOSE_CATEGORIES: PurposeCategory[] = [
  'concert_hall',
  'recording_studio',
  'office',
  'classroom',
  'auditorium',
  'home_theater',
  'restaurant',
];

const FEATURE_WEIGHTS = {
  volume: 0.3,
  surfaceArea: 0.25,
  aspectRatio: 0.2,
  purposeCategory: 0.25,
};

const RECENCY_HALF_LIFE_DAYS = 90;

class RecommendationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationError';
  }
}

class HistoryStore {
  private records: Map<string, HistoryRecord[]> = new Map();

  saveResult(
    roomId: string,
    features: RoomFeatureVector,
    result: CalculationResult,
    solutionUsed?: MaterialItem[],
    effectivenessScore?: number,
  ): void {
    const record: HistoryRecord = {
      roomId,
      roomFeatures: features,
      result,
      solutionUsed,
      effectivenessScore: effectivenessScore ?? result.uniformityScore,
      timestamp: new Date().toISOString(),
    };

    if (!this.records.has(roomId)) {
      this.records.set(roomId, []);
    }

    this.records.get(roomId)!.push(record);

    if (this.records.get(roomId)!.length > 50) {
      this.records.set(
        roomId,
        this.records.get(roomId)!.slice(-50)
      );
    }
  }

  getRoomHistory(roomId: string): HistoryRecord[] {
    return this.records.get(roomId) || [];
  }

  getAllRecords(): HistoryRecord[] {
    const allRecords: HistoryRecord[] = [];
    this.records.forEach((roomRecords) => {
      allRecords.push(...roomRecords);
    });
    return allRecords;
  }

  getSimilarRooms(
    targetFeatures: RoomFeatureVector,
    topK: number = 20,
  ): SimilarRoom[] {
    const allRecords = this.getAllRecords();
    
    const scoredRooms: SimilarRoom[] = allRecords.map((record) => ({
      roomId: record.roomId,
      similarityScore: cosineSimilarity(targetFeatures, record.roomFeatures),
      roomFeatures: record.roomFeatures,
      result: record.result,
      effectivenessScore: record.effectivenessScore,
    }));

    scoredRooms.sort((a, b) => b.similarityScore - a.similarityScore);

    return scoredRooms.slice(0, topK);
  }

  clear(): void {
    this.records.clear();
  }

  get size(): number {
    let count = 0;
    this.records.forEach((records) => (count += records.length));
    return count;
  }
}

function cosineSimilarity(vecA: RoomFeatureVector, vecB: RoomFeatureVector): number {
  const dotProduct =
    vecA.volume * vecB.volume * FEATURE_WEIGHTS.volume +
    vecA.surfaceArea * vecB.surfaceArea * FEATURE_WEIGHTS.surfaceArea +
    vecA.aspectRatio * vecB.aspectRatio * FEATURE_WEIGHTS.aspectRatio;

  let categorySimilarity = 0;
  for (let i = 0; i < vecA.purposeCategory.length; i++) {
    categorySimilarity += vecA.purposeCategory[i] * vecB.purposeCategory[i];
  }
  dotProduct += categorySimilarity * FEATURE_WEIGHTS.purposeCategory;

  const magnitudeA = Math.sqrt(
    Math.pow(vecA.volume, 2) * FEATURE_WEIGHTS.volume +
      Math.pow(vecA.surfaceArea, 2) * FEATURE_WEIGHTS.surfaceArea +
      Math.pow(vecA.aspectRatio, 2) * FEATURE_WEIGHTS.aspectRatio +
      vecA.purposeCategory.reduce((sum, val) => sum + Math.pow(val, 2), 0) *
        FEATURE_WEIGHTS.purposeCategory
  );

  const magnitudeB = Math.sqrt(
    Math.pow(vecB.volume, 2) * FEATURE_WEIGHTS.volume +
      Math.pow(vecB.surfaceArea, 2) * FEATURE_WEIGHTS.surfaceArea +
      Math.pow(vecB.aspectRatio, 2) * FEATURE_WEIGHTS.aspectRatio +
      vecB.purposeCategory.reduce((sum, val) => sum + Math.pow(val, 2), 0) *
        FEATURE_WEIGHTS.purposeCategory
  );

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return parseFloat(Math.max(0, Math.min(1, dotProduct / (magnitudeA * magnitudeB))).toFixed(4));
}

function extractRoomFeatures(room: Room): RoomFeatureVector {
  const normalizedVolume = normalizeValue(room.volumeM3, 50, 5000);
  const normalizedSurfaceArea = normalizeValue(room.surfaceAreaM2, 80, 1000);
  const aspectRatio = room.dimensions.length / room.dimensions.width;
  const normalizedAspectRatio = normalizeValue(aspectRatio, 0.5, 4.0);
  const heightToWidth = room.dimensions.height / room.dimensions.width;
  const normalizedHeightToWidth = normalizeValue(heightToWidth, 0.3, 2.0);
  const purposeEncoding = encodeOneHot(room.purposeCategory);

  return {
    volume: normalizedVolume,
    surfaceArea: normalizedSurfaceArea,
    aspectRatio: normalizedAspectRatio,
    heightToWidth: normalizedHeightToWidth,
    purposeCategory: purposeEncoding,
  };
}

function encodeOneHot(category: PurposeCategory): number[] {
  const encoding = new Array(PURPOSE_CATEGORIES.length).fill(0);
  const index = PURPOSE_CATEGORIES.indexOf(category);
  
  if (index !== -1) {
    encoding[index] = 1;
  }

  return encoding;
}

function normalizeValue(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return parseFloat(Math.max(0, Math.min(1, (value - min) / (max - min))).toFixed(4));
}

function calculateRecencyFactor(timestamp: string): number {
  const ageDays =
    (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
  
  return parseFloat(Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS).toFixed(4));
}

class RecommendationService {
  private historyStore: HistoryStore;
  private recommendations: Map<string, Recommendation> = new Map();

  constructor() {
    this.historyStore = new HistoryStore();
    this.seedSampleData();
  }

  async recommendMaterials(params: RecommendationParams): Promise<Recommendation[]> {
    const { roomId, roomFeatures, topK = 5 } = params;

    const similarRooms = this.historyStore.getSimilarRooms(roomFeatures, 20);

    if (similarRooms.length < 3) {
      console.log('[RecommendationService] Insufficient historical data, using rule-based fallback');
      return this.generateFallbackRecommendation(roomId, roomFeatures);
    }

    const scoredSolutions = this.extractAndScoreSolutions(similarRooms);

    const mergedSolutions = this.mergeAndRank(scoredSolutions, topK);

    const recommendations: Recommendation[] = mergedSolutions.map((solution) => ({
      id: uuidv4(),
      roomId,
      materialCombination: solution.materialCombination,
      confidenceScore: solution.confidenceScore,
      basedOnTasks: solution.basedOnRoomIds,
      predictedEffectiveness: solution.predictedEffectiveness,
      estimatedCost: solution.estimatedCost,
    }));

    recommendations.forEach((rec) => {
      this.recommendations.set(rec.id, rec);
    });

    return recommendations;
  }

  private extractAndScoreSolutions(similarRooms: SimilarRoom[]): ScoredSolution[] {
    const solutionsMap = new Map<string, ScoredSolution>();

    similarRooms.forEach((room) => {
      const historyRecords = this.historyStore.getRoomHistory(room.roomId);
      
      historyRecords.forEach((record) => {
        if (!record.solutionUsed || record.solutionUsed.length === 0) return;

        const solutionKey = this.generateSolutionKey(record.solutionUsed!);

        let existing = solutionsMap.get(solutionKey);

        if (existing) {
          existing.basedOnRoomIds.push(room.roomId);
          existing.similarityScore = Math.max(
            existing.similarityScore,
            room.similarityScore
          );
          existing.effectivenessScore =
            (existing.effectivenessScore + room.effectivenessScore) / 2;
          existing.recencyFactor = Math.max(
            existing.recencyFactor,
            calculateRecencyFactor(record.timestamp)
          );
        } else {
          const estimatedCost = record.solutionUsed!.reduce(
            (sum, mat) => sum + mat.areaSqm * mat.costPerSqm,
            0
          );

          solutionsMap.set(solutionKey, {
            materialCombination: [...record.solutionUsed!],
            similarityScore: room.similarityScore,
            effectivenessScore: room.effectivenessScore,
            recencyFactor: calculateRecencyFactor(record.timestamp),
            confidenceScore: 0,
            basedOnRoomIds: [room.roomId],
            predictedEffectiveness: room.effectivenessScore,
            estimatedCost,
          });
        }
      });
    });

    Array.from(solutionsMap.values()).forEach((solution) => {
      solution.confidenceScore = parseFloat(
        (
          solution.similarityScore * 0.4 +
          solution.effectivenessScore * 0.4 +
          solution.recencyFactor * 0.2
        ).toFixed(4)
      );
    });

    return Array.from(solutionsMap.values());
  }

  private mergeAndRank(
    solutions: ScoredSolution[],
    topK: number,
  ): ScoredSolution[] {
    solutions.sort((a, b) => b.confidenceScore - a.confidenceScore);

    const uniqueSolutions: ScoredSolution[] = [];
    const seenKeys = new Set<string>();

    for (const solution of solutions) {
      const key = this.generateSolutionKey(solution.materialCombination);
      
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueSolutions.push(solution);
        
        if (uniqueSolutions.length >= topK) break;
      }
    }

    return uniqueSolutions;
  }

  private generateSolutionKey(materials: MaterialItem[]): string {
    const sortedMaterials = [...materials]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => `${m.name}_${m.type}_${m.areaSqm.toFixed(1)}`);

    return sortedMaterials.join('|');
  }

  private generateFallbackRecommendation(
    roomId: string,
    features: RoomFeatureVector,
  ): Recommendation[] {
    const defaultMaterials: MaterialItem[] = [
      {
        id: uuidv4(),
        name: '高密度玻璃棉',
        type: 'absorption',
        density: 48,
        thickness: 50,
        nrc: 0.95,
        costPerSqm: 120,
        position: [0, 0, 0],
        areaSqm: 15.0,
      },
      {
        id: uuidv4(),
        name: '聚酯纤维板',
        type: 'absorption',
        density: 25,
        thickness: 25,
        nrc: 0.85,
        costPerSqm: 180,
        position: [0, 0, 0],
        areaSqm: 10.0,
      },
    ];

    const estimatedCost = defaultMaterials.reduce(
      (sum, mat) => sum + mat.areaSqm * mat.costPerSqm,
      0
    );

    const recommendation: Recommendation = {
      id: uuidv4(),
      roomId,
      materialCombination: defaultMaterials,
      confidenceScore: 0.5,
      basedOnTasks: [],
      predictedEffectiveness: 0.75,
      estimatedCost,
    };

    this.recommendations.set(recommendation.id, recommendation);
    return [recommendation];
  }

  addToHistory(
    roomId: string,
    room: Room,
    result: CalculationResult,
    solutionUsed?: MaterialItem[],
    effectivenessScore?: number,
  ): void {
    const features = extractRoomFeatures(room);
    this.historyStore.saveResult(
      roomId,
      features,
      result,
      solutionUsed,
      effectivenessScore,
    );
  }

  getRecommendation(recommendationId: string): Recommendation | null {
    return this.recommendations.get(recommendationId) || null;
  }

  getRecommendationsByRoom(roomId: string): Recommendation[] {
    return Array.from(this.recommendations.values()).filter(
      (rec) => rec.roomId === roomId
    );
  }

  getAllRecommendations(): Recommendation[] {
    return Array.from(this.recommendations.values()).sort(
      (a, b) => b.confidenceScore - a.confidenceScore
    );
  }

  deleteRecommendation(recommendationId: string): boolean {
    return this.recommendations.delete(recommendationId);
  }

  getHistoryStats(): {
    totalRecords: number;
    uniqueRooms: number;
    averageEffectiveness: number;
    categoryDistribution: Record<string, number>;
  } {
    const allRecords = this.historyStore.getAllRecords();
    const uniqueRooms = new Set(allRecords.map((r) => r.roomId)).size;
    
    const avgEffectiveness =
      allRecords.length > 0
        ? allRecords.reduce((sum, r) => sum + r.effectivenessScore, 0) /
          allRecords.length
        : 0;

    const categoryDistribution: Record<string, number> = {};
    allRecords.forEach((record) => {
      const categoryIndex = record.roomFeatures.purposeCategory.findIndex(
        (v) => v === 1
      );
      if (categoryIndex !== -1) {
        const categoryName = PURPOSE_CATEGORIES[categoryIndex];
        categoryDistribution[categoryName] =
          (categoryDistribution[categoryName] || 0) + 1;
      }
    });

    return {
      totalRecords: allRecords.length,
      uniqueRooms,
      averageEffectiveness: parseFloat(avgEffectiveness.toFixed(4)),
      categoryDistribution,
    };
  }

  clearAll(): void {
    this.recommendations.clear();
    this.historyStore.clear();
  }

  private seedSampleData(): void {
    const sampleRooms: Array<{
      roomId: string;
      volume: number;
      surfaceArea: number;
      dimensions: { length: number; width: number; height: number };
      purpose: PurposeCategory;
    }> = [
      {
        roomId: 'sample_room_001',
        volume: 500,
        surfaceArea: 350,
        dimensions: { length: 10, width: 8, height: 6.25 },
        purpose: 'recording_studio',
      },
      {
        roomId: 'sample_room_002',
        volume: 1200,
        surfaceArea: 600,
        dimensions: { length: 15, width: 12, height: 6.67 },
        purpose: 'concert_hall',
      },
      {
        roomId: 'sample_room_003',
        volume: 300,
        surfaceArea: 240,
        dimensions: { length: 8, width: 6, height: 6.25 },
        purpose: 'home_theater',
      },
      {
        roomId: 'sample_room_004',
        volume: 800,
        surfaceArea: 450,
        dimensions: { length: 12, width: 10, height: 6.67 },
        purpose: 'auditorium',
      },
      {
        roomId: 'sample_room_005',
        volume: 200,
        surfaceArea: 180,
        dimensions: { length: 6, width: 5, height: 6.67 },
        purpose: 'classroom',
      },
    ];

    sampleRooms.forEach((sample, index) => {
      const mockRoom: Room = {
        id: sample.roomId,
        name: `Sample Room ${index + 1}`,
        dimensions: sample.dimensions,
        volumeM3: sample.volume,
        surfaceAreaM2: sample.surfaceArea,
        purposeCategory: sample.purpose,
        singularCount: 0,
        isSuspended: false,
        createdBy: 'system',
        createdAt: new Date(Date.now() - (index + 1) * 86400000 * 30).toISOString(),
      };

      const features = extractRoomFeatures(mockRoom);

      const mockResult: CalculationResult = {
        id: `result_${sample.roomId}`,
        taskId: `task_${sample.roomId}`,
        rt60Values: [0.7 + Math.random() * 0.3, 0.65 + Math.random() * 0.25, 0.6 + Math.random() * 0.2, 0.55 + Math.random() * 0.2, 0.5 + Math.random() * 0.2, 0.45 + Math.random() * 0.2, 0.4 + Math.random() * 0.2, 0.35 + Math.random() * 0.2],
        splDistribution: [],
        uniformityScore: 0.75 + Math.random() * 0.2,
        standingWaveRatio: 1.5 + Math.random() * 2,
        maxSplDecibel: 75 + Math.random() * 15,
        avgSplDecibel: 70 + Math.random() * 10,
        calculationTimeSec: 30 + Math.random() * 20,
        nodeCount: 75,
        computedAt: new Date().toISOString(),
      };

      const mockMaterials: MaterialItem[] = [
        {
          id: uuidv4(),
          name: index % 2 === 0 ? '高密度玻璃棉' : '岩棉吸音板',
          type: 'absorption',
          density: index % 2 === 0 ? 48 : 80,
          thickness: index % 2 === 0 ? 50 : 75,
          nrc: index % 2 === 0 ? 0.95 : 0.90,
          costPerSqm: index % 2 === 0 ? 120 : 150,
          position: [0, 0, 0],
          areaSqm: 10 + Math.random() * 20,
        },
      ];

      this.historyStore.saveResult(
        sample.roomId,
        features,
        mockResult,
        mockMaterials,
        mockResult.uniformityScore
      );
    });
  }
}

export const recommendationService = new RecommendationService();

export {
  RecommendationService,
  RecommendationError,
  HistoryStore,
  cosineSimilarity,
  extractRoomFeatures,
  encodeOneHot,
};
export type {
  RoomFeatureVector,
  HistoryRecord,
  SimilarRoom,
  ScoredSolution,
  RecommendationParams,
};
