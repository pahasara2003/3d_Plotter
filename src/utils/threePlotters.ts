import * as THREE from 'three';
import * as math from 'mathjs';
import { LayerItem, ParamItem, SceneSettings } from '../types';
import { buildParamScope } from './mathUtils';

export function disposeThreeObject(obj: THREE.Object3D | null) {
  if (!obj) return;
  obj.traverse((child: any) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function makeGridSurfaceMesh(
  N: number,
  color: string,
  tintRatio: number,
  opacity: number,
  wireframe: boolean,
  computeVertex: (i: number, j: number) => { pos: [number, number, number]; val: number }
): THREE.Mesh {
  const verts: number[] = [];
  const vals: number[] = [];

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const { pos, val } = computeVertex(i, j);
      verts.push(pos[0], pos[1], pos[2]);
      vals.push(isFinite(val) ? val : 0);
    }
  }

  let minV = Infinity;
  let maxV = -Infinity;
  for (const v of vals) {
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const a = i * (N + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (N + 1) + j;
      const d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const base = new THREE.Color(color);
  const cols = new Float32Array(verts.length);
  const diff = maxV - minV;

  for (let i = 0; i < vals.length; i++) {
    const t = diff > 0.00001 ? (vals[i] - minV) / diff : 0.5;
    const c2 = base.clone().lerp(new THREE.Color(0xffffff), t * tintRatio);
    cols[i * 3] = c2.r;
    cols[i * 3 + 1] = c2.g;
    cols[i * 3 + 2] = c2.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  return new THREE.Mesh(
    geo,
    new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 55,
      transparent: true,
      opacity,
      wireframe,
    })
  );
}

export function makeCurveLine(
  color: string,
  computePoint: (t: number) => [number, number, number] | null
): THREE.Line {
  const pts: THREE.Vector3[] = [];
  const base = new THREE.Color(color);
  const samples = 1200;

  for (let i = 0; i <= samples; i++) {
    const t = -Math.PI * 6 + i * ((Math.PI * 12) / samples);
    try {
      const p = computePoint(t);
      if (p && isFinite(p[0]) && isFinite(p[1]) && isFinite(p[2])) {
        pts.push(new THREE.Vector3(p[0], p[1], p[2]));
      }
    } catch {
      // ignore singularity points
    }
  }

  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const count = pts.length;
  const cols = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const c2 = base.clone().lerp(new THREE.Color(0xffffff), (i / count) * 0.4);
    cols[i * 3] = c2.r;
    cols[i * 3 + 1] = c2.g;
    cols[i * 3 + 2] = c2.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    })
  );
}

export function buildLayerThreeObject(
  layer: LayerItem,
  params: Record<string, ParamItem>,
  settings: SceneSettings
): THREE.Object3D | null {
  if (!layer.visible) return null;

  const scope = buildParamScope(params);
  const tintRatio = settings.colorTint / 100;
  const opacity = settings.surfaceOpacity / 100;
  const wireframe = settings.wireframe;
  const R = layer.R || 5;
  const N = Math.max(10, layer.N || 55);

  try {
    if (layer.type === 'surface' && layer.eq) {
      const compiled = math.compile(layer.eq);
      const step = (2 * R) / N;
      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const x = -R + i * step;
        const y = -R + j * step;
        let z = 0;
        try {
          z = compiled.evaluate({ ...scope, x, y });
          if (!isFinite(z)) z = 0;
        } catch {
          z = 0;
        }
        return { pos: [x, z, y], val: z };
      });
    }

    if (layer.type === 'spherical' && layer.eq) {
      const compiled = math.compile(layer.eq);
      const stepT = (2 * Math.PI) / N;
      const stepP = Math.PI / N;
      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const theta = i * stepT;
        const phi = j * stepP;
        let rho = 0;
        try {
          rho = compiled.evaluate({ ...scope, theta, phi });
          if (!isFinite(rho)) rho = 0;
        } catch {
          rho = 0;
        }
        const x = rho * Math.sin(phi) * Math.cos(theta);
        const y = rho * Math.sin(phi) * Math.sin(theta);
        const z = rho * Math.cos(phi);
        return { pos: [x, z, y], val: rho };
      });
    }

    if (layer.type === 'cylindrical' && layer.eq) {
      const compiled = math.compile(layer.eq);
      const stepT = (2 * Math.PI) / N;
      const stepZ = (2 * R) / N;
      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const theta = i * stepT;
        const z = -R + j * stepZ;
        let r = 0;
        try {
          r = compiled.evaluate({ ...scope, theta, z });
          if (!isFinite(r)) r = 0;
        } catch {
          r = 0;
        }
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        return { pos: [x, z, y], val: r };
      });
    }

    if (layer.type === 'field' && layer.eq) {
      const raw = layer.eq.trim();
      let fxE = raw,
        fyE = raw,
        fzE = '0';
      const m = raw.match(/^\[(.+),(.+),(.+)\]$/);
      if (m) {
        fxE = m[1].trim();
        fyE = m[2].trim();
        fzE = m[3].trim();
      }
      const fx = math.compile(fxE);
      const fy = math.compile(fyE);
      const fz = math.compile(fzE);
      const grp = new THREE.Group();
      const step = (2 * R) / 6;
      const col = parseInt(layer.color.replace('#', '0x'), 16);

      for (let i = 0; i <= 6; i++) {
        for (let j = 0; j <= 6; j++) {
          for (let k = 0; k <= 6; k++) {
            const x = -R + i * step;
            const y = -R + j * step;
            const z = -R + k * step;
            let vx = 0,
              vy = 0,
              vz = 0;
            try {
              vx = fx.evaluate({ ...scope, x, y, z });
              vy = fy.evaluate({ ...scope, x, y, z });
              vz = fz.evaluate({ ...scope, x, y, z });
            } catch {
              continue;
            }
            const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
            const sc = step * 0.42;
            grp.add(
              new THREE.ArrowHelper(
                new THREE.Vector3(vx / len, vz / len, vy / len),
                new THREE.Vector3(x, z, y),
                sc,
                col,
                sc * 0.35,
                sc * 0.17
              )
            );
          }
        }
      }
      return grp;
    }

    if (layer.type === 'fieldSph' && layer.eq) {
      const raw = layer.eq.trim();
      let frE = raw,
        ftE = '0',
        fpE = '0';
      const m = raw.match(/^\[(.+),(.+),(.+)\]$/);
      if (m) {
        frE = m[1].trim();
        ftE = m[2].trim();
        fpE = m[3].trim();
      }
      const fr = math.compile(frE);
      const ft = math.compile(ftE);
      const fp = math.compile(fpE);
      const grp = new THREE.Group();
      const col = parseInt(layer.color.replace('#', '0x'), 16);
      const stepR = R / 3;
      const stepT = (2 * Math.PI) / 6;
      const stepP = Math.PI / 5;

      for (let i = 1; i <= 3; i++) {
        for (let j = 0; j <= 6; j++) {
          for (let k = 1; k <= 4; k++) {
            const rho = i * stepR;
            const theta = j * stepT;
            const phi = k * stepP;
            let frV = 0,
              ftV = 0,
              fpV = 0;
            try {
              frV = fr.evaluate({ ...scope, rho, theta, phi });
              ftV = ft.evaluate({ ...scope, rho, theta, phi });
              fpV = fp.evaluate({ ...scope, rho, theta, phi });
            } catch {
              continue;
            }
            const x = rho * Math.sin(phi) * Math.cos(theta);
            const y = rho * Math.sin(phi) * Math.sin(theta);
            const z = rho * Math.cos(phi);
            const eR = [Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)];
            const eT = [-Math.sin(theta), Math.cos(theta), 0];
            const eP = [Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), -Math.sin(phi)];
            const vx = frV * eR[0] + ftV * eT[0] + fpV * eP[0];
            const vy = frV * eR[1] + ftV * eT[1] + fpV * eP[1];
            const vz = frV * eR[2] + ftV * eT[2] + fpV * eP[2];
            const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
            const sc = stepR * 0.9;
            grp.add(
              new THREE.ArrowHelper(
                new THREE.Vector3(vx / len, vz / len, vy / len),
                new THREE.Vector3(x, z, y),
                sc,
                col,
                sc * 0.35,
                sc * 0.17
              )
            );
          }
        }
      }
      return grp;
    }

    if (layer.type === 'fieldCyl' && layer.eq) {
      const raw = layer.eq.trim();
      let frE = raw,
        ftE = '0',
        fzE = '0';
      const m = raw.match(/^\[(.+),(.+),(.+)\]$/);
      if (m) {
        frE = m[1].trim();
        ftE = m[2].trim();
        fzE = m[3].trim();
      }
      const fr = math.compile(frE);
      const ft = math.compile(ftE);
      const fz = math.compile(fzE);
      const grp = new THREE.Group();
      const col = parseInt(layer.color.replace('#', '0x'), 16);
      const stepR = R / 3;
      const stepT = (2 * Math.PI) / 8;
      const stepZ = (2 * R) / 6;

      for (let i = 1; i <= 3; i++) {
        for (let j = 0; j <= 8; j++) {
          for (let k = 0; k <= 6; k++) {
            const r = i * stepR;
            const theta = j * stepT;
            const z = -R + k * stepZ;
            let frV = 0,
              ftV = 0,
              fzV = 0;
            try {
              frV = fr.evaluate({ ...scope, r, theta, z });
              ftV = ft.evaluate({ ...scope, r, theta, z });
              fzV = fz.evaluate({ ...scope, r, theta, z });
            } catch {
              continue;
            }
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            const eR = [Math.cos(theta), Math.sin(theta), 0];
            const eT = [-Math.sin(theta), Math.cos(theta), 0];
            const eZ = [0, 0, 1];
            const vx = frV * eR[0] + ftV * eT[0] + fzV * eZ[0];
            const vy = frV * eR[1] + ftV * eT[1] + fzV * eZ[1];
            const vz = frV * eR[2] + ftV * eT[2] + fzV * eZ[2];
            const len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
            const sc = stepR * 0.75;
            grp.add(
              new THREE.ArrowHelper(
                new THREE.Vector3(vx / len, vz / len, vy / len),
                new THREE.Vector3(x, z, y),
                sc,
                col,
                sc * 0.35,
                sc * 0.17
              )
            );
          }
        }
      }
      return grp;
    }

    if (layer.type === 'param' && layer.px && layer.py && layer.pz) {
      const pxE = math.compile(layer.px);
      const pyE = math.compile(layer.py);
      const pzE = math.compile(layer.pz);
      return makeCurveLine(layer.color, (t) => {
        const x = pxE.evaluate({ ...scope, t });
        const y = pyE.evaluate({ ...scope, t });
        const z = pzE.evaluate({ ...scope, t });
        return [x, z, y];
      });
    }

    if (layer.type === 'paramSph' && layer.pRho && layer.pTheta && layer.pPhi) {
      const rhoE = math.compile(layer.pRho);
      const thetaE = math.compile(layer.pTheta);
      const phiE = math.compile(layer.pPhi);
      return makeCurveLine(layer.color, (t) => {
        const rho = rhoE.evaluate({ ...scope, t });
        const theta = thetaE.evaluate({ ...scope, t });
        const phi = phiE.evaluate({ ...scope, t });
        const x = rho * Math.sin(phi) * Math.cos(theta);
        const y = rho * Math.sin(phi) * Math.sin(theta);
        const z = rho * Math.cos(phi);
        return [x, z, y];
      });
    }

    if (layer.type === 'paramCyl' && layer.pR && layer.pThetaC && layer.pZ) {
      const rE = math.compile(layer.pR);
      const thetaE = math.compile(layer.pThetaC);
      const zE = math.compile(layer.pZ);
      return makeCurveLine(layer.color, (t) => {
        const r = rE.evaluate({ ...scope, t });
        const theta = thetaE.evaluate({ ...scope, t });
        const z = zE.evaluate({ ...scope, t });
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        return [x, z, y];
      });
    }

    if (layer.type === 'script' && layer.script) {
      const grp = new THREE.Group();
      const color = layer.color;
      const base = new THREE.Color(color);
      const points3d: number[] = [];
      let surfaceResult: { mode: 'cart' | 'sph' | 'cyl'; fn: (...args: any[]) => number } | null = null;
      const curveFns: Array<(t: number) => [number, number, number] | null> = [];
      let meshResult: { pts: Float32Array; rows: number; cols: number } | null = null;

      const api = {
        plot3d: (x: number, y: number, z: number) => {
          if (isFinite(x) && isFinite(y) && isFinite(z)) {
            points3d.push(x, z, y);
          }
        },
        plotSurface: (fn: (x: number, y: number) => number) => {
          surfaceResult = { mode: 'cart', fn };
        },
        plotSurfaceSph: (fn: (theta: number, phi: number) => number) => {
          surfaceResult = { mode: 'sph', fn };
        },
        plotSurfaceCyl: (fn: (theta: number, z: number) => number) => {
          surfaceResult = { mode: 'cyl', fn };
        },
        plotCurve: (fn: (t: number) => [number, number, number]) => {
          curveFns.push((t) => {
            const r = fn(t);
            if (!r) return null;
            return [r[0], r[2], r[1]];
          });
        },
        plotCurveSph: (fn: (t: number) => [number, number, number]) => {
          curveFns.push((t) => {
            const r = fn(t);
            if (!r) return null;
            const [rho, theta, phi] = r;
            const x = rho * Math.sin(phi) * Math.cos(theta);
            const y = rho * Math.sin(phi) * Math.sin(theta);
            const z = rho * Math.cos(phi);
            return [x, z, y];
          });
        },
        plotCurveCyl: (fn: (t: number) => [number, number, number]) => {
          curveFns.push((t) => {
            const r = fn(t);
            if (!r) return null;
            const [rr, theta, z] = r;
            const x = rr * Math.cos(theta);
            const y = rr * Math.sin(theta);
            return [x, z, y];
          });
        },
        plotMesh: (pts: Float32Array, rows?: number, cols?: number) => {
          meshResult = { pts, rows: rows || 50, cols: cols || 50 };
        },
        sph2cart: (rho: number, theta: number, phi: number) => [
          rho * Math.sin(phi) * Math.cos(theta),
          rho * Math.sin(phi) * Math.sin(theta),
          rho * Math.cos(phi),
        ],
        cyl2cart: (r: number, theta: number, z: number) => [r * Math.cos(theta), r * Math.sin(theta), z],
      };

      const ctx = {
        ...api,
        Math,
        sin: Math.sin,
        cos: Math.cos,
        sqrt: Math.sqrt,
        exp: Math.exp,
        abs: Math.abs,
        log: Math.log,
        PI: Math.PI,
        E: Math.E,
        pow: Math.pow,
        atan2: Math.atan2,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round,
        random: Math.random,
        min: Math.min,
        max: Math.max,
        Float32Array,
        ...scope,
      };

      const fn = new Function(...Object.keys(ctx), layer.script);
      fn(...Object.values(ctx));

      // render plot3d points
      if (points3d.length > 0) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points3d), 3));
        const cols = new Float32Array(points3d.length);
        const count = points3d.length / 3;
        for (let i = 0; i < count; i++) {
          const c2 = base.clone().lerp(new THREE.Color(0xffffff), (i / count) * 0.5);
          cols[i * 3] = c2.r;
          cols[i * 3 + 1] = c2.g;
          cols[i * 3 + 2] = c2.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        grp.add(new THREE.Points(geo, new THREE.PointsMaterial({ vertexColors: true, size: 0.08 })));
      }

      // render plotSurface / plotSurfaceSph / plotSurfaceCyl
      if (surfaceResult) {
        const { mode, fn: sf } = surfaceResult as any;
        let mesh: THREE.Mesh;
        if (mode === 'sph') {
          const stepT = (2 * Math.PI) / N;
          const stepP = Math.PI / N;
          mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
            const theta = i * stepT;
            const phi = j * stepP;
            let rho = 0;
            try {
              rho = sf(theta, phi);
              if (!isFinite(rho)) rho = 0;
            } catch {
              rho = 0;
            }
            const x = rho * Math.sin(phi) * Math.cos(theta);
            const y = rho * Math.sin(phi) * Math.sin(theta);
            const z = rho * Math.cos(phi);
            return { pos: [x, z, y], val: rho };
          });
        } else if (mode === 'cyl') {
          const stepT = (2 * Math.PI) / N;
          const stepZ = (2 * R) / N;
          mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
            const theta = i * stepT;
            const z = -R + j * stepZ;
            let r = 0;
            try {
              r = sf(theta, z);
              if (!isFinite(r)) r = 0;
            } catch {
              r = 0;
            }
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            return { pos: [x, z, y], val: r };
          });
        } else {
          const step = (2 * R) / N;
          mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
            const x = -R + i * step;
            const y = -R + j * step;
            let z = 0;
            try {
              z = sf(x, y);
              if (!isFinite(z)) z = 0;
            } catch {
              z = 0;
            }
            return { pos: [x, z, y], val: z };
          });
        }
        grp.add(mesh);
      }

      // render plotCurve / plotCurveSph / plotCurveCyl
      curveFns.forEach((computePoint) => {
        grp.add(makeCurveLine(color, computePoint));
      });

      // render plotMesh
      if (meshResult) {
        const { pts, rows, cols: C } = meshResult as any;
        const count = rows * C;
        if (pts.length >= count * 3) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
          const idx: number[] = [];
          for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < C - 1; j++) {
              const a = i * C + j;
              const b = a + 1;
              const c = (i + 1) * C + j;
              const d = c + 1;
              idx.push(a, b, d, a, d, c);
            }
          }
          geo.setIndex(idx);
          geo.computeVertexNormals();
          const colArr = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            const c2 = base.clone().lerp(new THREE.Color(0xffffff), (i / count) * 0.45);
            colArr[i * 3] = c2.r;
            colArr[i * 3 + 1] = c2.g;
            colArr[i * 3 + 2] = c2.b;
          }
          geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
          grp.add(
            new THREE.Mesh(
              geo,
              new THREE.MeshPhongMaterial({
                vertexColors: true,
                side: THREE.DoubleSide,
                shininess: 55,
                transparent: true,
                opacity,
                wireframe,
              })
            )
          );
        }
      }

      return grp;
    }
  } catch (err) {
    console.error('Error generating 3D layer:', err);
  }

  return null;
}
