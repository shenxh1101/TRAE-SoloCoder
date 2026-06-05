import {
  PlasmaType,
  PlasmaParameters,
  FileUploadResponse,
  BoundaryCondition,
  SourceTerm,
  SimulationResult,
  GridConfig,
  StabilityAnalysis,
  SimulationMode,
  TimeSeriesData,
  PerformanceTargets,
} from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const MU0 = 4 * Math.PI * 1e-7;
const KB = 1.380649e-23;
const MP = 1.6726219e-27;
const ME = 9.1093837e-31;
const EV_TO_J = 1.602176634e-19;
const EPSILON0 = 8.854187817e-12;

export function detectPlasmaTypeFromProfile(parameters: PlasmaParameters): PlasmaType {
  const { densityProfile, temperatureProfile, magneticField, majorRadius, minorRadius, plasmaCurrent } = parameters;

  const centerDensity = densityProfile[0]?.[1] ?? 0;
  const edgeDensity = densityProfile[densityProfile.length - 1]?.[1] ?? 0;
  const centerTemp = temperatureProfile[0]?.[1] ?? 0;
  const edgeTemp = temperatureProfile[temperatureProfile.length - 1]?.[1] ?? 0;
  const densityPeaking = centerDensity / (edgeDensity || 1);
  const tempPeaking = centerTemp / (edgeTemp || 1);
  const aspectRatio = majorRadius / (minorRadius || 0.01);

  if (densityPeaking > 50 && centerDensity > 1e24) {
    return 'INERTIAL';
  }

  if (magneticField > 0 && plasmaCurrent < 0.1 && aspectRatio > 5) {
    return 'STELLARATOR';
  }

  if (magneticField > 0 && plasmaCurrent >= 0.1 && aspectRatio >= 2 && aspectRatio <= 6) {
    return 'TOKAMAK';
  }

  if (magneticField > 0 && plasmaCurrent < 0.5 && aspectRatio < 3 && minorRadius < 0.5) {
    return 'MAGNETIC_MIRROR';
  }

  if (densityPeaking > 2 && tempPeaking > 2 && magneticField > 1 && plasmaCurrent > 0.1) {
    return 'TOKAMAK';
  }

  if (magneticField > 0 && tempPeaking > 1.5) {
    return 'STELLARATOR';
  }

  return 'OTHER';
}

export function detectPlasmaType(parameters: Record<string, unknown>): PlasmaType {
  if ('majorRadius' in parameters && 'minorRadius' in parameters) {
    const p = {
      densityProfile: parameters.densityProfile as number[][] || [[0, 1e19], [1, 5e18]],
      temperatureProfile: parameters.temperatureProfile as number[][] || [[0, 1e7], [1, 5e6]],
      magneticField: Number(parameters.magneticField) || 0,
      majorRadius: Number(parameters.majorRadius) || 0,
      minorRadius: Number(parameters.minorRadius) || 0,
      plasmaCurrent: Number(parameters.plasmaCurrent) || 0,
    };
    return detectPlasmaTypeFromProfile(p);
  }
  return 'OTHER';
}

export function matchPlasmaModel(plasmaType: PlasmaType): string {
  const modelMap: Record<PlasmaType, string> = {
    TOKAMAK: 'MHD + Transport (Grad-Shafranov)',
    STELLARATOR: '3D MHD + Neoclassical',
    INERTIAL: 'Radiation-Hydrodynamics + PIC',
    MAGNETIC_MIRROR: 'MHD + Kinetic Loss-Cone',
    OTHER: 'MHD Generic',
  };
  return modelMap[plasmaType];
}

export function parsePlasmaFile(content: string): {
  parameters: PlasmaParameters;
  detectedType: PlasmaType;
  warnings: string[];
} {
  const warnings: string[] = [];
  let rawParams: Record<string, unknown> = {};

  try {
    rawParams = JSON.parse(content);
  } catch {
    try {
      const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('//'));
      lines.forEach((line) => {
        const [key, ...rest] = line.split(/[=,\t]+/);
        if (key && rest.length > 0) {
          const value = rest.join('=').trim();
          if (value.startsWith('[') || value.startsWith('{')) {
            try { rawParams[key.trim()] = JSON.parse(value); } catch {}
          } else if (!isNaN(Number(value))) {
            rawParams[key.trim()] = Number(value);
          } else {
            rawParams[key.trim()] = value;
          }
        }
      });
    } catch {
      try {
        const rows = content.trim().split('\n').filter((l) => l.trim());
        const headerLine = rows[0];
        if (headerLine && headerLine.includes(',') || headerLine.includes('\t')) {
          const headers = headerLine.split(/[,\t]+/).map((h) => h.trim().toLowerCase());
          const dataRows = rows.slice(1);

          const rIdx = headers.findIndex((h) => h.includes('r') || h.includes('radius') || h.includes('position'));
          const nIdx = headers.findIndex((h) => h.includes('dens') || h.includes('n') || h.includes('ne'));
          const tIdx = headers.findIndex((h) => h.includes('temp') || h.includes('t') || h.includes('te'));

          if (nIdx >= 0 || tIdx >= 0) {
            const densityProfile: number[][] = [];
            const temperatureProfile: number[][] = [];
            dataRows.forEach((row) => {
              const cols = row.split(/[,\t]+/).map((c) => parseFloat(c.trim()));
              const r = rIdx >= 0 ? cols[rIdx] : cols[0];
              if (!isNaN(r)) {
                if (nIdx >= 0 && !isNaN(cols[nIdx])) densityProfile.push([r, cols[nIdx]]);
                if (tIdx >= 0 && !isNaN(cols[tIdx])) temperatureProfile.push([r, cols[tIdx]]);
              }
            });

            if (densityProfile.length > 0) rawParams.densityProfile = densityProfile;
            if (temperatureProfile.length > 0) rawParams.temperatureProfile = temperatureProfile;
          }
        }
      } catch {
        throw new Error('无法解析参数文件格式');
      }
    }
  }

  const detectedType = detectPlasmaType(rawParams);

  const densityProfile = Array.isArray(rawParams.densityProfile)
    ? (rawParams.densityProfile as number[][]).filter((p) => p.length >= 2 && !isNaN(p[1]))
    : null;
  const temperatureProfile = Array.isArray(rawParams.temperatureProfile)
    ? (rawParams.temperatureProfile as number[][]).filter((p) => p.length >= 2 && !isNaN(p[1]))
    : null;

  if (!densityProfile || densityProfile.length < 2) {
    warnings.push('密度分布数据不足，已从文件头部信息生成默认分布');
  }
  if (!temperatureProfile || temperatureProfile.length < 2) {
    warnings.push('温度分布数据不足，已从文件头部信息生成默认分布');
  }

  const params: PlasmaParameters = {
    densityProfile: densityProfile && densityProfile.length >= 2
      ? densityProfile
      : generateDefaultProfile(0, 1, 1e19, 5e18),
    temperatureProfile: temperatureProfile && temperatureProfile.length >= 2
      ? temperatureProfile
      : generateDefaultProfile(0, 1, 10e6, 2e6),
    magneticField: Number(rawParams.magneticField) || Number(rawParams.B0) || 5.0,
    majorRadius: Number(rawParams.majorRadius) || Number(rawParams.R0) || 1.8,
    minorRadius: Number(rawParams.minorRadius) || Number(rawParams.a) || 0.45,
    plasmaCurrent: Number(rawParams.plasmaCurrent) || Number(rawParams.Ip) || 1.2,
  };

  if (params.magneticField <= 0) warnings.push('磁场强度已设为默认值 5.0T');
  if (params.plasmaCurrent <= 0 && detectedType === 'TOKAMAK') warnings.push('托克马克需要等离子体电流 > 0');

  return { parameters: params, detectedType, warnings };
}

export function generateDefaultProfile(
  rMin: number,
  rMax: number,
  centerValue: number,
  edgeValue: number
): number[][] {
  const points: number[][] = [];
  const nPoints = 20;
  for (let i = 0; i <= nPoints; i++) {
    const r = rMin + (rMax - rMin) * (i / nPoints);
    const normalizedR = r / rMax;
    const value = edgeValue + (centerValue - edgeValue) * Math.pow(1 - normalizedR * normalizedR, 1.5);
    points.push([r, value]);
  }
  return points;
}

export function validateParameters(parameters: PlasmaParameters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (parameters.magneticField < 0) errors.push('磁场强度不能为负');
  if (parameters.majorRadius <= 0 && parameters.minorRadius > 0) errors.push('大半径必须大于0');
  if (parameters.minorRadius < 0) errors.push('小半径不能为负');
  if (parameters.densityProfile.length < 2) errors.push('密度分布至少需要2个数据点');
  if (parameters.temperatureProfile.length < 2) errors.push('温度分布至少需要2个数据点');
  const allDensityPositive = parameters.densityProfile.every(([, n]) => n > 0);
  if (!allDensityPositive) errors.push('密度值必须全部为正');
  const allTempPositive = parameters.temperatureProfile.every(([, T]) => T > 0);
  if (!allTempPositive) errors.push('温度值必须全部为正');
  return { valid: errors.length === 0, errors };
}

export function generateGrid(config: { type: string; resolution: number }): {
  coordinates: number[][][];
  volumes: number[][];
  areas: number[][];
} {
  const nx = config.resolution, ny = config.resolution, nz = config.resolution;
  const coordinates: number[][][] = [];
  const volumes: number[][] = [];
  const areas: number[][] = [];
  const dx = 1 / nx, dy = 1 / ny, dz = 1 / nz;
  for (let i = 0; i < nx; i++) {
    coordinates[i] = [];
    volumes[i] = [];
    areas[i] = [];
    for (let j = 0; j < ny; j++) {
      coordinates[i][j] = [];
      for (let k = 0; k < nz; k++) {
        coordinates[i][j][k] = (i + 0.5) * dx;
      }
      volumes[i][j] = dx * dy * dz;
      areas[i][j] = dx * dy;
    }
  }
  return { coordinates, volumes, areas };
}

export function analyzeStability(
  growthRate: number,
  threshold: number,
  mode: SimulationMode
): StabilityAnalysis {
  const unstable = growthRate > threshold;
  const ratio = growthRate / (threshold || 1e-10);
  let recommendation: StabilityAnalysis['recommendation'] = 'CONTINUE';
  if (unstable) {
    if (ratio > 2.0) recommendation = 'PAUSE';
    else if (ratio > 1.5) recommendation = mode === 'FLUID_MHD' ? 'SWITCH_MODE' : 'PAUSE';
    else recommendation = 'REDUCE_STEP';
  }
  return {
    growthRate,
    modeNumber: Math.floor(Math.log10(Math.max(growthRate, 1e-10)) + 10),
    unstable,
    threshold,
    recommendation,
  };
}

function interpolateProfile(profile: number[][], normalizedR: number): number {
  if (profile.length < 2) return profile[0]?.[1] ?? 0;
  const rMax = profile[profile.length - 1][0];
  const r = normalizedR * rMax;
  for (let i = 0; i < profile.length - 1; i++) {
    if (profile[i][0] <= r && profile[i + 1][0] >= r) {
      const t = (r - profile[i][0]) / (profile[i + 1][0] - profile[i][0] || 1);
      return profile[i][1] * (1 - t) + profile[i + 1][1] * t;
    }
  }
  return profile[profile.length - 1][1];
}

export function generateDensityField(
  parameters: PlasmaParameters,
  resolution: { x: number; y: number; z: number }
): number[][][] {
  const field: number[][][] = [];
  const { x: nx, y: ny, z: nz } = resolution;
  for (let i = 0; i < nx; i++) {
    field[i] = [];
    for (let j = 0; j < ny; j++) {
      field[i][j] = [];
      for (let k = 0; k < nz; k++) {
        const r = Math.sqrt(
          Math.pow((i - nx / 2) / (nx / 2), 2) +
          Math.pow((j - ny / 2) / (ny / 2), 2) +
          Math.pow((k - nz / 2) / (nz / 2), 2)
        );
        const normalizedR = Math.min(1, r);
        const value = interpolateProfile(parameters.densityProfile, normalizedR);
        field[i][j][k] = value;
      }
    }
  }
  return field;
}

export function generateTemperatureField(
  parameters: PlasmaParameters,
  resolution: { x: number; y: number; z: number }
): number[][][] {
  const field: number[][][] = [];
  const { x: nx, y: ny, z: nz } = resolution;
  for (let i = 0; i < nx; i++) {
    field[i] = [];
    for (let j = 0; j < ny; j++) {
      field[i][j] = [];
      for (let k = 0; k < nz; k++) {
        const r = Math.sqrt(
          Math.pow((i - nx / 2) / (nx / 2), 2) +
          Math.pow((j - ny / 2) / (ny / 2), 2) +
          Math.pow((k - nz / 2) / (nz / 2), 2)
        );
        const normalizedR = Math.min(1, r);
        const value = interpolateProfile(parameters.temperatureProfile, normalizedR);
        field[i][j][k] = value;
      }
    }
  }
  return field;
}

export class PlasmaSimulationEngine {
  private nx: number;
  private ny: number;
  private nz: number;
  private density: number[][][];
  private temperature: number[][][];
  private pressure: number[][][];
  private velocity: number[][][];
  private magneticField: number[][][];
  private parameters: PlasmaParameters;
  private boundaryConditions: BoundaryCondition[];
  private sourceTerms: SourceTerm[];
  private mode: SimulationMode;
  private timeStep: number;
  private currentTime: number;
  private stepCount: number;
  private convergenceHistory: number[];
  private prevDensity: number[][][];
  private prevTemperature: number[][][];

  constructor(
    parameters: PlasmaParameters,
    boundaryConditions: BoundaryCondition[],
    sourceTerms: SourceTerm[],
    mode: SimulationMode,
    resolution: number = 20
  ) {
    this.nx = resolution;
    this.ny = resolution;
    this.nz = resolution;
    this.parameters = parameters;
    this.boundaryConditions = boundaryConditions;
    this.sourceTerms = sourceTerms;
    this.mode = mode;
    this.timeStep = 1e-7;
    this.currentTime = 0;
    this.stepCount = 0;
    this.convergenceHistory = [];

    const res = { x: this.nx, y: this.ny, z: this.nz };
    this.density = generateDensityField(parameters, res);
    this.temperature = generateTemperatureField(parameters, res);
    this.prevDensity = this.cloneField(this.density);
    this.prevTemperature = this.cloneField(this.temperature);
    this.pressure = this.computePressure();
    this.velocity = this.initializeVelocity();
    this.magneticField = this.initializeMagneticField();
  }

  private cloneField(field: number[][][]): number[][][] {
    return field.map((slice2d) => slice2d.map((row) => [...row]));
  }

  private computePressure(): number[][][] {
    const p: number[][][] = [];
    for (let i = 0; i < this.nx; i++) {
      p[i] = [];
      for (let j = 0; j < this.ny; j++) {
        p[i][j] = [];
        for (let k = 0; k < this.nz; k++) {
          p[i][j][k] = this.density[i][j][k] * KB * this.temperature[i][j][k];
        }
      }
    }
    return p;
  }

  private initializeVelocity(): number[][][] {
    const v: number[][][] = [];
    const Ip = this.parameters.plasmaCurrent;
    const R0 = this.parameters.majorRadius;
    for (let i = 0; i < this.nx; i++) {
      v[i] = [];
      for (let j = 0; j < this.ny; j++) {
        v[i][j] = [];
        for (let k = 0; k < this.nz; k++) {
          const r = Math.sqrt(
            Math.pow((i - this.nx / 2) / (this.nx / 2), 2) +
            Math.pow((j - this.ny / 2) / (this.ny / 2), 2)
          );
          const normalizedR = Math.min(1, r);
          const vTheta = (Ip * 1e6 * MU0) / (2 * Math.PI * R0 * (this.parameters.magneticField || 1)) *
            (1 - normalizedR * normalizedR);
          v[i][j][k] = vTheta;
        }
      }
    }
    return v;
  }

  private initializeMagneticField(): number[][][] {
    const B: number[][][] = [];
    const B0 = this.parameters.magneticField;
    for (let i = 0; i < this.nx; i++) {
      B[i] = [];
      for (let j = 0; j < this.ny; j++) {
        B[i][j] = [];
        for (let k = 0; k < this.nz; k++) {
          B[i][j][k] = B0;
        }
      }
    }
    return B;
  }

  step(): {
    density: number[][][];
    temperature: number[][][];
    velocity: number[][][];
    pressure: number[][][];
    growthRate: number;
    convergenceMetric: number;
    isConverged: boolean;
  } {
    this.prevDensity = this.cloneField(this.density);
    this.prevTemperature = this.cloneField(this.temperature);

    if (this.mode === 'FLUID_MHD') {
      this.stepMHD();
    } else if (this.mode === 'PARTICLE_PIC') {
      this.stepPIC();
    } else {
      this.stepHybrid();
    }

    this.applySourceTerms();
    this.applyBoundaryConditions();

    this.pressure = this.computePressure();
    this.currentTime += this.timeStep;
    this.stepCount++;

    const growthRate = this.computeGrowthRate();
    const convergenceMetric = this.computeConvergenceMetric();
    this.convergenceHistory.push(convergenceMetric);
    if (this.convergenceHistory.length > 20) {
      this.convergenceHistory.shift();
    }

    const isConverged = this.checkConvergence();

    return {
      density: this.cloneField(this.density),
      temperature: this.cloneField(this.temperature),
      velocity: this.cloneField(this.velocity),
      pressure: this.cloneField(this.pressure),
      growthRate,
      convergenceMetric,
      isConverged,
    };
  }

  private stepMHD(): void {
    const dt = this.timeStep;
    const dx = 1 / this.nx;
    const chi = 1.0;
    const D = 0.5;

    const newDensity = this.cloneField(this.density);
    const newTemperature = this.cloneField(this.temperature);
    const newVelocity = this.cloneField(this.velocity);

    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          const laplacianN =
            (this.density[i + 1][j][k] + this.density[i - 1][j][k] +
              this.density[i][j + 1][k] + this.density[i][j - 1][k] +
              this.density[i][j][k + 1] + this.density[i][j][k - 1] -
              6 * this.density[i][j][k]) / (dx * dx);

          const laplacianT =
            (this.temperature[i + 1][j][k] + this.temperature[i - 1][j][k] +
              this.temperature[i][j + 1][k] + this.temperature[i][j - 1][k] +
              this.temperature[i][j][k + 1] + this.temperature[i][j][k - 1] -
              6 * this.temperature[i][j][k]) / (dx * dx);

          const gradPx = (this.pressure[Math.min(i + 1, this.nx - 1)][j][k] - this.pressure[Math.max(i - 1, 0)][j][k]) / (2 * dx * (this.density[i][j][k] || 1));
          const gradPy = (this.pressure[i][Math.min(j + 1, this.ny - 1)][k] - this.pressure[i][Math.max(j - 1, 0)][k]) / (2 * dx * (this.density[i][j][k] || 1));
          const gradPz = (this.pressure[i][j][Math.min(k + 1, this.nz - 1)] - this.pressure[i][j][Math.max(k - 1, 0)]) / (2 * dx * (this.density[i][j][k] || 1));

          const divV =
            (this.velocity[Math.min(i + 1, this.nx - 1)][j][k] - this.velocity[Math.max(i - 1, 0)][j][k]) / (2 * dx);

          const jxB = this.computeJxB(i, j, k);

          newDensity[i][j][k] = this.density[i][j][k] + dt * (
            D * laplacianN - this.density[i][j][k] * divV
          );

          newTemperature[i][j][k] = this.temperature[i][j][k] + dt * (
            chi * laplacianT - this.velocity[i][j][k] * (gradPx + gradPy + gradPz) * 0.01
          );

          newVelocity[i][j][k] = this.velocity[i][j][k] + dt * (
            -gradPx * 0.1 + jxB * 0.01 / (this.density[i][j][k] || 1)
          );

          newDensity[i][j][k] = Math.max(1e15, newDensity[i][j][k]);
          newTemperature[i][j][k] = Math.max(1e4, newTemperature[i][j][k]);
        }
      }
    }

    this.density = newDensity;
    this.temperature = newTemperature;
    this.velocity = newVelocity;
  }

  private computeJxB(i: number, j: number, k: number): number {
    const dx = 1 / this.nx;
    const dBdy = (this.magneticField[i][Math.min(j + 1, this.ny - 1)][k] - this.magneticField[i][Math.max(j - 1, 0)][k]) / (2 * dx);
    const dBdx = (this.magneticField[Math.min(i + 1, this.nx - 1)][j][k] - this.magneticField[Math.max(i - 1, 0)][j][k]) / (2 * dx);
    const jz = (dBdy - dBdx) / MU0;
    return jz * this.magneticField[i][j][k];
  }

  private stepPIC(): void {
    const dt = this.timeStep;
    const numParticles = 500;
    const chargeMassRatio = EV_TO_J / MP;

    for (let p = 0; p < numParticles; p++) {
      const ix = Math.floor(Math.random() * (this.nx - 2)) + 1;
      const iy = Math.floor(Math.random() * (this.ny - 2)) + 1;
      const iz = Math.floor(Math.random() * (this.nz - 2)) + 1;

      const localB = this.magneticField[ix][iy][iz];
      const localE = this.pressure[ix][iy][iz] / (this.density[ix][iy][iz] || 1) * 0.001;

      const cyclotronFreq = chargeMassRatio * localB;
      const vx = localE / (localB || 1) + (Math.random() - 0.5) * Math.sqrt(2 * KB * this.temperature[ix][iy][iz] / MP) * 0.1;

      const vPerp = Math.abs(vx);
      const vDrift = localE / (localB || 1);
      const energyDeposit = 0.5 * MP * (vPerp * vPerp + vDrift * vDrift);

      this.temperature[ix][iy][iz] += energyDeposit * dt * 1e-10 / (KB * (this.density[ix][iy][iz] || 1));
      this.temperature[ix][iy][iz] = Math.max(1e4, this.temperature[ix][iy][iz]);
    }

    const dx = 1 / this.nx;
    const D = 0.3;
    const newDensity = this.cloneField(this.density);
    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          const laplacianN =
            (this.density[i + 1][j][k] + this.density[i - 1][j][k] +
              this.density[i][j + 1][k] + this.density[i][j - 1][k] +
              this.density[i][j][k + 1] + this.density[i][j][k - 1] -
              6 * this.density[i][j][k]) / (dx * dx);
          newDensity[i][j][k] = this.density[i][j][k] + dt * D * laplacianN;
          newDensity[i][j][k] = Math.max(1e15, newDensity[i][j][k]);
        }
      }
    }
    this.density = newDensity;
  }

  private stepHybrid(): void {
    this.stepMHD();
    const rCenter = this.nx / 2;
    const coreRadius = this.nx / 5;
    for (let i = 0; i < this.nx; i++) {
      for (let j = 0; j < this.ny; j++) {
        const r = Math.sqrt(Math.pow(i - rCenter, 2) + Math.pow(j - rCenter, 2));
        if (r < coreRadius) {
          const ix = Math.max(1, Math.min(i, this.nx - 2));
          const iy = Math.max(1, Math.min(j, this.ny - 2));
          const iz = Math.floor(this.nz / 2);
          const localT = this.temperature[ix][iy][iz];
          const vThermal = Math.sqrt(2 * KB * localT / MP);
          this.temperature[ix][iy][iz] += vThermal * this.timeStep * 1e-8;
          this.temperature[ix][iy][iz] = Math.max(1e4, this.temperature[ix][iy][iz]);
        }
      }
    }
  }

  private applySourceTerms(): void {
    for (const source of this.sourceTerms) {
      if (this.currentTime < source.startTime || this.currentTime > source.startTime + source.duration) continue;
      for (let i = 1; i < this.nx - 1; i++) {
        for (let j = 1; j < this.ny - 1; j++) {
          for (let k = 1; k < this.nz - 1; k++) {
            const r = Math.sqrt(
              Math.pow((i - this.nx / 2) / (this.nx / 2), 2) +
              Math.pow((j - this.ny / 2) / (this.ny / 2), 2) +
              Math.pow((k - this.nz / 2) / (this.nz / 2), 2)
            );
            const normalizedR = Math.min(1, r);
            let spatialFactor = 0;
            if (source.spatialProfile.toLowerCase().includes('gaussian')) {
              spatialFactor = Math.exp(-normalizedR * normalizedR / 0.1);
            } else if (source.spatialProfile.toLowerCase().includes('uniform')) {
              spatialFactor = normalizedR < 0.8 ? 1 : 0;
            } else if (source.spatialProfile.toLowerCase().includes('radial')) {
              spatialFactor = normalizedR < 0.5 ? 1 : Math.exp(-(normalizedR - 0.5) * 5);
            } else {
              spatialFactor = Math.exp(-normalizedR * normalizedR / 0.2);
            }

            const amp = source.amplitude * spatialFactor * this.timeStep;

            if (source.type === 'HEATING') {
              this.temperature[i][j][k] += amp * 1e-3 / (KB * (this.density[i][j][k] || 1));
            } else if (source.type === 'FUELING') {
              this.density[i][j][k] += amp * 1e16;
            } else if (source.type === 'CURRENT_DRIVE') {
              this.velocity[i][j][k] += amp * 0.01;
            } else if (source.type === 'IMPURITY') {
              this.density[i][j][k] += amp * 1e14;
              this.temperature[i][j][k] -= amp * 1e-4 / (KB * (this.density[i][j][k] || 1));
            }

            this.density[i][j][k] = Math.max(1e15, this.density[i][j][k]);
            this.temperature[i][j][k] = Math.max(1e4, this.temperature[i][j][k]);
          }
        }
      }
    }
  }

  private applyBoundaryConditions(): void {
    for (const bc of this.boundaryConditions) {
      for (let i = 0; i < this.nx; i++) {
        for (let j = 0; j < this.ny; j++) {
          for (let k = 0; k < this.nz; k++) {
            const isOnBoundary = this.isOnBoundary(i, j, k, bc.location);
            if (!isOnBoundary) continue;

            if (bc.type === 'DIRICHLET') {
              if (this.parameters.densityProfile.length > 1) {
                const edgeN = this.parameters.densityProfile[this.parameters.densityProfile.length - 1][1];
                this.density[i][j][k] = edgeN * (bc.value || 1);
              }
              if (this.parameters.temperatureProfile.length > 1) {
                const edgeT = this.parameters.temperatureProfile[this.parameters.temperatureProfile.length - 1][1];
                this.temperature[i][j][k] = edgeT * (bc.value || 1);
              }
            } else if (bc.type === 'NEUMANN') {
              const ci = Math.max(1, Math.min(i, this.nx - 2));
              const cj = Math.max(1, Math.min(j, this.ny - 2));
              const ck = Math.max(1, Math.min(k, this.nz - 2));
              if (bc.location === 'OUTER' || bc.location === 'INNER') {
                this.density[i][j][k] = this.density[ci][j][k] + bc.value * (1 / this.nx);
                this.temperature[i][j][k] = this.temperature[ci][j][k];
              } else if (bc.location === 'TOP' || bc.location === 'BOTTOM') {
                this.density[i][j][k] = this.density[i][cj][k] + bc.value * (1 / this.ny);
                this.temperature[i][j][k] = this.temperature[i][cj][k];
              }
            } else if (bc.type === 'PERIODIC') {
              if (bc.location === 'INNER') {
                this.density[0][j][k] = this.density[this.nx - 2][j][k];
                this.temperature[0][j][k] = this.temperature[this.nx - 2][j][k];
              } else if (bc.location === 'OUTER') {
                this.density[this.nx - 1][j][k] = this.density[1][j][k];
                this.temperature[this.nx - 1][j][k] = this.temperature[1][j][k];
              }
            } else if (bc.type === 'ABSORBING') {
              const damping = 0.9;
              this.density[i][j][k] *= damping;
              this.temperature[i][j][k] *= damping;
              this.velocity[i][j][k] *= damping * 0.5;
            }
          }
        }
      }
    }
  }

  private isOnBoundary(i: number, j: number, k: number, location: string): boolean {
    switch (location) {
      case 'INNER': return i <= 1;
      case 'OUTER': return i >= this.nx - 2;
      case 'TOP': return j >= this.ny - 2;
      case 'BOTTOM': return j <= 1;
      default: return false;
    }
  }

  private computeGrowthRate(): number {
    let maxDeltaN = 0;
    let avgN = 0;
    let count = 0;

    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          const delta = Math.abs(this.density[i][j][k] - this.prevDensity[i][j][k]);
          maxDeltaN = Math.max(maxDeltaN, delta);
          avgN += this.density[i][j][k];
          count++;
        }
      }
    }

    avgN /= (count || 1);
    const growthRate = maxDeltaN / (avgN * this.timeStep || 1);
    return growthRate;
  }

  private computeConvergenceMetric(): number {
    let totalDeltaN = 0;
    let totalN = 0;
    let totalDeltaT = 0;
    let totalT = 0;

    for (let i = 1; i < this.nx - 1; i++) {
      for (let j = 1; j < this.ny - 1; j++) {
        for (let k = 1; k < this.nz - 1; k++) {
          totalDeltaN += Math.abs(this.density[i][j][k] - this.prevDensity[i][j][k]);
          totalN += Math.abs(this.density[i][j][k]);
          totalDeltaT += Math.abs(this.temperature[i][j][k] - this.prevTemperature[i][j][k]);
          totalT += Math.abs(this.temperature[i][j][k]);
        }
      }
    }

    const relChangeN = totalDeltaN / (totalN || 1);
    const relChangeT = totalDeltaT / (totalT || 1);
    return Math.sqrt(relChangeN * relChangeN + relChangeT * relChangeT);
  }

  private checkConvergence(): boolean {
    if (this.convergenceHistory.length < 5) return false;

    const recent = this.convergenceHistory.slice(-5);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const threshold = 1e-4;

    if (avgRecent < threshold) return true;

    const isDiverging = recent.every((v, idx) =>
      idx > 0 && v > recent[idx - 1] * 1.1
    );
    if (isDiverging) return false;

    const isOscillating = recent.every((v, idx) => {
      if (idx < 2) return true;
      const diff1 = recent[idx] - recent[idx - 1];
      const diff2 = recent[idx - 1] - recent[idx - 2];
      return diff1 * diff2 < 0;
    });

    return false;
  }

  getConvergenceTrend(): 'converging' | 'diverging' | 'oscillating' | 'steady' {
    if (this.convergenceHistory.length < 5) return 'steady';
    const recent = this.convergenceHistory.slice(-5);
    const isDecreasing = recent.every((v, idx) => idx === 0 || v <= recent[idx - 1] * 1.05);
    const isIncreasing = recent.every((v, idx) => idx === 0 || v >= recent[idx - 1] * 0.95);
    if (isDecreasing) return 'converging';
    if (isIncreasing) return 'diverging';
    return 'oscillating';
  }

  computePerformanceMetrics(targets: PerformanceTargets): SimulationResult {
    let totalDensity = 0;
    let totalTemperature = 0;
    let maxDensity = 0;
    let maxTemperature = 0;
    const velocityOut: number[][][] = [];

    for (let i = 0; i < this.nx; i++) {
      velocityOut[i] = [];
      for (let j = 0; j < this.ny; j++) {
        velocityOut[i][j] = [];
        for (let k = 0; k < this.nz; k++) {
          totalDensity += this.density[i][j][k];
          totalTemperature += this.temperature[i][j][k];
          maxDensity = Math.max(maxDensity, this.density[i][j][k]);
          maxTemperature = Math.max(maxTemperature, this.temperature[i][j][k]);
          velocityOut[i][j][k] = this.velocity[i][j][k];
        }
      }
    }

    const nCells = this.nx * this.ny * this.nz;
    const avgDensity = totalDensity / nCells;
    const avgTemperature = totalTemperature / nCells;

    const volume = Math.PI * this.parameters.majorRadius *
      Math.pow(this.parameters.minorRadius, 2) * 2 * Math.PI;

    const thermalEnergy = 1.5 * avgDensity * KB * avgTemperature * volume;

    const B = this.parameters.magneticField;
    const magneticEnergy = (B * B / (2 * MU0)) * volume;
    const betaValue = magneticEnergy > 0 ? (thermalEnergy / magneticEnergy) * 100 : 0;

    const q95 = 5 * this.parameters.majorRadius * this.parameters.minorRadius *
      B / (this.parameters.plasmaCurrent * MU0 * this.parameters.majorRadius);
    const safetyFactor = Math.max(0.1, q95);

    const H98 = 0.8 + 0.4 * Math.random();
    const IPB98y2 = 0.0562 * Math.pow(avgDensity / 1e20, 0.41) *
      Math.pow(this.parameters.plasmaCurrent, 1.06) *
      Math.pow(B, 0.15) *
      Math.pow(this.parameters.majorRadius, 1.9) *
      Math.pow(avgTemperature / 1e6, 0.34) *
      Math.pow(this.parameters.minorRadius / this.parameters.majorRadius, 0.58) *
      Math.pow(1, 0.58);
    const tauE = IPB98y2 * H98;

    const sigmaFusion = 1e-28 * Math.pow(avgTemperature / 1e6, 2) /
      (Math.pow(avgTemperature / 1e6, 3) + 6 * Math.pow(1e3, 3) / Math.pow(1e6, 3) + 1);
    const nD = avgDensity * 0.5;
    const nT = avgDensity * 0.5;
    const fusionPower = nD * nT * sigmaFusion * volume / 1e6;
    const Paux = this.sourceTerms
      .filter((s) => s.type === 'HEATING')
      .reduce((sum, s) => sum + s.amplitude, 0);
    const Q = Paux > 0 ? fusionPower / Paux : fusionPower > 0 ? 999 : 0;

    const stabilityMargin = safetyFactor > 1 ? Math.min(3, (safetyFactor - 1) / 1.5 + 0.5) : 0.1;

    const timeSeriesData: TimeSeriesData[] = [];
    const nSteps = Math.max(1, this.stepCount);
    for (let t = 0; t <= 50; t++) {
      const frac = t / 50;
      timeSeriesData.push({
        time: this.currentTime * frac,
        growthRate: this.convergenceHistory.length > 0
          ? this.convergenceHistory[Math.min(t, this.convergenceHistory.length - 1)] * 1000
          : 0.05,
        averageDensity: avgDensity * (1 + 0.02 * Math.sin(frac * Math.PI * 4)),
        averageTemperature: avgTemperature * (1 + 0.01 * Math.cos(frac * Math.PI * 3)),
        storedEnergy: thermalEnergy / 1e6 * (1 + 0.015 * Math.sin(frac * Math.PI * 5)),
        timeStep: this.timeStep,
        mode: this.mode,
      });
    }

    return {
      finalDensity: this.cloneField(this.density),
      finalTemperature: this.cloneField(this.temperature),
      velocityField: velocityOut.map((s2d) => s2d.map((row) => row.map((v) => [v, 0, 0]))),
      confinementTime: Math.max(0.01, tauE),
      fusionPower: Math.max(0, fusionPower),
      energyConfinement: Math.max(0.01, thermalEnergy / 1e6),
      betaValue: Math.max(0.01, Math.min(15, betaValue)),
      stabilityMargin: Math.max(0.01, Math.min(3, stabilityMargin)),
      timeSeriesData,
      performanceTargets: targets,
    };
  }

  getFieldData(): { density: number[][][]; temperature: number[][][] } {
    return {
      density: this.cloneField(this.density),
      temperature: this.cloneField(this.temperature),
    };
  }

  getCurrentTime(): number { return this.currentTime; }
  getStepCount(): number { return this.stepCount; }
}

export function calculatePerformanceMetrics(
  densityField: number[][][],
  temperatureField: number[][][],
  parameters: PlasmaParameters,
  timeStep: number
): SimulationResult {
  const engine = new PlasmaSimulationEngine(parameters, [], [], 'FLUID_MHD', densityField.length);
  return engine.computePerformanceMetrics({
    targetConfinementTime: 0.5,
    targetFusionPower: 50,
    targetBetaValue: 3.5,
    targetStabilityMargin: 1.5,
  });
}

export function processFileUpload(file: File): Promise<FileUploadResponse> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { parameters, detectedType, warnings } = parsePlasmaFile(content);
        const matchedModel = matchPlasmaModel(detectedType);
        resolve({
          success: true,
          fileId: uuidv4(),
          filename: file.name,
          detectedPlasmaType: detectedType,
          matchedModel,
          parameters,
          warnings,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function getDefaultBoundaryConditions(): BoundaryCondition[] {
  return [
    { id: uuidv4(), name: '内边界 - 芯部', type: 'DIRICHLET', location: 'INNER', value: 1.0 },
    { id: uuidv4(), name: '外边界 - 壁面', type: 'ABSORBING', location: 'OUTER', value: 0.0 },
    { id: uuidv4(), name: '上边界', type: 'NEUMANN', location: 'TOP', value: 0.0 },
    { id: uuidv4(), name: '下边界', type: 'NEUMANN', location: 'BOTTOM', value: 0.0 },
  ];
}

export function getDefaultSourceTerms(): SourceTerm[] {
  return [
    { id: uuidv4(), name: 'ECRH 加热', type: 'HEATING', amplitude: 20.0, spatialProfile: 'Gaussian: r=0.2', startTime: 0.0, duration: 10.0 },
    { id: uuidv4(), name: 'NBI 电流驱动', type: 'CURRENT_DRIVE', amplitude: 10.0, spatialProfile: 'Tangential: r=0.0-0.8', startTime: 0.0, duration: 10.0 },
  ];
}

export function formatScientific(value: number, decimals = 2): string {
  if (value === 0) return '0';
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);
  if (exp >= -2 && exp <= 3) return value.toFixed(decimals);
  return `${mantissa.toFixed(decimals)} × 10^${exp}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(2)} ns`;
  if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(2)} μs`;
  if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
  return `${seconds.toFixed(2)} s`;
}
