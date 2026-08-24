import * as THREE from 'three';
import * as math from 'mathjs';
import { LayerItem, ParamItem, SceneSettings } from '../types';
import { buildParamScope, getColorFromColormap, transformCoord } from './mathUtils';

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
uniform int u_colormap;
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

vec3 getColormapColor(float t, int cmap, vec3 base) {
  t = clamp(t, 0.0, 1.0);
  if (cmap == 0) {
    // Thermal / AFMHot: Black -> Red -> Orange -> Yellow -> White (as in scientific density plots)
    if (t < 0.25) {
      return mix(vec3(0.02, 0.02, 0.03), vec3(0.72, 0.08, 0.02), t / 0.25);
    } else if (t < 0.55) {
      return mix(vec3(0.72, 0.08, 0.02), vec3(1.0, 0.55, 0.05), (t - 0.25) / 0.30);
    } else if (t < 0.85) {
      return mix(vec3(1.0, 0.55, 0.05), vec3(1.0, 0.95, 0.25), (t - 0.55) / 0.30);
    } else {
      return mix(vec3(1.0, 0.95, 0.25), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
    }
  } else if (cmap == 1) {
    // Turbo
    if (t < 0.2) return mix(vec3(0.188, 0.07, 0.231), vec3(0.274, 0.384, 0.847), t / 0.2);
    else if (t < 0.4) return mix(vec3(0.274, 0.384, 0.847), vec3(0.102, 0.894, 0.714), (t - 0.2) / 0.2);
    else if (t < 0.6) return mix(vec3(0.102, 0.894, 0.714), vec3(0.635, 0.988, 0.235), (t - 0.4) / 0.2);
    else if (t < 0.8) return mix(vec3(0.635, 0.988, 0.235), vec3(0.984, 0.502, 0.133), (t - 0.6) / 0.2);
    else return mix(vec3(0.984, 0.502, 0.133), vec3(0.478, 0.015, 0.012), (t - 0.8) / 0.2);
  } else if (cmap == 2) {
    // Plasma
    if (t < 0.25) return mix(vec3(0.05, 0.03, 0.53), vec3(0.41, 0.0, 0.66), t / 0.25);
    else if (t < 0.5) return mix(vec3(0.41, 0.0, 0.66), vec3(0.69, 0.16, 0.56), (t - 0.25) / 0.25);
    else if (t < 0.75) return mix(vec3(0.69, 0.16, 0.56), vec3(0.88, 0.39, 0.38), (t - 0.5) / 0.25);
    else return mix(vec3(0.88, 0.39, 0.38), vec3(0.94, 0.97, 0.13), (t - 0.75) / 0.25);
  } else if (cmap == 3) {
    // Viridis
    if (t < 0.25) return mix(vec3(0.267, 0.004, 0.329), vec3(0.231, 0.322, 0.545), t / 0.25);
    else if (t < 0.5) return mix(vec3(0.231, 0.322, 0.545), vec3(0.129, 0.569, 0.549), (t - 0.25) / 0.25);
    else if (t < 0.75) return mix(vec3(0.129, 0.569, 0.549), vec3(0.369, 0.788, 0.384), (t - 0.5) / 0.25);
    else return mix(vec3(0.369, 0.788, 0.384), vec3(0.992, 0.906, 0.145), (t - 0.75) / 0.25);
  } else if (cmap == 4) {
    // Magma
    if (t < 0.33) return mix(vec3(0.0, 0.0, 0.015), vec3(0.318, 0.07, 0.486), t / 0.33);
    else if (t < 0.66) return mix(vec3(0.318, 0.07, 0.486), vec3(0.718, 0.216, 0.475), (t - 0.33) / 0.33);
    else return mix(vec3(0.718, 0.216, 0.475), vec3(0.988, 0.992, 0.749), (t - 0.66) / 0.34);
  } else if (cmap == 5) {
    // Coolwarm
    if (t < 0.5) return mix(vec3(0.23, 0.3, 0.75), vec3(0.86, 0.86, 0.86), t / 0.5);
    else return mix(vec3(0.86, 0.86, 0.86), vec3(0.7, 0.015, 0.15), (t - 0.5) / 0.5);
  } else {
    // Custom tint
    if (t < 0.5) return mix(vec3(0.06, 0.06, 0.09), base, t * 2.0);
    else return mix(base, vec3(1.0, 1.0, 1.0), (t - 0.5) * 1.5);
  }
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
      float s = pow(normD, u_densityPower);

      vec3 col = getColormapColor(d, u_colormap, u_baseColor);

      // Smooth 3D surface shading with normal gradients
      vec3 normal = sampleNormal(uvw, invRes * 1.5);
      float diff = max(dot(normal, lightDir), 0.0);
      float hemi = normal.y * 0.2 + 0.8;
      vec3 litColor = col * (0.4 + 0.6 * diff * hemi);

      // Solid core isosurface enhancement
      if (u_coreIso > 0.01 && d > 0.38) {
        float coreT = smoothstep(0.38, 0.80, d) * u_coreIso;
        vec3 h = normalize(lightDir - rayDir);
        float spec = pow(max(dot(normal, h), 0.0), 20.0) * 0.45;
        litColor = mix(litColor, col * 0.95 + vec3(spec), coreT * 0.85);
        s = mix(s, 1.0, coreT * 0.65);
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
    const compiled = math.compile(layer.eq);
    const R = layer.R || 5;
    const isSph = layer.type === 'densitySph';
    const isCyl = layer.type === 'densityCyl';

    // Resolution: 3D grid size (default 48x48x48 = 110,592 voxels for smooth rendering)
    const Ngrid = Math.min(64, Math.max(32, layer.volumeResolution || 48));

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
              val = compiled.evaluate({ ...scope, rho, theta, phi, x, y, z });
            } else if (isCyl) {
              const r = Math.sqrt(x * x + y * y);
              const theta = Math.atan2(y, x);
              val = compiled.evaluate({ ...scope, r, theta, z, x, y });
            } else {
              val = compiled.evaluate({ ...scope, x, y, z });
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
    const colormapIdx = getColormapIndex(layer.colorMap || 'thermal');
    const baseColor = new THREE.Color(layer.color);

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
        u_colormap: { value: colormapIdx },
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

  const xMin = settings.useCustomBounds ? settings.xMin : -R;
  const xMax = settings.useCustomBounds ? settings.xMax : R;
  const yMin = settings.useCustomBounds ? settings.yMin : -R;
  const yMax = settings.useCustomBounds ? settings.yMax : R;
  const zMin = settings.useCustomBounds ? settings.zMin : -R;
  const zMax = settings.useCustomBounds ? settings.zMax : R;

  try {
    // 3D Density Plots (Cartesian, Spherical, Cylindrical)
    if (
      (layer.type === 'density' || layer.type === 'densitySph' || layer.type === 'densityCyl') &&
      layer.eq
    ) {
      return buildDensityPlotObject(layer, scope, settings);
    }

    if (layer.type === 'surface' && layer.eq) {
      const compiled = math.compile(layer.eq);
      const stepX = (xMax - xMin) / N;
      const stepY = (yMax - yMin) / N;

      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const x = xMin + i * stepX;
        const y = yMin + j * stepY;
        let z = 0;
        try {
          z = compiled.evaluate({ ...scope, x, y });
          if (!isFinite(z)) z = 0;
        } catch {
          z = 0;
        }
        const pos = mapMathToThree(x, y, z, settings);
        return { pos, val: z };
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
        const pos = mapMathToThree(x, y, z, settings);
        return { pos, val: rho };
      });
    }

    if (layer.type === 'cylindrical' && layer.eq) {
      const compiled = math.compile(layer.eq);
      const stepT = (2 * Math.PI) / N;
      const stepZ = (zMax - zMin) / N;
      return makeGridSurfaceMesh(N, layer.color, tintRatio, opacity, wireframe, (i, j) => {
        const theta = i * stepT;
        const z = zMin + j * stepZ;
        let r = 0;
        try {
          r = compiled.evaluate({ ...scope, theta, z });
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
      const fx = math.compile(fxE);
      const fy = math.compile(fyE);
      const fz = math.compile(fzE);
      const grp = new THREE.Group();
      const stepX = (xMax - xMin) / 6;
      const stepY = (yMax - yMin) / 6;
      const stepZ = (zMax - zMin) / 6;
      const col = parseInt(layer.color.replace('#', '0x'), 16);

      for (let i = 0; i <= 6; i++) {
        for (let j = 0; j <= 6; j++) {
          for (let k = 0; k <= 6; k++) {
            const x = xMin + i * stepX;
            const y = yMin + j * stepY;
            const z = zMin + k * stepZ;
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
            const sc = stepX * 0.45;
            const basePos = mapMathToThree(x, y, z, settings);
            // Direction mapped to Three.js orientation: [vx, vz, vy]
            const dirVec = new THREE.Vector3(
              vx / len * (settings.scaleX ?? 1),
              vz / len * (settings.scaleZ ?? 1),
              vy / len * (settings.scaleY ?? 1)
            ).normalize();

            grp.add(
              new THREE.ArrowHelper(
                dirVec,
                new THREE.Vector3(...basePos),
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
            const basePos = mapMathToThree(x, y, z, settings);
            const dirVec = new THREE.Vector3(
              vx / len * (settings.scaleX ?? 1),
              vz / len * (settings.scaleZ ?? 1),
              vy / len * (settings.scaleY ?? 1)
            ).normalize();

            grp.add(
              new THREE.ArrowHelper(
                dirVec,
                new THREE.Vector3(...basePos),
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
      const stepZ = (zMax - zMin) / 6;

      for (let i = 1; i <= 3; i++) {
        for (let j = 0; j <= 8; j++) {
          for (let k = 0; k <= 6; k++) {
            const r = i * stepR;
            const theta = j * stepT;
            const z = zMin + k * stepZ;
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
            const basePos = mapMathToThree(x, y, z, settings);
            const dirVec = new THREE.Vector3(
              vx / len * (settings.scaleX ?? 1),
              vz / len * (settings.scaleZ ?? 1),
              vy / len * (settings.scaleY ?? 1)
            ).normalize();

            grp.add(
              new THREE.ArrowHelper(
                dirVec,
                new THREE.Vector3(...basePos),
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
        return mapMathToThree(x, y, z, settings);
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
        return mapMathToThree(x, y, z, settings);
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
        return mapMathToThree(x, y, z, settings);
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
            const p = mapMathToThree(x, y, z, settings);
            points3d.push(p[0], p[1], p[2]);
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
            return mapMathToThree(r[0], r[1], r[2], settings);
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
            return mapMathToThree(x, y, z, settings);
          });
        },
        plotCurveCyl: (fn: (t: number) => [number, number, number]) => {
          curveFns.push((t) => {
            const r = fn(t);
            if (!r) return null;
            const [rr, theta, z] = r;
            const x = rr * Math.cos(theta);
            const y = rr * Math.sin(theta);
            return mapMathToThree(x, y, z, settings);
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
        grp.add(new THREE.Points(geo, new THREE.PointsMaterial({ vertexColors: true, size: 0.1 })));
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
            return { pos: mapMathToThree(x, y, z, settings), val: rho };
          });
        } else if (mode === 'cyl') {
          const stepT = (2 * Math.PI) / N;
          const stepZ = (zMax - zMin) / N;
          mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
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
        } else {
          const stepX = (xMax - xMin) / N;
          const stepY = (yMax - yMin) / N;
          mesh = makeGridSurfaceMesh(N, color, tintRatio, opacity, wireframe, (i, j) => {
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
          const transformedPts = new Float32Array(count * 3);
          for (let i = 0; i < count; i++) {
            const rawX = pts[i * 3];
            const rawZ = pts[i * 3 + 1];
            const rawY = pts[i * 3 + 2];
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
      }

      return grp;
    }
  } catch (err) {
    console.error('Error generating 3D layer:', err);
  }

  return null;
}
