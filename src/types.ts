export type MainTabType = 'surfaceplot' | 'vectorfield' | 'parametric' | 'script';

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
  // Surface / Field expressions
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
  wireframe: boolean;
}

export interface StatusState {
  message: string;
  isError: boolean;
}
