import React, { useState } from 'react';
import { ChevronDown, Sliders, Plus, X } from 'lucide-react';
import { ParamItem } from '../types';
import { RESERVED_VARS } from '../utils/mathUtils';

interface VariablesPanelProps {
  params: Record<string, ParamItem>;
  onUpdateParamValue: (name: string, value: number) => void;
  onUpdateParamBounds: (name: string, min: number, max: number) => void;
  onAddManualParam: (name: string) => void;
  onRemoveParam: (name: string) => void;
}

export const VariablesPanel: React.FC<VariablesPanelProps> = ({
  params,
  onUpdateParamValue,
  onUpdateParamBounds,
  onAddManualParam,
  onRemoveParam,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [newVarName, setNewVarName] = useState('');
  const paramKeys = Object.keys(params);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newVarName.trim();
    if (!clean || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(clean) || RESERVED_VARS.has(clean)) {
      return;
    }
    onAddManualParam(clean);
    setNewVarName('');
  };

  return (
    <div className="border-t border-white/[0.08] p-3 bg-[#121215] flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-200 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Variables & Sliders</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 pt-1">
          {paramKeys.length === 0 ? (
            <div className="text-[11.5px] text-slate-500 text-center py-2 px-2.5 bg-[#16161b]/60 rounded-lg border border-white/[0.04]">
              Use a letter like <b className="text-indigo-300">a</b> or <b className="text-indigo-300">k</b> in an equation to get a dynamic slider.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {paramKeys.map((key) => {
                const p = params[key];
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-1.5 bg-[#16161b] border border-white/[0.08] rounded-xl p-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-indigo-300">
                        {key} =
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={p.value}
                        onChange={(e) =>
                          onUpdateParamValue(key, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 font-mono text-xs px-2 py-1 rounded bg-[#111114] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
                      />
                      <div className="flex-1" />
                      <button
                        onClick={() => onRemoveParam(key)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete parameter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={p.min}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateParamBounds(key, val, p.max);
                        }}
                        className="w-12 font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#111114] border border-white/[0.08] text-slate-400 focus:text-slate-100 text-center"
                        title="Minimum bound"
                      />
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step || 0.05}
                        value={p.value}
                        onChange={(e) =>
                          onUpdateParamValue(key, parseFloat(e.target.value))
                        }
                        className="flex-1 accent-indigo-500 h-1.5 cursor-pointer rounded bg-[#111114]"
                      />
                      <input
                        type="number"
                        step="any"
                        value={p.max}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) onUpdateParamBounds(key, p.min, val);
                        }}
                        className="w-12 font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#111114] border border-white/[0.08] text-slate-400 focus:text-slate-100 text-center"
                        title="Maximum bound"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add custom parameter row */}
          <form onSubmit={handleAdd} className="flex gap-1.5 mt-1">
            <input
              type="text"
              placeholder="add variable, e.g. k"
              maxLength={8}
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              className="flex-1 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-[#111114] border border-white/[0.1] text-slate-100 focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={!newVarName.trim()}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#18181e] hover:bg-indigo-500/20 border border-white/[0.1] text-slate-300 hover:text-indigo-200 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
