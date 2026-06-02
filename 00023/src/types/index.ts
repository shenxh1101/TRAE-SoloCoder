export type BodyColor = 'red' | 'brown' | 'gray';
export type SpireType = 'sharp' | 'round' | 'pearl';

export interface PagodaConfig {
  floors: number;
  roofAngle: number;
  bodyColor: BodyColor;
  spireType: SpireType;
  sunPosition: { x: number; y: number; z: number };
  shadowsEnabled: boolean;
  gridHelper: boolean;
  firefliesEnabled: boolean;
}

export const defaultConfig: PagodaConfig = {
  floors: 5,
  roofAngle: 15,
  bodyColor: 'red',
  spireType: 'sharp',
  sunPosition: { x: 50, y: 50, z: 30 },
  shadowsEnabled: true,
  gridHelper: false,
  firefliesEnabled: true,
};

export const colorMap: Record<BodyColor, string> = {
  red: '#8B0000',
  brown: '#5D4037',
  gray: '#455A64',
};

export const roofColor: string = '#1a1a2e';
