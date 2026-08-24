import * as math from 'mathjs';
import katex from 'katex';
import { LayerItem, ParamItem } from '../types';

export const RESERVED_VARS = new Set(['x', 'y', 'z', 't', 'r', 'theta', 'phi', 'rho', 'pi', 'e', 'PI', 'E', 'i']);

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
  if (l.type === 'surface' || l.type === 'spherical' || l.type === 'cylindrical') {
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
