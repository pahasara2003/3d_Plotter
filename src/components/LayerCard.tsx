import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Edit3, Copy, Trash2, Check, X, Sparkles } from 'lucide-react';
import { LayerItem } from '../types';
import { typeLabel, buildLatexDisplay, renderKatexToString } from '../utils/mathUtils';
import { ScriptCodeEditor } from './ScriptCodeEditor';

interface LayerCardProps {
  layer: LayerItem;
  onToggleVisible: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onUpdate: (layer: LayerItem) => void;
}

export const LayerCard: React.FC<LayerCardProps> = ({
  layer,
  onToggleVisible,
  onDelete,
  onDuplicate,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [name, setName] = useState(layer.name);
  const [eq, setEq] = useState(layer.eq || '');
  const [px, setPx] = useState(layer.px || '');
  const [py, setPy] = useState(layer.py || '');
  const [pz, setPz] = useState(layer.pz || '');
  const [pRho, setPRho] = useState(layer.pRho || '');
  const [pTheta, setPTheta] = useState(layer.pTheta || '');
  const [pPhi, setPPhi] = useState(layer.pPhi || '');
  const [pR, setPR] = useState(layer.pR || '');
  const [pThetaC, setPThetaC] = useState(layer.pThetaC || '');
  const [pZ, setPZ] = useState(layer.pZ || '');
  const [colorMap, setColorMap] = useState(layer.colorMap || 'thermal');
  const [threshold, setThreshold] = useState(layer.threshold ?? 0.06);
  const [coreIso, setCoreIso] = useState(layer.coreIso ?? 0.75);
  const [volumeDensity, setVolumeDensity] = useState(layer.volumeDensity ?? 1.4);
  const [densityPower, setDensityPower] = useState(layer.densityPower ?? 1.2);
  const [showBoundingBox, setShowBoundingBox] = useState(layer.showBoundingBox ?? true);
  const [script, setScript] = useState(layer.script || '');

  const latexHtml = renderKatexToString(buildLatexDisplay(layer));

  const handleApply = () => {
    const updated: LayerItem = {
      ...layer,
      name: name.trim() || layer.name,
      eq: eq.trim(),
      px: px.trim(),
      py: py.trim(),
      pz: pz.trim(),
      pRho: pRho.trim(),
      pTheta: pTheta.trim(),
      pPhi: pPhi.trim(),
      pR: pR.trim(),
      pThetaC: pThetaC.trim(),
      pZ: pZ.trim(),
      colorMap,
      threshold,
      coreIso,
      volumeDensity,
      densityPower,
      showBoundingBox,
      script,
    };
    onUpdate(updated);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(layer.name);
    setEq(layer.eq || '');
    setPx(layer.px || '');
    setPy(layer.py || '');
    setPz(layer.pz || '');
    setPRho(layer.pRho || '');
    setPTheta(layer.pTheta || '');
    setPPhi(layer.pPhi || '');
    setPR(layer.pR || '');
    setPThetaC(layer.pThetaC || '');
    setPZ(layer.pZ || '');
    setColorMap(layer.colorMap || 'thermal');
    setThreshold(layer.threshold ?? 0.06);
    setCoreIso(layer.coreIso ?? 0.75);
    setVolumeDensity(layer.volumeDensity ?? 1.4);
    setDensityPower(layer.densityPower ?? 1.2);
    setShowBoundingBox(layer.showBoundingBox ?? true);
    setScript(layer.script || '');
    setIsEditing(false);
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'surface':
        return 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10';
      case 'spherical':
        return 'border-pink-500/30 text-pink-300 bg-pink-500/10';
      case 'cylindrical':
        return 'border-teal-500/30 text-teal-300 bg-teal-500/10';
      case 'field':
      case 'fieldSph':
      case 'fieldCyl':
        return 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10';
      case 'param':
      case 'paramSph':
      case 'paramCyl':
        return 'border-amber-500/30 text-amber-300 bg-amber-500/10';
      case 'density':
      case 'densitySph':
      case 'densityCyl':
        return 'border-violet-500/40 text-violet-300 bg-violet-500/15';
      case 'script':
        return 'border-sky-500/30 text-sky-300 bg-sky-500/10';
      default:
        return 'border-white/[0.1] text-slate-400 bg-white/[0.04]';
    }
  };

  return (
    <div
      className={`border rounded-xl bg-[#16161b] mb-2 overflow-hidden transition-all duration-150 ${
        layer.visible
          ? 'border-white/[0.08] hover:border-white/[0.16] shadow-sm'
          : 'opacity-40 border-white/[0.04]'
      } ${isEditing ? 'ring-1 ring-indigo-500/60 border-indigo-500/60' : ''}`}
    >
      {/* Header */}
      <div
        onClick={() => onToggleVisible(layer.id)}
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none bg-[#16161b]"
      >
        {/* Color picker swatch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            colorInputRef.current?.click();
          }}
          style={{ backgroundColor: layer.color }}
          className="w-4 h-4 rounded shrink-0 shadow-sm border border-black/40 hover:scale-110 transition-transform cursor-pointer"
          title="Change Color"
        />
        <input
          ref={colorInputRef}
          type="color"
          value={layer.color}
          onChange={(e) => onUpdate({ ...layer, color: e.target.value })}
          className="sr-only"
        />

        {/* Title */}
        <span
          className="flex-1 text-[13px] font-medium text-slate-100 truncate font-sans"
          title={layer.name}
        >
          {layer.name}
        </span>

        {/* Type Badge */}
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getBadgeStyle(
            layer.type
          )}`}
        >
          {typeLabel(layer.type)}
        </span>

        {/* Quick Action buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors ${
              isEditing ? 'text-indigo-300 bg-indigo-500/15' : ''
            }`}
            title="Edit Equation"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleVisible(layer.id)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors"
            title={layer.visible ? 'Hide layer' : 'Show layer'}
          >
            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDuplicate(layer.id)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors"
            title="Duplicate layer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(layer.id)}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete layer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KaTeX expression preview */}
      <div
        className="px-3 pb-2.5 pt-0.5 overflow-x-auto text-[12px] text-slate-300 layer-latex"
        dangerouslySetInnerHTML={{ __html: latexHtml }}
      />

      {/* Inline Editing Form */}
      {isEditing && (
        <div className="border-t border-white/[0.08] p-3 bg-[#121215] flex flex-col gap-2.5">
          {/* Surface / Field / Density Formula Inputs */}
          {(layer.type === 'surface' ||
            layer.type === 'spherical' ||
            layer.type === 'cylindrical' ||
            layer.type === 'field' ||
            layer.type === 'fieldSph' ||
            layer.type === 'fieldCyl' ||
            layer.type === 'density' ||
            layer.type === 'densitySph' ||
            layer.type === 'densityCyl') && (
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 w-14 shrink-0 font-mono">
                {layer.type.startsWith('density') ? 'V = ' : 'Formula'}
              </span>
              <input
                type="text"
                value={eq}
                onChange={(e) => setEq(e.target.value)}
                className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
              />
            </div>
          )}

          {/* Density Plot Specific Controls (Intensity -> Alpha, Solid Core, Density Multiplier, Cutoff) */}
          {(layer.type === 'density' ||
            layer.type === 'densitySph' ||
            layer.type === 'densityCyl') && (
            <div className="flex flex-col gap-2.5 bg-[#18181e] p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-400 w-16">Plot Color:</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => onUpdate({ ...layer, color: e.target.value })}
                    className="w-5 h-5 rounded border border-white/20 p-0 bg-[#111114] cursor-pointer"
                    title="Choose plot color"
                  />
                  <div className="flex items-center gap-1">
                    {['#9d8fff', '#60b4ff', '#ff6b6b', '#4ecca3', '#ffbe53', '#ff84e8'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => onUpdate({ ...layer, color: col })}
                        style={{ backgroundColor: col }}
                        className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                          layer.color.toLowerCase() === col.toLowerCase()
                            ? 'scale-110 border-white ring-1 ring-white/50'
                            : 'border-black/30 hover:scale-105'
                        }`}
                        title={col}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-400 w-16">Solid Core:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(coreIso * 100)}
                  onChange={(e) => setCoreIso(parseInt(e.target.value) / 100)}
                  className="flex-1 accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                />
                <span className="text-xs font-mono text-violet-300 w-10 text-right">
                  {Math.round(coreIso * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-400 w-16">Cutoff:</span>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={Math.round(threshold * 100)}
                  onChange={(e) => setThreshold(parseInt(e.target.value) / 100)}
                  className="flex-1 accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                />
                <span className="text-xs font-mono text-violet-300 w-10 text-right">
                  {Math.round(threshold * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-slate-400 w-16">Density:</span>
                <input
                  type="range"
                  min="3"
                  max="30"
                  value={Math.round(volumeDensity * 10)}
                  onChange={(e) => setVolumeDensity(parseInt(e.target.value) / 10)}
                  className="flex-1 accent-violet-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                />
                <span className="text-xs font-mono text-violet-300 w-10 text-right">
                  {volumeDensity.toFixed(1)}x
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10.5px] text-slate-400">Bounding Cage:</span>
                <button
                  type="button"
                  onClick={() => setShowBoundingBox(!showBoundingBox)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    showBoundingBox
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                      : 'bg-[#101014] text-slate-500 border-white/[0.08]'
                  }`}
                >
                  {showBoundingBox ? 'Visible' : 'Hidden'}
                </button>
              </div>
            </div>
          )}

          {/* Cartesian Parametric */}
          {layer.type === 'param' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  x(t)
                </span>
                <input
                  type="text"
                  value={px}
                  onChange={(e) => setPx(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  y(t)
                </span>
                <input
                  type="text"
                  value={py}
                  onChange={(e) => setPy(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  z(t)
                </span>
                <input
                  type="text"
                  value={pz}
                  onChange={(e) => setPz(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </>
          )}

          {/* Spherical Parametric */}
          {layer.type === 'paramSph' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  ρ(t)
                </span>
                <input
                  type="text"
                  value={pRho}
                  onChange={(e) => setPRho(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  θ(t)
                </span>
                <input
                  type="text"
                  value={pTheta}
                  onChange={(e) => setPTheta(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  φ(t)
                </span>
                <input
                  type="text"
                  value={pPhi}
                  onChange={(e) => setPPhi(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </>
          )}

          {/* Cylindrical Parametric */}
          {layer.type === 'paramCyl' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  r(t)
                </span>
                <input
                  type="text"
                  value={pR}
                  onChange={(e) => setPR(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  θ(t)
                </span>
                <input
                  type="text"
                  value={pThetaC}
                  onChange={(e) => setPThetaC(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-slate-400 w-10 shrink-0 font-mono">
                  z(t)
                </span>
                <input
                  type="text"
                  value={pZ}
                  onChange={(e) => setPZ(e.target.value)}
                  className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </>
          )}

          {/* Script Editor */}
          {layer.type === 'script' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold text-slate-400">
                Script Code (Syntax Highlighted):
              </span>
              <ScriptCodeEditor
                value={script}
                onChange={setScript}
                heightClass="min-h-[220px] h-[260px]"
              />
            </div>
          )}

          {/* Name label */}
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 w-14 shrink-0">
              Label
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#18181e] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleApply}
              className="flex-1 py-1.5 px-3 flex items-center justify-center gap-1 text-xs font-semibold rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Changes
            </button>
            <button
              onClick={handleCancel}
              className="py-1.5 px-3 flex items-center justify-center gap-1 text-xs rounded-lg border border-white/[0.1] bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
