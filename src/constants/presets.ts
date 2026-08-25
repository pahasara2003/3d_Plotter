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
  sinc: `# Sinc 3D Surface Generator
import math

def sinc_surface(x, y):
    r = math.sqrt(x**2 + y**2) + 0.001
    return (math.sin(r) / r) * 3.0

plot_surface(sinc_surface)`,

  lorenz: `# Lorenz Chaotic Attractor (Differential equations)
x, y, z = 0.1, 0.0, 0.0
sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0
dt = 0.005

for i in range(8000):
    dx = sigma * (y - x)
    dy = x * (rho - z) - y
    dz = x * y - beta * z
    x += dx * dt
    y += dy * dt
    z += dz * dt
    if i > 150:
        plot3d(x * 0.2, y * 0.2, (z - 25.0) * 0.2)`,

  mobius: `# Parametric Möbius Strip (UV Coordinate Surface)
import math

def mobius(u, v):
    # u in [0, 2*pi], v in [-1, 1]
    x = (2.0 + v * math.cos(u / 2.0)) * math.cos(u)
    y = (2.0 + v * math.cos(u / 2.0)) * math.sin(u)
    z = v * math.sin(u / 2.0)
    return (x, y, z)

plot_parametric_surface(mobius, u_range=(0, 2*math.pi), v_range=(-1, 1), nu=60, nv=20)`,

  lissajous: `# 3D Lissajous Knot Space Curve
import math

def lissajous_knot(t):
    return (
        math.sin(3.0 * t + math.pi / 4.0),
        math.sin(2.0 * t),
        math.cos(5.0 * t) * 0.5
    )

plot_curve(lissajous_knot)`,

  numpyRipple: `# NumPy Meshgrid 3D Wave
import numpy as np

# Generate coordinate meshgrid
x = np.linspace(-5, 5, 45)
y = np.linspace(-5, 5, 45)
X, Y = np.meshgrid(x, y)

Z = []
for i in range(len(y)):
    row = []
    for j in range(len(x)):
        r = np.sqrt(X[i][j]**2 + Y[i][j]**2) + 0.001
        row.append(np.sin(2.0 * r) / (1.0 + 0.3 * r))
    Z.append(row)

plot_grid(X, Y, Z)`,

  scatter: `# Gaussian Random Spherical Particle Cloud
import math
import random

for i in range(700):
    theta = random.random() * 2.0 * math.pi
    phi = math.acos(2.0 * random.random() - 1.0)
    r = 1.8 + (random.random() - 0.5) * 0.8
    plot3d(
        r * math.sin(phi) * math.cos(theta),
        r * math.sin(phi) * math.sin(theta),
        r * math.cos(phi)
    )`,

  shell: `# Spherical Harmonics Bumpy Shell r(theta, psi)
import math

def bumpy_shell(theta, psi):
    return 2.0 + 0.35 * math.sin(5.0 * theta) * math.sin(4.0 * psi)

plot_surface_sph(bumpy_shell)`,

  twistedcyl: `# Polar Ripple Cylindrical Surface z(rho, theta)
import math

def polar_ripple(rho, theta):
    return math.cos(rho * 2.0) / (1.0 + 0.2 * rho)

plot_surface_cyl(polar_ripple)`,

  travelingWave: `# Time-Varying Traveling Wave (Animates with 't')
import math

def wave(x, y):
    r = math.sqrt(x**2 + y**2)
    return math.sin(2.0 * r - t * 3.0) / (1.0 + 0.3 * r)

plot_surface(wave)`,

  torus: `# Parametric Torus Ring
import math

def torus(u, v):
    R, r = 2.5, 0.8
    x = (R + r * math.cos(v)) * math.cos(u)
    y = (R + r * math.cos(v)) * math.sin(u)
    z = r * math.sin(v)
    return (x, y, z)

plot_parametric_surface(torus, u_range=(0, 2*math.pi), v_range=(0, 2*math.pi), nu=50, nv=30)`,
};
