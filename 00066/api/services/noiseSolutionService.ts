import { v4 as uuidv4 } from 'uuid';
import type {
  NoiseSolution,
  MaterialItem,
  SpeakerConfig,
  RoomDimensions,
  CalculationResult,
} from '../../src/types/index';

interface MaterialDatabaseEntry {
  id: string;
  name: string;
  type: 'absorption' | 'diffusion' | 'bass_trap';
  density: number;
  thickness: number;
  nrc: number;
  costPerSqm: number;
  frequencyRange?: [number, number];
}

interface SpeakerTemplate {
  model: string;
  powerWatts: number;
  freqRange: [number, number];
  coverageAngle: number;
  costPerUnit: number;
}

interface CurrentMetrics {
  maxSplDecibel: number;
  avgSplDecibel: number;
  standingWaveRatio: number;
  uniformityScore: number;
  rt60Values: number[];
}

interface SolutionGenerationParams {
  taskId: string;
  roomDimensions: RoomDimensions;
  currentMetrics: CurrentMetrics;
  budget?: number;
  priority?: 'spl_reduction' | 'uniformity_improvement' | 'rt60_optimization';
}

const MATERIAL_DATABASE: MaterialDatabaseEntry[] = [
  {
    id: 'glass_wool_48',
    name: '高密度玻璃棉',
    type: 'absorption',
    density: 48,
    thickness: 50,
    nrc: 0.95,
    costPerSqm: 120,
    frequencyRange: [500, 8000],
  },
  {
    id: 'polyester_fiber',
    name: '聚酯纤维板',
    type: 'absorption',
    density: 25,
    thickness: 25,
    nrc: 0.85,
    costPerSqm: 180,
    frequencyRange: [250, 8000],
  },
  {
    id: 'rock_wool',
    name: '岩棉吸音板',
    type: 'absorption',
    density: 80,
    thickness: 75,
    nrc: 0.90,
    costPerSqm: 150,
    frequencyRange: [125, 8000],
  },
  {
    id: 'bass_trap',
    name: '低频陷阱',
    type: 'bass_trap',
    density: 60,
    thickness: 100,
    nrc: 0.92,
    costPerSqm: 280,
    frequencyRange: [63, 500],
  },
  {
    id: 'diffuser_qrd',
    name: 'QRD扩散体',
    type: 'diffusion',
    density: 15,
    thickness: 150,
    nrc: 0.35,
    costPerSqm: 350,
    frequencyRange: [500, 16000],
  },
  {
    id: 'foam_panel',
    name: '吸音泡沫板',
    type: 'absorption',
    density: 20,
    thickness: 30,
    nrc: 0.75,
    costPerSqm: 80,
    frequencyRange: [1000, 8000],
  },
];

const SPEAKER_TEMPLATES: SpeakerTemplate[] = [
  {
    model: 'Genelec 8040B',
    powerWatts: 100,
    freqRange: [45, 20000],
    coverageAngle: 120,
    costPerUnit: 4500,
  },
  {
    model: 'JBL LSR308',
    powerWatts: 85,
    freqRange: [45, 20000],
    coverageAngle: 110,
    costPerUnit: 3200,
  },
  {
    model: 'Yamaha HS8',
    powerWatts: 120,
    freqRange: [43, 30000],
    coverageAngle: 90,
    costPerUnit: 3800,
  },
];

class NoiseSolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoiseSolutionError';
  }
}

class NoiseSolutionService {
  private solutions: Map<string, NoiseSolution> = new Map();

  generateSolution(params: SolutionGenerationParams): NoiseSolution {
    const { taskId, roomDimensions, currentMetrics, budget, priority } = params;

    const problems = this.identifyProblems(currentMetrics);
    
    if (problems.length === 0) {
      throw new NoiseSolutionError('No acoustic issues detected - solution not needed');
    }

    const materials = this.selectMaterials(problems, roomDimensions, budget);
    const speakerArray = this.designSpeakerArray(roomDimensions, priority);
    const estimatedCost = this.calculateTotalCost(materials, speakerArray);
    const effectivenessPrediction = this.predictEffectiveness(
      materials,
      currentMetrics,
      roomDimensions,
    );

    const solution: NoiseSolution = {
      id: uuidv4(),
      taskId,
      materials,
      speakerArray,
      estimatedCost,
      effectivenessPrediction,
      generatedAt: new Date().toISOString(),
    };

    this.solutions.set(solution.id, solution);
    return solution;
  }

  private identifyProblems(metrics: CurrentMetrics): Array<{
    type: 'high_spl' | 'poor_uniformity' | 'high_swr' | 'long_rt60';
    severity: 'critical' | 'moderate' | 'minor';
    value: number;
    threshold: number;
  }> {
    const problems: Array<{
      type: 'high_spl' | 'poor_uniformity' | 'high_swr' | 'long_rt60';
      severity: 'critical' | 'moderate' | 'minor';
      value: number;
      threshold: number;
    }> = [];

    if (metrics.maxSplDecibel > 95) {
      problems.push({
        type: 'high_spl',
        severity: 'critical',
        value: metrics.maxSplDecibel,
        threshold: 85,
      });
    } else if (metrics.maxSplDecibel > 85) {
      problems.push({
        type: 'high_spl',
        severity: 'moderate',
        value: metrics.maxSplDecibel,
        threshold: 85,
      });
    }

    if (metrics.standingWaveRatio > 5) {
      problems.push({
        type: 'high_swr',
        severity: 'critical',
        value: metrics.standingWaveRatio,
        threshold: 3,
      });
    } else if (metrics.standingWaveRatio > 3) {
      problems.push({
        type: 'high_swr',
        severity: 'moderate',
        value: metrics.standingWaveRatio,
        threshold: 3,
      });
    }

    if (metrics.uniformityScore < 0.6) {
      problems.push({
        type: 'poor_uniformity',
        severity: 'critical',
        value: metrics.uniformityScore,
        threshold: 0.8,
      });
    } else if (metrics.uniformityScore < 0.8) {
      problems.push({
        type: 'poor_uniformity',
        severity: 'moderate',
        value: metrics.uniformityScore,
        threshold: 0.8,
      });
    }

    const avgRt60 =
      metrics.rt60Values.reduce((sum, val) => sum + val, 0) /
      metrics.rt60Values.length;

    if (avgRt60 > 1.5) {
      problems.push({
        type: 'long_rt60',
        severity: 'moderate',
        value: avgRt60,
        threshold: 1.2,
      });
    } else if (avgRt60 > 1.2) {
      problems.push({
        type: 'long_rt60',
        severity: 'minor',
        value: avgRt60,
        threshold: 1.2,
      });
    }

    return problems.sort((a, b) => {
      const severityOrder = { critical: 3, moderate: 2, minor: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private selectMaterials(
    problems: Array<{
      type: string;
      severity: string;
      value: number;
      threshold: number;
    }>,
    dimensions: RoomDimensions,
    budget?: number,
  ): MaterialItem[] {
    const selectedMaterials: MaterialItem[] = [];
    const surfaceArea = this.calculateSurfaceArea(dimensions);

    for (const problem of problems) {
      let materialCandidates: MaterialDatabaseEntry[] = [];

      switch (problem.type) {
        case 'high_spl':
          materialCandidates = MATERIAL_DATABASE.filter(
            (m) =>
              m.type === 'absorption' &&
              m.nrc >= 0.85 &&
              m.thickness >= 40
          );
          break;

        case 'high_swr':
          materialCandidates = [
            ...MATERIAL_DATABASE.filter((m) => m.type === 'bass_trap'),
            ...MATERIAL_DATABASE.filter(
              (m) =>
                m.type === 'diffusion' &&
                problem.severity === 'critical'
            ),
          ];
          break;

        case 'poor_uniformity':
          materialCandidates = [
            ...MATERIAL_DATABASE.filter(
              (m) => m.type === 'absorption' && m.nrc >= 0.9
            ),
            ...MATERIAL_DATABASE.filter((m) => m.type === 'diffusion'),
          ];
          break;

        case 'long_rt60':
          materialCandidates = MATERIAL_DATABASE.filter(
            (m) => m.type === 'absorption'
          );
          break;
      }

      if (materialCandidates.length === 0) continue;

      const requiredArea = this.calculateRequiredArea(
        problem,
        dimensions,
        surfaceArea
      );

      const bestMaterial = this.selectBestMaterial(
        materialCandidates,
        requiredArea,
        budget ? budget / problems.length : undefined
      );

      if (bestMaterial) {
        const positions = this.generateMaterialPositions(
          bestMaterial,
          requiredArea,
          dimensions,
          problem.type as any
        );

        selectedMaterials.push(...positions);
      }
    }

    return this.mergeDuplicateMaterials(selectedMaterials);
  }

  private calculateRequiredArea(
    problem: { type: string; severity: string; value: number; threshold: number },
    dimensions: RoomDimensions,
    totalSurfaceArea: number,
  ): number {
    let baseRatio = 0.3;

    switch (problem.severity) {
      case 'critical':
        baseRatio = 0.6;
        break;
      case 'moderate':
        baseRatio = 0.4;
        break;
      case 'minor':
        baseRatio = 0.25;
        break;
    }

    switch (problem.type) {
      case 'high_spl':
        baseRatio *= 1.2;
        break;
      case 'high_swr':
        baseRatio *= 0.8;
        break;
      case 'long_rt60':
        baseRatio *= 1.5;
        break;
    }

    return totalSurfaceArea * baseRatio;
  }

  private selectBestMaterial(
    candidates: MaterialDatabaseEntry[],
    requiredArea: number,
    maxBudget?: number,
  ): MaterialDatabaseEntry | null {
    const scored = candidates.map((material) => {
      const effectiveness = material.nrc * (material.thickness / 100);
      const cost = requiredArea * material.costPerSqm;
      
      let score = effectiveness;
      
      if (maxBudget && cost <= maxBudget) {
        score *= 1.5;
      }
      
      score /= Math.log(cost + 1);

      return { material, score, cost };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].material : null;
  }

  private generateMaterialPositions(
    material: MaterialDatabaseEntry,
    requiredArea: number,
    dimensions: RoomDimensions,
    problemType: string,
  ): MaterialItem[] {
    const positions: MaterialItem[] = [];
    const unitArea = 1.0;
    const panelCount = Math.ceil(requiredArea / unitArea);

    const placementPriority = this.getPlacementPriority(problemType);

    for (let i = 0; i < Math.min(panelCount, 20); i++) {
      const position = this.calculateOptimalPosition(
        i,
        panelCount,
        dimensions,
        placementPriority
      );

      positions.push({
        id: uuidv4(),
        name: material.name,
        type: material.type,
        density: material.density,
        thickness: material.thickness,
        nrc: material.nrc,
        costPerSqm: material.costPerSqm,
        position,
        areaSqm: unitArea,
      });
    }

    return positions;
  }

  private getPlacementPriority(
    problemType: string,
  ): Array<'walls' | 'ceiling' | 'floor'> {
    switch (problemType) {
      case 'high_swr':
        return ['walls', 'ceiling', 'floor'];
      case 'high_spl':
        return ['ceiling', 'walls', 'floor'];
      case 'poor_uniformity':
        return ['walls', 'ceiling', 'floor'];
      case 'long_rt60':
        return ['walls', 'ceiling', 'floor'];
      default:
        return ['walls', 'ceiling', 'floor'];
    }
  }

  private calculateOptimalPosition(
    index: number,
    totalCount: number,
    dimensions: RoomDimensions,
    priority: Array<'walls' | 'ceiling' | 'floor'>
  ): [number, number, number] {
    const surfaceIndex = index % 3;
    const surface = priority[surfaceIndex];
    
    const spacing = Math.sqrt(totalCount / 3);
    const localIndex = Math.floor(index / 3);

    let x: number, y: number, z: number;

    switch (surface) {
      case 'walls':
        x = ((localIndex % spacing) / spacing) * dimensions.length;
        y = (Math.floor(localIndex / spacing) / (spacing)) * dimensions.width;
        z = 0.1;
        break;

      case 'ceiling':
        x = ((localIndex % spacing) / spacing) * dimensions.length;
        y = (Math.floor(localIndex / spacing) / (spacing)) * dimensions.width;
        z = dimensions.height - 0.1;
        break;

      case 'floor':
      default:
        x = ((localIndex % spacing) / spacing) * dimensions.length;
        y = (Math.floor(localIndex / spacing) / (spacing)) * dimensions.width;
        z = 0.1;
        break;
    }

    return [
      parseFloat(x.toFixed(2)),
      parseFloat(y.toFixed(2)),
      parseFloat(z.toFixed(2)),
    ];
  }

  private designSpeakerArray(
    dimensions: RoomDimensions,
    priority?: string,
  ): SpeakerConfig[] {
    const speakers: SpeakerConfig[] = [];
    const template = SPEAKER_TEMPLATES[0];

    const centerX = dimensions.length / 2;
    const centerY = dimensions.width / 2;
    const earHeight = 1.2;

    speakers.push({
      id: uuidv4(),
      model: template.model,
      position: [
        parseFloat((centerX - 1.5).toFixed(2)),
        parseFloat(centerY.toFixed(2)),
        parseFloat(earHeight.toFixed(2)),
      ],
      orientation: [30, 0, 0],
      powerWatts: template.powerWatts,
      frequencyRangeHz: template.freqRange,
      coverageAngle: template.coverageAngle,
    });

    speakers.push({
      id: uuidv4(),
      model: template.model,
      position: [
        parseFloat((centerX + 1.5).toFixed(2)),
        parseFloat(centerY.toFixed(2)),
        parseFloat(earHeight.toFixed(2)),
      ],
      orientation: [-30, 0, 0],
      powerWatts: template.powerWatts,
      frequencyRangeHz: template.freqRange,
      coverageAngle: template.coverageAngle,
    });

    if (priority === 'spl_reduction' || dimensions.length > 8) {
      speakers.push({
        id: uuidv4(),
        model: template.model,
        position: [
          parseFloat(centerX.toFixed(2)),
          parseFloat(centerY.toFixed(2)),
          parseFloat(earHeight.toFixed(2)),
        ],
        orientation: [0, 0, 0],
        powerWatts: template.powerWatts,
        frequencyRangeHz: template.freqRange,
        coverageAngle: template.coverageAngle,
      });
    }

    return speakers;
  }

  private calculateTotalCost(
    materials: MaterialItem[],
    speakers: SpeakerConfig[],
  ): number {
    const materialCost = materials.reduce(
      (sum, mat) => sum + mat.areaSqm * mat.costPerSqm,
      0
    );

    const speakerCost = speakers.reduce((sum, spk) => {
      const template = SPEAKER_TEMPLATES.find((t) => t.model === spk.model);
      return sum + (template?.costPerUnit || 4000);
    }, 0);

    const installationCost = (materialCost + speakerCost) * 0.15;

    return Math.round(materialCost + speakerCost + installationCost);
  }

  private predictEffectiveness(
    materials: MaterialItem[],
    currentMetrics: CurrentMetrics,
    dimensions: RoomDimensions,
  ): number {
    let score = 0.5;

    const totalAbsorption = materials.reduce((sum, mat) => {
      return sum + mat.areaSqm * mat.nrc;
    }, 0);

    const surfaceArea = this.calculateSurfaceArea(dimensions);
    const absorptionCoverage = totalAbsorption / surfaceArea;

    score += absorptionCoverage * 0.25;

    const hasBassTrap = materials.some((m) => m.type === 'bass_trap');
    if (hasBassTrap && currentMetrics.standingWaveRatio > 3) {
      score += 0.15;
    }

    const hasDiffuser = materials.some((m) => m.type === 'diffusion');
    if (hasDiffuser && currentMetrics.uniformityScore < 0.8) {
      score += 0.1;
    }

    const avgNrc =
      materials.reduce((sum, m) => sum + m.nrc, 0) / materials.length;
    if (avgNrc > 0.85) {
      score += 0.1;
    }

    return parseFloat(Math.min(0.99, Math.max(0.1, score)).toFixed(2));
  }

  private calculateSurfaceArea(dimensions: RoomDimensions): number {
    const { length, width, height } = dimensions;
    return 2 * (length * width + length * height + width * height);
  }

  private mergeDuplicateMaterials(materials: MaterialItem[]): MaterialItem[] {
    const merged = new Map<string, MaterialItem>();

    materials.forEach((mat) => {
      const key = `${mat.name}_${mat.type}`;
      const existing = merged.get(key);

      if (existing) {
        existing.areaSqm += mat.areaSqm;
        existing.costPerSqm = Math.min(existing.costPerSqm, mat.costPerSqm);
      } else {
        merged.set(key, { ...mat });
      }
    });

    return Array.from(merged.values());
  }

  getSolution(solutionId: string): NoiseSolution | null {
    return this.solutions.get(solutionId) || null;
  }

  getSolutionsByTask(taskId: string): NoiseSolution[] {
    return Array.from(this.solutions.values()).filter(
      (sol) => sol.taskId === taskId
    );
  }

  getAllSolutions(): NoiseSolution[] {
    return Array.from(this.solutions.values());
  }

  deleteSolution(solutionId: string): boolean {
    return this.solutions.delete(solutionId);
  }

  getMaterialDatabase(): MaterialDatabaseEntry[] {
    return [...MATERIAL_DATABASE];
  }

  getSpeakerTemplates(): SpeakerTemplate[] {
    return [...SPEAKER_TEMPLATES];
  }

  clearAll(): void {
    this.solutions.clear();
  }
}

export const noiseSolutionService = new NoiseSolutionService();

export {
  NoiseSolutionService,
  NoiseSolutionError,
  MATERIAL_DATABASE,
  SPEAKER_TEMPLATES,
};
export type {
  MaterialDatabaseEntry,
  SpeakerTemplate,
  CurrentMetrics,
  SolutionGenerationParams,
};
