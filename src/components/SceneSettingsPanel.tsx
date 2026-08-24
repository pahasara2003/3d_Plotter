import React, { useState } from 'react';
import {
  ChevronDown,
  Settings2,
  Grid,
  Sun,
  Compass,
  Box,
  Hash,
  Sliders,
  Maximize2,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { SceneSettings } from '../types';

interface SceneSettingsPanelProps {
  settings: SceneSettings;
  onChange: (settings: SceneSettings) => void;
}

export const SceneSettingsPanel: React.FC<SceneSettingsPanelProps> = ({
  settings,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'display' | 'scaling' | 'bounds'>('display');

  const updateSetting = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const resetScales = () => {
    onChange({
      ...settings,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      logScaleX: false,
      logScaleY: false,
      logScaleZ: false,
    });
  };

  const resetBounds = () => {
    onChange({
      ...settings,
      useCustomBounds: false,
      xMin: -5,
      xMax: 5,
      yMin: -5,
      yMax: 5,
      zMin: -5,
      zMax: 5,
    });
  };

  return (
    <div className="border-t border-white/[0.08] p-3 bg-[#121215] flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Scene & Axis Settings</span>
        </div>
        <div className="flex items-center gap-2">
          {(settings.logScaleX || settings.logScaleY || settings.logScaleZ) && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              LOG ON
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-400' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 pt-1">
          {/* Sub-tabs */}
          <div className="flex bg-[#0c0c0f] p-0.5 rounded-lg border border-white/[0.06] text-[11px]">
            <button
              onClick={() => setActiveTab('display')}
              className={`flex-1 py-1 px-2 rounded-md font-medium transition-all text-center cursor-pointer ${
                activeTab === 'display'
                  ? 'bg-indigo-600/90 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Display
            </button>
            <button
              onClick={() => setActiveTab('scaling')}
              className={`flex-1 py-1 px-2 rounded-md font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'scaling'
                  ? 'bg-indigo-600/90 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Scaling & Log</span>
              {(settings.logScaleX || settings.logScaleY || settings.logScaleZ) && (
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('bounds')}
              className={`flex-1 py-1 px-2 rounded-md font-medium transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'bounds'
                  ? 'bg-indigo-600/90 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Min/Max</span>
              {settings.useCustomBounds && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* TAB 1: Display & Lighting */}
          {activeTab === 'display' && (
            <div className="flex flex-col gap-2.5">
              {/* Ambient light */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-24 shrink-0 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" /> Ambient
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.ambientLight}
                  onChange={(e) => updateSetting('ambientLight', parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
                />
                <span className="font-mono text-xs text-slate-500 w-10 text-right">
                  {settings.ambientLight}%
                </span>
              </div>

              {/* Directional light */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-24 shrink-0 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-pink-400" /> Directional
                </span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={settings.directionalLight}
                  onChange={(e) => updateSetting('directionalLight', parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
                />
                <span className="font-mono text-xs text-slate-500 w-10 text-right">
                  {settings.directionalLight}%
                </span>
              </div>

              {/* Opacity */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-24 shrink-0">Opacity</span>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={settings.surfaceOpacity}
                  onChange={(e) => updateSetting('surfaceOpacity', parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
                />
                <span className="font-mono text-xs text-slate-500 w-10 text-right">
                  {settings.surfaceOpacity}%
                </span>
              </div>

              {/* Color Tint */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 w-24 shrink-0">Color Tint</span>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={settings.colorTint}
                  onChange={(e) => updateSetting('colorTint', parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
                />
                <span className="font-mono text-xs text-slate-500 w-10 text-right">
                  {settings.colorTint}%
                </span>
              </div>

              {/* Toggle Buttons: Grid, Axes, Numbers/Ticks, Mesh */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => updateSetting('showGrid', !settings.showGrid)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    settings.showGrid
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  Grid Ground
                </button>

                <button
                  onClick={() => updateSetting('showAxes', !settings.showAxes)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    settings.showAxes
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  Axes Lines
                </button>

                <button
                  onClick={() => updateSetting('showTicks', !settings.showTicks)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    settings.showTicks
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle coordinate ticks and numeric numbers"
                >
                  <Hash className="w-3 h-3" />
                  Numbers / Ticks
                </button>

                <button
                  onClick={() => updateSetting('wireframe', !settings.wireframe)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    settings.wireframe
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Box className="w-3 h-3" />
                  Wireframe Mesh
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: X, Y, Z Scaling & Log Scale Toggles */}
          {activeTab === 'scaling' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Axis Scaling & Scale Mode</span>
                <button
                  onClick={resetScales}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset 1.0x
                </button>
              </div>

              {/* X Axis Control */}
              <div className="bg-[#18181e] p-2.5 rounded-xl border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-blue-400">X Axis</span>
                  </div>
                  <button
                    onClick={() => updateSetting('logScaleX', !settings.logScaleX)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      settings.logScaleX
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold'
                        : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {settings.logScaleX ? 'Log Scale [ON]' : 'Linear'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-12">Scale:</span>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={Math.round((settings.scaleX ?? 1) * 100)}
                    onChange={(e) => updateSetting('scaleX', parseInt(e.target.value) / 100)}
                    className="flex-1 accent-blue-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                  <span className="font-mono text-xs text-blue-300 w-10 text-right">
                    {(settings.scaleX ?? 1).toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* Y Axis Control */}
              <div className="bg-[#18181e] p-2.5 rounded-xl border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-400">Y Axis</span>
                  </div>
                  <button
                    onClick={() => updateSetting('logScaleY', !settings.logScaleY)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      settings.logScaleY
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                        : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {settings.logScaleY ? 'Log Scale [ON]' : 'Linear'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-12">Scale:</span>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={Math.round((settings.scaleY ?? 1) * 100)}
                    onChange={(e) => updateSetting('scaleY', parseInt(e.target.value) / 100)}
                    className="flex-1 accent-emerald-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                  <span className="font-mono text-xs text-emerald-300 w-10 text-right">
                    {(settings.scaleY ?? 1).toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* Z Axis Control */}
              <div className="bg-[#18181e] p-2.5 rounded-xl border border-white/[0.06] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-semibold text-rose-400">Z Axis (Height)</span>
                  </div>
                  <button
                    onClick={() => updateSetting('logScaleZ', !settings.logScaleZ)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      settings.logScaleZ
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold'
                        : 'bg-[#101014] border-white/[0.08] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {settings.logScaleZ ? 'Log Scale [ON]' : 'Linear'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-12">Scale:</span>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={Math.round((settings.scaleZ ?? 1) * 100)}
                    onChange={(e) => updateSetting('scaleZ', parseInt(e.target.value) / 100)}
                    className="flex-1 accent-rose-500 h-1.5 cursor-pointer rounded bg-[#101014]"
                  />
                  <span className="font-mono text-xs text-rose-300 w-10 text-right">
                    {(settings.scaleZ ?? 1).toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Min & Max Bounds */}
          {activeTab === 'bounds' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.useCustomBounds}
                    onChange={(e) => updateSetting('useCustomBounds', e.target.checked)}
                    className="accent-indigo-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Use Custom Range Bounds
                  </span>
                </label>
                {settings.useCustomBounds && (
                  <button
                    onClick={resetBounds}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Reset
                  </button>
                )}
              </div>

              {settings.useCustomBounds ? (
                <div className="flex flex-col gap-2.5 bg-[#18181e] p-2.5 rounded-xl border border-white/[0.06]">
                  {/* X bounds */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-400 w-14 shrink-0">X bounds:</span>
                    <input
                      type="number"
                      value={settings.xMin}
                      onChange={(e) => updateSetting('xMin', parseFloat(e.target.value) || -5)}
                      className="w-16 bg-[#101014] border border-white/[0.1] rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
                      placeholder="Min"
                    />
                    <span className="text-slate-500 text-xs font-mono">to</span>
                    <input
                      type="number"
                      value={settings.xMax}
                      onChange={(e) => updateSetting('xMax', parseFloat(e.target.value) || 5)}
                      className="w-16 bg-[#101014] border border-white/[0.1] rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
                      placeholder="Max"
                    />
                  </div>

                  {/* Y bounds */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400 w-14 shrink-0">Y bounds:</span>
                    <input
                      type="number"
                      value={settings.yMin}
                      onChange={(e) => updateSetting('yMin', parseFloat(e.target.value) || -5)}
                      className="w-16 bg-[#101014] border border-white/[0.1] rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
                      placeholder="Min"
                    />
                    <span className="text-slate-500 text-xs font-mono">to</span>
                    <input
                      type="number"
                      value={settings.yMax}
                      onChange={(e) => updateSetting('yMax', parseFloat(e.target.value) || 5)}
                      className="w-16 bg-[#101014] border border-white/[0.1] rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
                      placeholder="Max"
                    />
                  </div>

                  {/* Z bounds */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-rose-400 w-14 shrink-0">Z bounds:</span>
                    <input
                      type="number"
                      value={settings.zMin}
                      onChange={(e) => updateSetting('zMin', parseFloat(e.target.value) || -5)}
                      className="w-16 bg-[#101014] border border-white/[0.1] rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
                      placeholder="Min"
                    />
                    <span className="text-slate-500 text-xs font-mono">to</span>
                    <input
                      type="number"
                      value={settings.zMax}
                      onChange={(e) => updateSetting('zMax', parseFloat(e.target.value) || 5)}
                      className="w-16 bg-[#101014] border border-white/[0.1] rounded px-1.5 py-0.5 text-xs font-mono text-slate-200 text-center"
                      placeholder="Max"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#16161c] rounded-xl border border-white/[0.04] text-[11px] text-slate-400 leading-relaxed">
                  Default symmetric domain radius <span className="font-mono text-indigo-300">[-R, +R]</span> is used for each layer. Check the box above to specify explicit custom bounding limits for <span className="text-blue-400 font-semibold">X</span>, <span className="text-emerald-400 font-semibold">Y</span>, and <span className="text-rose-400 font-semibold">Z</span>.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
