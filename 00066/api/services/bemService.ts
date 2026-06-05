import { v4 as uuidv4 } from 'uuid';
import EventEmitter from 'events';
import type {
  CalculationResult,
  SplGridPoint,
  SourceParameters,
  RoomDimensions,
  RealtimeMetrics,
} from '../../src/types/index';
import { taskService } from './taskService';
import { monitoringService } from './monitoringService';
import { alertService } from './alertService';

interface BEMCalculationParams {
  taskId: string;
  roomDimensions: RoomDimensions;
  sourceParameters: SourceParameters;
  surfaceAbsorption?: Record<string, number>;
}

interface ProgressUpdate {
  taskId: string;
  stage: 'geometry_check' | 'bem_calculation' | 'visualization';
  progressPercent: number;
  message: string;
  timestamp: string;
}

interface RT60Result {
  frequencyBands: number[];
  rt60Values: number[];
  averageRt60: number;
}

interface SPLDistributionResult {
  gridPoints: SplGridPoint[];
  minSpl: number;
  maxSpl: number;
  avgSpl: number;
  stdDev: number;
}

interface AcousticMetrics {
  uniformityScore: number;
  standingWaveRatio: number;
  maxSplDecibel: number;
  avgSplDecibel: number;
  minSplDecibel: number;
  rt60: RT60Result;
  splDistribution: SPLDistributionResult;
  rirData?: Float32Array;
}

const SAMPLE_RATE = 44100;
const OCTAVE_BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];

const DEFAULT_ABSORPTION_COEFFICIENTS: Record<string, number> = {
  wall: 0.02,
  ceiling: 0.15,
  floor: 0.05,
  window: 0.35,
  door: 0.1,
};

class BEMCalculationError extends Error {
  constructor(message: string, public readonly stage: string) {
    super(message);
    this.name = 'BEMCalculationError';
  }
}

class BEMService extends EventEmitter {
  private activeCalculations: Map<
    string,
    { startTime: number; abortController: AbortController }
  > = new Map();

  async startCalculation(
    params: BEMCalculationParams,
    onProgress?: (update: ProgressUpdate) => void,
  ): Promise<CalculationResult> {
    const { taskId, roomDimensions, sourceParameters, surfaceAbsorption } =
      params;

    const abortController = new AbortController();
    this.activeCalculations.set(taskId, {
      startTime: Date.now(),
      abortController,
    });

    try {
      await this.simulateGeometryCheck(taskId, onProgress);
      abortController.signal.throwIfAborted();

      const metrics = await this.performBEMCalculation(
        taskId,
        roomDimensions,
        sourceParameters,
        surfaceAbsorption || DEFAULT_ABSORPTION_COEFFICIENTS,
        onProgress,
      );
      abortController.signal.throwIfAborted();

      await this.generateVisualization(taskId, onProgress);

      const result = this.buildCalculationResult(taskId, metrics);
      this.activeCalculations.delete(taskId);
      return result;
    } catch (error) {
      this.activeCalculations.delete(taskId);
      if (error instanceof Error && error.name !== 'AbortError') {
        throw new BEMCalculationError(
          `Calculation failed: ${error.message}`,
          'unknown',
        );
      }
      throw error;
    }
  }

  private async simulateGeometryCheck(
    taskId: string,
    onProgress?: (update: ProgressUpdate) => void,
  ): Promise<void> {
    const duration = 5000;
    const interval = 2000;
    const steps = Math.ceil(duration / interval);

    for (let i = 1; i <= steps; i++) {
      await this.delay(interval);
      const progress = Math.round((i / steps) * 100);

      taskService.updateProgress(taskId, progress * 0.2);

      onProgress?.({
        taskId,
        stage: 'geometry_check',
        progressPercent: progress,
        message: `Validating geometry... ${progress}%`,
        timestamp: new Date().toISOString(),
      });
    }

    await taskService.transitionStatus(taskId, 'geometry_check', 'engineer');
    await taskService.transitionStatus(taskId, 'bem_calculation', 'engineer');
  }

  private async performBEMCalculation(
    taskId: string,
    roomDimensions: RoomDimensions,
    sourceParameters: SourceParameters,
    absorptionCoeffs: Record<string, number>,
    onProgress?: (update: ProgressUpdate) => void,
  ): Promise<AcousticMetrics> {
    const duration = 30000;
    const interval = 2000;
    const steps = Math.ceil(duration / interval);
    const volume = this.calculateVolume(roomDimensions);
    const surfaceArea = this.calculateSurfaceArea(roomDimensions);

    const rt60 = this.calculateRT60(volume, surfaceArea, absorptionCoeffs);
    const splDistribution = this.calculateSPLDistribution(
      roomDimensions,
      sourceParameters,
    );

    for (let i = 1; i <= steps; i++) {
      await this.delay(interval);
      const progress = Math.round((i / steps) * 100);

      taskService.updateProgress(taskId, 20 + progress * 0.6);

      const simulatedMetrics = this.generateSimulatedMetrics(
        taskId,
        splDistribution,
        rt60,
        sourceParameters.frequencyHz,
        progress,
      );

      monitoringService.updateMetricsCache(taskId, simulatedMetrics);
      monitoringService.broadcastMetrics(taskId, simulatedMetrics);

      alertService.checkAndCreateAlerts(taskId, simulatedMetrics);

      onProgress?.({
        taskId,
        stage: 'bem_calculation',
        progressPercent: progress,
        message: `Running acoustic simulation... ${progress}%`,
        timestamp: new Date().toISOString(),
      });
    }

    const rirData = this.generateRIR({
      volume,
      surfaceArea,
      rt60: rt60.averageRt60,
      sourcePosition: sourceParameters.sourcePosition,
    });

    const finalMetrics: AcousticMetrics = {
      uniformityScore: this.calculateUniformity(splDistribution),
      standingWaveRatio: this.calculateStandingWaveRatio(rt60),
      maxSplDecibel: splDistribution.maxSpl,
      avgSplDecibel: splDistribution.avgSpl,
      minSplDecibel: splDistribution.minSpl,
      rt60,
      splDistribution,
      rirData,
    };

    const finalRealtimeMetrics: RealtimeMetrics = {
      taskId,
      uniformityScore: finalMetrics.uniformityScore * 100,
      standingWaveRatio: finalMetrics.standingWaveRatio,
      maxSplDecibel: finalMetrics.maxSplDecibel,
      avgSplDecibel: finalMetrics.avgSplDecibel,
      currentFrequency: sourceParameters.frequencyHz,
      timestamp: new Date().toISOString(),
    };

    monitoringService.updateMetricsCache(taskId, finalRealtimeMetrics);
    monitoringService.broadcastMetrics(taskId, finalRealtimeMetrics);
    alertService.checkAndCreateAlerts(taskId, finalRealtimeMetrics);

    return finalMetrics;
  }

  private generateSimulatedMetrics(
    taskId: string,
    splDistribution: SPLDistributionResult,
    rt60: RT60Result,
    frequencyHz: number,
    progressPercent: number,
  ): RealtimeMetrics {
    const progressFactor = progressPercent / 100;
    const jitter = (Math.random() - 0.5) * 2;

    const baseUniformity = this.calculateUniformity(splDistribution) * 100;
    const baseSWR = this.calculateStandingWaveRatio(rt60);
    const baseMaxSPL = splDistribution.maxSpl;
    const baseAvgSPL = splDistribution.avgSpl;

    const convergenceFactor = 0.7 + 0.3 * progressFactor;

    return {
      taskId,
      uniformityScore: parseFloat((baseUniformity * convergenceFactor + jitter).toFixed(1)),
      standingWaveRatio: parseFloat((baseSWR * (0.8 + 0.2 * progressFactor) + jitter * 0.1).toFixed(2)),
      maxSplDecibel: parseFloat((baseMaxSPL + jitter * 0.5).toFixed(1)),
      avgSplDecibel: parseFloat((baseAvgSPL + jitter * 0.3).toFixed(1)),
      currentFrequency: frequencyHz,
      timestamp: new Date().toISOString(),
    };
  }

  private async generateVisualization(
    taskId: string,
    onProgress?: (update: ProgressUpdate) => void,
  ): Promise<void> {
    const duration = 10000;
    const interval = 2000;
    const steps = Math.ceil(duration / interval);

    for (let i = 1; i <= steps; i++) {
      await this.delay(interval);
      const progress = Math.round((i / steps) * 100);

      taskService.updateProgress(taskId, 80 + progress * 0.2);

      onProgress?.({
        taskId,
        stage: 'visualization',
        progressPercent: progress,
        message: `Generating visualization... ${progress}%`,
        timestamp: new Date().toISOString(),
      });
    }

    await taskService.transitionStatus(taskId, 'visualization', 'engineer');
    await taskService.transitionStatus(taskId, 'completed', 'engineer');
  }

  calculateRT60(
    volumeM3: number,
    surfaceAreaM2: number,
    absorptionCoefficients: Record<string, number>,
  ): RT60Result {
    const totalAbsorption = Object.entries(absorptionCoefficients).reduce(
      (sum, [surface, coeff]) => {
        const surfaceAreaRatio = this.getSurfaceAreaRatio(surface);
        return sum + surfaceAreaM2 * surfaceAreaRatio * coeff;
      },
      0,
    );

    const baseRT60 =
      totalAbsorption > 0 ? (0.161 * volumeM3) / totalAbsorption : Infinity;

    const rt60Values = OCTAVE_BANDS.map((freq) => {
      const freqFactor = this.getFrequencyFactor(freq);
      let rt60 = baseRT60 * freqFactor;

      if (rt60 < 0.1) rt60 = 0.1;
      if (rt60 > 5.0) rt60 = 5.0;

      return parseFloat(rt60.toFixed(3));
    });

    const averageRt60 =
      rt60Values.reduce((sum, val) => sum + val, 0) / rt60Values.length;

    return {
      frequencyBands: OCTAVE_BANDS,
      rt60Values,
      averageRt60: parseFloat(averageRt60.toFixed(3)),
    };
  }

  private getFrequencyFactor(frequencyHz: number): number {
    if (frequencyHz < 125) return 1.3;
    if (frequencyHz < 500) return 1.0;
    if (frequencyHz < 2000) return 0.85;
    return 0.7;
  }

  private getSurfaceAreaRatio(surfaceType: string): number {
    const ratios: Record<string, number> = {
      wall: 0.6,
      ceiling: 0.15,
      floor: 0.15,
      window: 0.05,
      door: 0.05,
    };
    return ratios[surfaceType] || 0.1;
  }

  calculateSPLDistribution(
    roomDimensions: RoomDimensions,
    sourceParams: SourceParameters,
  ): SPLDistributionResult {
    const gridPoints: SplGridPoint[] = [];
    const gridSize = { x: 5, y: 5, z: 3 };

    for (let z = 0; z < gridSize.z; z++) {
      for (let y = 0; y < gridSize.y; y++) {
        for (let x = 0; x < gridSize.x; x++) {
          const position: [number, number, number] = [
            parseFloat(((x + 0.5) * (roomDimensions.length / gridSize.x)).toFixed(2)),
            parseFloat(((y + 0.5) * (roomDimensions.width / gridSize.y)).toFixed(2)),
            parseFloat(((z + 0.5) * (roomDimensions.height / gridSize.z)).toFixed(2)),
          ];

          const distance = this.calculateDistance(
            position,
            sourceParams.sourcePosition,
          );

          let splDb = this.calculatePointSourceSPL(
            sourceParams.soundPowerLevelDb,
            distance,
          );

          splDb += this.calculateReflectionGain(
            position,
            roomDimensions,
            sourceParams.frequencyHz,
          );

          const noise = (Math.random() - 0.5) * 2;
          splDb += noise;

          splDb = parseFloat(Math.max(30, Math.min(120, splDb)).toFixed(1));

          gridPoints.push({ position, splDb: splDb });
        }
      }
    }

    const splValues = gridPoints.map((p) => p.splDb);
    const minSpl = Math.min(...splValues);
    const maxSpl = Math.max(...splValues);
    const avgSpl =
      splValues.reduce((sum, val) => sum + val, 0) / splValues.length;
    const variance =
      splValues.reduce((sum, val) => sum + Math.pow(val - avgSpl, 2), 0) /
      splValues.length;
    const stdDev = Math.sqrt(variance);

    return {
      gridPoints,
      minSpl: parseFloat(minSpl.toFixed(1)),
      maxSpl: parseFloat(maxSpl.toFixed(1)),
      avgSpl: parseFloat(avgSpl.toFixed(1)),
      stdDev: parseFloat(stdDev.toFixed(3)),
    };
  }

  private calculateDistance(
    pos1: [number, number, number],
    pos2: [number, number, number],
  ): number {
    return Math.sqrt(
      Math.pow(pos1[0] - pos2[0], 2) +
        Math.pow(pos1[1] - pos2[1], 2) +
        Math.pow(pos1[2] - pos2[2], 2),
    );
  }

  private calculatePointSourceSPL(
    soundPowerLevelDb: number,
    distanceMeters: number,
  ): number {
    if (distanceMeters < 0.1) distanceMeters = 0.1;
    return soundPowerLevelDb - 20 * Math.log10(distanceMeters) - 11;
  }

  private calculateReflectionGain(
    position: [number, number, number],
    dimensions: RoomDimensions,
    frequencyHz: number,
  ): number {
    let gain = 0;

    const distancesToWalls = [
      position[0],
      dimensions.length - position[0],
      position[1],
      dimensions.width - position[1],
      position[2],
      dimensions.height - position[2],
    ];

    distancesToWalls.forEach((dist) => {
      if (dist < 2.0) {
        const wallGain = Math.max(0, 3 * (1 - dist / 2.0));
        gain += wallGain;
      }
    });

    const wavelength = 343 / frequencyHz;
    const roomDiagonal = Math.sqrt(
      Math.pow(dimensions.length, 2) +
        Math.pow(dimensions.width, 2) +
        Math.pow(dimensions.height, 2),
    );

    if (wavelength > roomDiagonal * 0.5) {
      gain *= 1.2;
    }

    return parseFloat(gain.toFixed(1));
  }

  calculateUniformity(splDistribution: SPLDistributionResult): number {
    const { minSpl, maxSpl, avgSpl } = splDistribution;

    if (avgSpl === 0) return 0;

    const uniformity = 1 - (maxSpl - minSpl) / avgSpl;
    return parseFloat(Math.max(0, Math.min(1, uniformity)).toFixed(4));
  }

  calculateStandingWaveRatio(rt60: RT60Result): number {
    const variance =
      rt60.rt60Values.reduce(
        (sum, val) => sum + Math.pow(val - rt60.averageRt60, 2),
        0,
      ) / rt60.rt60Values.length;

    const coefficientOfVariation =
      rt60.averageRt60 > 0
        ? Math.sqrt(variance) / rt60.averageRt60
        : 0;

    let swr = 1 + coefficientOfVariation * 4;

    if (swr < 1.0) swr = 1.0;
    if (swr > 10.0) swr = 10.0;

    return parseFloat(swr.toFixed(2));
  }

  generateRIR(params: {
    volume: number;
    surfaceArea: number;
    rt60: number;
    sourcePosition: [number, number, number];
  }): Float32Array {
    const durationSec = Math.min(params.rt60 * 3, 5.0);
    const sampleCount = Math.floor(durationSec * SAMPLE_RATE);
    const rir = new Float32Array(sampleCount);

    const directSoundSample = Math.floor(sampleCount * 0.001);
    rir[directSoundSample] = 1.0;

    const imageSources = this.generateImageSources(params.sourcePosition, 3);

    imageSources.forEach((source) => {
      const delaySamples = Math.floor(
        (source.distance / 343) * SAMPLE_RATE,
      );
      if (delaySamples < sampleCount) {
        const amplitude =
          (0.8 / source.order) *
          Math.exp(-delaySamples / (params.rt60 * SAMPLE_RATE * 0.25));
        rir[delaySamples] += amplitude;
      }
    });

    const decayConstant = -Math.log(0.001) / (params.rt60 * SAMPLE_RATE);
    for (let i = 1; i < sampleCount; i++) {
      const noise = (Math.random() - 0.5) * 0.01;
      const decay = Math.exp(-decayConstant * i);
      rir[i] += noise * decay;
    }

    let maxAmplitude = 0;
    for (let i = 0; i < sampleCount; i++) {
      if (Math.abs(rir[i]) > maxAmplitude) {
        maxAmplitude = Math.abs(rir[i]);
      }
    }

    if (maxAmplitude > 0) {
      for (let i = 0; i < sampleCount; i++) {
        rir[i] /= maxAmplitude;
      }
    }

    return rir;
  }

  private generateImageSources(
    sourcePosition: [number, number, number],
    maxOrder: number,
  ): Array<{ distance: number; order: number }> {
    const sources: Array<{ distance: number; order: number }> = [];

    for (let order = 1; order <= maxOrder; order++) {
      const reflections = Math.pow(6, order);
      for (let i = 0; i < Math.min(reflections, 20); i++) {
        const distance = order * 2.5 + Math.random() * 3;
        sources.push({ distance, order });
      }
    }

    return sources;
  }

  private buildCalculationResult(
    taskId: string,
    metrics: AcousticMetrics,
  ): CalculationResult {
    const now = new Date().toISOString();
    const calculation = this.activeCalculations.get(taskId);

    return {
      id: uuidv4(),
      taskId,
      rt60Values: metrics.rt60.rt60Values,
      splDistribution: metrics.splDistribution.gridPoints,
      uniformityScore: metrics.uniformityScore,
      standingWaveRatio: metrics.standingWaveRatio,
      maxSplDecibel: metrics.maxSplDecibel,
      avgSplDecibel: metrics.avgSplDecibel,
      calculationTimeSec: calculation
        ? (Date.now() - calculation.startTime) / 1000
        : 0,
      nodeCount: metrics.splDistribution.gridPoints.length,
      computedAt: now,
    };
  }

  private calculateVolume(dimensions: RoomDimensions): number {
    return dimensions.length * dimensions.width * dimensions.height;
  }

  private calculateSurfaceArea(dimensions: RoomDimensions): number {
    const { length, width, height } = dimensions;
    return 2 * (length * width + length * height + width * height);
  }

  abortCalculation(taskId: string): boolean {
    const calculation = this.activeCalculations.get(taskId);
    if (calculation) {
      calculation.abortController.abort();
      this.activeCalculations.delete(taskId);
      return true;
    }
    return false;
  }

  getActiveCalculationCount(): number {
    return this.activeCalculations.size;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const bemService = new BEMService();

export {
  BEMService,
  BEMCalculationError,
  OCTAVE_BANDS,
  SAMPLE_RATE,
};
export type {
  BEMCalculationParams,
  ProgressUpdate,
  RT60Result,
  SPLDistributionResult,
  AcousticMetrics,
};
