export type GeometryType = 'sphere' | 'octahedron' | 'icosahedron' | 'torus';

export interface Fragment {
  id: string;
  geometryType: GeometryType;
  size: number;
  orbitRadius: number;
  orbitEllipticity: number;
  orbitTilt: number;
  orbitPhase: number;
  rotationSpeed: number;
  imageData: string;
  imageName: string;
}

export interface SceneConfig {
  lucidity: number;
  fragmentCount: number;
  fragments: Fragment[];
}
