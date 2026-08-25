import * as THREE from 'three';
import * as math from 'mathjs';
import { LayerItem, ParamItem, SceneSettings } from '../types';
import {
  buildParamScope,
  getColorFromColormap,
  transformCoord,
  evaluateNumericExpr,
  getFastEvaluator,
} from './mathUtils';
import { runPythonScriptSync } from './pythonRunner';

let glowTextureCache: THREE.CanvasTexture | null = null;
function getGlowPointTexture(): THREE.CanvasTexture {
  if (glowTextureCache) return glowTextureCache;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  glowTextureCache = new THREE.CanvasTexture(canvas);
  return glowTextureCache;
}

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

/**
 * Maps math coordinates (x, y, z) into Three.js coordinates [x_three, y_three, z_three]
 * taking into account log scales and scale factors.
 * Note: Three.js Y is Math Z (height), Three.js Z is Math Y (depth).
 */
export function mapMathToThree(
  x: number,
  y: number,
  z: number,
  settings?: SceneSettings
): [number, number, number] {
  if (!settings) return [x, z, y];

  const logX = settings.logScaleX;
  const logY = settings.logScaleY;
  const logZ = settings.logScaleZ;

  const sx = settings.scaleX ?? 1;
  const sy = settings.scaleY ?? 1;
  const sz = settings.scaleZ ?? 1;

  const tx = transformCoord(x, logX) * sx;
  const ty = transformCoord(y, logY) * sy;
  const tz = transformCoord(z, logZ) * sz;

  // Three.js: X=tx, Y=tz (Math Z height), Z=ty (Math Y depth)
  return [tx, tz, ty];
}

export function makeGridSurfaceMesh(
  N: number,
  color: string,
  tintRatio: number,
  opacity: number,
  wireframe: boolean,
  computeVertex: (i: number, j: number) => { pos: [number, number, number]; val: number },
  M?: number
): THREE.Mesh {
  const cols = M !== undefined ? M : N;
  const totalVerts = (N + 1) * (cols + 1);
  const verts = new Float32Array(totalVerts * 3);
  const vals = new Float32Array(totalVerts);

  let minV = Infinity;
  let maxV = -Infinity;
  let ptr = 0;
  let valPtr = 0;

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= cols; j++) {
      const { pos, val } = computeVertex(i, j);
      verts[ptr++] = pos[0];
      verts[ptr++] = pos[1];
      verts[ptr++] = pos[2];
      const validVal = isFinite(val) ? val : 0;
      vals[valPtr++] = validVal;
      if (validVal < minV) minV = validVal;
      if (validVal > maxV) maxV = validVal;
    }
  }

  const numQuads = N * cols;
  const idx = new (totalVerts > 65535 ? Uint32Array : Uint16Array)(numQuads * 6);
  let idxPtr = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (cols + 1) + j;
      const d = c + 1;
      idx[idxPtr++] = a;
      idx[idxPtr++] = b;
      idx[idxPtr++] = d;
      idx[idxPtr++] = a;
      idx[idxPtr++] = d;
      idx[idxPtr++] = c;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const base = new THREE.Color(color);
  const colsArr = new Float32Array(totalVerts * 3);
  const diff = maxV - minV;

  for (let i = 0; i < totalVerts; i++) {
    const t = diff > 0.00001 ? (vals[i] - minV) / diff : 0.5;
    const c2 = base.clone().lerp(new THREE.Color(0xffffff), t * tintRatio);
    colsArr[i * 3] = c2.r;
    colsArr[i * 3 + 1] = c2.g;
    colsArr[i * 3 + 2] = c2.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colsArr, 3));

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
      // ignore singularity
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

const VOLUME_VERTEX_SHADER = `
varying vec3 vWorldPos;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const VOLUME_FRAGMENT_SHADER = `
precision highp float;
precision highp sampler3D;

uniform sampler3D u_data;
uniform vec3 u_bMin;
uniform vec3 u_bMax;
uniform float u_threshold;
uniform float u_opacity;
uniform float u_densityPower;
uniform float u_coreIso;
uniform float u_densityMultiplier;
uniform vec3 u_baseColor;
uniform int u_steps;
uniform float u_resolution;

varying vec3 vWorldPos;

vec2 hitBox(vec3 orig, vec3 dir, vec3 bMin, vec3 bMax) {
  vec3 invDir = 1.0 / (dir + vec3(equal(dir, vec3(0.0))) * 1e-6);
  vec3 t0 = (bMin - orig) * invDir;
  vec3 t1 = (bMax - orig) * invDir;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tNear = max(max(tmin.x, tmin.y), tmin.z);
  float tFar = min(min(tmax.x, tmax.y), tmax.z);
  return vec2(tNear, tFar);
}

vec3 sampleNormal(vec3 uvw, float stepOffset) {
  float dx = texture(u_data, uvw + vec3(stepOffset, 0.0, 0.0)).r - texture(u_data, uvw - vec3(stepOffset, 0.0, 0.0)).r;
  float dy = texture(u_data, uvw + vec3(0.0, stepOffset, 0.0)).r - texture(u_data, uvw - vec3(0.0, stepOffset, 0.0)).r;
  float dz = texture(u_data, uvw + vec3(0.0, 0.0, stepOffset)).r - texture(u_data, uvw - vec3(0.0, 0.0, stepOffset)).r;
  vec3 grad = vec3(-dx, -dy, -dz);
  if (length(grad) < 1e-5) return vec3(0.0, 1.0, 0.0);
  return normalize(grad);
}

void main() {
  vec3 rayOrig = cameraPosition;
  vec3 rayDir = normalize(vWorldPos - cameraPosition);

  vec2 tHits = hitBox(rayOrig, rayDir, u_bMin, u_bMax);
  float t0 = max(tHits.x, 0.0);
  float t1 = tHits.y;

  if (t0 >= t1) discard;

  float stepLen = (t1 - t0) / float(u_steps);
  vec4 acc = vec4(0.0);
  vec3 lightDir = normalize(vec3(0.6, 0.9, 0.5));
  float invRes = 1.0 / max(10.0, u_resolution);

  for (int i = 0; i < 180; i++) {
    if (i >= u_steps) break;
    float t = t0 + (float(i) + 0.5) * stepLen;
    vec3 p = rayOrig + t * rayDir;

    vec3 uvw = (p - u_bMin) / (u_bMax - u_bMin);
    // Clamp uvw to avoid edge bleeding
    uvw = clamp(uvw, vec3(0.001), vec3(0.999));

    float d = texture(u_data, uvw).r;

    if (d > u_threshold) {
      float normD = (d - u_threshold) / max(0.001, 1.0 - u_threshold);
      // Intensity modulates opacity (alpha) directly with density falloff
      float s = pow(normD, u_densityPower);

      // Single chosen color per plot with directional & ambient 3D shading
      vec3 normal = sampleNormal(uvw, invRes * 1.5);
      float diff = max(dot(normal, lightDir), 0.0);
      float hemi = normal.y * 0.25 + 0.75;
      vec3 litColor = u_baseColor * (0.45 + 0.55 * diff * hemi);

      // Solid core isosurface enhancement with specular gloss and inner brightness
      if (u_coreIso > 0.01 && d > 0.35) {
        float coreT = smoothstep(0.35, 0.80, d) * u_coreIso;
        vec3 h = normalize(lightDir - rayDir);
        float spec = pow(max(dot(normal, h), 0.0), 20.0) * 0.5;
        vec3 coreColor = mix(litColor, u_baseColor * 1.25 + vec3(spec), coreT * 0.9);
        litColor = mix(litColor, coreColor, coreT);
        s = mix(s, 1.0, coreT * 0.7);
      }

      float alpha = s * u_opacity * stepLen * u_densityMultiplier * 3.5;
      alpha = clamp(alpha, 0.0, 1.0);

      acc.rgb += (1.0 - acc.a) * litColor * alpha;
      acc.a += (1.0 - acc.a) * alpha;

      if (acc.a >= 0.98) break;
    }
  }

  if (acc.a < 0.005) discard;
  gl_FragColor = acc;
}
`;

function getColormapIndex(name?: string): number {
  if (!name) return 0;
  const n = name.toLowerCase();
  if (n === 'thermal' || n === 'hot' || n === 'afmhot') return 0;
  if (n === 'turbo') return 1;
  if (n === 'plasma') return 2;
  if (n === 'viridis') return 3;
  if (n === 'magma') return 4;
  if (n === 'coolwarm') return 5;
  return 6; // custom
}

/**
 * 3D Continuous Volumetric Density Plot builder for scalar potential fields
 * Uses GPU 3D texture raymarching with trilinear interpolation and smooth transfer function.
 * Zero visible points — seamless solid object shape and smooth volumetric cloud.
 */
export function buildDensityPlotObject(
  layer: LayerItem,
  scope: Record<string, number>,
  settings: SceneSettings
): THREE.Group | null {
  if (!layer.eq) return null;

  try {
    const fastFn = getFastEvaluator(layer.eq);
    const R = layer.R || 5;
    const isSph = layer.type === 'densitySph';
    const isCyl = layer.type === 'densityCyl';

    // Resolution: 3D grid size (default 40x40x40 = 64,000 voxels for real-time raymarching)
    const Ngrid = Math.min(50, Math.max(28, layer.volumeResolution || 38));

    const xMin = settings.useCustomBounds ? settings.xMin : -R;
    const xMax = settings.useCustomBounds ? settings.xMax : R;
    const yMin = settings.useCustomBounds ? settings.yMin : -R;
    const yMax = settings.useCustomBounds ? settings.yMax : R;
    const zMin = settings.useCustomBounds ? settings.zMin : -R;
    const zMax = settings.useCustomBounds ? settings.zMax : R;

    const rawValues = new Float32Array(Ngrid * Ngrid * Ngrid);
    let minV = Infinity;
    let maxV = -Infinity;

    const stepX = (xMax - xMin) / (Ngrid - 1);
    const stepY = (yMax - yMin) / (Ngrid - 1);
    const stepZ = (zMax - zMin) / (Ngrid - 1);

    let idx = 0;

    // Grid ordering: i (Math X), k (Math Z / height), j (Math Y / depth)
    // to align directly with Three.js Box coordinate conventions
    for (let j = 0; j < Ngrid; j++) {
      const y = yMin + j * stepY;
      for (let k = 0; k < Ngrid; k++) {
        const z = zMin + k * stepZ;
        for (let i = 0; i < Ngrid; i++) {
          const x = xMin + i * stepX;
          let val = 0;

          try {
            if (isSph) {
              const rho = Math.sqrt(x * x + y * y + z * z);
              const theta = Math.atan2(y, x);
              const phi = Math.acos(Math.max(-1, Math.min(1, z / (rho + 1e-7))));
              val = fastFn(scope, x, y, z, scope.t, theta, phi, rho);
            } else if (isCyl) {
              const r = Math.sqrt(x * x + y * y);
              const theta = Math.atan2(y, x);
              val = fastFn(scope, x, y, z, scope.t, theta, undefined, undefined, r);
            } else {
              val = fastFn(scope, x, y, z, scope.t);
            }

            if (!isFinite(val) || isNaN(val)) val = 0;
          } catch {
            val = 0;
          }

          rawValues[idx++] = val;
          if (val < minV) minV = val;
          if (val > maxV) maxV = val;
        }
      }
    }

    if (!isFinite(minV) || !isFinite(maxV) || minV === maxV) {
      minV = 0;
      maxV = 1;
    }

    // Save computed bounds on layer for colorbar and legend
    layer.calculatedMin = minV;
    layer.calculatedMax = maxV;

    const diff = maxV - minV || 1;
    const uintData = new Uint8Array(rawValues.length);

    for (let m = 0; m < rawValues.length; m++) {
      const norm = Math.max(0, Math.min(1, (rawValues[m] - minV) / diff));
      uintData[m] = Math.round(norm * 255);
    }

    // Create 3D Texture with hardware trilinear filtering
    const texture3D = new THREE.Data3DTexture(uintData, Ngrid, Ngrid, Ngrid);
    texture3D.format = THREE.RedFormat;
    texture3D.type = THREE.UnsignedByteType;
    texture3D.minFilter = THREE.LinearFilter;
    texture3D.magFilter = THREE.LinearFilter;
    texture3D.unpackAlignment = 1;
    texture3D.needsUpdate = true;

    // Calculate world bounding box in Three.js coordinates
    const pMin = mapMathToThree(xMin, yMin, zMin, settings);
    const pMax = mapMathToThree(xMax, yMax, zMax, settings);

    const bMinWorld = new THREE.Vector3(
      Math.min(pMin[0], pMax[0]),
      Math.min(pMin[1], pMax[1]),
      Math.min(pMin[2], pMax[2])
    );
    const bMaxWorld = new THREE.Vector3(
      Math.max(pMin[0], pMax[0]),
      Math.max(pMin[1], pMax[1]),
      Math.max(pMin[2], pMax[2])
    );

    const size = new THREE.Vector3().subVectors(bMaxWorld, bMinWorld);
    const center = new THREE.Vector3().addVectors(bMinWorld, bMaxWorld).multiplyScalar(0.5);

    const threshold = layer.threshold ?? 0.06;
    const densityPower = layer.densityPower ?? 1.2;
    const coreIso = layer.coreIso ?? 0.75;
    const volumeDensity = layer.volumeDensity ?? 1.4;
    const opacity = (settings.surfaceOpacity / 100) * 0.95;
    const baseColor = new THREE.Color(layer.color || '#9d8fff');

    const grp = new THREE.Group();

    // Volume Raymarch Mesh
    const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const volMat = new THREE.ShaderMaterial({
      vertexShader: VOLUME_VERTEX_SHADER,
      fragmentShader: VOLUME_FRAGMENT_SHADER,
      uniforms: {
        u_data: { value: texture3D },
        u_bMin: { value: bMinWorld },
        u_bMax: { value: bMaxWorld },
        u_threshold: { value: threshold },
        u_opacity: { value: opacity },
        u_densityPower: { value: densityPower },
        u_coreIso: { value: coreIso },
        u_densityMultiplier: { value: volumeDensity },
        u_baseColor: { value: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b) },
        u_steps: { value: 140 },
        u_resolution: { value: Ngrid },
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const volMesh = new THREE.Mesh(boxGeo, volMat);
    volMesh.position.copy(center);
    grp.add(volMesh);

    // Wireframe Bounding Box Cage (like in scientific visualization / ParaView)
    if (layer.showBoundingBox !== false) {
      const cageGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
      const cageEdges = new THREE.EdgesGeometry(cageGeo);
      const cageMat = new THREE.LineBasicMaterial({
        color: 0x383842,
        transparent: true,
        opacity: 0.75,
      });
      const cage = new THREE.LineSegments(cageEdges, cageMat);
      cage.position.copy(center);
      grp.add(cage);
    }

    return grp;
  } catch (err) {
    console.error('Error generating 3D volumetric density plot:', err);
    return null;
  }
}

interface Bounds3D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}

/**
 * Traces 3D Streamlines / Field Lines (like in electromagnetism) with Runge-Kutta 4th order
 * integration, uniform spatial separation, closed loop detection, and arc-length spaced arrowheads.
 */
function buildStreamlinesAndArrows(
  evalField: (x: number, y: number, z: number) => [number, number, number] | null,
  bounds: Bounds3D,
  layer: LayerItem,
  settings: SceneSettings
): THREE.Group {
  const grp = new THREE.Group();
  const colHex = parseInt(layer.color.replace('#', '0x'), 16);
  const mode = layer.fieldDisplay || 'fieldlines'; // 'fieldlines' | 'vectors' | 'both'
  const { xMin, xMax, yMin, yMax, zMin, zMax } = bounds;

  const dx = xMax - xMin;
  const dy = yMax - yMin;
  const dz = zMax - zMin;
  const diag = Math.sqrt(dx * dx + dy * dy + dz * dz) || 10;
  const scaleX = settings.scaleX ?? 1;
  const scaleY = settings.scaleY ?? 1;
  const scaleZ = settings.scaleZ ?? 1;

  // 1. Render Discrete Vectors if 'vectors' or 'both'
  if (mode === 'vectors' || mode === 'both') {
    const gridN = 6;
    const stepX = dx / gridN;
    const stepY = dy / gridN;
    const stepZ = dz / gridN;
    const arrowLen = Math.min(stepX, stepY, stepZ) * 0.75;

    for (let i = 0; i <= gridN; i++) {
      for (let j = 0; j <= gridN; j++) {
        for (let k = 0; k <= gridN; k++) {
          const x = xMin + i * stepX;
          const y = yMin + j * stepY;
          const z = zMin + k * stepZ;
          const v = evalField(x, y, z);
          if (!v) continue;
          const [vx, vy, vz] = v;
          const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (len < 1e-6 || !isFinite(len)) continue;

          const basePos = mapMathToThree(x, y, z, settings);
          const dirVec = new THREE.Vector3(
            (vx / len) * scaleX,
            (vz / len) * scaleZ,
            (vy / len) * scaleY
          ).normalize();

          grp.add(
            new THREE.ArrowHelper(
              dirVec,
              new THREE.Vector3(...basePos),
              arrowLen,
              colHex,
              arrowLen * 0.35,
              arrowLen * 0.18
            )
          );
        }
      }
    }
  }

  // 2. Render Connected Streamlines (Field Lines) with Arrow Heads if 'fieldlines' or 'both'
  if (mode === 'fieldlines' || mode === 'both') {
    const targetLines = layer.streamlineCount || 36;
    const ds = Math.max(0.025, diag / 140); // RK4 step size for smooth curves
    const maxSteps = 380; // High max steps to complete full 2pi closed orbits
    // Separation distance between distinct streamlines to avoid duplicate overlapping tracks
    const minSeparation = diag / (Math.cbrt(targetLines) * 4.2);
    const minSepSq = (0.55 * minSeparation) ** 2;

    // RK4 normalized direction step helper
    const getUnitV = (px: number, py: number, pz: number): [number, number, number] | null => {
      const v = evalField(px, py, pz);
      if (!v) return null;
      const [vx, vy, vz] = v;
      const mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (mag < 1e-6 || !isFinite(mag)) return null;
      return [vx / mag, vy / mag, vz / mag];
    };

    const rk4Step = (
      px: number,
      py: number,
      pz: number,
      step: number
    ): [number, number, number] | null => {
      const k1 = getUnitV(px, py, pz);
      if (!k1) return null;

      const k2 = getUnitV(px + 0.5 * step * k1[0], py + 0.5 * step * k1[1], pz + 0.5 * step * k1[2]);
      if (!k2) return null;

      const k3 = getUnitV(px + 0.5 * step * k2[0], py + 0.5 * step * k2[1], pz + 0.5 * step * k2[2]);
      if (!k3) return null;

      const k4 = getUnitV(px + step * k3[0], py + step * k3[1], pz + step * k3[2]);
      if (!k4) return null;

      return [
        px + (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
        py + (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
        pz + (step / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
      ];
    };

    const isInsideBounds = (px: number, py: number, pz: number) => {
      return (
        px >= xMin - 0.1 * dx &&
        px <= xMax + 0.1 * dx &&
        py >= yMin - 0.1 * dy &&
        py <= yMax + 0.1 * dy &&
        pz >= zMin - 0.1 * dz &&
        pz <= zMax + 0.1 * dz
      );
    };

    // Coordinate-Aware Candidate Seed Points covering full 2pi angles and multiple radii
    const candidateSeeds: [number, number, number][] = [];
    const R_max = Math.min(dx, dy, dz) * 0.46;

    if (layer.type === 'fieldSph') {
      // Concentric spherical shells across multiple radii and full 2pi angles
      const nRadii = 5;
      const radii: number[] = [];
      for (let rIdx = 1; rIdx <= nRadii; rIdx++) {
        radii.push((rIdx / (nRadii + 0.1)) * R_max);
      }

      // Complete 2pi range of azimuthal angles
      const nThetas = 16;
      const thetas: number[] = [];
      for (let t = 0; t < nThetas; t++) {
        thetas.push((t / nThetas) * 2 * Math.PI);
      }

      // Polar angles from north pole to south pole
      const phis = [
        Math.PI * 0.15,
        Math.PI * 0.28,
        Math.PI * 0.42,
        Math.PI * 0.5, // Equator
        Math.PI * 0.58,
        Math.PI * 0.72,
        Math.PI * 0.85,
      ];

      for (const rad of radii) {
        for (const phi of phis) {
          for (const th of thetas) {
            const sx = rad * Math.sin(phi) * Math.cos(th);
            const sy = rad * Math.sin(phi) * Math.sin(th);
            const sz = rad * Math.cos(phi);
            candidateSeeds.push([sx, sy, sz]);
          }
        }
      }
    } else if (layer.type === 'fieldCyl') {
      // Cylindrical shells: multiple radii, full 2pi angles, multiple heights
      const nRadii = 5;
      const radii: number[] = [];
      for (let rIdx = 1; rIdx <= nRadii; rIdx++) {
        radii.push((rIdx / (nRadii + 0.1)) * R_max);
      }

      const nThetas = 16;
      const thetas: number[] = [];
      for (let t = 0; t < nThetas; t++) {
        thetas.push((t / nThetas) * 2 * Math.PI);
      }

      const nZ = 6;
      for (const rad of radii) {
        for (let zi = 1; zi < nZ; zi++) {
          const sz = zMin + (zi / nZ) * dz;
          for (const th of thetas) {
            candidateSeeds.push([rad * Math.cos(th), rad * Math.sin(th), sz]);
          }
        }
      }
    } else {
      // Cartesian: 3D grid plus concentric cylindrical rings for vortex / dipole flows
      const nGrid = Math.max(5, Math.ceil(Math.cbrt(targetLines * 3)));
      for (let i = 1; i < nGrid; i++) {
        const x = xMin + (i / nGrid) * dx;
        for (let j = 1; j < nGrid; j++) {
          const y = yMin + (j / nGrid) * dy;
          for (let k = 1; k < nGrid; k++) {
            const z = zMin + (k / nGrid) * dz;
            candidateSeeds.push([x, y, z]);
          }
        }
      }

      const radii = [0.25 * R_max, 0.5 * R_max, 0.75 * R_max, 0.95 * R_max];
      const thetas = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
      const zLevels = [zMin + 0.25 * dz, zMin + 0.5 * dz, zMin + 0.75 * dz];
      for (const r of radii) {
        for (const z of zLevels) {
          for (const th of thetas) {
            candidateSeeds.push([r * Math.cos(th), r * Math.sin(th), z]);
          }
        }
      }
    }

    // Keep track of sampled points along already-plotted streamlines to prevent duplicate rings
    const sampledFieldPoints: [number, number, number][] = [];
    const isSeedOnExistingTrack = (px: number, py: number, pz: number) => {
      const len = sampledFieldPoints.length;
      for (let i = 0; i < len; i += 4) {
        const sp = sampledFieldPoints[i];
        const distSq = (px - sp[0]) ** 2 + (py - sp[1]) ** 2 + (pz - sp[2]) ** 2;
        if (distSq < minSepSq) return true;
      }
      return false;
    };

    const showArrowHeads = layer.showArrowHeads !== false;
    const avgScale = Math.min(scaleX, scaleY, scaleZ);
    const arrowConeGeo = new THREE.ConeGeometry(0.08 * avgScale, 0.25 * avgScale, 12);
    const arrowConeMat = new THREE.MeshStandardMaterial({
      color: colHex,
      roughness: 0.3,
      metalness: 0.15,
    });
    const lineMat = new THREE.LineBasicMaterial({
      color: colHex,
      transparent: true,
      opacity: 0.88,
    });

    const upVec = new THREE.Vector3(0, 1, 0);
    let acceptedLinesCount = 0;

    for (const [sx, sy, sz] of candidateSeeds) {
      if (acceptedLinesCount >= targetLines) break;
      if (!isInsideBounds(sx, sy, sz)) continue;
      if (isSeedOnExistingTrack(sx, sy, sz)) continue;

      const initialV = evalField(sx, sy, sz);
      if (!initialV) continue;

      // 1. Forward trace with closed loop detection
      const forwardPts: [number, number, number][] = [];
      let curX = sx, curY = sy, curZ = sz;
      let isClosedLoop = false;

      for (let s = 0; s < maxSteps; s++) {
        const next = rk4Step(curX, curY, curZ, ds);
        if (!next || !isInsideBounds(next[0], next[1], next[2])) break;

        // Check if trajectory looped back to start point (full 2pi closed orbit)
        if (s >= 14) {
          const distToStartSq = (next[0] - sx) ** 2 + (next[1] - sy) ** 2 + (next[2] - sz) ** 2;
          if (distToStartSq < (2.2 * ds) ** 2) {
            forwardPts.push([sx, sy, sz]); // Seamlessly close the circle
            isClosedLoop = true;
            break;
          }
        }

        forwardPts.push(next);
        curX = next[0]; curY = next[1]; curZ = next[2];
      }

      // 2. Backward trace (only if not already a closed circular loop)
      const backwardPts: [number, number, number][] = [];
      if (!isClosedLoop) {
        curX = sx; curY = sy; curZ = sz;
        for (let s = 0; s < maxSteps; s++) {
          const next = rk4Step(curX, curY, curZ, -ds);
          if (!next || !isInsideBounds(next[0], next[1], next[2])) break;
          backwardPts.push(next);
          curX = next[0]; curY = next[1]; curZ = next[2];
        }
      }

      // Assemble full continuous streamline curve
      const mathLine: [number, number, number][] = isClosedLoop
        ? [[sx, sy, sz], ...forwardPts]
        : [...backwardPts.reverse(), [sx, sy, sz], ...forwardPts];

      if (mathLine.length < 5) continue;

      // Calculate total curve arc length
      let totalArcLen = 0;
      const arcLengths: number[] = [0];
      for (let i = 1; i < mathLine.length; i++) {
        const p0 = mathLine[i - 1];
        const p1 = mathLine[i];
        const segLen = Math.sqrt((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2 + (p1[2] - p0[2]) ** 2);
        totalArcLen += segLen;
        arcLengths.push(totalArcLen);
      }

      if (totalArcLen < ds * 3) continue;

      // Register points along this accepted streamline to avoid re-tracing the same path
      const sampleStep = Math.max(1, Math.floor(mathLine.length / 16));
      for (let i = 0; i < mathLine.length; i += sampleStep) {
        sampledFieldPoints.push(mathLine[i]);
      }

      // Convert mathematical points to Three.js coordinates
      const threePts = mathLine.map(([mx, my, mz]) => {
        const p = mapMathToThree(mx, my, mz, settings);
        return new THREE.Vector3(p[0], p[1], p[2]);
      });

      // Construct continuous line
      const lineGeo = new THREE.BufferGeometry().setFromPoints(threePts);
      const line = new THREE.Line(lineGeo, lineMat);
      grp.add(line);

      // Place evenly spaced directional arrowheads along the actual curve arc length
      if (showArrowHeads && threePts.length >= 6) {
        // Closed loop gets 2 clean opposite arrows; open lines get 1-2 arrows based on length
        const arrowFractions = isClosedLoop
          ? [0.25, 0.75]
          : totalArcLen > diag * 0.35
          ? [0.35, 0.7]
          : [0.5];

        for (const frac of arrowFractions) {
          const targetDist = frac * totalArcLen;
          let bestIdx = 1;
          for (let i = 1; i < arcLengths.length - 1; i++) {
            if (arcLengths[i] >= targetDist) {
              bestIdx = i;
              break;
            }
          }

          if (bestIdx <= 0 || bestIdx >= threePts.length - 1) continue;
          const prev = threePts[bestIdx - 1];
          const next = threePts[bestIdx + 1];
          const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
          if (tangent.lengthSq() < 0.2) continue;

          const cone = new THREE.Mesh(arrowConeGeo, arrowConeMat);
          cone.quaternion.setFromUnitVectors(upVec, tangent);
          cone.position.copy(threePts[bestIdx]);
          grp.add(cone);
        }
      }

      acceptedLinesCount++;
    }
  }

  return grp;
}

export function buildShapeObject(
  layer: LayerItem,
  scope: Record<string, number>,
  settings: SceneSettings
): THREE.Object3D | null {
  const shapeType = layer.shapeType || 'sphere';
  const color = layer.color || '#6366f1';
  const wireframe = layer.shapeWireframe ?? settings.wireframe;
  const opacity = ((layer.shapeOpacity ?? 90) / 100) * (settings.surfaceOpacity / 100);
  const segments = Math.max(12, Math.min(80, layer.shapeSegments || 32));

  // Evaluate Center coordinates with coordinate system support (cart, sph, cyl)
  const c1 = evaluateNumericExpr(layer.shapeCenterX, scope, 0);
  const c2 = evaluateNumericExpr(layer.shapeCenterY, scope, 0);
  const c3 = evaluateNumericExpr(layer.shapeCenterZ, scope, 0);

  let cx = c1;
  let cy = c2;
  let cz = c3;

  const coordSystem = layer.shapeCoordSystem || 'cart';
  if (coordSystem === 'sph') {
    // Spherical coordinates: c1 = rho (radius), c2 = theta (azimuth), c3 = phi (inclination from +z)
    const rho = c1;
    const theta = c2;
    const phi = c3;
    cx = rho * Math.sin(phi) * Math.cos(theta);
    cy = rho * Math.sin(phi) * Math.sin(theta);
    cz = rho * Math.cos(phi);
  } else if (coordSystem === 'cyl') {
    // Cylindrical coordinates: c1 = r, c2 = theta, c3 = z
    const rVal = c1;
    const theta = c2;
    const zVal = c3;
    cx = rVal * Math.cos(theta);
    cy = rVal * Math.sin(theta);
    cz = zVal;
  }

  // Evaluate Dimensions
  const r = Math.max(0.01, evaluateNumericExpr(layer.shapeRadius, scope, 2));
  const r2 = Math.max(0.01, evaluateNumericExpr(layer.shapeRadius2, scope, 0.6));
  const r3 = Math.max(0.01, evaluateNumericExpr(layer.shapeRadius3, scope, 1.0));
  const w = Math.max(0.01, evaluateNumericExpr(layer.shapeWidth, scope, 3));
  const h = Math.max(0.01, evaluateNumericExpr(layer.shapeHeight, scope, 3));
  const d = Math.max(0.01, evaluateNumericExpr(layer.shapeDepth, scope, 3));

  const axis = layer.shapeAxis || 'z';

  let geo: THREE.BufferGeometry;

  switch (shapeType) {
    case 'sphere':
      geo = new THREE.SphereGeometry(r, segments, Math.round(segments * 0.75));
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(r, r, h, segments, 1, false);
      if (axis === 'z') {
        geo.rotateX(Math.PI / 2);
      } else if (axis === 'x') {
        geo.rotateZ(Math.PI / 2);
      }
      break;
    case 'cube':
      geo = new THREE.BoxGeometry(w, h, d);
      break;
    case 'cone':
      geo = new THREE.ConeGeometry(r, h, segments);
      if (axis === 'z') {
        geo.rotateX(Math.PI / 2);
      } else if (axis === 'x') {
        geo.rotateZ(Math.PI / 2);
      }
      break;
    case 'torus':
      geo = new THREE.TorusGeometry(r, r2, Math.round(segments * 0.6), segments);
      if (axis === 'z') {
        geo.rotateX(Math.PI / 2);
      } else if (axis === 'x') {
        geo.rotateY(Math.PI / 2);
      }
      break;
    case 'plane':
      geo = new THREE.PlaneGeometry(w, h, Math.round(segments / 2), Math.round(segments / 2));
      if (axis === 'z') {
        geo.rotateX(-Math.PI / 2);
      } else if (axis === 'x') {
        geo.rotateY(Math.PI / 2);
      }
      break;
    case 'ellipsoid':
      geo = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75));
      geo.scale(r, r3, r2); // Math X=r, Math Z=r3 (height), Math Y=r2
      break;
    default:
      geo = new THREE.SphereGeometry(r, segments, segments);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.35,
    metalness: 0.2,
    transparent: true,
    opacity,
    wireframe,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);

  // Position mesh at mapped coordinates
  const threePos = mapMathToThree(cx, cy, cz, settings);
  mesh.position.set(threePos[0], threePos[1], threePos[2]);

  const group = new THREE.Group();
  group.add(mesh);

  // If solid and shape is cube or cylinder, add subtle edge wireframe for crispness
  if (!wireframe && (shapeType === 'cube' || shapeType === 'cylinder')) {
    const edges = new THREE.EdgesGeometry(geo, 24);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(color).clone().lerp(new THREE.Color(0xffffff), 0.4),
      transparent: true,
      opacity: Math.min(1, opacity + 0.2),
    });
    const wire = new THREE.LineSegments(edges, lineMat);
    wire.position.copy(mesh.position);
    group.add(wire);
  }

  return group;
}

export function buildLayerThreeObject(
  layer: LayerItem,
  params: Record<string, ParamItem>,
  settings: SceneSettings,
  currentTime?: number
): THREE.Object3D | null {
  if (!layer.visible) return null;

  const baseScope = buildParamScope(params);
  const scope = {
    ...baseScope,
    t: currentTime !== undefined ? currentTime : (baseScope.t ?? 0),
    time: currentTime !== undefined ? currentTime : (baseScope.time ?? 0),
  };
  const tintRatio = settings.colorTint / 100;
  const opacity = settings.surfaceOpacity / 100;
  const wireframe = settings.wireframe;
  const R = layer.R || 5;
  const N = Math.max(10, layer.N || 55);

  const xMin = settings.useCustomBounds ? settings.xMin : -R;
  const xMax = settings.useCustomBounds ? settings.xMax : R;
  const yMin = settings.useCustomBounds ? settings.yMin : -R;
  const yMax = settings.useCustomBounds ? settings.yMax : R;
  const zMin = settings.useCustomBounds ? settings.zMin : -R;
  const zMax = settings.useCustomBounds ? settings.zMax : R;

  try {
    // Basic Shapes (Sphere, Cylinder, Cube, Cone, Torus, Plane, Ellipsoid)
    if (layer.type === 'shape') {
      return buildShapeObject(layer, scope, settings);
    }

    // 3D Density Plots (Cartesian, Spherical, Cylindrical)
    if (
      (layer.type === 'density' || layer.type === 'densitySph' || layer.type === 'densityCyl') &&
      layer.eq
    ) {
      return buildDensityPlotObject(layer, scope, settings);
    }
    if (layer.type === 'surface' && layer.eq) {
      const evalSurface = getFastEvaluator(layer.eq);
      const stepX = (xMax - xMin) / N;
      const stepY = (yMax - yMin) / N;

      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const x = xMin + i * stepX;
        const y = yMin + j * stepY;
        let z = 0;
        try {
          z = evalSurface(scope, x, y);
          if (!isFinite(z)) z = 0;
        } catch {
          z = 0;
        }
        const pos = mapMathToThree(x, y, z, settings);
        return { pos, val: z };
      });
    }

    if (layer.type === 'spherical' && layer.eq) {
      const evalSph = getFastEvaluator(layer.eq);
      const stepT = (2 * Math.PI) / N;
      const stepP = Math.PI / N;
      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const theta = i * stepT;
        const phi = j * stepP;
        let rho = 0;
        try {
          rho = evalSph(scope, undefined, undefined, undefined, undefined, theta, phi, undefined, undefined);
          if (!isFinite(rho)) rho = 0;
        } catch {
          rho = 0;
        }
        const x = rho * Math.sin(phi) * Math.cos(theta);
        const y = rho * Math.sin(phi) * Math.sin(theta);
        const z = rho * Math.cos(phi);
        const pos = mapMathToThree(x, y, z, settings);
        return { pos, val: rho };
      });
    }

    if (layer.type === 'cylindrical' && layer.eq) {
      const evalCyl = getFastEvaluator(layer.eq);
      const stepT = (2 * Math.PI) / N;
      const stepZ = (zMax - zMin) / N;
      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const theta = i * stepT;
        const z = zMin + j * stepZ;
        let r = 0;
        try {
          r = evalCyl(scope, undefined, undefined, z, undefined, theta);
          if (!isFinite(r)) r = 0;
        } catch {
          r = 0;
        }
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const pos = mapMathToThree(x, y, z, settings);
        return { pos, val: r };
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
      const evalFx = getFastEvaluator(fxE);
      const evalFy = getFastEvaluator(fyE);
      const evalFz = getFastEvaluator(fzE);

      const evalField = (x: number, y: number, z: number): [number, number, number] | null => {
        try {
          const vx = evalFx(scope, x, y, z);
          const vy = evalFy(scope, x, y, z);
          const vz = evalFz(scope, x, y, z);
          if (!isFinite(vx) || !isFinite(vy) || !isFinite(vz)) return null;
          return [vx, vy, vz];
        } catch {
          return null;
        }
      };

      return buildStreamlinesAndArrows(
        evalField,
        { xMin, xMax, yMin, yMax, zMin, zMax },
        layer,
        settings
      );
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
      const evalFr = getFastEvaluator(frE);
      const evalFt = getFastEvaluator(ftE);
      const evalFp = getFastEvaluator(fpE);

      const evalField = (x: number, y: number, z: number): [number, number, number] | null => {
        try {
          const rho = Math.sqrt(x * x + y * y + z * z);
          if (rho < 1e-6) return null;
          const rxy = Math.sqrt(x * x + y * y);
          let theta = Math.atan2(y, x);
          if (theta < 0) theta += 2 * Math.PI;
          const phi = Math.acos(Math.max(-1, Math.min(1, z / rho)));

          const frV = evalFr(scope, undefined, undefined, undefined, undefined, theta, phi, rho);
          const ftV = evalFt(scope, undefined, undefined, undefined, undefined, theta, phi, rho);
          const fpV = evalFp(scope, undefined, undefined, undefined, undefined, theta, phi, rho);
          if (!isFinite(frV) || !isFinite(ftV) || !isFinite(fpV)) return null;

          const sinP = Math.sin(phi);
          const cosP = Math.cos(phi);
          const sinT = Math.sin(theta);
          const cosT = Math.cos(theta);

          const vx = frV * sinP * cosT + fpV * cosP * cosT - ftV * sinT;
          const vy = frV * sinP * sinT + fpV * cosP * sinT + ftV * cosT;
          const vz = frV * cosP - fpV * sinP;

          return [vx, vy, vz];
        } catch {
          return null;
        }
      };

      return buildStreamlinesAndArrows(
        evalField,
        { xMin, xMax, yMin, yMax, zMin, zMax },
        layer,
        settings
      );
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
      const evalFr = getFastEvaluator(frE);
      const evalFt = getFastEvaluator(ftE);
      const evalFz = getFastEvaluator(fzE);

      const evalField = (x: number, y: number, z: number): [number, number, number] | null => {
        try {
          const r = Math.sqrt(x * x + y * y);
          let theta = Math.atan2(y, x);
          if (theta < 0) theta += 2 * Math.PI;

          const frV = evalFr(scope, undefined, undefined, z, undefined, theta, undefined, undefined, r);
          const ftV = evalFt(scope, undefined, undefined, z, undefined, theta, undefined, undefined, r);
          const fzV = evalFz(scope, undefined, undefined, z, undefined, theta, undefined, undefined, r);
          if (!isFinite(frV) || !isFinite(ftV) || !isFinite(fzV)) return null;

          const cosT = Math.cos(theta);
          const sinT = Math.sin(theta);
          const vx = frV * cosT - ftV * sinT;
          const vy = frV * sinT + ftV * cosT;
          const vz = fzV;

          return [vx, vy, vz];
        } catch {
          return null;
        }
      };

      return buildStreamlinesAndArrows(
        evalField,
        { xMin, xMax, yMin, yMax, zMin, zMax },
        layer,
        settings
      );
    }

    if (layer.type === 'param' && layer.px && layer.py && layer.pz) {
      const evalPx = getFastEvaluator(layer.px);
      const evalPy = getFastEvaluator(layer.py);
      const evalPz = getFastEvaluator(layer.pz);
      return makeCurveLine(layer.color, (tVal) => {
        const x = evalPx(scope, 0, 0, 0, tVal);
        const y = evalPy(scope, 0, 0, 0, tVal);
        const z = evalPz(scope, 0, 0, 0, tVal);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return null;
        return mapMathToThree(x, y, z, settings);
      });
    }

    if (layer.type === 'paramSph' && layer.pRho && layer.pTheta && layer.pPhi) {
      const evalRho = getFastEvaluator(layer.pRho);
      const evalTheta = getFastEvaluator(layer.pTheta);
      const evalPhi = getFastEvaluator(layer.pPhi);
      return makeCurveLine(layer.color, (tVal) => {
        const rho = evalRho(scope, 0, 0, 0, tVal);
        const theta = evalTheta(scope, 0, 0, 0, tVal);
        const phi = evalPhi(scope, 0, 0, 0, tVal);
        if (!isFinite(rho) || !isFinite(theta) || !isFinite(phi)) return null;
        const x = rho * Math.sin(phi) * Math.cos(theta);
        const y = rho * Math.sin(phi) * Math.sin(theta);
        const z = rho * Math.cos(phi);
        return mapMathToThree(x, y, z, settings);
      });
    }

    if (layer.type === 'paramCyl' && layer.pR && layer.pThetaC && layer.pZ) {
      const evalR = getFastEvaluator(layer.pR);
      const evalTheta = getFastEvaluator(layer.pThetaC);
      const evalZ = getFastEvaluator(layer.pZ);
      return makeCurveLine(layer.color, (tVal) => {
        const r = evalR(scope, 0, 0, 0, tVal);
        const theta = evalTheta(scope, 0, 0, 0, tVal);
        const z = evalZ(scope, 0, 0, 0, tVal);
        if (!isFinite(r) || !isFinite(theta) || !isFinite(z)) return null;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        return mapMathToThree(x, y, z, settings);
      });
    }

    if (layer.type === 'script' && layer.script) {
      const grp = new THREE.Group();
      const color = layer.color;
      const base = new THREE.Color(color);

      // Execute Python script synchronously
      const pyResult = runPythonScriptSync(layer.script, scope);

      // 1. Render 3D Point Cloud / Scatter / Attractors
      if (pyResult.points3d && pyResult.points3d.length > 0) {
        const rawPoints = pyResult.points3d;
        const count = Math.floor(rawPoints.length / 3);
        const transformedPoints = new Float32Array(count * 3);
        const cols = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
          const rx = rawPoints[i * 3];
          const ry = rawPoints[i * 3 + 1];
          const rz = rawPoints[i * 3 + 2];
          const p = mapMathToThree(rx, ry, rz, settings);
          transformedPoints[i * 3] = p[0];
          transformedPoints[i * 3 + 1] = p[1];
          transformedPoints[i * 3 + 2] = p[2];

          const c2 = base.clone().lerp(new THREE.Color(0xffffff), (i / count) * 0.45);
          cols[i * 3] = c2.r;
          cols[i * 3 + 1] = c2.g;
          cols[i * 3 + 2] = c2.b;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(transformedPoints, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        grp.add(
          new THREE.Points(
            geo,
            new THREE.PointsMaterial({
              vertexColors: true,
              size: 0.1,
              transparent: true,
              opacity: 0.9,
            })
          )
        );
      }

      // 2. Render Python Surfaces (Cartesian, Spherical, Cylindrical, Parametric UV, NumPy Grid)
      if (pyResult.surfaces && pyResult.surfaces.length > 0) {
        pyResult.surfaces.forEach((surf) => {
          if (surf.mode === 'sph' && surf.fn) {
            const sf = surf.fn;
            const stepT = (2 * Math.PI) / N;
            const stepP = Math.PI / N;
            const mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
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
              return { pos: mapMathToThree(x, y, z, settings), val: rho };
            });
            grp.add(mesh);
          } else if (surf.mode === 'cyl' && surf.fn) {
            const sf = surf.fn;
            const stepT = (2 * Math.PI) / N;
            const stepZ = (zMax - zMin) / N;
            const mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
              const theta = i * stepT;
              const z = zMin + j * stepZ;
              let r = 0;
              try {
                r = sf(theta, z);
                if (!isFinite(r)) r = 0;
              } catch {
                r = 0;
              }
              const x = r * Math.cos(theta);
              const y = r * Math.sin(theta);
              return { pos: mapMathToThree(x, y, z, settings), val: r };
            });
            grp.add(mesh);
          } else if (surf.mode === 'uv' && surf.uvFn) {
            const uvFn = surf.uvFn;
            const nu = surf.nu || N;
            const nv = surf.nv || Math.max(16, Math.floor(N / 2));
            const [uMin, uMax] = surf.uRange || [0, 2 * Math.PI];
            const [vMin, vMax] = surf.vRange || [-1, 1];
            const stepU = (uMax - uMin) / nu;
            const stepV = (vMax - vMin) / nv;

            const mesh = makeGridSurfaceMesh(
              nu,
              color,
              tintRatio,
              opacity,
              wireframe,
              (i, j) => {
                const u = uMin + i * stepU;
                const v = vMin + j * stepV;
                let p: [number, number, number] = [0, 0, 0];
                try {
                  const res = uvFn(u, v);
                  if (res && isFinite(res[0]) && isFinite(res[1]) && isFinite(res[2])) {
                    p = res;
                  }
                } catch {
                  // fallback to zero
                }
                return { pos: mapMathToThree(p[0], p[1], p[2], settings), val: p[2] };
              },
              nv
            );
            grp.add(mesh);
          } else if (surf.mode === 'grid' && surf.grid) {
            const { X, Y, Z } = surf.grid;
            const rows = X.length;
            const cols = X[0]?.length || 0;
            if (rows > 1 && cols > 1) {
              const mesh = makeGridSurfaceMesh(
                rows - 1,
                color,
                tintRatio,
                opacity,
                wireframe,
                (i, j) => {
                  const x = Number(X[i]?.[j] ?? 0);
                  const y = Number(Y[i]?.[j] ?? 0);
                  const z = Number(Z[i]?.[j] ?? 0);
                  return { pos: mapMathToThree(x, y, z, settings), val: z };
                },
                cols - 1
              );
              grp.add(mesh);
            }
          } else if (surf.fn) {
            const sf = surf.fn;
            const stepX = (xMax - xMin) / N;
            const stepY = (yMax - yMin) / N;
            const mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
              const x = xMin + i * stepX;
              const y = yMin + j * stepY;
              let z = 0;
              try {
                z = sf(x, y);
                if (!isFinite(z)) z = 0;
              } catch {
                z = 0;
              }
              return { pos: mapMathToThree(x, y, z, settings), val: z };
            });
            grp.add(mesh);
          }
        });
      }

      // 3. Render Python 3D Space Curves
      if (pyResult.curves && pyResult.curves.length > 0) {
        pyResult.curves.forEach((curve) => {
          if (curve.fn) {
            const curveFn = curve.fn;
            grp.add(
              makeCurveLine(color, (t) => {
                const r = curveFn(t);
                if (!r) return null;
                return mapMathToThree(r[0], r[1], r[2], settings);
              })
            );
          }
        });
      }

      // 4. Render Python Custom Meshes
      if (pyResult.meshes && pyResult.meshes.length > 0) {
        pyResult.meshes.forEach((meshItem) => {
          const { pts, rows, cols: C } = meshItem;
          const count = rows * C;
          const rawPts = pts instanceof Float32Array ? pts : new Float32Array(pts);

          if (rawPts.length >= count * 3) {
            const transformedPts = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
              const rawX = rawPts[i * 3];
              const rawZ = rawPts[i * 3 + 1];
              const rawY = rawPts[i * 3 + 2];
              const tp = mapMathToThree(rawX, rawY, rawZ, settings);
              transformedPts[i * 3] = tp[0];
              transformedPts[i * 3 + 1] = tp[1];
              transformedPts[i * 3 + 2] = tp[2];
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(transformedPts, 3));
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
        });
      }

      return grp;
    }
  } catch (err) {
    console.error('Error generating 3D layer:', err);
  }

  return null;
}
