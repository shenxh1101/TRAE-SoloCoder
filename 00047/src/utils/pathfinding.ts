import type { RoadSegment, Intersection } from '../types';
import { calculateDistance } from './trafficUtils';

interface GraphNode {
  id: string;
  position: [number, number, number];
  connections: string[];
}

interface AStarNode {
  id: string;
  position: [number, number, number];
  g: number;
  h: number;
  f: number;
  parent: string | null;
  roadId?: string;
}

function heuristic(
  current: [number, number, number],
  goal: [number, number, number]
): number {
  return calculateDistance(current, goal);
}

function buildGraph(
  roads: RoadSegment[],
  intersections: Intersection[]
): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();

  intersections.forEach(intersection => {
    graph.set(intersection.id, {
      id: intersection.id,
      position: intersection.position,
      connections: [],
    });
  });

  roads.forEach(road => {
    if (road.isClosed) return;

    const startIntersection = intersections.find(
      i =>
        calculateDistance(i.position, road.start) < 5 ||
        calculateDistance(i.position, road.end) < 5
    );

    const endIntersection = intersections.find(
      i =>
        calculateDistance(i.position, road.start) < 5 ||
        calculateDistance(i.position, road.end) < 5
    );

    if (startIntersection && endIntersection && startIntersection.id !== endIntersection.id) {
      const startNode = graph.get(startIntersection.id);
      const endNode = graph.get(endIntersection.id);

      if (startNode && !startNode.connections.includes(endIntersection.id)) {
        startNode.connections.push(endIntersection.id);
      }
      if (endNode && !endNode.connections.includes(startIntersection.id)) {
        endNode.connections.push(startIntersection.id);
      }
    }
  });

  return graph;
}

function getRoadWeight(
  start: [number, number, number],
  end: [number, number, number],
  roads: RoadSegment[]
): { weight: number; roadId?: string } {
  let minDistance = Infinity;
  let matchedRoad: RoadSegment | undefined;

  for (const road of roads) {
    if (road.isClosed) continue;

    const distToStart = calculateDistance(road.start, start) + calculateDistance(road.end, end);
    const distToEnd = calculateDistance(road.end, start) + calculateDistance(road.start, end);
    const totalDist = Math.min(distToStart, distToEnd);

    if (totalDist < minDistance) {
      minDistance = totalDist;
      matchedRoad = road;
    }
  }

  const segmentDistance = calculateDistance(start, end);
  const congestionFactor = matchedRoad ? matchedRoad.congestionIndex * 2 : 0;
  const weight = segmentDistance * (1 + congestionFactor);

  return { weight, roadId: matchedRoad?.id };
}

function findNearestIntersection(
  point: [number, number, number],
  intersections: Intersection[]
): Intersection | null {
  if (intersections.length === 0) return null;

  let nearest = intersections[0];
  let minDist = calculateDistance(point, nearest.position);

  for (const intersection of intersections) {
    const dist = calculateDistance(point, intersection.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = intersection;
    }
  }

  return nearest;
}

function reconstructPath(
  closedSet: Map<string, AStarNode>,
  endNodeId: string,
  startPoint: [number, number, number],
  endPoint: [number, number, number]
): [number, number, number][] {
  const path: [number, number, number][] = [];
  let currentId: string | null = endNodeId;

  while (currentId) {
    const node = closedSet.get(currentId);
    if (node) {
      path.unshift(node.position);
    }
    currentId = node?.parent ?? null;
  }

  if (path.length > 0) {
    if (calculateDistance(startPoint, path[0]) > 1) {
      path.unshift(startPoint);
    }
    if (calculateDistance(endPoint, path[path.length - 1]) > 1) {
      path.push(endPoint);
    }
  }

  return path;
}

export function findOptimalRoute(
  start: [number, number, number],
  end: [number, number, number],
  roads: RoadSegment[],
  intersections: Intersection[]
): [number, number, number][] {
  if (intersections.length === 0) {
    return [start, end];
  }

  const startIntersection = findNearestIntersection(start, intersections);
  const endIntersection = findNearestIntersection(end, intersections);

  if (!startIntersection || !endIntersection) {
    return [start, end];
  }

  if (startIntersection.id === endIntersection.id) {
    return [start, end];
  }

  const graph = buildGraph(roads, intersections);

  const openSet = new Map<string, AStarNode>();
  const closedSet = new Map<string, AStarNode>();

  const startNode: AStarNode = {
    id: startIntersection.id,
    position: startIntersection.position,
    g: 0,
    h: heuristic(startIntersection.position, endIntersection.position),
    f: heuristic(startIntersection.position, endIntersection.position),
    parent: null,
  };

  openSet.set(startNode.id, startNode);

  const maxIterations = 1000;
  let iterations = 0;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    let currentNode: AStarNode | undefined;
    let minF = Infinity;

    for (const node of openSet.values()) {
      if (node.f < minF) {
        minF = node.f;
        currentNode = node;
      }
    }

    if (!currentNode) break;

    if (currentNode.id === endIntersection.id) {
      closedSet.set(currentNode.id, currentNode);
      return reconstructPath(closedSet, currentNode.id, start, end);
    }

    openSet.delete(currentNode.id);
    closedSet.set(currentNode.id, currentNode);

    const graphNode = graph.get(currentNode.id);
    if (!graphNode) continue;

    for (const neighborId of graphNode.connections) {
      if (closedSet.has(neighborId)) continue;

      const neighborIntersection = intersections.find(i => i.id === neighborId);
      if (!neighborIntersection) continue;

      const { weight } = getRoadWeight(
        currentNode.position,
        neighborIntersection.position,
        roads
      );

      const tentativeG = currentNode.g + weight;

      const existingNode = openSet.get(neighborId);

      if (!existingNode || tentativeG < existingNode.g) {
        const h = heuristic(neighborIntersection.position, endIntersection.position);
        const newNode: AStarNode = {
          id: neighborId,
          position: neighborIntersection.position,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: currentNode.id,
        };
        openSet.set(neighborId, newNode);
      }
    }
  }

  return [start, end];
}
