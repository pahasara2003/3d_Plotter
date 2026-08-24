export type MainTabType = 'surfaceplot' | 'densityplot' | 'vectorfield' | 'parametric' | 'script';

export type SchemeType = 'cart' | 'sph' | 'cyl';

export type LayerType =
  | 'surface'
  | 'spherical'
  | 'cylindrical'
  | 'field'
  | 'fieldSph'
  | 'fieldCyl'
  | 'param'
  | 'paramSph'
  | 'paramCyl'
  | 'density'
  | 'densitySph'
  | 'densityCyl'
  | 'script';

export interface ParamItem {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  manual: boolean;
}

export interface LayerItem {
  id: number;
  type: LayerType;
  visible: boolean;
  color: string;
  name: string;
  R: number;
  N: number;
  // Surface / Field / Density expressions
  eq?: string;
  // Cartesian Parametric
  px?: string;
  py?: string;
  pz?: string;
  // Spherical Parametric
  pRho?: string;
  pTheta?: string;
  pPhi?: string;
  // Cylindrical Parametric
  pR?: string;
  pThetaC?: string;
  pZ?: string;
  // Density Field Specifics
  colorMap?: string; // 'thermal' | 'turbo' | 'plasma' | 'viridis' | 'magma' | 'coolwarm' | 'custom'
  threshold?: number; // 0 - 1 (min normalized density threshold)
  pointSize?: number; // point/particle diameter
  densityPower?: number; // 0.5 - 3.0 (falloff smoothness)
  coreIso?: number; // 0.0 - 1.0 (solid isosurface core enhancement)
  volumeDensity?: number; // 0.2 - 3.0 (overall volumetric density multiplier)
  showBoundingBox?: boolean; // toggle wireframe bounding domain box
  volumeResolution?: number; // grid resolution (e.g. 40, 48, 64)
  calculatedMin?: number; // real computed min scalar value for colorbar
  calculatedMax?: number; // real computed max scalar value for colorbar
  densityMode?: 'cloud' | 'slices';
  // Script
  script?: string;
}

export interface SceneSettings {
  ambientLight: number; // 0 - 100
  directionalLight: number; // 0 - 200
  surfaceOpacity: number; // 10 - 100
  colorTint: number; // 0 - 80
  showGrid: boolean;
  showAxes: boolean;
  showTicks: boolean; // Coordinate ticks & numbers visibility
  wireframe: boolean;

  // Axis Scaling (Math Axes X, Y, Z)
  scaleX: number; // 0.1 - 3.0
  scaleY: number; // 0.1 - 3.0
  scaleZ: number; // 0.1 - 3.0

  // Axis Min / Max Bounds
  useCustomBounds: boolean;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;

  // Linear vs Logarithmic scale toggles per axis
  logScaleX: boolean;
  logScaleY: boolean;
  logScaleZ: boolean;
}

export interface StatusState {
  message: string;
  isError: boolean;
}
