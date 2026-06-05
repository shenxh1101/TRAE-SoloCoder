import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../store/useSimulationStore';
import {
  PlasmaSimulationEngine,
  validateParameters,
  generateGrid,
  analyzeStability,
} from '../utils/plasmaUtils';
import { SimulationStatus, STATUS_FLOW } from '../../shared/types';

const DEFAULT_PERFORMANCE_TARGETS = {
  targetConfinementTime: 0.5,
  targetFusionPower: 50,
  targetBetaValue: 3.5,
  targetStabilityMargin: 1.5,
};

export function useSimulationEngine(simulationId: string | null) {
  const {
    simulations,
    updateSimulationStatus,
    updateProgress,
    updateGrowthRate,
    adjustTimeStep,
    switchMode,
    incrementConvergenceCount,
    resetConvergenceCount,
    setSimulationResult,
    currentSimulation,
  } = useSimulationStore();

  const simulation = simulations.find((s) => s.id === simulationId) || currentSimulation;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<PlasmaSimulationEngine | null>(null);
  const highGrowthCountRef = useRef(0);

  const runStatusFlow = useCallback(async () => {
    if (!simulation || !simulationId) return;

    const currentStatusIndex = STATUS_FLOW.indexOf(simulation.status as SimulationStatus);

    if (currentStatusIndex === -1 || simulation.status === 'COMPLETED' || simulation.status === 'PAUSED') {
      return;
    }

    switch (simulation.status) {
      case 'PARAM_VALIDATION': {
        const validation = validateParameters(simulation.parameters);
        await new Promise((r) => setTimeout(r, 1500));

        if (!validation.valid) {
          updateSimulationStatus(simulationId, 'FAILED', `参数校验失败: ${validation.errors.join(', ')}`);
          return;
        }

        updateProgress(simulationId, 20);
        updateSimulationStatus(simulationId, 'GRID_GENERATION', '参数校验通过，开始网格生成');
        break;
      }

      case 'GRID_GENERATION': {
        await new Promise((r) => setTimeout(r, 2000));
        const gridConfig = {
          type: 'uniform',
          resolution: 32,
        };
        generateGrid(gridConfig);

        const engine = new PlasmaSimulationEngine(
          simulation.parameters,
          simulation.boundaryConditions,
          simulation.sourceTerms,
          simulation.mode,
          32
        );
        engineRef.current = engine;

        updateProgress(simulationId, 40);
        updateSimulationStatus(simulationId, 'COMPUTING', '网格生成完成，开始模拟计算');
        break;
      }

      case 'COMPUTING': {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        highGrowthCountRef.current = 0;

        intervalRef.current = setInterval(() => {
          const sim = useSimulationStore.getState().simulations.find((s) => s.id === simulationId);
          if (!sim || sim.status !== 'COMPUTING') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
          }

          const engine = engineRef.current;
          if (!engine) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
          }

          const stepResult = engine.step();
          const { growthRate, isConverged } = stepResult;

          const stepCount = engine.getStepCount();
          const baseProgress = 40;
          const progressRange = 45;
          const progress = baseProgress + (stepCount / 100) * progressRange;

          updateGrowthRate(simulationId, growthRate);
          updateProgress(simulationId, Math.min(85, progress));

          const stability = analyzeStability(growthRate, sim.instabilityThreshold, sim.mode);

          if (stability.unstable) {
            if (stability.recommendation === 'REDUCE_STEP') {
              const newStep = sim.timeStep * 0.5;
              (engine as any).timeStep = Math.max(newStep, 1e-9);
              adjustTimeStep(simulationId, Math.max(newStep, 1e-9));
              resetConvergenceCount(simulationId);
              highGrowthCountRef.current = 0;
            } else if (stability.recommendation === 'SWITCH_MODE') {
              switchMode(simulationId, 'PARTICLE_PIC');
              const newEngine = new PlasmaSimulationEngine(
                sim.parameters,
                sim.boundaryConditions,
                sim.sourceTerms,
                'PARTICLE_PIC',
                32
              );
              (newEngine as any).timeStep = sim.timeStep;
              engineRef.current = newEngine;
              resetConvergenceCount(simulationId);
              highGrowthCountRef.current = 0;
            } else if (stability.recommendation === 'PAUSE') {
              incrementConvergenceCount(simulationId);
            }
          } else {
            resetConvergenceCount(simulationId);
          }

          if (isConverged) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            updateProgress(simulationId, 85);
            updateSimulationStatus(simulationId, 'DATA_DIAGNOSIS', '计算收敛，开始数据诊断');
            return;
          }

          if (growthRate > sim.instabilityThreshold) {
            highGrowthCountRef.current += 1;
            if (highGrowthCountRef.current >= 3) {
              incrementConvergenceCount(simulationId);
            }
          } else {
            highGrowthCountRef.current = 0;
          }

          if (stepCount >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            updateProgress(simulationId, 85);
            updateSimulationStatus(simulationId, 'DATA_DIAGNOSIS', '计算完成，开始数据诊断');
          }
        }, 200);
        break;
      }

      case 'DATA_DIAGNOSIS': {
        await new Promise((r) => setTimeout(r, 2000));

        const engine = engineRef.current;
        if (engine) {
          const result = engine.computePerformanceMetrics(DEFAULT_PERFORMANCE_TARGETS);
          setSimulationResult(simulationId, result);
        }

        updateProgress(simulationId, 100);
        updateSimulationStatus(simulationId, 'COMPLETED', '模拟完成，结果已生成');
        break;
      }
    }
  }, [simulationId, simulation, updateSimulationStatus, updateProgress, updateGrowthRate, adjustTimeStep, switchMode, incrementConvergenceCount, resetConvergenceCount, setSimulationResult]);

  useEffect(() => {
    if (simulation && simulationId) {
      const isActive = STATUS_FLOW.includes(simulation.status as SimulationStatus) &&
        simulation.status !== 'COMPLETED' &&
        simulation.status !== 'PAUSED' &&
        simulation.status !== 'FAILED';

      if (isActive) {
        runStatusFlow();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulation?.status, simulationId, runStatusFlow]);

  const getStatusProgress = (status: SimulationStatus): number => {
    const index = STATUS_FLOW.indexOf(status);
    if (index === -1) return 0;
    return ((index + 1) / STATUS_FLOW.length) * 100;
  };

  return {
    simulation,
    runStatusFlow,
    getStatusProgress,
  };
}
