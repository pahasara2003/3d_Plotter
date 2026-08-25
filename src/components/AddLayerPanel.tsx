import React, { useState, useEffect } from 'react';
import { Plus, Code2, X, Sparkles, Layers, Sliders, Activity, Box, Circle, Disc, Zap, Edit3, Check } from 'lucide-react';
import { MainTabType, SchemeType, LayerItem, LayerType, ShapeType } from '../types';
import { PALETTE } from '../constants/presets';
import { ScriptCodeEditor } from './ScriptCodeEditor';
import { VisualMathField } from './VisualMathField';

interface AddLayerPanelProps {
  onAddLayer: (layer: Omit<LayerItem, 'id' | 'visible'>) => void;
  nextColor: string;
  onClose?: () => void;
  onOpenFullIDE?: (draftScript?: string) => void;
  onOpenSplitView?: () => void;
  editingLayer?: LayerItem | null;
  onUpdateLayer?: (layer: LayerItem) => void;
  onCancelEdit?: () => void;
}

export const AddLayerPanel: React.FC<AddLayerPanelProps> = ({
  onAddLayer,
  nextColor,
  onClose,
  onOpenFullIDE,
  onOpenSplitView,
  editingLayer,
  onUpdateLayer,
  onCancelEdit,
}) => {
  const [mainTab, setMainTab] = useState<MainTabType>('surfaceplot');
  const [schemes, setSchemes] = useState<Record<MainTabType, SchemeType>>({
    surfaceplot: 'cart',
    densityplot: 'cart',
    vectorfield: 'cart',
    parametric: 'cart',
    shapes: 'cart',
    script: 'cart',
  });

  // Basic Shapes states
  const [shapeType, setShapeType] = useState<ShapeType>('sphere');
  const [shapeRadius, setShapeRadius] = useState('2');
  const [shapeRadius2, setShapeRadius2] = useState('0.6');
  const [shapeRadius3, setShapeRadius3] = useState('1');
  const [shapeWidth, setShapeWidth] = useState('3');
  const [shapeHeight, setShapeHeight] = useState('3');
  const [shapeDepth, setShapeDepth] = useState('3');
  const [shapeCenterX, setShapeCenterX] = useState('0');
  const [shapeCenterY, setShapeCenterY] = useState('0');
  const [shapeCenterZ, setShapeCenterZ] = useState('0');
  const [shapeAxis, setShapeAxis] = useState<'x' | 'y' | 'z'>('z');
  const [shapeWireframe, setShapeWireframe] = useState(false);
  const [shapeOpacity, setShapeOpacity] = useState(90);
  const [shapeSegments, setShapeSegments] = useState(32);

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
  const [fieldDisplay, setFieldDisplay] = useState<'fieldlines' | 'vectors' | 'both'>('fieldlines');
  const [streamlineCount, setStreamlineCount] = useState(36);
  const [showArrowHeads, setShowArrowHeads] = useState(true);

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
    `# Sinc 3D Surface Generator\nimport math\n\ndef sinc_surface(x, y):\n    r = math.sqrt(x**2 + y**2) + 0.001\n    return (math.sin(r) / r) * 3.0\n\nplot_surface(sinc_surface)`
  );

  const [layerColor, setLayerColor] = useState(nextColor || PALETTE[0]);
  const [layerName, setLayerName] = useState('');
  const [rangeR, setRangeR] = useState(5);
  const [resolutionN, setResolutionN] = useState(45);

  // Automatically populate all panel inputs when editingLayer changes
  useEffect(() => {
    if (!editingLayer) {
      setLayerColor(nextColor || PALETTE[0]);
      return;
    }

    const t = editingLayer.type;
    let tab: MainTabType = 'surfaceplot';
    let sch: SchemeType = 'cart';

    if (t === 'surface' || t === 'spherical' || t === 'cylindrical') {
      tab = 'surfaceplot';
      sch = t === 'surface' ? 'cart' : t === 'spherical' ? 'sph' : 'cyl';
      if (t === 'surface') setSurfEq(editingLayer.eq || '');
      if (t === 'spherical') setSphEq(editingLayer.eq || '');
      if (t === 'cylindrical') setCylEq(editingLayer.eq || '');
    } else if (t === 'density' || t === 'densitySph' || t === 'densityCyl') {
      tab = 'densityplot';
      sch = t === 'density' ? 'cart' : t === 'densitySph' ? 'sph' : 'cyl';
      if (t === 'density') setDensityEq(editingLayer.eq || '');
      if (t === 'densitySph') setDensitySphEq(editingLayer.eq || '');
      if (t === 'densityCyl') setDensityCylEq(editingLayer.eq || '');
      if (editingLayer.colorMap) setDensityColormap(editingLayer.colorMap);
      if (editingLayer.threshold !== undefined) setDensityThreshold(editingLayer.threshold);
      if (editingLayer.coreIso !== undefined) setDensityCoreIso(editingLayer.coreIso);
      if (editingLayer.volumeDensity !== undefined) setDensityMultiplier(editingLayer.volumeDensity);
      if (editingLayer.densityPower !== undefined) setDensityPower(editingLayer.densityPower);
      if (editingLayer.showBoundingBox !== undefined) setShowDensityBoundingBox(editingLayer.showBoundingBox);
    } else if (t === 'field' || t === 'fieldSph' || t === 'fieldCyl') {
      tab = 'vectorfield';
      sch = t === 'field' ? 'cart' : t === 'fieldSph' ? 'sph' : 'cyl';
      if (t === 'field') setFieldEq(editingLayer.eq || '');
      if (t === 'fieldSph') setFieldSphEq(editingLayer.eq || '');
      if (t === 'fieldCyl') setFieldCylEq(editingLayer.eq || '');
      if (editingLayer.fieldDisplay) setFieldDisplay(editingLayer.fieldDisplay);
      if (editingLayer.streamlineCount !== undefined) setStreamlineCount(editingLayer.streamlineCount);
      if (editingLayer.showArrowHeads !== undefined) setShowArrowHeads(editingLayer.showArrowHeads);
    } else if (t === 'param' || t === 'paramSph' || t === 'paramCyl') {
      tab = 'parametric';
      sch = t === 'param' ? 'cart' : t === 'paramSph' ? 'sph' : 'cyl';
      if (t === 'param') {
        setPx(editingLayer.px || '');
        setPy(editingLayer.py || '');
        setPz(editingLayer.pz || '');
      }
      if (t === 'paramSph') {
        setPRho(editingLayer.pRho || '');
        setPTheta(editingLayer.pTheta || '');
        setPPhi(editingLayer.pPhi || '');
      }
      if (t === 'paramCyl') {
        setPR(editingLayer.pR || '');
        setPThetaC(editingLayer.pThetaC || '');
        setPZ(editingLayer.pZ || '');
      }
    } else if (t === 'shape') {
      tab = 'shapes';
      if (editingLayer.shapeCoordSystem) sch = editingLayer.shapeCoordSystem;
      if (editingLayer.shapeType) setShapeType(editingLayer.shapeType);
      if (editingLayer.shapeRadius !== undefined) setShapeRadius(String(editingLayer.shapeRadius));
      if (editingLayer.shapeRadius2 !== undefined) setShapeRadius2(String(editingLayer.shapeRadius2));
      if (editingLayer.shapeRadius3 !== undefined) setShapeRadius3(String(editingLayer.shapeRadius3));
      if (editingLayer.shapeWidth !== undefined) setShapeWidth(String(editingLayer.shapeWidth));
      if (editingLayer.shapeHeight !== undefined) setShapeHeight(String(editingLayer.shapeHeight));
      if (editingLayer.shapeDepth !== undefined) setShapeDepth(String(editingLayer.shapeDepth));
      if (editingLayer.shapeCenterX !== undefined) setShapeCenterX(String(editingLayer.shapeCenterX));
      if (editingLayer.shapeCenterY !== undefined) setShapeCenterY(String(editingLayer.shapeCenterY));
      if (editingLayer.shapeCenterZ !== undefined) setShapeCenterZ(String(editingLayer.shapeCenterZ));
      if (editingLayer.shapeAxis) setShapeAxis(editingLayer.shapeAxis);
      if (editingLayer.shapeWireframe !== undefined) setShapeWireframe(editingLayer.shapeWireframe);
      if (editingLayer.shapeOpacity !== undefined) setShapeOpacity(editingLayer.shapeOpacity);
      if (editingLayer.shapeSegments !== undefined) setShapeSegments(editingLayer.shapeSegments);
    } else if (t === 'script') {
      tab = 'script';
      if (editingLayer.script) setScript(editingLayer.script);
    }

    setMainTab(tab);
    setSchemes((prev) => ({ ...prev, [tab]: sch }));
    setLayerColor(editingLayer.color || nextColor || PALETTE[0]);
    setLayerName(editingLayer.name || '');
    if (editingLayer.R !== undefined) setRangeR(editingLayer.R);
    if (editingLayer.N !== undefined) setResolutionN(editingLayer.N);
  }, [editingLayer]);

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
    } else if (mainTab === 'shapes') {
      type = 'shape';
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
      layerData.fieldDisplay = fieldDisplay;
      layerData.streamlineCount = streamlineCount;
      layerData.showArrowHeads = showArrowHeads;
      layerData.name = computedName || layerData.eq;
    } else if (type === 'fieldSph') {
      layerData.eq = fieldSphEq.trim();
      layerData.fieldDisplay = fieldDisplay;
      layerData.streamlineCount = streamlineCount;
      layerData.showArrowHeads = showArrowHeads;
      layerData.name = computedName || `F_sph ${layerData.eq}`;
    } else if (type === 'fieldCyl') {
      layerData.eq = fieldCylEq.trim();
      layerData.fieldDisplay = fieldDisplay;
      layerData.streamlineCount = streamlineCount;
      layerData.showArrowHeads = showArrowHeads;
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
    } else if (type === 'shape') {
      layerData.shapeType = shapeType;
      layerData.shapeRadius = shapeRadius;
      layerData.shapeRadius2 = shapeRadius2;
      layerData.shapeRadius3 = shapeRadius3;
      layerData.shapeWidth = shapeWidth;
      layerData.shapeHeight = shapeHeight;
      layerData.shapeDepth = shapeDepth;
      layerData.shapeCenterX = shapeCenterX;
      layerData.shapeCenterY = shapeCenterY;
      layerData.shapeCenterZ = shapeCenterZ;
      layerData.shapeCoordSystem = curScheme;
      layerData.shapeAxis = shapeAxis;
      layerData.shapeWireframe = shapeWireframe;
      layerData.shapeOpacity = shapeOpacity;
      layerData.shapeSegments = shapeSegments;
      const shapeNames: Record<ShapeType, string> = {
        sphere: 'Sphere',
        cylinder: 'Cylinder',
        cube: 'Cube Box',
        cone: 'Cone',
        torus: 'Torus Ring',
        plane: 'Plane',
        ellipsoid: 'Ellipsoid',
      };
      layerData.name = computedName || `${shapeNames[shapeType]} (${shapeCenterX}, ${shapeCenterY}, ${shapeCenterZ})`;
    } else if (type === 'script') {
      layerData.script = script;
      layerData.name = computedName || 'Custom Script Plot';
    }

    if (editingLayer) {
      const updatedLayer: LayerItem = {
        ...editingLayer,
        ...layerData,
        id: editingLayer.id,
        visible: editingLayer.visible,
      };
      onUpdateLayer?.(updatedLayer);
    } else {
      onAddLayer(layerData);
      setLayerName('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121216] border-l border-white/[0.08] shadow-2xl select-none overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#16161b]/90 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm ${
              editingLayer
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
            }`}
          >
            {editingLayer ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {editingLayer ? 'Change Plot' : 'Add New Plot'}
            </h2>
            <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
              {editingLayer
                ? `Editing: ${editingLayer.name}`
                : 'Surface, 3D Density, Vector, Basic Shapes, or Curves'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {editingLayer && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={editingLayer && onCancelEdit ? onCancelEdit : onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex flex-wrap gap-1 bg-[#18181e] p-1 rounded-xl border border-white/[0.08]">
          {(['surfaceplot', 'densityplot', 'vectorfield', 'parametric', 'shapes', 'script'] as MainTabType[]).map((tab) => {
            const labels: Record<MainTabType, string> = {
              surfaceplot: 'Surface',
              densityplot: '3D Density',
              vectorfield: 'Vectors',
              parametric: 'Curve',
              shapes: 'Shapes',
              script: 'Script',
            };
            const isActive = mainTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setMainTab(tab)}
                className={`flex-1 min-w-[50px] py-1.5 px-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer truncate text-center ${
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
        {/* Coordinate System Selector for non-script and non-shapes types */}
        {mainTab !== 'script' && mainTab !== 'shapes' && (
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
                    className={`flex-1 py-1 px-1.5 text-[10.5px] font-medium rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-semibold'
                        : 'bg-[#16161b] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
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
          <div className="flex flex-col gap-3 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    z = f(x, y)
                  </span>
                  <span className="text-[10px] text-slate-500">Cartesian Surface</span>
                </div>
                <VisualMathField
                  value={surfEq}
                  onChange={setSurfEq}
                  prefixLabel="z ="
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
                <VisualMathField
                  value={sphEq}
                  onChange={setSphEq}
                  prefixLabel="ρ ="
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
                <VisualMathField
                  value={cylEq}
                  onChange={setCylEq}
                  prefixLabel="r ="
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
                <VisualMathField
                  value={densityEq}
                  onChange={setDensityEq}
                  prefixLabel="V ="
                  placeholder="exp(-sqrt(x^2+y^2+z^2)*0.8) * abs(2*z^2 - x^2 - y^2)^1.2"
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
                <VisualMathField
                  value={densitySphEq}
                  onChange={setDensitySphEq}
                  prefixLabel="V ="
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
                <VisualMathField
                  value={densityCylEq}
                  onChange={setDensityCylEq}
                  prefixLabel="V ="
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

            {/* Density Styling Controls (Solid Core, Opacity Cutoff, Density Multiplier, Falloff) */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                  Volumetric Rendering
                </span>
                <span className="text-[10.5px] text-violet-300 font-mono">Intensity → Alpha (Opacity)</span>
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
                    <span>Density Multiplier</span>
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
          <div className="flex flex-col gap-3 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    [Fx, Fy, Fz](x, y, z)
                  </span>
                  <span className="text-[10px] text-slate-500">Cartesian Vector Field</span>
                </div>
                <VisualMathField
                  value={fieldEq}
                  onChange={setFieldEq}
                  prefixLabel="F ="
                  placeholder="[-y, x, 0.3]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: 'E-Dipole Field', eq: '[3*x*z/(x^2+y^2+z^2+0.1)^2.5, 3*y*z/(x^2+y^2+z^2+0.1)^2.5, (2*z^2-x^2-y^2)/(x^2+y^2+z^2+0.1)^2.5]' },
                    { label: 'B-Field (Wire)', eq: '[-y/(x^2+y^2+0.1), x/(x^2+y^2+0.1), 0]' },
                    { label: 'Coulomb Charge', eq: '[x/(x^2+y^2+z^2+0.1)^1.5, y/(x^2+y^2+z^2+0.1)^1.5, z/(x^2+y^2+z^2+0.1)^1.5]' },
                    { label: 'Magnetic Vortex', eq: '[-y, x, 0.3]' },
                    { label: 'Spiral Flow', eq: '[-y, x, sin(z)]' },
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
                <VisualMathField
                  value={fieldSphEq}
                  onChange={setFieldSphEq}
                  prefixLabel="F_sph ="
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
                <VisualMathField
                  value={fieldCylEq}
                  onChange={setFieldCylEq}
                  prefixLabel="F_cyl ="
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

            {/* Field Lines / Streamlines and Vectors Toggle */}
            <div className="flex flex-col gap-2.5 pt-2.5 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                  Field Representation
                </span>
                <span className="text-[10.5px] text-cyan-300 font-mono">Streamlines & Direction</span>
              </div>

              {/* Toggle Segment: Field Lines vs Vectors vs Both */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#101014] rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setFieldDisplay('fieldlines')}
                  className={`py-1 px-2 text-[11px] font-medium rounded transition-all cursor-pointer ${
                    fieldDisplay === 'fieldlines'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Field Lines (Streamlines)
                </button>
                <button
                  type="button"
                  onClick={() => setFieldDisplay('vectors')}
                  className={`py-1 px-2 text-[11px] font-medium rounded transition-all cursor-pointer ${
                    fieldDisplay === 'vectors'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Discrete Vectors
                </button>
                <button
                  type="button"
                  onClick={() => setFieldDisplay('both')}
                  className={`py-1 px-2 text-[11px] font-medium rounded transition-all cursor-pointer ${
                    fieldDisplay === 'both'
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  Both Combined
                </button>
              </div>

              {/* Streamline settings when fieldlines or both are enabled */}
              {fieldDisplay !== 'vectors' && (
                <div className="flex items-center justify-between pt-1 gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10.5px] text-slate-400 shrink-0">Line Density:</span>
                    <input
                      type="range"
                      min="12"
                      max="64"
                      step="4"
                      value={streamlineCount}
                      onChange={(e) => setStreamlineCount(parseInt(e.target.value))}
                      className="flex-1 accent-cyan-400 h-1.5 cursor-pointer rounded bg-[#101014]"
                    />
                    <span className="text-[10.5px] font-mono text-cyan-300 w-8 text-right">
                      {streamlineCount}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowArrowHeads(!showArrowHeads)}
                    className={`text-[10.5px] font-mono px-2.5 py-1 rounded border transition-colors cursor-pointer shrink-0 ${
                      showArrowHeads
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-[#101014] text-slate-500 border-white/[0.08]'
                    }`}
                  >
                    {showArrowHeads ? 'Arrowheads ON' : 'Arrowheads OFF'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PARAMETRIC CURVE INPUTS */}
        {mainTab === 'parametric' && (
          <div className="flex flex-col gap-3 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
            {curScheme === 'cart' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 font-mono">
                    x(t) · y(t) · z(t)
                  </span>
                  <span className="text-[10px] text-slate-500">Cartesian Space Curve</span>
                </div>
                <div className="flex flex-col gap-2">
                  <VisualMathField
                    value={px}
                    onChange={setPx}
                    prefixLabel="x(t) ="
                    placeholder="cos(t)"
                    showToolbar={false}
                  />
                  <VisualMathField
                    value={py}
                    onChange={setPy}
                    prefixLabel="y(t) ="
                    placeholder="sin(t)"
                    showToolbar={false}
                  />
                  <VisualMathField
                    value={pz}
                    onChange={setPz}
                    prefixLabel="z(t) ="
                    placeholder="t/5"
                    showToolbar={true}
                  />
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
                  <VisualMathField
                    value={pRho}
                    onChange={setPRho}
                    prefixLabel="ρ(t) ="
                    placeholder="2"
                    showToolbar={false}
                  />
                  <VisualMathField
                    value={pTheta}
                    onChange={setPTheta}
                    prefixLabel="θ(t) ="
                    placeholder="t"
                    showToolbar={false}
                  />
                  <VisualMathField
                    value={pPhi}
                    onChange={setPPhi}
                    prefixLabel="φ(t) ="
                    placeholder="PI/2+sin(t*2)*0.4"
                    showToolbar={true}
                  />
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
                  <VisualMathField
                    value={pR}
                    onChange={setPR}
                    prefixLabel="r(t) ="
                    placeholder="1"
                    showToolbar={false}
                  />
                  <VisualMathField
                    value={pThetaC}
                    onChange={setPThetaC}
                    prefixLabel="θ(t) ="
                    placeholder="t"
                    showToolbar={false}
                  />
                  <VisualMathField
                    value={pZ}
                    onChange={setPZ}
                    prefixLabel="z(t) ="
                    placeholder="t/5"
                    showToolbar={true}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* 5. BASIC SHAPES (SPHERE, CYLINDER, CUBE, CONE, TORUS, PLANE, ELLIPSOID) */}
        {mainTab === 'shapes' && (
          <div className="flex flex-col gap-3.5">
            {/* Unified Geometry & Shape Parameters Card */}
            <div className="flex flex-col gap-3 bg-[#16161b] p-3.5 rounded-xl border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-indigo-400" />
                  Geometry & Shape Parameters
                </span>
              </div>

              {/* Dropdown Selector + Shape Parameter Inputs in an ergonomic row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Shape Selection Dropdown */}
                <div className="flex flex-col gap-1 sm:w-48 shrink-0">
                  <label className="text-[10px] uppercase font-mono font-medium text-slate-400">
                    Shape Type:
                  </label>
                  <select
                    value={shapeType}
                    onChange={(e) => setShapeType(e.target.value as ShapeType)}
                    className="w-full bg-[#101014] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="sphere">Sphere</option>
                    <option value="cylinder">Cylinder</option>
                    <option value="cube">Cube / Box</option>
                    <option value="cone">Cone</option>
                    <option value="torus">Torus Ring</option>
                    <option value="plane">Plane</option>
                    <option value="ellipsoid">Ellipsoid</option>
                  </select>
                </div>

                {/* Parameters specific to selected shape */}
                <div className="flex-1 flex items-center gap-2.5 flex-wrap">
                  {/* Sphere */}
                  {shapeType === 'sphere' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 shrink-0">Radius R:</span>
                      <input
                        type="text"
                        value={shapeRadius}
                        onChange={(e) => setShapeRadius(e.target.value)}
                        placeholder="2 or 1.5+0.5*sin(t)"
                        className="w-36 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  )}

                  {/* Cylinder */}
                  {shapeType === 'cylinder' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Radius r:</span>
                        <input
                          type="text"
                          value={shapeRadius}
                          onChange={(e) => setShapeRadius(e.target.value)}
                          placeholder="1.5"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Height h:</span>
                        <input
                          type="text"
                          value={shapeHeight}
                          onChange={(e) => setShapeHeight(e.target.value)}
                          placeholder="4"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Axis:</span>
                        <div className="flex gap-1">
                          {(['x', 'y', 'z'] as Array<'x' | 'y' | 'z'>).map((ax) => (
                            <button
                              key={ax}
                              type="button"
                              onClick={() => setShapeAxis(ax)}
                              className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold border uppercase transition-colors cursor-pointer ${
                                shapeAxis === ax
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {ax}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Cube */}
                  {shapeType === 'cube' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Width (X):</span>
                        <input
                          type="text"
                          value={shapeWidth}
                          onChange={(e) => setShapeWidth(e.target.value)}
                          placeholder="3"
                          className="w-20 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Height (Y):</span>
                        <input
                          type="text"
                          value={shapeHeight}
                          onChange={(e) => setShapeHeight(e.target.value)}
                          placeholder="3"
                          className="w-20 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Depth (Z):</span>
                        <input
                          type="text"
                          value={shapeDepth}
                          onChange={(e) => setShapeDepth(e.target.value)}
                          placeholder="3"
                          className="w-20 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </>
                  )}

                  {/* Cone */}
                  {shapeType === 'cone' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Radius r:</span>
                        <input
                          type="text"
                          value={shapeRadius}
                          onChange={(e) => setShapeRadius(e.target.value)}
                          placeholder="2"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Height h:</span>
                        <input
                          type="text"
                          value={shapeHeight}
                          onChange={(e) => setShapeHeight(e.target.value)}
                          placeholder="3.5"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Axis:</span>
                        <div className="flex gap-1">
                          {(['x', 'y', 'z'] as Array<'x' | 'y' | 'z'>).map((ax) => (
                            <button
                              key={ax}
                              type="button"
                              onClick={() => setShapeAxis(ax)}
                              className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold border uppercase transition-colors cursor-pointer ${
                                shapeAxis === ax
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {ax}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Torus */}
                  {shapeType === 'torus' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Ring R:</span>
                        <input
                          type="text"
                          value={shapeRadius}
                          onChange={(e) => setShapeRadius(e.target.value)}
                          placeholder="2.5"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Tube r:</span>
                        <input
                          type="text"
                          value={shapeRadius2}
                          onChange={(e) => setShapeRadius2(e.target.value)}
                          placeholder="0.6"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Axis:</span>
                        <div className="flex gap-1">
                          {(['x', 'y', 'z'] as Array<'x' | 'y' | 'z'>).map((ax) => (
                            <button
                              key={ax}
                              type="button"
                              onClick={() => setShapeAxis(ax)}
                              className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold border uppercase transition-colors cursor-pointer ${
                                shapeAxis === ax
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {ax}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Plane */}
                  {shapeType === 'plane' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Width:</span>
                        <input
                          type="text"
                          value={shapeWidth}
                          onChange={(e) => setShapeWidth(e.target.value)}
                          placeholder="6"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Height:</span>
                        <input
                          type="text"
                          value={shapeHeight}
                          onChange={(e) => setShapeHeight(e.target.value)}
                          placeholder="6"
                          className="w-24 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Normal:</span>
                        <div className="flex gap-1">
                          {(['x', 'y', 'z'] as Array<'x' | 'y' | 'z'>).map((ax) => (
                            <button
                              key={ax}
                              type="button"
                              onClick={() => setShapeAxis(ax)}
                              className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold border uppercase transition-colors cursor-pointer ${
                                shapeAxis === ax
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {ax}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Ellipsoid */}
                  {shapeType === 'ellipsoid' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Semi-a:</span>
                        <input
                          type="text"
                          value={shapeRadius}
                          onChange={(e) => setShapeRadius(e.target.value)}
                          placeholder="2.5"
                          className="w-20 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Semi-b:</span>
                        <input
                          type="text"
                          value={shapeRadius2}
                          onChange={(e) => setShapeRadius2(e.target.value)}
                          placeholder="1.8"
                          className="w-20 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-400 shrink-0">Semi-c:</span>
                        <input
                          type="text"
                          value={shapeRadius3}
                          onChange={(e) => setShapeRadius3(e.target.value)}
                          placeholder="1.0"
                          className="w-20 font-mono text-xs px-2 py-1.5 rounded-lg bg-[#101014] border border-white/[0.12] text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Presets row inside the geometry card */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.04]">
                <span className="text-[10px] uppercase font-mono font-medium text-slate-500 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('sphere');
                    setShapeRadius('2');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Unit Sphere
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('sphere');
                    setShapeRadius('0.8');
                    setShapeCenterX('3*cos(t)');
                    setShapeCenterY('3*sin(t)');
                    setShapeCenterZ('0.5*sin(2*t)');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-medium transition-colors cursor-pointer"
                >
                  ⚡ Orbiting
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('sphere');
                    setShapeRadius('1.5 + 0.6*sin(2*t)');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-medium transition-colors cursor-pointer"
                >
                  ⚡ Pulsating
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('cylinder');
                    setShapeRadius('1.5');
                    setShapeHeight('4');
                    setShapeAxis('z');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Cylinder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('cube');
                    setShapeWidth('4');
                    setShapeHeight('4');
                    setShapeDepth('4');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Cube (4×4×4)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('torus');
                    setShapeRadius('2.5');
                    setShapeRadius2('0.6');
                    setShapeAxis('z');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Torus Ring
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('cone');
                    setShapeRadius('2');
                    setShapeHeight('3.5');
                    setShapeAxis('z');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Cone
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('plane');
                    setShapeWidth('6');
                    setShapeHeight('6');
                    setShapeAxis('z');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('-2');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Plane (z=-2)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShapeType('ellipsoid');
                    setShapeRadius('2.5');
                    setShapeRadius2('1.8');
                    setShapeRadius3('1.0');
                    setShapeCenterX('0');
                    setShapeCenterY('0');
                    setShapeCenterZ('0');
                    setSchemes((prev) => ({ ...prev, shapes: 'cart' }));
                  }}
                  className="px-2 py-0.5 text-[10.5px] rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 transition-colors cursor-pointer"
                >
                  Ellipsoid
                </button>
              </div>
            </div>

            {/* Center Coordinates Full Width Card with Multiple Coordinate Systems */}
            <div className="flex flex-col gap-3 bg-[#16161b] p-4 rounded-xl border border-white/[0.08]">
              {/* Header with Coordinate System Switcher Tabs */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Center Position Coordinates
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    Supports 't'
                  </span>
                </div>

                {/* Coordinate System Selector */}
                <div className="flex bg-[#101014] p-0.5 rounded-lg border border-white/[0.08] text-xs">
                  <button
                    type="button"
                    onClick={() => setSchemes((prev) => ({ ...prev, shapes: 'cart' }))}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      curScheme === 'cart'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cartesian (x, y, z)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemes((prev) => ({ ...prev, shapes: 'sph' }))}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      curScheme === 'sph'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Spherical (ρ, θ, φ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchemes((prev) => ({ ...prev, shapes: 'cyl' }))}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      curScheme === 'cyl'
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cylindrical (r, θ, z)
                  </button>
                </div>
              </div>

              {/* 3 Separate Full-Width Long Inputs */}
              <div className="flex flex-col gap-3 pt-1">
                {curScheme === 'cart' && (
                  <>
                    <VisualMathField
                      value={shapeCenterX}
                      onChange={setShapeCenterX}
                      prefixLabel="x₀ ="
                      placeholder="0 or 3*cos(t)"
                      size="large"
                      className="w-full"
                    />
                    <VisualMathField
                      value={shapeCenterY}
                      onChange={setShapeCenterY}
                      prefixLabel="y₀ ="
                      placeholder="0 or 3*sin(t)"
                      size="large"
                      className="w-full"
                    />
                    <VisualMathField
                      value={shapeCenterZ}
                      onChange={setShapeCenterZ}
                      prefixLabel="z₀ ="
                      placeholder="0 or sin(t*3)"
                      size="large"
                      className="w-full"
                    />
                  </>
                )}

                {curScheme === 'sph' && (
                  <>
                    <VisualMathField
                      value={shapeCenterX}
                      onChange={setShapeCenterX}
                      prefixLabel="ρ₀ ="
                      placeholder="radius ρ e.g. 3 or 2+sin(t)"
                      size="large"
                      className="w-full"
                    />
                    <VisualMathField
                      value={shapeCenterY}
                      onChange={setShapeCenterY}
                      prefixLabel="θ₀ ="
                      placeholder="azimuth angle θ e.g. t or pi/4"
                      size="large"
                      className="w-full"
                    />
                    <VisualMathField
                      value={shapeCenterZ}
                      onChange={setShapeCenterZ}
                      prefixLabel="φ₀ ="
                      placeholder="inclination φ from +z e.g. pi/2 or 0.5*t"
                      size="large"
                      className="w-full"
                    />
                  </>
                )}

                {curScheme === 'cyl' && (
                  <>
                    <VisualMathField
                      value={shapeCenterX}
                      onChange={setShapeCenterX}
                      prefixLabel="r₀ ="
                      placeholder="radial distance r e.g. 2.5 or 2+cos(t)"
                      size="large"
                      className="w-full"
                    />
                    <VisualMathField
                      value={shapeCenterY}
                      onChange={setShapeCenterY}
                      prefixLabel="θ₀ ="
                      placeholder="azimuth angle θ e.g. t or 2*t"
                      size="large"
                      className="w-full"
                    />
                    <VisualMathField
                      value={shapeCenterZ}
                      onChange={setShapeCenterZ}
                      prefixLabel="z₀ ="
                      placeholder="height z e.g. 0 or sin(t)"
                      size="large"
                      className="w-full"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Shape Material & Mesh Quality */}
            <div className="flex flex-col gap-2.5 bg-[#16161b] p-3 rounded-xl border border-white/[0.08]">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Material & Rendering
              </span>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shapeWireframe}
                    onChange={(e) => setShapeWireframe(e.target.checked)}
                    className="rounded accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Wireframe Mesh</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Opacity:</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={shapeOpacity}
                    onChange={(e) => setShapeOpacity(parseInt(e.target.value))}
                    className="w-20 accent-indigo-500 h-1.5 bg-[#111114] rounded cursor-pointer"
                  />
                  <span className="font-mono text-xs text-indigo-300 w-8 text-right">{shapeOpacity}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. SCRIPT CODE EDITOR (LARGER WITH PYTHON HIGHLIGHTING & VIEW SHORTCUTS) */}
        {mainTab === 'script' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Python 3 Script Workspace
              </span>
              <span className="text-[10.5px] text-slate-500 font-mono">Python Highlighting</span>
            </div>

            {/* Python Syntax Highlighted Script Editor */}
            <ScriptCodeEditor
              value={script}
              onChange={setScript}
              heightClass="min-h-[360px] h-[440px]"
              onOpenFullIDE={onOpenFullIDE ? () => onOpenFullIDE(script) : undefined}
              onOpenSplitView={onOpenSplitView}
              showLayoutButtons={true}
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
        {editingLayer && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="py-2.5 px-4 text-xs font-semibold rounded-xl bg-[#202028] hover:bg-[#282832] text-slate-300 hover:text-white border border-white/[0.1] transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleAdd}
          className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl active:scale-[0.98] text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
            editingLayer
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50'
          }`}
        >
          {editingLayer ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{editingLayer ? 'Save Changes' : 'Add Plot to Scene'}</span>
        </button>
      </div>
    </div>
  );
};
