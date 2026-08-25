export type ViewModeType = 'plot' | 'split' | 'script';

export type MainTabType =
  | 'surfaceplot'
  | 'densityplot'
  | 'vectorfield'
  | 'parametric'
  | 'shapes'
  | 'script';

export type SchemeType = 'cart' | 'sph' | 'cyl';

export type ShapeType =
  | 'sphere'
  | 'cylinder'
  | 'cube'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'ellipsoid';

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
  | 'shape'
  | 'script';

export interface ParamItem {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  manual: boolean;
}

export interface TimeState {
  time: number;
  isPlaying: boolean;
  speed: number;
  min: number;
  max: number;
  step: number;
  loopMode: 'loop' | 'pingpong' | 'once';
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
  // Basic Shapes Specifics
  shapeType?: ShapeType;
  shapeRadius?: number | string; // e.g. 2 or "1.5 + 0.5*sin(t)"
  shapeRadius2?: number | string; // torus tube radius or ellipsoid b
  shapeRadius3?: number | string; // ellipsoid c
  shapeWidth?: number | string; // cube/plane width
  shapeHeight?: number | string; // cylinder/cone/cube/plane height
  shapeDepth?: number | string; // cube depth
  shapeCenterX?: number | string; // center x e.g. 0 or "3*cos(t)"
  shapeCenterY?: number | string; // center y e.g. 0 or "3*sin(t)"
  shapeCenterZ?: number | string; // center z
  shapeCoordSystem?: SchemeType; // coordinate system for center coordinates: 'cart' | 'sph' | 'cyl'
  shapeAxis?: 'x' | 'y' | 'z'; // alignment axis for cylinder/cone/torus/plane
  shapeSegments?: number;
  shapeWireframe?: boolean;
  shapeOpacity?: number; // 0 - 100
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
  // Vector Field Specifics (Field lines / Streamlines with arrowheads)
  fieldDisplay?: 'vectors' | 'fieldlines' | 'both';
  streamlineCount?: number; // 12 - 64 seed lines
  showArrowHeads?: boolean; // arrowheads along field lines
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
