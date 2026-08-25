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

/**
 * Helper to extract balanced content between matching braces starting at pos.
 */
function extractBalancedBraces(
  str: string,
  openChar = '{',
  closeChar = '}'
): { content: string; endIndex: number } | null {
  const start = str.indexOf(openChar);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === openChar) depth++;
    else if (str[i] === closeChar) {
      depth--;
      if (depth === 0) {
        return { content: str.substring(start + 1, i), endIndex: i };
      }
    }
  }
  return null;
}

/**
 * Converts a LaTeX mathematical string (e.g. from MathLive) into standard infix math syntax for math.js and fast evaluators.
 */
export function latexToInfix(latex: string): string {
  if (!latex) return '';
  let s = latex.trim();

  // If already plain ASCII without LaTeX commands or braces, return directly
  if (!s.includes('\\') && !s.includes('{') && !s.includes('}')) {
    // Add implicit multiplication for cases like 2x -> 2*x
    return s.replace(/(\d)\s*([a-zA-Z(])/g, '$1 * $2').replace(/(\))\s*([a-zA-Z0-9(])/g, '$1 * $2');
  }

  // Replace explicit multiplication commands early
  s = s.replace(/\\cdot\b/g, ' * ');
  s = s.replace(/\\times\b/g, ' * ');
  s = s.replace(/\\ast\b/g, ' * ');

  // Handle absolute values: \left| ... \right| and |...|
  s = s.replace(/\\left\|\s*([^|\n]+?)\s*\\right\|/g, 'abs($1)');
  s = s.replace(/\|([^|\n]+?)\|/g, 'abs($1)');

  // Handle trig/function powers like \cos^2(x) or \sin^{2}(\theta)
  s = s.replace(
    /\\(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|asin|acos|atan|exp|ln|log)\^\{?(\d+)\}?\s*(\([^)]+\)|[a-zA-Z0-9])/g,
    '($1($3))^$2'
  );

  // Remove spacing commands
  s = s.replace(/\\left/g, '');
  s = s.replace(/\\right/g, '');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\:/g, ' ');
  s = s.replace(/\\;/g, ' ');
  s = s.replace(/\\!/g, ' ');
  s = s.replace(/\\quad/g, ' ');
  s = s.replace(/\\qquad/g, ' ');

  // Remove \operatorname{...}, \mathrm{...}, \text{...}
  s = s.replace(/\\(?:operatorname|mathrm|text)\{([^}]+)\}/g, '$1');

  // Replace fractions: \frac{num}{den} or \dfrac{num}{den}
  while (s.includes('\\frac') || s.includes('\\dfrac')) {
    const idx = s.search(/\\d?frac/);
    const sub = s.substring(idx);
    const numMatch = extractBalancedBraces(sub, '{', '}');
    if (!numMatch) break;
    const afterNum = sub.substring(numMatch.endIndex + 1);
    const denMatch = extractBalancedBraces(afterNum, '{', '}');
    if (!denMatch) break;

    const numInfix = latexToInfix(numMatch.content);
    const denInfix = latexToInfix(denMatch.content);
    s = s.substring(0, idx) + `((${numInfix}) / (${denInfix}))` + afterNum.substring(denMatch.endIndex + 1);
  }

  // Replace roots: \sqrt[n]{x} and \sqrt{x}
  while (s.includes('\\sqrt')) {
    const idx = s.indexOf('\\sqrt');
    const sub = s.substring(idx);
    if (sub.startsWith('\\sqrt[')) {
      const degMatch = extractBalancedBraces(sub, '[', ']');
      if (degMatch) {
        const afterDeg = sub.substring(degMatch.endIndex + 1);
        const radMatch = extractBalancedBraces(afterDeg, '{', '}');
        if (radMatch) {
          const degInfix = latexToInfix(degMatch.content);
          const radInfix = latexToInfix(radMatch.content);
          s = s.substring(0, idx) + `((${radInfix}) ^ (1 / (${degInfix})))` + afterDeg.substring(radMatch.endIndex + 1);
          continue;
        }
      }
    }

    const radMatch = extractBalancedBraces(sub, '{', '}');
    if (radMatch) {
      const radInfix = latexToInfix(radMatch.content);
      s = s.substring(0, idx) + `sqrt(${radInfix})` + sub.substring(radMatch.endIndex + 1);
    } else {
      s = s.replace(/\\sqrt\s*([a-zA-Z0-9])/g, 'sqrt($1)');
      break;
    }
  }

  // Replace powers: ^{...} -> ^(...)
  while (s.includes('^{')) {
    const idx = s.indexOf('^{');
    const sub = s.substring(idx + 1);
    const pMatch = extractBalancedBraces(sub, '{', '}');
    if (!pMatch) break;
    const pInfix = latexToInfix(pMatch.content);
    s = s.substring(0, idx) + `^(${pInfix})` + sub.substring(pMatch.endIndex + 1);
  }

  // Replace subscripts: _{...} -> _(...)
  while (s.includes('_{')) {
    const idx = s.indexOf('_{');
    const sub = s.substring(idx + 1);
    const subMatch = extractBalancedBraces(sub, '{', '}');
    if (!subMatch) break;
    const subInfix = latexToInfix(subMatch.content);
    s = s.substring(0, idx) + `_${subInfix}` + sub.substring(subMatch.endIndex + 1);
  }

  // Common math symbols and constants
  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/\\theta\b/g, 'theta');
  s = s.replace(/\\phi\b/g, 'phi');
  s = s.replace(/\\rho\b/g, 'rho');
  s = s.replace(/\\alpha\b/g, 'alpha');
  s = s.replace(/\\beta\b/g, 'beta');
  s = s.replace(/\\gamma\b/g, 'gamma');
  s = s.replace(/\\delta\b/g, 'delta');
  s = s.replace(/\\omega\b/g, 'omega');
  s = s.replace(/\\sigma\b/g, 'sigma');
  s = s.replace(/\\lambda\b/g, 'lambda');
  s = s.replace(/\\mu\b/g, 'mu');

  // Standard trig and math functions
  s = s.replace(/\\sin\b/g, 'sin');
  s = s.replace(/\\cos\b/g, 'cos');
  s = s.replace(/\\tan\b/g, 'tan');
  s = s.replace(/\\sec\b/g, 'sec');
  s = s.replace(/\\csc\b/g, 'csc');
  s = s.replace(/\\cot\b/g, 'cot');
  s = s.replace(/\\sinh\b/g, 'sinh');
  s = s.replace(/\\cosh\b/g, 'cosh');
  s = s.replace(/\\tanh\b/g, 'tanh');
  s = s.replace(/\\arcsin\b/g, 'asin');
  s = s.replace(/\\arccos\b/g, 'acos');
  s = s.replace(/\\arctan\b/g, 'atan');
  s = s.replace(/\\asin\b/g, 'asin');
  s = s.replace(/\\acos\b/g, 'acos');
  s = s.replace(/\\atan\b/g, 'atan');
  s = s.replace(/\\exp\b/g, 'exp');
  s = s.replace(/\\ln\b/g, 'log');
  s = s.replace(/\\log\b/g, 'log10');
  s = s.replace(/\\abs\b/g, 'abs');

  // Strip remaining backslashes before identifiers
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  // Clean up braces into parentheses
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');

  // Implicit multiplication: 2x -> 2*x, 2( -> 2*(, )x -> )*x, )( -> )*(
  s = s.replace(/(\d)\s*([a-zA-Z(])/g, '$1 * $2');
  s = s.replace(/(\))\s*([a-zA-Z0-9(])/g, '$1 * $2');

  const KNOWN_FUNCS = new Set([
    'sin',
    'cos',
    'tan',
    'sec',
    'csc',
    'cot',
    'sinh',
    'cosh',
    'tanh',
    'asin',
    'acos',
    'atan',
    'exp',
    'log',
    'log10',
    'sqrt',
    'abs',
    'round',
    'floor',
    'ceil',
    'min',
    'max',
  ]);

  // Insert multiplication between variable and '(' if not a known math function
  s = s.replace(/\b([a-zA-Z]+)\s*\(/g, (match, fn) => {
    if (KNOWN_FUNCS.has(fn.toLowerCase())) return match;
    return `${fn} * (`;
  });

  // Convert adjacent single-letter math variables (xy -> x * y, yz -> y * z, etc.)
  s = s.replace(/\b([xyzuv])([xyzuv])\b/g, '$1 * $2');
  s = s.replace(/\b([xyzuv])([xyzuv])([xyzuv])\b/g, '$1 * $2 * $3');

  return s.trim();
}

export function toLatex(expr?: string): string {
  if (!expr) return '';
  // If already contains LaTeX commands, return directly
  if (expr.includes('\\') || expr.includes('{')) {
    return expr;
  }
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
    const coordSystem = l.shapeCoordSystem || 'cart';
    let cLabel = '\\mathbf{c}';
    if (coordSystem === 'sph') cLabel = '\\mathbf{c}_{\\text{sph}}';
    else if (coordSystem === 'cyl') cLabel = '\\mathbf{c}_{\\text{cyl}}';
    const cStr = `${cLabel}=(${toLatex(String(l.shapeCenterX ?? 0))}, ${toLatex(String(l.shapeCenterY ?? 0))}, ${toLatex(String(l.shapeCenterZ ?? 0))})`;
    
    if (st === 'sphere') return `\\text{Sphere: } R=${toLatex(String(l.shapeRadius ?? 2))},\\; ${cStr}`;
    if (st === 'cylinder') return `\\text{Cylinder: } r=${toLatex(String(l.shapeRadius ?? 1.5))},\\; h=${toLatex(String(l.shapeHeight ?? 4))},\\; ${cStr}`;
    if (st === 'cube') return `\\text{Box: } ${toLatex(String(l.shapeWidth ?? 3))}\\times${toLatex(String(l.shapeHeight ?? 3))}\\times${toLatex(String(l.shapeDepth ?? 3))},\\; ${cStr}`;
    if (st === 'cone') return `\\text{Cone: } r=${toLatex(String(l.shapeRadius ?? 2))},\\; h=${toLatex(String(l.shapeHeight ?? 3.5))},\\; ${cStr}`;
    if (st === 'torus') return `\\text{Torus: } R=${toLatex(String(l.shapeRadius ?? 2.5))},\\; r=${toLatex(String(l.shapeRadius2 ?? 0.6))},\\; ${cStr}`;
    if (st === 'plane') return `\\text{Plane: } ${toLatex(String(l.shapeWidth ?? 6))}\\times${toLatex(String(l.shapeHeight ?? 6))},\\; ${cStr}`;
    if (st === 'ellipsoid') return `\\text{Ellipsoid: } (${toLatex(String(l.shapeRadius ?? 2))}, ${toLatex(String(l.shapeRadius2 ?? 1.5))}, ${toLatex(String(l.shapeRadius3 ?? 1))}),\\; ${cStr}`;
    return `\\text{Shape: ${st}},\\; ${cStr}`;
  }
  if (l.type === 'script') return '\\texttt{script}';
  return '';
}

export function extractParamNames(expr?: string): Set<string> {
  const found = new Set<string>();
  if (!expr) return found;
  try {
    const infix = latexToInfix(expr);
    const node = math.parse(infix);
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
    const infix = latexToInfix(trimmed);
    const node = math.parse(infix);

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
