/**
 * Python Script Execution Engine for 3D Mathematical Plotting
 * 
 * Supports:
 * - Pyodide WebAssembly Python 3 runtime (with numpy, math, stdlib, custom functions)
 * - Fast hybrid mathematical Python evaluator for instant 60fps slider/animation reactivity
 * - Plotting APIs: plot_surface, plot_surface_sph, plot_surface_cyl, plot_curve,
 *   plot_parametric_surface, plot_grid (meshgrid), plot3d, plot_points, plot_mesh
 * - Stdout interception (captures print() statements)
 * - Traceback and syntax error formatting
 */

export interface PythonSurfaceItem {
  mode: 'cart' | 'sph' | 'cyl' | 'uv' | 'grid';
  fn?: (...args: number[]) => number;
  uvFn?: (u: number, v: number) => [number, number, number];
  uRange?: [number, number];
  vRange?: [number, number];
  grid?: { X: number[][]; Y: number[][]; Z: number[][] };
  nu?: number;
  nv?: number;
}

export interface PythonCurveItem {
  fn: (t: number) => [number, number, number] | null;
  tRange?: [number, number];
  samples?: number;
}

export interface PythonMeshItem {
  pts: Float32Array | number[];
  rows: number;
  cols: number;
}

export interface PythonPlotOutput {
  success: boolean;
  error: string | null;
  stdout: string;
  executionTimeMs: number;
  surfaces: PythonSurfaceItem[];
  curves: PythonCurveItem[];
  points3d: number[]; // Flat array [x, y, z, x, y, z, ...]
  meshes: PythonMeshItem[];
}

export type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error';

let pyodideInstance: any = null;
let pyodideStatus: PyodideStatus = 'idle';
let pyodideLoadPromise: Promise<any> | null = null;
const statusListeners = new Set<(status: PyodideStatus) => void>();

export function getPyodideStatus(): PyodideStatus {
  return pyodideStatus;
}

export function subscribePyodideStatus(listener: (status: PyodideStatus) => void): () => void {
  statusListeners.add(listener);
  listener(pyodideStatus);
  return () => statusListeners.delete(listener);
}

function setStatus(status: PyodideStatus) {
  pyodideStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

/**
 * Loads Pyodide WebAssembly runtime from CDN
 */
export async function initPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadPromise) return pyodideLoadPromise;

  setStatus('loading');

  pyodideLoadPromise = (async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Pyodide can only be loaded in a browser environment');
      }

      // Check if script is already present or add it
      if (!(window as any).loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide script from CDN'));
          document.head.appendChild(script);
        });
      }

      const loadPyodideFn = (window as any).loadPyodide;
      if (!loadPyodideFn) {
        throw new Error('loadPyodide not found on window object');
      }

      const pyodide = await loadPyodideFn({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
      });

      // Try loading numpy package in background
      try {
        await pyodide.loadPackage('numpy');
      } catch (npErr) {
        console.warn('NumPy could not be pre-loaded, falling back to math stdlib:', npErr);
      }

      pyodideInstance = pyodide;
      setStatus('ready');
      return pyodide;
    } catch (err: any) {
      console.error('Pyodide initialization failed:', err);
      setStatus('error');
      pyodideLoadPromise = null;
      throw err;
    }
  })();

  return pyodideLoadPromise;
}

// Auto-trigger Pyodide loading in the background on module import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initPyodide().catch(() => {
      // Handled in status
    });
  }, 100);
}

/**
 * Fast synchronous Python-to-JS mathematical transpiler/evaluator
 * Supports Python math expressions, def / lambda functions, for loops,
 * numpy/math aliases, and coordinate plotting APIs for immediate zero-latency execution.
 */
function runFastPythonEvaluator(
  pythonCode: string,
  scope: Record<string, number> = {}
): PythonPlotOutput {
  const t0 = performance.now();
  const surfaces: PythonSurfaceItem[] = [];
  const curves: PythonCurveItem[] = [];
  const points3d: number[] = [];
  const meshes: PythonMeshItem[] = [];
  const stdoutLines: string[] = [];

  const customPrint = (...args: any[]) => {
    stdoutLines.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  };

  // Build Python API bridge
  const api = {
    print: customPrint,
    plot_surface: (fn: any, xRange?: [number, number], yRange?: [number, number]) => {
      if (typeof fn === 'function') {
        surfaces.push({ mode: 'cart', fn });
      }
    },
    plotSurface: (fn: any) => {
      if (typeof fn === 'function') surfaces.push({ mode: 'cart', fn });
    },
    plot_surface_sph: (fn: any) => {
      if (typeof fn === 'function') surfaces.push({ mode: 'sph', fn });
    },
    plotSurfaceSph: (fn: any) => {
      if (typeof fn === 'function') surfaces.push({ mode: 'sph', fn });
    },
    plot_surface_cyl: (fn: any) => {
      if (typeof fn === 'function') surfaces.push({ mode: 'cyl', fn });
    },
    plotSurfaceCyl: (fn: any) => {
      if (typeof fn === 'function') surfaces.push({ mode: 'cyl', fn });
    },
    plot_curve: (fn: any, tRange?: [number, number]) => {
      if (typeof fn === 'function') curves.push({ fn, tRange });
    },
    plotCurve: (fn: any) => {
      if (typeof fn === 'function') curves.push({ fn });
    },
    plot_curve_sph: (fn: any) => {
      if (typeof fn === 'function') {
        curves.push({
          fn: (t) => {
            const res = fn(t);
            if (!res) return null;
            const [rho, theta, phi] = res;
            return [
              rho * Math.sin(phi) * Math.cos(theta),
              rho * Math.sin(phi) * Math.sin(theta),
              rho * Math.cos(phi),
            ];
          },
        });
      }
    },
    plotCurveSph: (fn: any) => {
      api.plot_curve_sph(fn);
    },
    plot_curve_cyl: (fn: any) => {
      if (typeof fn === 'function') {
        curves.push({
          fn: (t) => {
            const res = fn(t);
            if (!res) return null;
            const [r, theta, z] = res;
            return [r * Math.cos(theta), r * Math.sin(theta), z];
          },
        });
      }
    },
    plotCurveCyl: (fn: any) => {
      api.plot_curve_cyl(fn);
    },
    plot3d: (x: number, y: number, z: number) => {
      if (isFinite(x) && isFinite(y) && isFinite(z)) {
        points3d.push(Number(x), Number(y), Number(z));
      }
    },
    plot_point: (x: number, y: number, z: number) => {
      api.plot3d(x, y, z);
    },
    plot_points: (coords: Array<[number, number, number] | number[]>) => {
      if (Array.isArray(coords)) {
        coords.forEach((p) => {
          if (Array.isArray(p) && p.length >= 3) {
            api.plot3d(p[0], p[1], p[2]);
          }
        });
      }
    },
    plot_parametric_surface: (
      uvFn: (u: number, v: number) => [number, number, number],
      uRange: [number, number] = [0, 2 * Math.PI],
      vRange: [number, number] = [-1, 1],
      nu: number = 50,
      nv: number = 20
    ) => {
      if (typeof uvFn === 'function') {
        surfaces.push({ mode: 'uv', uvFn, uRange, vRange, nu, nv });
      }
    },
    plot_grid: (X: any, Y: any, Z: any) => {
      if (Array.isArray(X) && Array.isArray(Y) && Array.isArray(Z)) {
        surfaces.push({ mode: 'grid', grid: { X, Y, Z } });
      }
    },
    plot_mesh: (pts: any, rows: number = 50, cols: number = 50) => {
      if (pts && (Array.isArray(pts) || pts instanceof Float32Array)) {
        meshes.push({
          pts: pts instanceof Float32Array ? pts : new Float32Array(pts),
          rows: rows || 50,
          cols: cols || 50,
        });
      }
    },
    plotMesh: (pts: any, rows: number, cols: number) => {
      api.plot_mesh(pts, rows, cols);
    },
    sph2cart: (rho: number, theta: number, phi: number) => [
      rho * Math.sin(phi) * Math.cos(theta),
      rho * Math.sin(phi) * Math.sin(theta),
      rho * Math.cos(phi),
    ],
    cyl2cart: (r: number, theta: number, z: number) => [
      r * Math.cos(theta),
      r * Math.sin(theta),
      z,
    ],
  };

  // Math functions and constants
  const mathScope: Record<string, any> = {
    Math,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: Math.atan2,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    exp: Math.exp,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    min: Math.min,
    max: Math.max,
    pi: Math.PI,
    e: Math.E,
    PI: Math.PI,
    E: Math.E,
    Float32Array,
    Array,
    len: (x: any) => (x ? (x.length !== undefined ? x.length : Object.keys(x).length) : 0),
    sum: (arr: number[]) => (Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0),
    range: (start: number, stop?: number, step: number = 1) => {
      if (stop === undefined) {
        stop = start;
        start = 0;
      }
      const res: number[] = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) res.push(i);
      } else {
        for (let i = start; i > stop; i += step) res.push(i);
      }
      return res;
    },
    linspace: (start: number, stop: number, num: number = 50) => {
      const step = (stop - start) / Math.max(1, num - 1);
      const res: number[] = [];
      for (let i = 0; i < num; i++) res.push(start + i * step);
      return res;
    },
    zeros: (shape: [number, number] | number) => {
      if (Array.isArray(shape)) {
        const [rows, cols] = shape;
        return Array.from({ length: rows }, () => new Array(cols).fill(0));
      }
      return new Array(shape).fill(0);
    },
    ones: (shape: [number, number] | number) => {
      if (Array.isArray(shape)) {
        const [rows, cols] = shape;
        return Array.from({ length: rows }, () => new Array(cols).fill(1));
      }
      return new Array(shape).fill(1);
    },
    meshgrid: (xArr: number[], yArr: number[]) => {
      const X: number[][] = [];
      const Y: number[][] = [];
      for (let i = 0; i < yArr.length; i++) {
        const rowX: number[] = [];
        const rowY: number[] = [];
        for (let j = 0; j < xArr.length; j++) {
          rowX.push(xArr[j]);
          rowY.push(yArr[i]);
        }
        X.push(rowX);
        Y.push(rowY);
      }
      return [X, Y];
    },
    random: {
      random: Math.random,
      uniform: (a: number = 0, b: number = 1) => a + Math.random() * (b - a),
    },
  };

  // Simple math/numpy module mock
  mathScope.math = { ...mathScope };
  mathScope.np = {
    ...mathScope,
    sin: (x: any) => (Array.isArray(x) ? x.map((v) => Math.sin(v)) : Math.sin(x)),
    cos: (x: any) => (Array.isArray(x) ? x.map((v) => Math.cos(v)) : Math.cos(x)),
    tan: (x: any) => (Array.isArray(x) ? x.map((v) => Math.tan(v)) : Math.tan(x)),
    sqrt: (x: any) => (Array.isArray(x) ? x.map((v) => Math.sqrt(v)) : Math.sqrt(x)),
    exp: (x: any) => (Array.isArray(x) ? x.map((v) => Math.exp(v)) : Math.exp(x)),
    abs: (x: any) => (Array.isArray(x) ? x.map((v) => Math.abs(v)) : Math.abs(x)),
    pi: Math.PI,
    e: Math.E,
  };
  mathScope.numpy = mathScope.np;

  // Add .append polyfill to Array prototype if not present
  if (typeof (Array.prototype as any).append !== 'function') {
    Object.defineProperty(Array.prototype, 'append', {
      value: function (item: any) {
        return (this as any[]).push(item);
      },
      writable: true,
      configurable: true,
    });
  }

  try {
    // Transpile basic Python constructs to JS
    const jsCode = transpilePythonToJs(pythonCode);
    const executionScope = {
      ...mathScope,
      ...api,
      params: scope,
      ...scope,
    };

    const func = new Function(...Object.keys(executionScope), jsCode);
    func(...Object.values(executionScope));

    const t1 = performance.now();
    return {
      success: true,
      error: null,
      stdout: stdoutLines.join('\n'),
      executionTimeMs: Math.round((t1 - t0) * 10) / 10,
      surfaces,
      curves,
      points3d,
      meshes,
    };
  } catch (err: any) {
    const t1 = performance.now();
    return {
      success: false,
      error: err.message || String(err),
      stdout: stdoutLines.join('\n'),
      executionTimeMs: Math.round((t1 - t0) * 10) / 10,
      surfaces,
      curves,
      points3d,
      meshes,
    };
  }
}

/**
 * Helper to convert standard Python syntax blocks into executable JS for fast evaluation
 */
function transpilePythonToJs(py: string): string {
  let js = py;

  // Normalize newlines
  js = js.replace(/\r\n/g, '\n');

  // Strip Python docstrings """ ... """ and ''' ... '''
  js = js.replace(/"""[\s\S]*?"""/g, '');
  js = js.replace(/'''[\s\S]*?'''/g, '');

  const lines = js.split('\n');
  const convertedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle Python comments (unless inside quote)
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      const before = line.slice(0, commentIdx);
      const quotes = (before.match(/['"]/g) || []).length;
      if (quotes % 2 === 0) {
        line = before + '//' + line.slice(commentIdx + 1);
      }
    }

    // Ignore import lines
    if (/^\s*(import|from)\s+/.test(line)) {
      convertedLines.push('// ' + line);
      continue;
    }

    // Replace Python boolean / None constants
    line = line.replace(/\bTrue\b/g, 'true');
    line = line.replace(/\bFalse\b/g, 'false');
    line = line.replace(/\bNone\b/g, 'null');

    // Convert `lambda x, y: ...` to `(x, y) => ...`
    line = line.replace(/\blambda\s+([^:]+):/g, '($1) =>');

    // Convert simple `def fn_name(args):` to `function fn_name(args) {`
    const defMatch = line.match(/^(\s*)def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*:/);
    if (defMatch) {
      const indent = defMatch[1];
      const fnName = defMatch[2];
      const args = defMatch[3];
      line = `${indent}function ${fnName}(${args}) {`;
    }

    // Convert simple `for var in range(...):` to `for (let var of range(...)) {`
    const forMatch = line.match(/^(\s*)for\s+([a-zA-Z0-9_,\s]+)\s+in\s+([^:]+):/);
    if (forMatch) {
      const indent = forMatch[1];
      const loopVars = forMatch[2].trim();
      const iterable = forMatch[3].trim();
      if (loopVars.includes(',')) {
        line = `${indent}for (let [${loopVars}] of ${iterable}) {`;
      } else {
        line = `${indent}for (let ${loopVars} of ${iterable}) {`;
      }
    }

    // Convert simple `if condition:` to `if (condition) {`
    const ifMatch = line.match(/^(\s*)(if|elif|while)\s+([^:]+):/);
    if (ifMatch) {
      const indent = ifMatch[1];
      const keyword = ifMatch[2] === 'elif' ? 'else if' : ifMatch[2];
      const cond = ifMatch[3].trim();
      line = `${indent}${keyword} (${cond}) {`;
    }

    // Convert simple `else:` to `else {`
    const elseMatch = line.match(/^(\s*)else\s*:/);
    if (elseMatch) {
      const indent = elseMatch[1];
      line = `${indent}else {`;
    }

    // Handle Python tuple unpacking assignment: a, b, c = 1, 2, 3 or a, b = fn()
    const tupleAssignMatch = line.match(
      /^(\s*)([a-zA-Z_][a-zA-Z0-9_]*(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)+)\s*=\s*(.+)$/
    );
    if (tupleAssignMatch) {
      const indent = tupleAssignMatch[1];
      const lhsVars = tupleAssignMatch[2];
      let rhs = tupleAssignMatch[4].trim().replace(/;$/, '');

      let depth = 0;
      let hasTopLevelComma = false;
      for (let c = 0; c < rhs.length; c++) {
        const ch = rhs[c];
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
        else if (ch === ',' && depth === 0) {
          hasTopLevelComma = true;
          break;
        }
      }

      if (hasTopLevelComma && !rhs.startsWith('[') && !rhs.startsWith('(')) {
        rhs = `[${rhs}]`;
      }
      line = `${indent}var [${lhsVars}] = ${rhs};`;
    } else {
      // Handle single variable assignment: var_name = expr
      const singleAssignMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/);
      if (
        singleAssignMatch &&
        !line.trim().startsWith('return ') &&
        !line.trim().startsWith('if ') &&
        !line.trim().startsWith('while ')
      ) {
        const indent = singleAssignMatch[1];
        const varName = singleAssignMatch[2];
        const rhs = singleAssignMatch[3].replace(/;$/, '');
        line = `${indent}var ${varName} = ${rhs};`;
      }
    }

    convertedLines.push(line);
  }

  // Handle Python indentation block closes automatically
  const indentedResult: string[] = [];
  const indentStack: number[] = [0];

  for (let i = 0; i < convertedLines.length; i++) {
    const rawLine = convertedLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith('//')) {
      indentedResult.push(rawLine);
      continue;
    }

    // Count leading whitespace
    const leadingSpaces = rawLine.search(/\S|$/);

    // If current indentation is less than top of stack, close blocks with '}'
    while (indentStack.length > 1 && leadingSpaces < indentStack[indentStack.length - 1]) {
      const prevIndent = indentStack.pop()!;
      indentedResult.push(' '.repeat(Math.max(0, prevIndent - 2)) + '}');
    }

    indentedResult.push(rawLine);

    // If line opens a block ({ at end), push indentation
    if (rawLine.trimEnd().endsWith('{')) {
      const nextIndent = leadingSpaces + 2;
      indentStack.push(nextIndent);
    }
  }

  // Close any remaining open blocks
  while (indentStack.length > 1) {
    const prevIndent = indentStack.pop()!;
    indentedResult.push(' '.repeat(Math.max(0, prevIndent - 2)) + '}');
  }

  return indentedResult.join('\n');
}

/**
 * Executes Python code using Pyodide WebAssembly if ready, or fast hybrid evaluator
 */
export async function runPythonScript(
  pythonCode: string,
  scope: Record<string, number> = {}
): Promise<PythonPlotOutput> {
  const t0 = performance.now();

  // If Pyodide is ready, execute through Pyodide WebAssembly
  if (pyodideInstance && pyodideStatus === 'ready') {
    try {
      const surfaces: PythonSurfaceItem[] = [];
      const curves: PythonCurveItem[] = [];
      const points3d: number[] = [];
      const meshes: PythonMeshItem[] = [];
      const stdoutLines: string[] = [];

      const customPrint = (...args: any[]) => {
        stdoutLines.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      };

      // Expose Bridge APIs to Pyodide globals
      pyodideInstance.globals.set('_js_print', customPrint);
      pyodideInstance.globals.set('_js_plot3d', (x: number, y: number, z: number) => {
        if (isFinite(x) && isFinite(y) && isFinite(z)) {
          points3d.push(Number(x), Number(y), Number(z));
        }
      });

      // Prepare wrapper environment in Python
      const scopeJson = JSON.stringify(scope);

      const pyWrapper = `
import sys
import io
import json
import math

class _OutputCapture:
    def write(self, s):
        if s.strip():
            _js_print(s.strip())
    def flush(self):
        pass

sys.stdout = _OutputCapture()
sys.stderr = _OutputCapture()

# Global params dictionary
params = json.loads('''${scopeJson}''')
for _k, _v in params.items():
    globals()[_k] = _v

# Math functions in global scope
sin = math.sin
cos = math.cos
tan = math.tan
asin = math.asin
acos = math.acos
atan = math.atan
atan2 = math.atan2
sinh = math.sinh
cosh = math.cosh
tanh = math.tanh
sqrt = math.sqrt
exp = math.exp
log = math.log
log10 = math.log10
log2 = math.log2
pi = math.pi
e = math.e

_registered_surfaces = []
_registered_curves = []
_registered_parametric_surfaces = []
_registered_grids = []
_registered_meshes = []

def plot_surface(fn, x_range=(-5, 5), y_range=(-5, 5)):
    _registered_surfaces.append(('cart', fn, x_range, y_range))

def plotSurface(fn, *args, **kwargs):
    plot_surface(fn, *args, **kwargs)

def plot_surface_sph(fn):
    _registered_surfaces.append(('sph', fn))

def plotSurfaceSph(fn):
    plot_surface_sph(fn)

def plot_surface_cyl(fn):
    _registered_surfaces.append(('cyl', fn))

def plotSurfaceCyl(fn):
    plot_surface_cyl(fn)

def plot_curve(fn, t_range=(-6*pi, 6*pi)):
    _registered_curves.append(('cart', fn, t_range))

def plotCurve(fn, *args, **kwargs):
    plot_curve(fn, *args, **kwargs)

def plot_curve_sph(fn, t_range=(-6*pi, 6*pi)):
    _registered_curves.append(('sph', fn, t_range))

def plotCurveSph(fn, *args, **kwargs):
    plot_curve_sph(fn, *args, **kwargs)

def plot_curve_cyl(fn, t_range=(-6*pi, 6*pi)):
    _registered_curves.append(('cyl', fn, t_range))

def plotCurveCyl(fn, *args, **kwargs):
    plot_curve_cyl(fn, *args, **kwargs)

def plot3d(x, y, z):
    _js_plot3d(float(x), float(y), float(z))

def plot_point(x, y, z):
    plot3d(x, y, z)

def plot_points(pts):
    for p in pts:
        if len(p) >= 3:
            plot3d(p[0], p[1], p[2])

def plot_parametric_surface(fn, u_range=(0, 2*pi), v_range=(-1, 1), nu=50, nv=20):
    _registered_parametric_surfaces.append((fn, u_range, v_range, nu, nv))

def plot_grid(X, Y, Z):
    _registered_grids.append((X, Y, Z))

def plot_mesh(pts, rows=50, cols=50):
    _registered_meshes.append((pts, rows, cols))

def plotMesh(pts, rows=50, cols=50):
    plot_mesh(pts, rows, cols)

def sph2cart(rho, theta, phi):
    return (
        rho * math.sin(phi) * math.cos(theta),
        rho * math.sin(phi) * math.sin(theta),
        rho * math.cos(phi)
    )

def cyl2cart(r, theta, z):
    return (
        r * math.cos(theta),
        r * math.sin(theta),
        z
    )

# User Script Execution
${pythonCode}
`;

      await pyodideInstance.runPythonAsync(pyWrapper);

      // Extract registered surfaces
      const pySurfaces = pyodideInstance.globals.get('_registered_surfaces')?.toJs() || [];
      for (const item of pySurfaces) {
        const mode = item[0];
        const fnPy = item[1];
        if (typeof fnPy === 'function') {
          surfaces.push({ mode, fn: fnPy });
        }
      }

      // Extract registered curves
      const pyCurves = pyodideInstance.globals.get('_registered_curves')?.toJs() || [];
      for (const item of pyCurves) {
        const mode = item[0];
        const fnPy = item[1];
        const tRange: [number, number] | undefined =
          item[2] && item[2].length >= 2 ? [Number(item[2][0]), Number(item[2][1])] : undefined;

        if (typeof fnPy === 'function') {
          if (mode === 'sph') {
            curves.push({
              fn: (t: number) => {
                const res = fnPy(t);
                if (!res) return null;
                const r = Array.isArray(res) ? res : res.toJs?.() || [];
                const [rho, theta, phi] = r;
                return [
                  rho * Math.sin(phi) * Math.cos(theta),
                  rho * Math.sin(phi) * Math.sin(theta),
                  rho * Math.cos(phi),
                ];
              },
              tRange,
            });
          } else if (mode === 'cyl') {
            curves.push({
              fn: (t: number) => {
                const res = fnPy(t);
                if (!res) return null;
                const r = Array.isArray(res) ? res : res.toJs?.() || [];
                const [rr, theta, z] = r;
                return [rr * Math.cos(theta), rr * Math.sin(theta), z];
              },
              tRange,
            });
          } else {
            curves.push({
              fn: (t: number) => {
                const res = fnPy(t);
                if (!res) return null;
                const r = Array.isArray(res) ? res : res.toJs?.() || [];
                return [r[0], r[1], r[2]];
              },
              tRange,
            });
          }
        }
      }

      // Extract parametric surfaces
      const pyParamSurfs = pyodideInstance.globals.get('_registered_parametric_surfaces')?.toJs() || [];
      for (const item of pyParamSurfs) {
        const fnPy = item[0];
        const uRange = item[1] ? [item[1][0], item[1][1]] : [0, 2 * Math.PI];
        const vRange = item[2] ? [item[2][0], item[2][1]] : [-1, 1];
        const nu = item[3] || 50;
        const nv = item[4] || 20;

        if (typeof fnPy === 'function') {
          surfaces.push({
            mode: 'uv',
            uvFn: (u: number, v: number) => {
              const res = fnPy(u, v);
              const r = Array.isArray(res) ? res : res?.toJs?.() || [0, 0, 0];
              return [r[0], r[1], r[2]];
            },
            uRange: uRange as [number, number],
            vRange: vRange as [number, number],
            nu,
            nv,
          });
        }
      }

      // Extract meshes
      const pyMeshes = pyodideInstance.globals.get('_registered_meshes')?.toJs() || [];
      for (const item of pyMeshes) {
        const rawPts = item[0];
        const rows = item[1] || 50;
        const cols = item[2] || 50;
        const pts = rawPts instanceof Float32Array ? rawPts : new Float32Array(rawPts);
        meshes.push({ pts, rows, cols });
      }

      const t1 = performance.now();
      return {
        success: true,
        error: null,
        stdout: stdoutLines.join('\n'),
        executionTimeMs: Math.round((t1 - t0) * 10) / 10,
        surfaces,
        curves,
        points3d,
        meshes,
      };
    } catch (pyErr: any) {
      console.warn('Pyodide execution warning, checking fallback:', pyErr);
      const cleanErr = formatPythonError(pyErr.message || String(pyErr));
      const t1 = performance.now();
      return {
        success: false,
        error: cleanErr,
        stdout: '',
        executionTimeMs: Math.round((t1 - t0) * 10) / 10,
        surfaces: [],
        curves: [],
        points3d: [],
        meshes: [],
      };
    }
  }

  // Fallback to fast mathematical evaluator
  return runFastPythonEvaluator(pythonCode, scope);
}

/**
 * Synchronous Python executor for real-time 60fps render loop
 */
export function runPythonScriptSync(
  pythonCode: string,
  scope: Record<string, number> = {}
): PythonPlotOutput {
  return runFastPythonEvaluator(pythonCode, scope);
}

/**
 * Format Python tracebacks into friendly user messages
 */
export function formatPythonError(rawError: string): string {
  if (!rawError) return 'Unknown Python error';

  // If there's a Python Traceback, extract the core error and line number
  const lines = rawError.split('\n');
  const errorLine = lines.find((l) =>
    /^(SyntaxError|NameError|TypeError|ValueError|ZeroDivisionError|IndexError|AttributeError):/.test(l.trim())
  );

  const lineMatch = rawError.match(/File "<exec>", line (\d+)/i) || rawError.match(/line (\d+)/i);
  const lineNum = lineMatch ? `Line ${lineMatch[1]}: ` : '';

  if (errorLine) {
    return `${lineNum}${errorLine.trim()}`;
  }

  return rawError.replace(/Traceback \(most recent call last\):[\s\S]*?File "<exec>", /g, '');
}
