import type { FloorMap, GridCell, Position3D } from '../types';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const CELL_SCALE = 1;
const MAP_ORIGIN: Position3D = { x: -10, y: 0, z: -10 };

export const BLOOD_BANK_START: Position3D = { x: -6, y: 0, z: 0 };
export const CROSSMATCH_STATION: Position3D = { x: 0, y: 0, z: 0 };
export const NURSE_STATION: Position3D = { x: 6, y: 0, z: 5 };

export const WARD_POSITIONS: Record<string, Position3D> = {
  'ward_101': { x: 8, y: 0, z: -6 },
  'ward_102': { x: 8, y: 0, z: -3 },
  'ward_103': { x: 8, y: 0, z: 0 },
  'ward_104': { x: 8, y: 0, z: 3 },
  'ward_105': { x: 8, y: 0, z: 6 },
  'ward_201': { x: 5, y: 0, z: -6 },
  'ward_202': { x: 5, y: 0, z: -3 },
  'ward_203': { x: 5, y: 0, z: 3 },
  'ward_204': { x: 5, y: 0, z: 6 },
};

function createEmptyGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = {
        x,
        y,
        walkable: true,
        type: 'floor',
      };
    }
  }
  return grid;
}

function setArea(
  grid: GridCell[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: GridCell['type'],
  walkable: boolean,
  label?: string
): void {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        grid[y][x] = { x, y, walkable, type, label };
      }
    }
  }
}

function setCell(
  grid: GridCell[][],
  x: number,
  y: number,
  type: GridCell['type'],
  walkable: boolean,
  label?: string
): void {
  if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
    grid[y][x] = { x, y, walkable, type, label };
  }
}

function buildHospitalLayout(): GridCell[][] {
  const grid = createEmptyGrid();

  setArea(grid, 0, 0, 4, 6, 'blood_bank', true, '血库');
  setArea(grid, 0, 0, 0, 6, 'wall', false);
  setArea(grid, 0, 0, 4, 0, 'wall', false);
  setCell(grid, 4, 3, 'door', true, '血库入口');

  setArea(grid, 5, 0, 14, 19, 'corridor', true, '走廊');

  setArea(grid, 8, 8, 11, 11, 'wall', false);
  setArea(grid, 9, 9, 10, 10, 'floor', true, '配血台');
  setCell(grid, 8, 9, 'door', true, '配血台入口');
  setCell(grid, 11, 10, 'door', true, '配血台出口');

  setArea(grid, 15, 15, 19, 19, 'nurse_station', true, '护士站');
  setArea(grid, 15, 15, 15, 19, 'wall', false);
  setArea(grid, 15, 19, 19, 19, 'wall', false);
  setCell(grid, 15, 17, 'door', true, '护士站入口');

  const wards = [
    { x1: 15, y1: 1, x2: 19, y2: 3, label: '101病房' },
    { x1: 15, y1: 5, x2: 19, y2: 7, label: '102病房' },
    { x1: 15, y1: 9, x2: 19, y2: 11, label: '103病房' },
    { x1: 15, y1: 13, x2: 19, y2: 13, label: '104病房' },
    { x1: 17, y1: 13, x2: 19, y2: 13, label: '105病房' },
    { x1: 12, y1: 1, x2: 14, y2: 3, label: '201病房' },
    { x1: 12, y1: 5, x2: 14, y2: 7, label: '202病房' },
    { x1: 12, y1: 9, x2: 14, y2: 11, label: '203病房' },
    { x1: 12, y1: 13, x2: 14, y2: 13, label: '204病房' },
  ];

  wards.forEach((ward, index) => {
    setArea(grid, ward.x1, ward.y1, ward.x2, ward.y2, 'ward', true, ward.label);
    setArea(grid, ward.x1, ward.y1, ward.x1, ward.y2, 'wall', false);
    const midY = Math.floor((ward.y1 + ward.y2) / 2);
    setCell(grid, ward.x1, midY, 'door', true, `${ward.label}门`);
  });

  setArea(grid, 0, 8, 4, 8, 'wall', false);
  setArea(grid, 0, 12, 4, 19, 'wall', false);

  return grid;
}

export const floorMap: FloorMap = {
  width: GRID_WIDTH,
  height: GRID_HEIGHT,
  grid: buildHospitalLayout(),
  scale: CELL_SCALE,
  origin: MAP_ORIGIN,
};

export function gridToWorld(gridX: number, gridY: number): Position3D {
  return {
    x: MAP_ORIGIN.x + gridX * CELL_SCALE,
    y: 0,
    z: MAP_ORIGIN.z + gridY * CELL_SCALE,
  };
}

export function worldToGrid(worldX: number, worldZ: number): { x: number; y: number } {
  return {
    x: Math.round((worldX - MAP_ORIGIN.x) / CELL_SCALE),
    y: Math.round((worldZ - MAP_ORIGIN.z) / CELL_SCALE),
  };
}

export function getCell(gridX: number, gridY: number): GridCell | null {
  if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
    return null;
  }
  return floorMap.grid[gridY][gridX];
}

export function isWalkable(gridX: number, gridY: number): boolean {
  const cell = getCell(gridX, gridY);
  return cell !== null && cell.walkable;
}
