export const PALETTE = [
  '#9d8fff',
  '#ff6b6b',
  '#4ecca3',
  '#ffd060',
  '#60b4ff',
  '#ff85c8',
  '#5ef8c8',
  '#ffb07c',
  '#b8ff7c',
  '#88ccff',
  '#d4b8ff',
  '#ffd4a0',
];

export const SCRIPT_PRESETS: Record<string, string> = {
  sinc: `// Sinc 3D Surface
plotSurface((x, y) => {
  const r = Math.sqrt(x*x + y*y) + 0.001;
  return (Math.sin(r) / r) * 3;
});`,
  densityDipole: `// Electric Dipole 3D Scalar Field (Density Particles)
const N = 18;
const q1 = [1.2, 0, 0], q2 = [-1.2, 0, 0];
for (let x = -3; x <= 3; x += 6/N) {
  for (let y = -3; y <= 3; y += 6/N) {
    for (let z = -3; z <= 3; z += 6/N) {
      const d1 = Math.hypot(x - q1[0], y - q1[1], z - q1[2]) + 0.1;
      const d2 = Math.hypot(x - q2[0], y - q2[1], z - q2[2]) + 0.1;
      const V = Math.abs(1/d1 - 1/d2);
      if (V > 0.1) {
        plot3d(x, y, z);
      }
    }
  }
}`,
  lissajous: `// 3D Lissajous Knot Curve
plotCurve(t => [
  Math.sin(3*t + Math.PI/4),
  Math.sin(2*t),
  Math.cos(5*t) * 0.5
]);`,
  mobius: `// Parametric Möbius Strip
const N = 60, M = 20;
const pts = new Float32Array(N * M * 3);
let k = 0;
for (let i = 0; i < N; i++) {
  for (let j = 0; j < M; j++) {
    const u = 2 * Math.PI * i / N;
    const v = (j / M - 0.5) * 2;
    const x = (2 + v * Math.cos(u / 2)) * Math.cos(u);
    const y = (2 + v * Math.cos(u / 2)) * Math.sin(u);
    const z = v * Math.sin(u / 2);
    pts[k++] = x;
    pts[k++] = z;
    pts[k++] = y;
  }
}
plotMesh(pts, N, M);`,
  lorenz: `// Lorenz Chaotic Attractor
let x = 0.1, y = 0, z = 0;
const s = 10, r = 28, b = 8/3, dt = 0.005;
for (let i = 0; i < 8000; i++) {
  const dx = s * (y - x);
  const dy = x * (r - z) - y;
  const dz = x * y - b * z;
  x += dx * dt;
  y += dy * dt;
  z += dz * dt;
  if (i > 200) {
    plot3d(x * 0.2, y * 0.2, (z - 25) * 0.2);
  }
}`,
  scatter: `// Random Spherical Gaussian Cloud
for (let i = 0; i < 600; i++) {
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 1 + (Math.random() - 0.5) * 0.6;
  plot3d(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}`,
  shell: `// Spherical Bumpy Shell
plotSurfaceSph((theta, phi) => {
  return 2 + 0.3 * Math.sin(5 * theta) * Math.sin(4 * phi);
});`,
  twistedcyl: `// Twisted Cylindrical Tube
plotSurfaceCyl((theta, z) => {
  return 1 + 0.25 * Math.sin(5 * theta + z);
});`,
};
