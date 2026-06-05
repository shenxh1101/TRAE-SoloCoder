import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Vehicle,
  Intersection,
  RoadSegment,
  TrafficEvent,
  CongestionPrediction,
  BusPriority,
  TimingReport,
  Direction,
  EventType,
  EventSeverity,
} from '../types';
import {
  calculateOptimalTiming,
  calculateDistance,
  lerpVector3,
  generateId,
  detectAnomaly,
} from '../utils/trafficUtils';
import {
  predictCongestion,
  updateRoadCongestion,
  generateHistoricalData,
  calculateHeatmapIntensity,
  type CongestionHistoryPoint,
} from '../utils/congestionPredictor';
import { useAppStore } from '../store';

interface UseTrafficSimulationOptions {
  initialVehicles: Vehicle[];
  initialIntersections: Intersection[];
  initialRoads: RoadSegment[];
  initialEvents: TrafficEvent[];
  enableAutoOptimization?: boolean;
  updateInterval?: number;
}

interface UseTrafficSimulationReturn {
  vehicles: Vehicle[];
  intersections: Intersection[];
  roads: RoadSegment[];
  events: TrafficEvent[];
  congestionPredictions: CongestionPrediction[];
  busPriorities: BusPriority[];
  timingReports: TimingReport[];
  isRunning: boolean;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
}

const PHASE_ORDER: Direction[] = ['north', 'east', 'south', 'west'];

export function useTrafficSimulation({
  initialVehicles,
  initialIntersections,
  initialRoads,
  initialEvents,
  enableAutoOptimization = false,
  updateInterval = 100,
}: UseTrafficSimulationOptions): UseTrafficSimulationReturn {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [intersections, setIntersections] = useState<Intersection[]>(initialIntersections);
  const [roads, setRoads] = useState<RoadSegment[]>(initialRoads);
  const [events, setEvents] = useState<TrafficEvent[]>(initialEvents);
  const [congestionPredictions, setCongestionPredictions] = useState<CongestionPrediction[]>([]);
  const [busPriorities, setBusPriorities] = useState<BusPriority[]>([]);
  const [timingReports, setTimingReports] = useState<TimingReport[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());
  const lastEventGenRef = useRef<number>(Date.now());
  const lastFlowUpdateRef = useRef<number>(Date.now());
  const lastOptimizationRef = useRef<number>(Date.now());
  const lastPredictionUpdateRef = useRef<number>(Date.now());
  const simulationStepRef = useRef<number>(0);

  const setRoadsStore = useAppStore(state => state.setRoads);

  const updateVehiclePositions = useCallback((deltaTime: number) => {
    setVehicles(prevVehicles => {
      return prevVehicles.map(vehicle => {
        const speedFactor = deltaTime / 1000;
        const moveDistance = vehicle.speed * speedFactor * 0.1;

        const direction = vehicle.rotation[1];
        const dx = Math.sin(direction) * moveDistance;
        const dz = Math.cos(direction) * moveDistance;

        let newX = vehicle.position[0] + dx;
        let newZ = vehicle.position[2] + dz;

        if (Math.abs(newX) > 45) {
          newX = -Math.sign(newX) * 45;
        }
        if (Math.abs(newZ) > 45) {
          newZ = -Math.sign(newZ) * 45;
        }

        if (Math.random() < 0.02) {
          const newRotation = vehicle.rotation[1] + (Math.random() - 0.5) * Math.PI * 0.5;
          return {
            ...vehicle,
            position: [newX, vehicle.position[1], newZ] as [number, number, number],
            rotation: [vehicle.rotation[0], newRotation, vehicle.rotation[2]] as [number, number, number],
          };
        }

        return {
          ...vehicle,
          position: [newX, vehicle.position[1], newZ] as [number, number, number],
        };
      });
    });
  }, []);

  const updateSignals = useCallback((deltaTime: number) => {
    setIntersections(prevIntersections => {
      return prevIntersections.map(intersection => {
        let remainingTime = intersection.signalTiming.remainingTime - deltaTime / 1000;
        let currentPhase = intersection.signalTiming.currentPhase;

        if (remainingTime <= 0) {
          const currentIndex = PHASE_ORDER.indexOf(currentPhase);
          const nextIndex = (currentIndex + 1) % PHASE_ORDER.length;
          currentPhase = PHASE_ORDER[nextIndex];
          const nextTiming = intersection.signalTiming[currentPhase];
          remainingTime = nextTiming.green;
        }

        return {
          ...intersection,
          signalTiming: {
            ...intersection.signalTiming,
            currentPhase,
            remainingTime: Math.max(0, remainingTime),
          },
        };
      });
    });
  }, []);

  const generateRandomEvent = useCallback(() => {
    const eventTypes: EventType[] = ['congestion', 'accident', 'abnormal_parking'];
    const severities: EventSeverity[] = ['low', 'medium', 'high'];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const randomRoad = roads[Math.floor(Math.random() * roads.length)];
    if (!randomRoad || randomRoad.isClosed) return;

    const t = Math.random();
    const location: [number, number, number] = [
      randomRoad.start[0] + (randomRoad.end[0] - randomRoad.start[0]) * t,
      0,
      randomRoad.start[2] + (randomRoad.end[2] - randomRoad.start[2]) * t,
    ];

    const descriptions: Record<EventType, string> = {
      congestion: `${randomRoad.name}出现拥堵，平均车速下降`,
      accident: `${randomRoad.name}发生交通事故`,
      abnormal_parking: `${randomRoad.name}有车辆异常停靠`,
    };

    const newEvent: TrafficEvent = {
      id: generateId('evt'),
      type,
      location,
      roadId: randomRoad.id,
      severity,
      description: descriptions[type],
      status: 'detected',
      createdAt: new Date(),
    };

    setEvents(prev => [...prev, newEvent]);

    if (type === 'congestion') {
      setRoads(prevRoads => {
        const updatedRoads = prevRoads.map(r =>
          r.id === randomRoad.id
            ? { ...r, congestionIndex: Math.min(1, r.congestionIndex + 0.3), avgSpeed: Math.max(5, r.avgSpeed - 15) }
            : r
        );
        setRoadsStore(updatedRoads);
        return updatedRoads;
      });
    }
  }, [roads, setRoadsStore]);

  const updateFlowData = useCallback(() => {
    setIntersections(prevIntersections => {
      return prevIntersections.map(intersection => {
        const flowVariation = () => Math.floor(Math.random() * 40) - 20;
        return {
          ...intersection,
          trafficFlow: {
            north: Math.max(0, intersection.trafficFlow.north + flowVariation()),
            south: Math.max(0, intersection.trafficFlow.south + flowVariation()),
            east: Math.max(0, intersection.trafficFlow.east + flowVariation()),
            west: Math.max(0, intersection.trafficFlow.west + flowVariation()),
          },
        };
      });
    });
  }, []);

  const updateTrafficData = useCallback((deltaTime: number) => {
    simulationStepRef.current += 1;
    const currentStep = simulationStepRef.current;

    setRoads(prevRoads => {
      const updatedRoads = prevRoads.map(road => {
        const roadMidpoint: [number, number, number] = [
          (road.start[0] + road.end[0]) / 2,
          0,
          (road.start[2] + road.end[2]) / 2,
        ];

        const nearbyEvents = events.filter(event => {
          const dist = calculateDistance(event.location, roadMidpoint);
          return dist < 50;
        }).length;

        const updated = updateRoadCongestion(road, deltaTime, nearbyEvents);

        let newHistory = road.history;
        if (currentStep % 10 === 0) {
          const newPoint: CongestionHistoryPoint = {
            timestamp: Date.now(),
            congestionIndex: updated.congestionIndex,
            flowRate: road.history.length > 0 
              ? road.history[road.history.length - 1].flowRate 
              : 1000,
            avgSpeed: updated.avgSpeed,
          };
          newHistory = [...road.history, newPoint].slice(-100);
        }

        return {
          ...road,
          congestionIndex: updated.congestionIndex,
          avgSpeed: updated.avgSpeed,
          history: newHistory,
        };
      });

      setRoadsStore(updatedRoads);
      return updatedRoads;
    });
  }, [events, setRoadsStore]);

  const optimizeSignalTiming = useCallback(() => {
    if (!enableAutoOptimization) return;

    setIntersections(prevIntersections => {
      const reports: TimingReport[] = [];

      const updated = prevIntersections.map(intersection => {
        if (intersection.congestionIndex < 0.6) return intersection;

        const originalTiming = {
          north: { ...intersection.signalTiming.north },
          south: { ...intersection.signalTiming.south },
          east: { ...intersection.signalTiming.east },
          west: { ...intersection.signalTiming.west },
        };

        const optimizedTiming = calculateOptimalTiming(intersection.trafficFlow);

        reports.push({
          id: generateId('timing'),
          intersectionId: intersection.id,
          intersectionName: intersection.name,
          timestamp: new Date(),
          originalTiming,
          optimizedTiming,
          flowData: { ...intersection.trafficFlow },
          expectedImprovement: intersection.congestionIndex * 15,
        });

        return {
          ...intersection,
          signalTiming: {
            ...intersection.signalTiming,
            north: optimizedTiming.north,
            south: optimizedTiming.south,
            east: optimizedTiming.east,
            west: optimizedTiming.west,
          },
        };
      });

      if (reports.length > 0) {
        setTimingReports(prev => [...prev, ...reports]);
      }

      return updated;
    });
  }, [enableAutoOptimization]);

  const updateCongestionPredictions = useCallback(() => {
    const currentStep = simulationStepRef.current;
    if (currentStep % 30 !== 0) return;

    setRoads(prevRoads => {
      const updatedRoads = prevRoads.map(road => {
        const predictions = predictCongestion(road.history, 60);
        const heatmapIntensity = calculateHeatmapIntensity(predictions, road.congestionIndex);

        return {
          ...road,
          predictions,
          heatmapIntensity,
        };
      });

      setRoadsStore(updatedRoads);

      setCongestionPredictions(
        updatedRoads.map(road => ({
          roadId: road.id,
          roadName: road.name,
          predictions: road.predictions?.map(p => ({
            timestamp: new Date(p.timestamp),
            congestionIndex: p.congestionIndex,
            confidence: p.confidence,
          })) || [],
        }))
      );

      return updatedRoads;
    });
  }, [setRoadsStore]);

  const detectBusPriority = useCallback(() => {
    const buses = vehicles.filter(v => v.type === 'bus');
    const detectedPriorities: BusPriority[] = [];

    for (const bus of buses) {
      for (const intersection of intersections) {
        const dist = calculateDistance(bus.position, intersection.position);
        if (dist < 15) {
          const approaching = dist < 12 && bus.speed > 10;
          detectedPriorities.push({
            busId: bus.id,
            intersectionId: intersection.id,
            approaching,
            extendedTime: approaching ? 10 : 0,
            lane: 1,
          });
        }
      }
    }

    setBusPriorities(detectedPriorities);

    if (enableAutoOptimization) {
      setIntersections(prevIntersections => {
        return prevIntersections.map(intersection => {
          const priority = detectedPriorities.find(
            p => p.intersectionId === intersection.id && p.approaching
          );
          if (priority) {
            const currentPhase = intersection.signalTiming.currentPhase;
            return {
              ...intersection,
              signalTiming: {
                ...intersection.signalTiming,
                [currentPhase]: {
                  ...intersection.signalTiming[currentPhase],
                  green: intersection.signalTiming[currentPhase].green + priority.extendedTime,
                },
                remainingTime: intersection.signalTiming.remainingTime + priority.extendedTime,
              },
            };
          }
          return intersection;
        });
      });
    }
  }, [vehicles, intersections, enableAutoOptimization]);

  const detectAbnormalSpeed = useCallback(() => {
    for (const vehicle of vehicles) {
      if (detectAnomaly(vehicle, roads)) {
        const existingEvent = events.find(
          e => e.roadId && e.location[0] === vehicle.position[0] && e.type === 'abnormal_parking'
        );
        if (!existingEvent && Math.random() < 0.1) {
          const nearestRoad = roads.reduce((nearest, road) => {
            const distToStart = calculateDistance(vehicle.position, road.start);
            const distToEnd = calculateDistance(vehicle.position, road.end);
            const minDist = Math.min(distToStart, distToEnd);
            const nearestDist = Math.min(
              calculateDistance(vehicle.position, nearest.start),
              calculateDistance(vehicle.position, nearest.end)
            );
            return minDist < nearestDist ? road : nearest;
          });

          const newEvent: TrafficEvent = {
            id: generateId('evt'),
            type: 'abnormal_parking',
            location: vehicle.position,
            roadId: nearestRoad.id,
            severity: 'medium',
            description: `车辆 ${vehicle.plateNumber} 异常停车，车速低于10km/h`,
            status: 'detected',
            createdAt: new Date(),
          };

          setEvents(prev => [...prev, newEvent]);
        }
      }
    }
  }, [vehicles, roads, events]);

  const simulationLoop = useCallback(() => {
    if (!isRunning) return;

    const now = Date.now();
    const deltaTime = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    updateVehiclePositions(deltaTime);
    updateSignals(deltaTime);
    updateTrafficData(deltaTime);

    if (now - lastEventGenRef.current > 15000) {
      if (Math.random() < 0.3) {
        generateRandomEvent();
      }
      lastEventGenRef.current = now;
    }

    if (now - lastFlowUpdateRef.current > 5000) {
      updateFlowData();
      lastFlowUpdateRef.current = now;
    }

    if (now - lastOptimizationRef.current > 30000) {
      optimizeSignalTiming();
      lastOptimizationRef.current = now;
    }

    if (now - lastPredictionUpdateRef.current > 10000) {
      updateCongestionPredictions();
      lastPredictionUpdateRef.current = now;
    }

    detectBusPriority();
    detectAbnormalSpeed();

    animationFrameRef.current = requestAnimationFrame(simulationLoop);
  }, [
    isRunning,
    updateVehiclePositions,
    updateSignals,
    updateTrafficData,
    generateRandomEvent,
    updateFlowData,
    optimizeSignalTiming,
    updateCongestionPredictions,
    detectBusPriority,
    detectAbnormalSpeed,
  ]);

  useEffect(() => {
    if (isRunning) {
      lastUpdateRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(simulationLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, simulationLoop]);

  useEffect(() => {
    const initialRoads = roads.map(road => {
      const predictions = predictCongestion(road.history, 60);
      const heatmapIntensity = calculateHeatmapIntensity(predictions, road.congestionIndex);
      return {
        ...road,
        predictions,
        heatmapIntensity,
      };
    });

    setRoads(initialRoads);
    setRoadsStore(initialRoads);

    setCongestionPredictions(
      initialRoads.map(road => ({
        roadId: road.id,
        roadName: road.name,
        predictions: road.predictions?.map(p => ({
          timestamp: new Date(p.timestamp),
          congestionIndex: p.congestionIndex,
          confidence: p.confidence,
        })) || [],
      }))
    );
  }, []);

  const startSimulation = useCallback(() => {
    setIsRunning(true);
  }, []);

  useEffect(() => {
    startSimulation();
  }, [startSimulation]);

  const stopSimulation = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setVehicles(initialVehicles);
    setIntersections(initialIntersections);
    setRoads(initialRoads);
    setRoadsStore(initialRoads);
    setEvents(initialEvents);
    setCongestionPredictions([]);
    setBusPriorities([]);
    setTimingReports([]);
    simulationStepRef.current = 0;
  }, [initialVehicles, initialIntersections, initialRoads, initialEvents, setRoadsStore]);

  return {
    vehicles,
    intersections,
    roads,
    events,
    congestionPredictions,
    busPriorities,
    timingReports,
    isRunning,
    startSimulation,
    stopSimulation,
    resetSimulation,
  };
}

export default useTrafficSimulation;
