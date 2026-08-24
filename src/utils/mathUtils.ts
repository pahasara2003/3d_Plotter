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
  return [];
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
