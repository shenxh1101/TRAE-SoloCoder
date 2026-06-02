export type PartType = 'cube' | 'cylinder' | 'sphere' | 'gear';

export interface PartState {
  id: string;
  type: PartType;
  position: [number, number, number];
  rotation: [number, number, number];
  isOnBelt: boolean;
  isBeingCarried: boolean;
  carrierArmId: string | null;
  isAssembled: boolean;
  beltProgress: number;
}

export const PART_TYPES: PartType[] = ['cube', 'cylinder', 'sphere', 'gear'];

export const PART_COLORS: Record<PartType, string> = {
  cube: '#00d4ff',
  cylinder: '#ff6b9d',
  sphere: '#a855f7',
  gear: '#22c55e',
};

export interface AssemblySlot {
  id: string;
  position: [number, number, number];
  occupied: boolean;
  partId: string | null;
}

export const INITIAL_ASSEMBLY_SLOTS: AssemblySlot[] = [
  { id: 'slot-1', position: [6, 0.5, -2], occupied: false, partId: null },
  { id: 'slot-2', position: [6, 0.5, 0], occupied: false, partId: null },
  { id: 'slot-3', position: [6, 0.5, 2], occupied: false, partId: null },
];
