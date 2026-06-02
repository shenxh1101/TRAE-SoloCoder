import * as THREE from 'three';
import type { GeometryType } from '../types';

export const getGeometry = (type: GeometryType, size: number): THREE.BufferGeometry => {
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(size, 32, 32);
    case 'octahedron':
      return new THREE.OctahedronGeometry(size, 0);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(size, 0);
    case 'torus':
      return new THREE.TorusGeometry(size, size * 0.4, 16, 48);
    default:
      return new THREE.SphereGeometry(size, 32, 32);
  }
};

export const getOrbitPosition = (
  radius: number,
  ellipticity: number,
  tilt: number,
  phase: number,
  time: number
): THREE.Vector3 => {
  const a = radius;
  const b = radius * (1 - ellipticity);
  const angle = time + phase;

  const x = a * Math.cos(angle);
  const z = b * Math.sin(angle);
  const y = Math.sin(angle * 0.5) * radius * 0.3;

  const position = new THREE.Vector3(x, y, z);
  position.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
  position.applyAxisAngle(new THREE.Vector3(0, 1, 0), tilt * 0.5);

  return position;
};

export const randomGeometryType = (): GeometryType => {
  const types: GeometryType[] = ['sphere', 'octahedron', 'icosahedron', 'torus'];
  return types[Math.floor(Math.random() * types.length)];
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};
