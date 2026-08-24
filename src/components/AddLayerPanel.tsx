import React, { useState } from 'react';
import { Plus, Code2, X, Sparkles, Layers, Sliders, Activity } from 'lucide-react';
import { MainTabType, SchemeType, LayerItem, LayerType } from '../types';
import { PALETTE } from '../constants/presets';
import { ScriptCodeEditor } from './ScriptCodeEditor';

interface AddLayerPanelProps {
  onAddLayer: (layer: Omit<LayerItem, 'id' | 'visible'>) => void;
  nextColor: string;
  onClose?: () => void;
}

export const AddLayerPanel: React.FC<AddLayerPanelProps> = ({
  onAddLayer,
  nextColor,
  onClose,
}) => {
  const [mainTab, setMainTab] = useState<MainTabType>('surfaceplot');
  const [schemes, setSchemes] = useState<Record<MainTabType, SchemeType>>({
    surfaceplot: 'cart',
    densityplot: 'cart',
    vectorfield: 'cart',
    parametric: 'cart',
    script: 'cart',
  });

  // Surface equations
  const [surfEq, setSurfEq] = useState('sin(sqrt(x^2+y^2))');
  const [sphEq, setSphEq] = useState('2');
  const [cylEq, setCylEq] = useState('1');

  // Density 3D scalar potential field equations
  const [densityEq, setDensityEq] = useState('exp(-sqrt(x^2+y^2+z^2)*0.8) * abs(2*z^2 - x^2 - y^2)^1.2');
  const [densitySphEq, setDensitySphEq] = useState('rho^2 * exp(-rho/1.5) * abs(3*cos(phi)^2 - 1)');
  const [densityCylEq, setDensityCylEq] = useState('exp(-(r^2+z^2)/4) * abs(cos(2*theta))');
  const [densityColormap, setDensityColormap] = useState('thermal');
  const [densityThreshold, setDensityThreshold] = useState(0.06);
  const [densityCoreIso, setDensityCoreIso] = useState(0.75);
  const [densityMultiplier, setDensityMultiplier] = useState(1.4);
  const [densityPower, setDensityPower] = useState(1.2);
  const [showDensityBoundingBox, setShowDensityBoundingBox] = useState(true);

  // Vector field equations
  const [fieldEq, setFieldEq] = useState('[-y, x, 0.3]');
  const [fieldSphEq, setFieldSphEq] = useState('[0, 1, 0]');
  const [fieldCylEq, setFieldCylEq] = useState('[0, 1, 0.2]');

  // Parametric curves
  const [px, setPx] = useState('cos(t)');
  const [py, setPy] = useState('sin(t)');
  const [pz, setPz] = useState('t/5');

  const [pRho, setPRho] = useState('2');
  const [pTheta, setPTheta] = useState('t');
  const [pPhi, setPPhi] = useState('PI/2+sin(t*2)*0.4');

  const [pR, setPR] = useState('1');
  const [pThetaC, setPThetaC] = useState('t');
  const [pZ, setPZ] = useState('t/5');

  // Script code
  const [script, setScript] = useState(
    `// Sinc 3D Surface Generator\nplotSurface((x, y) => {\n  const r = Math.sqrt(x*x + y*y) + 0.001;\n  return (Math.sin(r) / r) * 3;\n});`
  );

  const [layerColor, setLayerColor] = useState(nextColor || PALETTE[0]);
  const [layerName, setLayerName] = useState('');
  const [rangeR, setRangeR] = useState(5);
  const [resolutionN, setResolutionN] = useState(45);

  const curScheme = schemes[mainTab];

  const setSchemeForTab = (sch: SchemeType) => {
    setSchemes((prev) => ({ ...prev, [mainTab]: sch }));
  };

  const handleAdd = () => {
    let type: LayerType = 'surface';

    if (mainTab === 'surfaceplot') {
      type = curScheme === 'cart' ? 'surface' : curScheme === 'sph' ? 'spherical' : 'cylindrical';
    } else if (mainTab === 'densityplot') {
      type = curScheme === 'cart' ? 'density' : curScheme === 'sph' ? 'densitySph' : 'densityCyl';
    } else if (mainTab === 'vectorfield') {
      type = curScheme === 'cart' ? 'field' : curScheme === 'sph' ? 'fieldSph' : 'fieldCyl';
    } else if (mainTab === 'parametric') {
      type = curScheme === 'cart' ? 'param' : curScheme === 'sph' ? 'paramSph' : 'paramCyl';
    } else {
      type = 'script';
    }

    const baseName = layerName.trim();
    let computedName = baseName;

    const layerData: Omit<LayerItem, 'id' | 'visible'> = {
      type,
      color: layerColor,
      name: computedName || 'Plot',
      R: rangeR,
      N: resolutionN,
    };

    if (type === 'surface') {
      layerData.eq = surfEq.trim();
      layerData.name = computedName || layerData.eq;
    } else if (type === 'spherical') {
      layerData.eq = sphEq.trim();
      layerData.name = computedName || `ρ = ${layerData.eq}`;
    } else if (type === 'cylindrical') {
      layerData.eq = cylEq.trim();
      layerData.name = computedName || `r = ${layerData.eq}`;
    } else if (type === 'density') {
      layerData.eq = densityEq.trim();
      layerData.colorMap = densityColormap;
      layerData.threshold = densityThreshold;
      layerData.densityPower = densityPower;
      layerData.coreIso = densityCoreIso;
      layerData.volumeDensity = densityMultiplier;
      layerData.showBoundingBox = showDensityBoundingBox;
      layerData.name = computedName || `3D Volume: ${layerData.eq}`;
    } else if (type === 'densitySph') {
      layerData.eq = densitySphEq.trim();
      layerData.colorMap = densityColormap;
      layerData.threshold = densityThreshold;
      layerData.densityPower = densityPower;
      layerData.coreIso = densityCoreIso;
      layerData.volumeDensity = densityMultiplier;
      layerData.showBoundingBox = showDensityBoundingBox;
      layerData.name = computedName || `Sph Volume: ${layerData.eq}`;
    } else if (type === 'densityCyl') {
      layerData.eq = densityCylEq.trim();
      layerData.colorMap = densityColormap;
      layerData.threshold = densityThreshold;
      layerData.densityPower = densityPower;
      layerData.coreIso = densityCoreIso;
      layerData.volumeDensity = densityMultiplier;
      layerData.showBoundingBox = showDensityBoundingBox;
      layerData.name = computedName || `Cyl Volume: ${layerData.eq}`;
    } else if (type === 'field') {
      layerData.eq = fieldEq.trim();
      layerData.name = computedName || layerData.eq;
    } else if (type === 'fieldSph') {
      layerData.eq = fieldSphEq.trim();
      layerData.name = computedName || `F_sph ${layerData.eq}`;
    } else if (type === 'fieldCyl') {
      layerData.eq = fieldCylEq.trim();
      layerData.name = computedName || `F_cyl ${layerData.eq}`;
    } else if (type === 'param') {
      layerData.px = px.trim();
      layerData.py = py.trim();
      layerData.pz = pz.trim();
      layerData.name = computedName || `(${layerData.px}, ${layerData.py}, ${layerData.pz})`;
    } else if (type === 'paramSph') {
      layerData.pRho = pRho.trim();
      layerData.pTheta = pTheta.trim();
      layerData.pPhi = pPhi.trim();
      layerData.name = computedName || `ρ,θ,φ = ${layerData.pRho}, ${layerData.pTheta}, ${layerData.pPhi}`;
    } else if (type === 'paramCyl') {
      layerData.pR = pR.trim();
      layerData.pThetaC = pThetaC.trim();
      layerData.pZ = pZ.trim();
      layerData.name = computedName || `r,θ,z = ${layerData.pR}, ${layerData.pThetaC}, ${layerData.pZ}`;
    } else if (type === 'script') {
      layerData.script = script;
      layerData.name = computedName || 'Custom Script Plot';
    }

    onAddLayer(layerData);
    setLayerName('');
  };

  return (
    <div className="flex flex-col h-full bg-[#121216] border-l border-white/[0.08] shadow-2xl select-none overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#16161b]/90 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Add New Plot</h2>
            <p className="text-[11px] text-slate-500">Surface, 3D Density Field, Vector, or Curve</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Hide Add Plots Menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex flex-wrap gap-1 bg-[#18181e] p-1 rounded-xl border border-white/[0.08]">
          {(['surfaceplot', 'densityplot', 'vectorfield', 'parametric', 'script'] as MainTabType[]).map((tab) => {
            const labels: Record<MainTabType, string> = {
              surfaceplot: 'Surface',
              densityplot: '3D Density',
              vectorfield: 'Vectors',
              parametric: 'Curve',
              script: 'Script',
            };
            const isActive = mainTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setMainTab(tab)}
                className={`flex-1 min-w-[62px] py-1.5 px-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer truncate text-center ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-4">
        {/* Coordinate System Selector for non-script types */}
        {mainTab !== 'script' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              Coordinate System
            </span>
            <div className="flex gap-1.5">
              {(['cart', 'sph', 'cyl'] as SchemeType[]).map((sch) => {
                const labels: Record<SchemeType, string> = {
                  cart: 'Cartesian (x,y,z)',
                  sph: 'Spherical (ρ,θ,φ)',
                  cyl: 'Cylindrical (r,θ,z)',
                };
                const isActive = curScheme === sch;
                return (
                  <button
                    key={sch}
                    type="button"
                    onClick={() => setSchemeForTab(sch)}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border transition-all cursor-pointer truncate ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-[#18181e] text-slate-400 hover:text-slate-200 border-white/[0.08]'
                    }`}
                  >
                    {labels[sch]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 1. SURFACE PLOT INPUTS */}
        {mainTab === 'surfaceplot' && (
          <div className="flex flex-col gap-2.5 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    z = f(x, y)
                  </span>
                  <span className="text-[10px] text-slate-500">Cartesian Surface</span>
                </div>
                <input
                  type="text"
                  value={surfEq}
                  onChange={(e) => setSurfEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="sin(sqrt(x^2+y^2))"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Ripple', eq: 'sin(sqrt(x^2+y^2))' },
                    { label: 'Saddle', eq: 'x^2 - y^2' },
                    { label: 'Gaussian', eq: '3*exp(-(x^2+y^2)/4)' },
                    { label: 'Eggcrate', eq: 'sin(x)*cos(y)' },
                    { label: 'Monkey Saddle', eq: 'x^3 - 3*x*y^2' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSurfEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'sph' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    ρ(θ, φ) · θ∈[0, 2π], φ∈[0, π]
                  </span>
                  <span className="text-[10px] text-slate-500">Spherical Surface</span>
                </div>
                <input
                  type="text"
                  value={sphEq}
                  onChange={(e) => setSphEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="2"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Sphere', eq: '2' },
                    { label: 'Bumpy', eq: '2 + 0.5*sin(4*theta)*cos(3*phi)' },
                    { label: 'Heart', eq: '2 - 2*sin(theta)*sqrt(abs(cos(phi)))' },
                    { label: 'Harmonic', eq: '1.5 + 0.8*cos(3*theta)*sin(2*phi)' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSphEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'cyl' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    r(θ, z) · θ∈[0, 2π], z∈[-R, R]
                  </span>
                  <span className="text-[10px] text-slate-500">Cylindrical Surface</span>
                </div>
                <input
                  type="text"
                  value={cylEq}
                  onChange={(e) => setCylEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="1"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Cylinder', eq: '1' },
                    { label: 'Cone', eq: 'z' },
                    { label: 'Hourglass', eq: '1 + 0.3*z^2' },
                    { label: 'Fluted Column', eq: '1 + 0.2*cos(6*theta)' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setCylEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. 3D DENSITY SCALAR FIELD PLOT INPUTS */}
        {mainTab === 'densityplot' && (
          <div className="flex flex-col gap-3 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    V(x, y, z) · Scalar Potential Field
                  </span>
                  <span className="text-[10px] text-violet-400 font-mono">Volumetric Density</span>
                </div>
                <input
                  type="text"
                  value={densityEq}
                  onChange={(e) => setDensityEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="1/sqrt((x-1)^2+y^2+z^2+0.1) - 1/sqrt((x+1)^2+y^2+z^2+0.1)"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    {
                      label: 'dz² Orbital (Lobes + Torus)',
                      eq: 'exp(-sqrt(x^2+y^2+z^2)*0.8) * abs(2*z^2 - x^2 - y^2)^1.2',
                    },
                    {
                      label: 'Hydrogen 2pz Lobes',
                      eq: 'abs(z) * exp(-sqrt(x^2+y^2+z^2)/1.2)',
                    },
                    {
                      label: '3dxy 4-Leaf Clover',
                      eq: 'abs(x*y) * exp(-sqrt(x^2+y^2+z^2)/1.2)',
                    },
                    {
                      label: 'Electric Dipole',
                      eq: 'abs(1/sqrt((x-1.3)^2+y^2+z^2+0.12) - 1/sqrt((x+1.3)^2+y^2+z^2+0.12))',
                    },
                    {
                      label: 'Quadrupole Field',
                      eq: 'abs(2*z^2 - x^2 - y^2) / (x^2 + y^2 + z^2 + 0.25)^1.8',
                    },
                    {
                      label: 'Torus Ring Vortex',
                      eq: 'exp(-((sqrt(x^2+y^2)-2.0)^2 + z^2)/1.2)',
                    },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDensityEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-violet-200 hover:border-violet-400/40 hover:bg-violet-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'sph' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    V(ρ, θ, φ) · Spherical Scalar Field
                  </span>
                  <span className="text-[10px] text-violet-400 font-mono">Continuous Volume</span>
                </div>
                <input
                  type="text"
                  value={densitySphEq}
                  onChange={(e) => setDensitySphEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="rho^2 * exp(-rho/1.5) * abs(3*cos(phi)^2 - 1)"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'dz² Orbital (Lobes + Torus)', eq: 'rho^2 * exp(-rho/1.5) * abs(3*cos(phi)^2 - 1)' },
                    { label: 'dxz Orbital', eq: 'rho^2 * exp(-rho/1.5) * abs(sin(phi)*cos(phi)*cos(theta))' },
                    { label: 'Radial Shells', eq: 'abs(sin(rho*2)) / (rho + 0.2)' },
                    { label: 'Spherical Harmonic', eq: 'abs(sin(2*theta)*cos(phi)) * exp(-rho/3)' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDensitySphEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-violet-200 hover:border-violet-400/40 hover:bg-violet-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'cyl' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    V(r, θ, z) · Cylindrical Scalar Field
                  </span>
                  <span className="text-[10px] text-violet-400 font-mono">Continuous Volume</span>
                </div>
                <input
                  type="text"
                  value={densityCylEq}
                  onChange={(e) => setDensityCylEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="exp(-(r^2+z^2)/4) * abs(cos(2*theta))"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Ring Torus Core', eq: 'exp(-((r-2)^2 + z^2)/1.2)' },
                    { label: 'Plasma Column', eq: 'exp(-r^2/2) * abs(cos(z))' },
                    { label: 'Helical Waveguide', eq: 'abs(sin(theta - z)) * exp(-r/2)' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setDensityCylEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-violet-200 hover:border-violet-400/40 hover:bg-violet-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Density Styling Controls (Colormap, Solid Core, Opacity Cutoff, Multiplier) */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                  Colormap
                </span>
                <div className="flex flex-wrap gap-1">
                  {['thermal', 'turbo', 'plasma', 'viridis', 'magma', 'coolwarm'].map((cmap) => (
                    <button
                      key={cmap}
                      type="button"
                      onClick={() => setDensityColormap(cmap)}
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                        densityColormap === cmap
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/50 font-semibold'
                          : 'bg-[#101014] text-slate-400 hover:text-slate-200 border-white/[0.08]'
                      }`}
                    >
                      {cmap}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10.5px] text-slate-400">
                    <span>Solid Core (Isosurface)</span>
                    <span className="font-mono text-violet-300 font-semibold">
                      {Math.round(densityCoreIso * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(densityCoreIso * 100)}
                    onChange={(e) => setDensityCoreIso(parseInt(e.target.value) / 100)}
                    className="accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10.5px] text-slate-400">
                    <span>Opacity Cutoff</span>
                    <span className="font-mono text-violet-300 font-semibold">
                      {Math.round(densityThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={Math.round(densityThreshold * 100)}
                    onChange={(e) => setDensityThreshold(parseInt(e.target.value) / 100)}
                    className="accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10.5px] text-slate-400">
                    <span>Density Intensity</span>
                    <span className="font-mono text-violet-300 font-semibold">
                      {densityMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="30"
                    step="1"
                    value={Math.round(densityMultiplier * 10)}
                    onChange={(e) => setDensityMultiplier(parseInt(e.target.value) / 10)}
                    className="accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10.5px] text-slate-400">
                    <span>Falloff Curve</span>
                    <span className="font-mono text-violet-300 font-semibold">
                      {densityPower.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={Math.round(densityPower * 10)}
                    onChange={(e) => setDensityPower(parseInt(e.target.value) / 10)}
                    className="accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10.5px] text-slate-400">Domain Bounding Cage</span>
                <button
                  type="button"
                  onClick={() => setShowDensityBoundingBox(!showDensityBoundingBox)}
                  className={`text-[10.5px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    showDensityBoundingBox
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                      : 'bg-[#101014] text-slate-500 border-white/[0.08]'
                  }`}
                >
                  {showDensityBoundingBox ? 'Visible' : 'Hidden'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. VECTOR FIELD INPUTS */}
        {mainTab === 'vectorfield' && (
          <div className="flex flex-col gap-2.5 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    [Fx, Fy, Fz](x, y, z)
                  </span>
                  <span className="text-[10px] text-slate-500">Cartesian Vector Field</span>
                </div>
                <input
                  type="text"
                  value={fieldEq}
                  onChange={(e) => setFieldEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="[-y, x, 0.3]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Vortex', eq: '[-y, x, 0.3]' },
                    { label: 'Sink/Source', eq: '[-x, -y, -z]' },
                    { label: 'Spiral Flow', eq: '[-y, x, sin(z)]' },
                    { label: 'Dipole', eq: '[x/(x^2+y^2+z^2+0.1), y/(x^2+y^2+z^2+0.1), z]' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFieldEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'sph' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    [F_ρ, F_θ, F_φ](ρ, θ, φ)
                  </span>
                  <span className="text-[10px] text-slate-500">Spherical Vector Field</span>
                </div>
                <input
                  type="text"
                  value={fieldSphEq}
                  onChange={(e) => setFieldSphEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="[0, 1, 0]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Zonal Flow', eq: '[0, 1, 0]' },
                    { label: 'Radial Outward', eq: '[1, 0, 0]' },
                    { label: 'Meridional', eq: '[0, 0, 1]' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFieldSphEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'cyl' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    [F_r, F_θ, F_z](r, θ, z)
                  </span>
                  <span className="text-[10px] text-slate-500">Cylindrical Vector Field</span>
                </div>
                <input
                  type="text"
                  value={fieldCylEq}
                  onChange={(e) => setFieldCylEq(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                  placeholder="[0, 1, 0.2]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Swirl & Updraft', eq: '[0, 1, 0.2]' },
                    { label: 'Radial Expand', eq: '[1, 0, 0]' },
                    { label: 'Helical Flow', eq: '[0, 2, 0.5]' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFieldCylEq(p.eq)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. PARAMETRIC CURVE INPUTS */}
        {mainTab === 'parametric' && (
          <div className="flex flex-col gap-2.5 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    x(t) · y(t) · z(t)
                  </span>
                  <span className="text-[10px] text-slate-500">Cartesian Space Curve</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">x(t) =</span>
                    <input
                      type="text"
                      value={px}
                      onChange={(e) => setPx(e.target.value)}
                      placeholder="cos(t)"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">y(t) =</span>
                    <input
                      type="text"
                      value={py}
                      onChange={(e) => setPy(e.target.value)}
                      placeholder="sin(t)"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">z(t) =</span>
                    <input
                      type="text"
                      value={pz}
                      onChange={(e) => setPz(e.target.value)}
                      placeholder="t/5"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'Helix', x: 'cos(t)*3', y: 'sin(t)*3', z: 't/4' },
                    { label: 'Trefoil Knot', x: 'sin(t)+2*sin(2*t)', y: 'cos(t)-2*cos(2*t)', z: '-sin(3*t)' },
                    { label: 'Torus Knot (2,3)', x: '(2+cos(3*t))*cos(2*t)', y: '(2+cos(3*t))*sin(2*t)', z: 'sin(3*t)' },
                    { label: 'Lissajous 3D', x: 'sin(3*t)', y: 'sin(2*t)', z: 'sin(4*t)' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setPx(p.x);
                        setPy(p.y);
                        setPz(p.z);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-white/[0.08] text-slate-400 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {curScheme === 'sph' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    ρ(t) · θ(t) · φ(t)
                  </span>
                  <span className="text-[10px] text-slate-500">Spherical Curve</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">ρ(t) =</span>
                    <input
                      type="text"
                      value={pRho}
                      onChange={(e) => setPRho(e.target.value)}
                      placeholder="2"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">θ(t) =</span>
                    <input
                      type="text"
                      value={pTheta}
                      onChange={(e) => setPTheta(e.target.value)}
                      placeholder="t"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">φ(t) =</span>
                    <input
                      type="text"
                      value={pPhi}
                      onChange={(e) => setPPhi(e.target.value)}
                      placeholder="PI/2+sin(t*2)*0.4"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </>
            )}

            {curScheme === 'cyl' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    r(t) · θ(t) · z(t)
                  </span>
                  <span className="text-[10px] text-slate-500">Cylindrical Curve</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">r(t) =</span>
                    <input
                      type="text"
                      value={pR}
                      onChange={(e) => setPR(e.target.value)}
                      placeholder="1"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">θ(t) =</span>
                    <input
                      type="text"
                      value={pThetaC}
                      onChange={(e) => setPThetaC(e.target.value)}
                      placeholder="t"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-10 shrink-0">z(t) =</span>
                    <input
                      type="text"
                      value={pZ}
                      onChange={(e) => setPZ(e.target.value)}
                      placeholder="t/5"
                      className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 5. SCRIPT CODE EDITOR (LARGER WITH SYNTAX HIGHLIGHTING) */}
        {mainTab === 'script' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-sky-400" />
                Script Code Workspace
              </span>
              <span className="text-[10.5px] text-slate-500 font-mono">Syntax Highlighted</span>
            </div>

            {/* Syntax Highlighted Script Editor */}
            <ScriptCodeEditor
              value={script}
              onChange={setScript}
              heightClass="min-h-[280px] h-[340px]"
            />
          </div>
        )}

        {/* Plot Appearance & Configuration */}
        <div className="flex flex-col gap-3 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            Plot Styling & Scope
          </span>

          {/* Color & Name row */}
          <div className="flex items-center gap-2.5">
            {/* Color Swatch / Native Picker */}
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={layerColor}
                onChange={(e) => setLayerColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-white/[0.15] p-0.5 bg-[#111114] cursor-pointer shrink-0"
                title="Choose plot color"
              />
            </div>

            {/* Preset Color dots */}
            <div className="flex items-center gap-1">
              {PALETTE.slice(0, 5).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setLayerColor(col)}
                  style={{ backgroundColor: col }}
                  className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                    layerColor.toLowerCase() === col.toLowerCase()
                      ? 'scale-110 border-white ring-2 ring-indigo-500/50'
                      : 'border-black/30 hover:scale-105'
                  }`}
                  title={col}
                />
              ))}
            </div>

            {/* Plot Name Input */}
            <input
              type="text"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="Custom plot label (optional)"
              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[#111114] border border-white/[0.12] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Range & Resolution Sliders */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10.5px] text-slate-400 font-semibold uppercase">
                <span>Range (±R)</span>
                <span className="font-mono text-indigo-300 font-semibold">{rangeR}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={rangeR}
                onChange={(e) => setRangeR(parseInt(e.target.value))}
                className="accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10.5px] text-slate-400 font-semibold uppercase">
                <span>Resolution</span>
                <span className="font-mono text-indigo-300 font-semibold">{resolutionN}</span>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="5"
                value={resolutionN}
                onChange={(e) => setResolutionN(parseInt(e.target.value))}
                className="accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action CTA */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#16161b]/95 shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/50"
        >
          <Plus className="w-4 h-4" />
          <span>Add Plot to Scene</span>
        </button>
      </div>
    </div>
  );
};
