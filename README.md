# 🪐 3D Plotter — Interactive Multi-Layer Mathematical Visualizer & Python IDE

A high-performance, interactive 3D mathematical visualization platform and Python scripting environment built with **React 19**, **Three.js**, **WebAssembly (Pyodide)**, **Math.js**, and **Tailwind CSS**.

![3D Plotter Banner](https://img.shields.io/badge/3D-Plotter-indigo?style=for-the-badge&logo=three.js)
![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-r185-black?style=for-the-badge&logo=three.js)
![Python 3](https://img.shields.io/badge/Python-3.11_(Pyodide)-3776ab?style=for-the-badge&logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=for-the-badge&logo=vite)

---

## ✨ Features

### 📐 1. Multi-Coordinate Mathematical Plotting
- **Explicit 3D Surfaces**:
  - Cartesian: \(z = f(x, y)\)
  - Spherical: \(\rho = f(\theta, \phi)\)
  - Cylindrical: \(r = f(\theta, z)\)
- **3D Volumetric Scalar Potential & Density Fields**:
  - GPU-accelerated raymarching / slice potential visualization for scalar fields \(V(x, y, z)\).
  - Custom opacity mapping, core isovalues, threshold filters, and bounding box indicators.
- **3D Vector Fields & Flow Lines**:
  - Vector arrows and streamline fieldlines \(\vec{F}(x, y, z) = [F_x, F_y, F_z]\) in Cartesian, Spherical, and Cylindrical coordinates.
- **3D Parametric Space Curves**:
  - Cartesian: \(t \mapsto (x(t), y(t), z(t))\)
  - Spherical: \(t \mapsto (\rho(t), \theta(t), \phi(t))\)
  - Cylindrical: \(t \mapsto (r(t), \theta(t), z(t))\)
- **Basic 3D Geometric Shapes**:
  - Spheres, Cylinders, Cubes, Cones, Toruses, Planes, and Ellipsoids with dynamic center positions, dimensions, wireframes, and opacity.

---

### 🐍 2. Python 3 Scripting Engine
Write Python 3 code directly in the browser to compute complex geometry, numerical simulations, and chaotic attractors.

- **Pyodide WebAssembly Runtime**: Full Python standard library + `numpy` support executing client-side in WebAssembly.
- **Instant Reactive Evaluator**: Hybrid runner for smooth 60 FPS animation and parameter slider scrubbing.
- **Python Plotting APIs**:
  - `plot_surface(fn)`: Heightfield \(z = f(x, y)\)
  - `plot_curve(fn)`: 3D space curves \(t \mapsto (x, y, z)\)
  - `plot_parametric_surface(fn, u_range, v_range)`: Parametric UV meshes (e.g., Möbius strip, Klein bottle, Torus)
  - `plot_grid(X, Y, Z)`: Coordinate matrices generated via `numpy.meshgrid`
  - `plot3d(x, y, z)` / `plot_points(pts)`: Point clouds & chaotic attractors (e.g., Lorenz attractor)
  - `plot_surface_sph(fn)` & `plot_surface_cyl(fn)`: Spherical and cylindrical coordinate surfaces
- **Live Output Console**: Captures `print()` outputs and execution timing.
- **Built-in Python Presets**: Sinc Surface, Lorenz Attractor, Möbius Strip, 3D Lissajous Knot, NumPy Meshgrid Ripple, Spherical Shell, Torus Ring, Traveling Wave, and Gaussian Scatter Cloud.

---

### 🖥️ 3. Multi-Layout Workspaces
Easily switch layouts depending on your workflow:

1. **3D Plot View**: Standard interactive WebGL viewport with layer stack, variable sliders, and scene settings.
2. **Split View (50 / 50)**: Live Python code editor on the left and real-time 3D rendering on the right.
3. **Full Script IDE ("Hide Plot & View Script")**: Distraction-free full-window IDE featuring:
   - Line numbers, syntax highlighting, and auto-indentation.
   - Run shortcut (`Shift + Enter`).
   - Integrated **Console Tab** for `print()` output.
   - **API Reference Tab** with function cheat sheets.
   - **Variables Tab** for live parameter tweaking.

---

### ⏱️ 4. Time-Varying Animations
- Add `t` or `time` to any equation, shape coordinate, or Python script.
- Floating playback controller with:
  - Play / Pause / Step forward & backward.
  - Scrubbing timeline slider.
  - Speed adjustments (\(0.25\times\) to \(4\times\)).
  - Loop modes: `Loop`, `Ping-Pong`, and `Play Once`.

---

### 🎛️ 5. Dedicated "Change Plot" Panel
- Streamlined layer management: clicking **Edit** on any layer or script in the sidebar opens the right-side panel in **Change Plot** mode.
- Pre-fills all equations, coordinates, parameters, and scripts.
- Distinct active highlight for the layer being modified.
- Quick **Save Changes** and **Cancel** actions.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm or yarn / pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pahasara2003/3d_Plotter.git
   cd 3d_Plotter
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Type check & lint**:
   ```bash
   npm run lint
   ```

---

## 📖 Python Scripting Examples

### 1. Sinc 3D Surface
```python
import math

def sinc_surface(x, y):
    r = math.sqrt(x**2 + y**2) + 0.001
    return (math.sin(r) / r) * 3.0

plot_surface(sinc_surface)
```

### 2. Lorenz Chaotic Attractor
```python
# Numerical Lorenz Attractor
sigma, rho, beta = 10.0, 28.0, 8.0 / 3.0
dt = 0.008
x, y, z = 0.1, 0.0, 0.0

for _ in range(6500):
    dx = sigma * (y - x)
    dy = x * (rho - z) - y
    dz = x * y - beta * z
    x += dx * dt
    y += dy * dt
    z += dz * dt
    plot3d(x * 0.18, y * 0.18, (z - 25.0) * 0.18)
```

### 3. Parametric Möbius Strip
```python
import math

def mobius(u, v):
    x = (1.0 + (v / 2.0) * math.cos(u / 2.0)) * math.cos(u)
    y = (1.0 + (v / 2.0) * math.cos(u / 2.0)) * math.sin(u)
    z = (v / 2.0) * math.sin(u / 2.0)
    return (x * 2.0, y * 2.0, z * 2.0)

plot_parametric_surface(mobius, u_range=(0, 2 * math.pi), v_range=(-1, 1), nu=60, nv=20)
```

### 4. NumPy 3D Coordinate Grid
```python
import numpy as np

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

plot_grid(X, Y, Z)
```

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **3D Graphics Engine**: [Three.js](https://threejs.org/)
- **Python WASM Runtime**: [Pyodide](https://pyodide.org/)
- **Math Parsing & LaTeX**: [Math.js](https://mathjs.org/) & [KaTeX](https://katex.org/)
- **Styling & UI Components**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)

---

## 📄 License

This project is licensed under the Apache-2.0 License.
