import React, { useState, useEffect } from 'react';
import {
  Box,
  Camera,
  RotateCcw,
  Sparkles,
  Plus,
  PanelRightClose,
  Columns,
  Code2,
  Zap,
} from 'lucide-react';
import { ViewModeType } from '../types';
import { getPyodideStatus, subscribePyodideStatus, PyodideStatus } from '../utils/pythonRunner';

interface TopbarProps {
  onResetView: () => void;
  onSnapshot: () => void;
  onLoadExample: () => void;
  layerCount: number;
  isAddMenuOpen?: boolean;
  onToggleAddMenu?: () => void;
  viewMode?: ViewModeType;
  onChangeViewMode?: (mode: ViewModeType) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onResetView,
  onSnapshot,
  onLoadExample,
  isAddMenuOpen,
  onToggleAddMenu,
  viewMode = 'plot',
  onChangeViewMode,
}) => {
  const [pyStatus, setPyStatus] = useState<PyodideStatus>(getPyodideStatus());

  useEffect(() => {
    return subscribePyodideStatus(setPyStatus);
  }, []);

  return (
    <header className="h-12 border-b border-white/[0.08] bg-[#121215]/95 backdrop-blur flex items-center px-4 gap-3.5 shrink-0 z-20 select-none">
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-sm">
          <Box className="w-4 h-4" />
        </div>
        <span className="font-bold text-sm tracking-wider text-slate-100 font-mono">
          3D PLOTTER
        </span>
      </div>

      <div className="w-px h-5 bg-white/[0.08]" />

      {/* View Mode Switcher */}
      {onChangeViewMode && (
        <div className="flex items-center bg-[#18181f] p-0.5 rounded-lg border border-white/[0.08]">
          <button
            type="button"
            onClick={() => onChangeViewMode('plot')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'plot'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Canvas Viewport"
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Plot</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split Screen View (Python Script & 3D Plot side-by-side)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('script')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'script'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full Python Script IDE (Hide 3D Plot)"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Python Script</span>
          </button>
        </div>
      )}

      {/* Pyodide status */}
      {pyStatus === 'ready' && (
        <span className="hidden xl:inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>Python 3 Ready</span>
        </span>
      )}

      <div className="flex-1" />

      {/* Control hints (only when 3D plot is visible) */}
      {viewMode !== 'script' && (
        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="bg-[#18181e] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              drag
            </kbd>
            rotate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="bg-[#18181e] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              scroll
            </kbd>
            zoom
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="bg-[#18181e] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
              shift
            </kbd>
            +drag pan
          </span>
        </div>
      )}

      <div className="w-px h-5 bg-white/[0.08] hidden lg:block" />

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onLoadExample}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-slate-100 bg-[#18181e] hover:bg-[#22222a] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer shadow-sm"
          title="Load presets & sample scene"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Demo Presets</span>
        </button>

        {viewMode !== 'script' && (
          <>
            <button
              onClick={onResetView}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-slate-100 bg-[#18181e] hover:bg-[#22222a] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer shadow-sm"
              title="Reset Camera View"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Reset Camera</span>
            </button>

            <button
              onClick={onSnapshot}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-slate-100 bg-[#18181e] hover:bg-[#22222a] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer shadow-sm"
              title="Capture High-Res Image Snapshot"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Capture</span>
            </button>
          </>
        )}

        {onToggleAddMenu && (
          <button
            onClick={onToggleAddMenu}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm ml-1 ${
              isAddMenuOpen
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-indigo-950/50'
                : 'bg-[#18181e] hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30'
            }`}
            title={isAddMenuOpen ? 'Hide Add Plots Menu' : 'Open Add Plots Menu'}
          >
            {isAddMenuOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAddMenuOpen ? 'Hide Menu' : 'Add Plot'}</span>
          </button>
        )}
      </div>
    </header>
  );
};
