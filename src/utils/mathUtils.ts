import * as math from 'mathjs';
import katex from 'katex';
import * as THREE from 'three';
import { LayerItem, ParamItem } from '../types';

export const RESERVED_VARS = new Set([
  'x',
  'y',
  'z',
  't',
  'r',
  'theta',
  'phi',
  'rho',
  'pi',
  'e',
  'PI',
  'E',
  'i',
]);

export function toLatex(expr?: string): string {
  if (!expr) return '';
  try {
    const parsed = math.parse(expr);
    return parsed.toTex({ parenthesis: 'auto' });
  } catch {
    return expr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

export function renderKatexToString(tex: string): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode: false,
      strict: false,
    });
  } catch {
    return tex;
  }
}

export function typeLabel(t: string): string {
  const map: Record<string, string> = {
    surface: 'surface',
    spherical: 'spherical',
    cylindrical: 'cylindrical',
    field: 'field',
    fieldSph: 'field·sph',
    fieldCyl: 'field·cyl',
    param: 'param',
    paramSph: 'param·sph',
    paramCyl: 'param·cyl',
    density: 'density 3d',
    densitySph: 'density·sph',
    densityCyl: 'density·cyl',
    shape: 'basic shape',
    script: 'script',
  };
  return map[t] || t;
}

export function buildLatexDisplay(l: LayerItem): string {
  if (l.type === 'surface') return 'z = ' + toLatex(l.eq);
  if (l.type === 'spherical') return '\\rho = ' + toLatex(l.eq);
  if (l.type === 'cylindrical') return 'r = ' + toLatex(l.eq);
  if (l.type === 'field' || l.type === 'fieldSph' || l.type === 'fieldCyl') {
    const raw = l.eq?.trim() || '';
    const m = raw.match(/^\[(.+),(.+),(.+)\]$/);
    const sub = l.type === 'fieldSph' ? '{sph}' : l.type === 'fieldCyl' ? '{cyl}' : '';
    if (m) {
      return `\\vec{F}_${sub}=\\begin{pmatrix}${toLatex(m[1].trim())}\\\\${toLatex(m[2].trim())}\\\\${toLatex(m[3].trim())}\\end{pmatrix}`;
    }
    return toLatex(raw);
  }
  if (l.type === 'param') return `x=${toLatex(l.px)},\\;y=${toLatex(l.py)},\\;z=${toLatex(l.pz)}`;
  if (l.type === 'paramSph') return `\\rho=${toLatex(l.pRho)},\\;\\theta=${toLatex(l.pTheta)},\\;\\phi=${toLatex(l.pPhi)}`;
  if (l.type === 'paramCyl') return `r=${toLatex(l.pR)},\\;\\theta=${toLatex(l.pThetaC)},\\;z=${toLatex(l.pZ)}`;
  if (l.type === 'density') return `V(x,y,z) = ${toLatex(l.eq)}`;
  if (l.type === 'densitySph') return `V(\\rho,\\theta,\\phi) = ${toLatex(l.eq)}`;
  if (l.type === 'densityCyl') return `V(r,\\theta,z) = ${toLatex(l.eq)}`;
  if (l.type === 'shape') {
    const st = l.shapeType || 'sphere';
    const cStr = `(${l.shapeCenterX ?? 0}, ${l.shapeCenterY ?? 0}, ${l.shapeCenterZ ?? 0})`;
    if (st === 'sphere') return `\\text{Sphere: } R=${toLatex(String(l.shapeRadius ?? 2))},\\; \\mathbf{c}=${cStr}`;
    if (st === 'cylinder') return `\\text{Cylinder: } r=${toLatex(String(l.shapeRadius ?? 1.5))},\\; h=${toLatex(String(l.shapeHeight ?? 4))}`;
    if (st === 'cube') return `\\text{Box: } ${toLatex(String(l.shapeWidth ?? 3))}\\times${toLatex(String(l.shapeHeight ?? 3))}\\times${toLatex(String(l.shapeDepth ?? 3))}`;
    if (st === 'cone') return `\\text{Cone: } r=${toLatex(String(l.shapeRadius ?? 2))},\\; h=${toLatex(String(l.shapeHeight ?? 3.5))}`;
    if (st === 'torus') return `\\text{Torus: } R=${toLatex(String(l.shapeRadius ?? 2.5))},\\; r=${toLatex(String(l.shapeRadius2 ?? 0.6))}`;
    if (st === 'plane') return `\\text{Plane: } ${toLatex(String(l.shapeWidth ?? 6))}\\times${toLatex(String(l.shapeHeight ?? 6))}`;
    if (st === 'ellipsoid') return `\\text{Ellipsoid: } (${toLatex(String(l.shapeRadius ?? 2))}, ${toLatex(String(l.shapeRadius2 ?? 1.5))}, ${toLatex(String(l.shapeRadius3 ?? 1))})`;
    return `\\text{Shape: ${st}}`;
  }
  if (l.type === 'script') return '\\texttt{script}';
  return '';
}

export function extractParamNames(expr?: string): Set<string> {
  const found = new Set<string>();
  if (!expr) return found;
  try {
    const node = math.parse(expr);
    node.traverse((n: any) => {
      if (n.type === 'SymbolNode') {
        const name = n.name;
        if (RESERVED_VARS.has(name)) return;
        if (typeof (math as any)[name] === 'function') return;
        found.add(name);
      }
    });
  } catch {
    // Ignore parse errors during typing
  }
  return found;
}

export function getLayerExprs(l: LayerItem): string[] {
  if (
    l.type === 'surface' ||
    l.type === 'spherical' ||
    l.type === 'cylindrical' ||
    l.type === 'density' ||
    l.type === 'densitySph' ||
    l.type === 'densityCyl'
  ) {
    return l.eq ? [l.eq] : [];
  }
  if (l.type === 'field' || l.type === 'fieldSph' || l.type === 'fieldCyl') {
    if (!l.eq) return [];
    const m = l.eq.trim().match(/^\[(.+),(.+),(.+)\]$/);
    return m ? [m[1], m[2], m[3]] : [l.eq];
  }
  if (l.type === 'param') {
    return [l.px || '', l.py || '', l.pz || ''].filter(Boolean);
  }
  if (l.type === 'paramSph') {
    return [l.pRho || '', l.pTheta || '', l.pPhi || ''].filter(Boolean);
  }
  if (l.type === 'paramCyl') {
    return [l.pR || '', l.pThetaC || '', l.pZ || ''].filter(Boolean);
  }
  if (l.type === 'shape') {
    const exprs: string[] = [];
    const pushIfStr = (val?: number | string) => {
      if (typeof val === 'string' && isNaN(Number(val)) && val.trim() !== '') {
        exprs.push(val.trim());
      }
    };
    pushIfStr(l.shapeRadius);
    pushIfStr(l.shapeRadius2);
    pushIfStr(l.shapeRadius3);
    pushIfStr(l.shapeWidth);
    pushIfStr(l.shapeHeight);
    pushIfStr(l.shapeDepth);
    pushIfStr(l.shapeCenterX);
    pushIfStr(l.shapeCenterY);
    pushIfStr(l.shapeCenterZ);
    return exprs;
  }
  return [];
}

export type FastEvalFn = (
  scope: Record<string, number>,
  x?: number,
  y?: number,
  z?: number,
  t?: number,
  theta?: number,
  phi?: number,
  rho?: number,
  r?: number
) => number;

const fastEvalCache = new Map<string, FastEvalFn>();

/**
 * JIT-compiles a math expression string into a high-performance native JavaScript function.
 * Avoids repeated mathjs AST walks and runtime object allocations.
 */
export function getFastEvaluator(expr: string): FastEvalFn {
  const trimmed = (expr || '').trim();
  if (!trimmed) return () => 0;

  const cached = fastEvalCache.get(trimmed);
  if (cached) return cached;

  try {
    const node = math.parse(trimmed);

    const nodeToJs = (n: any): string => {
      if (n.isSymbolNode) {
        const name = n.name;
        if (name === 'pi' || name === 'PI') return 'Math.PI';
        if (name === 'e' || name === 'E') return 'Math.E';
        if (name === 'x') return '(x !== undefined ? x : (scope.x ?? 0))';
        if (name === 'y') return '(y !== undefined ? y : (scope.y ?? 0))';
        if (name === 'z') return '(z !== undefined ? z : (scope.z ?? 0))';
        if (name === 't' || name === 'time') return '(t !== undefined ? t : (scope.t ?? scope.time ?? 0))';
        if (name === 'theta') return '(theta !== undefined ? theta : (scope.theta ?? 0))';
        if (name === 'phi') return '(phi !== undefined ? phi : (scope.phi ?? 0))';
        if (name === 'rho') return '(rho !== undefined ? rho : (scope.rho ?? 0))';
        if (name === 'r') return '(r !== undefined ? r : (scope.r ?? 0))';
        return `(scope['${name}'] ?? 0)`;
      }
      if (n.isConstantNode) {
        return String(n.value);
      }
      if (n.isOperatorNode) {
        if (n.op === '^') {
          return `Math.pow(${nodeToJs(n.args[0])}, ${nodeToJs(n.args[1])})`;
        }
        if (n.isUnary()) {
          return `(${n.op}${nodeToJs(n.args[0])})`;
        }
        return `(${nodeToJs(n.args[0])} ${n.op} ${nodeToJs(n.args[1])})`;
      }
      if (n.isParenthesisNode) {
        return `(${nodeToJs(n.content)})`;
      }
      if (n.isFunctionNode) {
        const fnName = n.name.toLowerCase();
        const argsStr = n.args.map(nodeToJs).join(', ');

        const mathFns = new Set([
          'sin',
          'cos',
          'tan',
          'asin',
          'acos',
          'atan',
          'atan2',
          'sinh',
          'cosh',
          'tanh',
          'asinh',
          'acosh',
          'atanh',
          'sqrt',
          'cbrt',
          'exp',
          'log',
          'log10',
          'log2',
          'abs',
          'floor',
          'ceil',
          'round',
          'min',
          'max',
          'sign',
        ]);
        if (fnName === 'ln') return `Math.log(${argsStr})`;
        if (fnName === 'log') return `Math.log10(${argsStr})`;
        if (mathFns.has(fnName)) {
          return `Math.${fnName}(${argsStr})`;
        }
        if (fnName === 'mod') {
          return `((${nodeToJs(n.args[0])}) % (${nodeToJs(n.args[1])}))`;
        }
        throw new Error('Unsupported function: ' + fnName);
      }
      throw new Error('Unsupported node type: ' + n.type);
    };

    const jsCode = nodeToJs(node);
    const compiledFn = new Function(
      'scope',
      'x',
      'y',
      'z',
      't',
      'theta',
      'phi',
      'rho',
      'r',
      `"use strict";
       try {
         const val = ${jsCode};
         return (typeof val === 'number' && isFinite(val)) ? val : 0;
       } catch {
         return 0;
       }`
    ) as FastEvalFn;

    fastEvalCache.set(trimmed, compiledFn);
    return compiledFn;
  } catch {
    // Graceful fallback to compiled mathjs
    try {
      const compiled = math.compile(trimmed);
      const fallbackFn: FastEvalFn = (scope, x, y, z, t, theta, phi, rho, r) => {
        try {
          const evalScope: any = Object.assign({}, scope);
          if (x !== undefined) evalScope.x = x;
          if (y !== undefined) evalScope.y = y;
          if (z !== undefined) evalScope.z = z;
          if (t !== undefined) {
            evalScope.t = t;
            evalScope.time = t;
          }
          if (theta !== undefined) evalScope.theta = theta;
          if (phi !== undefined) evalScope.phi = phi;
          if (rho !== undefined) evalScope.rho = rho;
          if (r !== undefined) evalScope.r = r;
          const res = compiled.evaluate(evalScope);
          return typeof res === 'number' && isFinite(res) ? res : 0;
        } catch {
          return 0;
        }
      };
      fastEvalCache.set(trimmed, fallbackFn);
      return fallbackFn;
    } catch {
      const zeroFn: FastEvalFn = () => 0;
      fastEvalCache.set(trimmed, zeroFn);
      return zeroFn;
    }
  }
}

/**
 * Evaluates a numeric or string expression against scope with JIT caching
 */
export function evaluateNumericExpr(
  val: number | string | undefined,
  scope: Record<string, number>,
  fallback: number = 0
): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isFinite(val) ? val : fallback;
  const str = String(val).trim();
  if (str === '') return fallback;
  const num = Number(str);
  if (!isNaN(num)) return num;

  const fn = getFastEvaluator(str);
  const res = fn(scope, scope.x, scope.y, scope.z, scope.t);
  return isFinite(res) ? res : fallback;
}

export function buildParamScope(params: Record<string, ParamItem>): Record<string, number> {
  const s: Record<string, number> = {};
  for (const k in params) {
    s[k] = params[k].value;
  }
  return s;
}

/**
 * Transforms coordinate value based on symmetric log scale
 */
export function transformCoord(val: number, isLog: boolean): number {
  if (!isFinite(val)) return 0;
  if (!isLog) return val;
  const sign = val < 0 ? -1 : 1;
  const abs = Math.abs(val);
  // Symmetric logarithmic scale centered at 0
  return sign * (Math.log10(1 + abs * 0.9) / Math.log10(2)) * 1.8;
}

/**
 * Generates an interpolated color from scientific colormaps
 */
export function getColorFromColormap(
  t: number,
  cmap: string = 'turbo',
  baseColor: string = '#6366f1'
): THREE.Color {
  const clampT = Math.max(0, Math.min(1, t));

  if (cmap === 'thermal' || cmap === 'hot' || cmap === 'afmhot') {
    // Thermal / AFMHot / Density: Black -> Red -> Orange -> Yellow -> White
    if (clampT < 0.25) {
      const f = clampT / 0.25;
      return new THREE.Color(0x000000).lerp(new THREE.Color(0xb30d00), f);
    } else if (clampT < 0.55) {
      const f = (clampT - 0.25) / 0.30;
      return new THREE.Color(0xb30d00).lerp(new THREE.Color(0xff8000), f);
    } else if (clampT < 0.85) {
      const f = (clampT - 0.55) / 0.30;
      return new THREE.Color(0xff8000).lerp(new THREE.Color(0xfff233), f);
    } else {
      const f = (clampT - 0.85) / 0.15;
      return new THREE.Color(0xfff233).lerp(new THREE.Color(0xffffff), f);
    }
  }

  if (cmap === 'viridis') {
    // Viridis approx: purple -> blue -> teal -> green -> yellow
    if (clampT < 0.25) {
      const f = clampT / 0.25;
      return new THREE.Color(0x440154).lerp(new THREE.Color(0x3b528b), f);
    } else if (clampT < 0.5) {
      const f = (clampT - 0.25) / 0.25;
      return new THREE.Color(0x3b528b).lerp(new THREE.Color(0x21918c), f);
    } else if (clampT < 0.75) {
      const f = (clampT - 0.5) / 0.25;
      return new THREE.Color(0x21918c).lerp(new THREE.Color(0x5ec962), f);
    } else {
      const f = (clampT - 0.75) / 0.25;
      return new THREE.Color(0x5ec962).lerp(new THREE.Color(0xfde725), f);
    }
  }

  if (cmap === 'plasma') {
    // Plasma: dark purple -> violet -> reddish pink -> orange -> light yellow
    if (clampT < 0.25) {
      const f = clampT / 0.25;
      return new THREE.Color(0x0d0887).lerp(new THREE.Color(0x6a00a8), f);
    } else if (clampT < 0.5) {
      const f = (clampT - 0.25) / 0.25;
      return new THREE.Color(0x6a00a8).lerp(new THREE.Color(0xb12a90), f);
    } else if (clampT < 0.75) {
      const f = (clampT - 0.5) / 0.25;
      return new THREE.Color(0xb12a90).lerp(new THREE.Color(0xe16462), f);
    } else {
      const f = (clampT - 0.75) / 0.25;
      return new THREE.Color(0xe16462).lerp(new THREE.Color(0xf0f921), f);
    }
  }

  if (cmap === 'magma') {
    // Magma: black/purple -> deep red -> bright orange -> pale yellow
    if (clampT < 0.33) {
      const f = clampT / 0.33;
      return new THREE.Color(0x000004).lerp(new THREE.Color(0x51127c), f);
    } else if (clampT < 0.66) {
      const f = (clampT - 0.33) / 0.33;
      return new THREE.Color(0x51127c).lerp(new THREE.Color(0xb73779), f);
    } else {
      const f = (clampT - 0.66) / 0.34;
      return new THREE.Color(0xb73779).lerp(new THREE.Color(0xfcfdbf), f);
    }
  }

  if (cmap === 'coolwarm') {
    // Coolwarm: blue -> white -> red
    if (clampT < 0.5) {
      const f = clampT / 0.5;
      return new THREE.Color(0x3b4cc0).lerp(new THREE.Color(0xdddddd), f);
    } else {
      const f = (clampT - 0.5) / 0.5;
      return new THREE.Color(0xdddddd).lerp(new THREE.Color(0xb40426), f);
    }
  }

  if (cmap === 'custom') {
    const base = new THREE.Color(baseColor);
    if (clampT < 0.5) {
      return new THREE.Color(0x101018).lerp(base, clampT * 2);
    } else {
      return base.clone().lerp(new THREE.Color(0xffffff), (clampT - 0.5) * 1.5);
    }
  }

  // Default 'turbo': deep blue -> cyan -> green -> yellow -> red
  if (clampT < 0.2) {
    return new THREE.Color(0x30123b).lerp(new THREE.Color(0x4662d8), clampT / 0.2);
  } else if (clampT < 0.4) {
    return new THREE.Color(0x4662d8).lerp(new THREE.Color(0x1ae4b6), (clampT - 0.2) / 0.2);
  } else if (clampT < 0.6) {
    return new THREE.Color(0x1ae4b6).lerp(new THREE.Color(0xa2fc3c), (clampT - 0.4) / 0.2);
  } else if (clampT < 0.8) {
    return new THREE.Color(0xa2fc3c).lerp(new THREE.Color(0xfb8022), (clampT - 0.6) / 0.2);
  } else {
    return new THREE.Color(0xfb8022).lerp(new THREE.Color(0x7a0403), (clampT - 0.8) / 0.2);
  }
}
