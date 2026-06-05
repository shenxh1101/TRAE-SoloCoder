import type { FloorMap, Position3D } from '../types';
import { gridToWorld, isWalkable } from './floorMap';

interface GridPoint {
  x: number;
  y: number;
}

interface PathNode extends GridPoint {
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

const DIRECTIONS = [
  { dx: 0, dy: -1, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: -1, cost: Math.SQRT2 },
  { dx: 1, dy: -1, cost: Math.SQRT2 },
  { dx: -1, dy: 1, cost: Math.SQRT2 },
  { dx: 1, dy: 1, cost: Math.SQRT2 },
];

export function manhattanDistance(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function euclideanDistance(a: GridPoint, b: GridPoint): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function heuristic(a: GridPoint, b: GridPoint): number {
  return manhattanDistance(a, b);
}

function createNode(x: number, y: number, g: number, h: number, parent: PathNode | null): PathNode {
  return {
    x,
    y,
    g,
    h,
    f: g + h,
    parent,
  };
}

function nodeKey(node: GridPoint): string {
  return `${node.x},${node.y}`;
}

function getLowestFNode(openSet: Map<string, PathNode>): PathNode | null {
  let lowest: PathNode | null = null;
  for (const node of openSet.values()) {
    if (lowest === null || node.f < lowest.f) {
      lowest = node;
    }
  }
  return lowest;
}

function reconstructPath(endNode: PathNode): GridPoint[] {
  const path: GridPoint[] = [];
  let current: PathNode | null = endNode;
  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  return path;
}

function canDiagonalMove(x: number, y: number, dx: number, dy: number, floorMap: FloorMap): boolean {
  const horizontalOk = isWalkable(x + dx, y);
  const verticalOk = isWalkable(x, y + dy);
  return horizontalOk && verticalOk;
}

export function findPath(
  startGrid: GridPoint,
  endGrid: GridPoint,
  floorMap: FloorMap
): Position3D[] {
  if (!isWalkable(startGrid.x, startGrid.y)) {
    console.warn(`Start point (${startGrid.x}, ${startGrid.y}) is not walkable`);
    return [];
  }

  if (!isWalkable(endGrid.x, endGrid.y)) {
    console.warn(`End point (${endGrid.x}, ${endGrid.y}) is not walkable`);
    return [];
  }

  if (startGrid.x === endGrid.x && startGrid.y === endGrid.y) {
    return [gridToWorld(startGrid.x, startGrid.y)];
  }

  const openSet = new Map<string, PathNode>();
  const closedSet = new Set<string>();

  const startH = heuristic(startGrid, endGrid);
  const startNode = createNode(startGrid.x, startGrid.y, 0, startH, null);
  openSet.set(nodeKey(startNode), startNode);

  while (openSet.size > 0) {
    const current = getLowestFNode(openSet);
    if (current === null) {
      break;
    }

    const currentKey = nodeKey(current);
    openSet.delete(currentKey);
    closedSet.add(currentKey);

    if (current.x === endGrid.x && current.y === endGrid.y) {
      const gridPath = reconstructPath(current);
      return gridPathToWorldPath(gridPath);
    }

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= floorMap.width || ny < 0 || ny >= floorMap.height) {
        continue;
      }

      const neighborKey = nodeKey({ x: nx, y: ny });
      if (closedSet.has(neighborKey)) {
        continue;
      }

      if (!isWalkable(nx, ny)) {
        continue;
      }

      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!canDiagonalMove(current.x, current.y, dir.dx, dir.dy, floorMap)) {
          continue;
        }
      }

      const tentativeG = current.g + dir.cost;
      const neighborH = heuristic({ x: nx, y: ny }, endGrid);

      const existingNode = openSet.get(neighborKey);
      if (existingNode === undefined) {
        const newNode = createNode(nx, ny, tentativeG, neighborH, current);
        openSet.set(neighborKey, newNode);
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = tentativeG + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  console.warn(`No path found from (${startGrid.x}, ${startGrid.y}) to (${endGrid.x}, ${endGrid.y})`);
  return [];
}

export function gridPathToWorldPath(gridPath: GridPoint[]): Position3D[] {
  return gridPath.map((point) => gridToWorld(point.x, point.y));
}

export function smoothPath(path: Position3D[]): Position3D[] {
  if (path.length <= 2) {
    return path;
  }

  const smoothed: Position3D[] = [path[0]];
  let lastIndex = 0;

  for (let i = 2; i < path.length; i++) {
    const p0 = path[lastIndex];
    const p1 = path[i];

    if (!isLineOfSightClear(p0, p1)) {
      smoothed.push(path[i - 1]);
      lastIndex = i - 1;
    }
  }

  smoothed.push(path[path.length - 1]);
  return smoothed;
}

function isLineOfSightClear(p1: Position3D, p2: Position3D): boolean {
  const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.z - p1.z)) * 2;
  if (steps === 0) return true;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1.x + (p2.x - p1.x) * t;
    const z = p1.z + (p2.z - p1.z) * t;

    const gridX = Math.floor(x);
    const gridY = Math.floor(z);

    if (!isWalkable(gridX, gridY)) {
      return false;
    }
  }

  return true;
}

export function calculatePathLength(path: Position3D[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dz = path[i].z - path[i - 1].z;
    length += Math.sqrt(dx * dx + dz * dz);
  }
  return length;
}

export function estimateTravelTime(pathLength: number, speed: number = 1.5): number {
  return pathLength / speed;
}
