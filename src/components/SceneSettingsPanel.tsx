import React, { useState } from 'react';
import { ChevronDown, Settings2, Grid, Sun, Compass, Box } from 'lucide-react';
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

  const updateSetting = <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="border-t border-white/[0.08] p-3 bg-[#121215] flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Scene Settings</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2.5 pt-1">
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
              min="10"
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

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => updateSetting('showGrid', !settings.showGrid)}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                settings.showGrid
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3 h-3" />
              Grid
            </button>

            <button
              onClick={() => updateSetting('showAxes', !settings.showAxes)}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                settings.showAxes
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3 h-3" />
              Axes
            </button>

            <button
              onClick={() => updateSetting('wireframe', !settings.wireframe)}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                settings.wireframe
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-[#18181e] border-white/[0.08] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3 h-3" />
              Mesh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
