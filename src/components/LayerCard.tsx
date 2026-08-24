import React, { useRef } from 'react';
import { Eye, EyeOff, Edit3, Copy, Trash2 } from 'lucide-react';
import { LayerItem } from '../types';
import { typeLabel, buildLatexDisplay, renderKatexToString } from '../utils/mathUtils';

interface LayerCardProps {
  layer: LayerItem;
  onToggleVisible: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onUpdate: (layer: LayerItem) => void;
  onEditLayer?: (id: number) => void;
  isEditing?: boolean;
}

export const LayerCard: React.FC<LayerCardProps> = ({
  layer,
  onToggleVisible,
  onDelete,
  onDuplicate,
  onUpdate,
  onEditLayer,
  isEditing = false,
}) => {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const latexHtml = renderKatexToString(buildLatexDisplay(layer));

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-3 mb-2 flex flex-col gap-2 relative ${
        isEditing
          ? 'bg-[#181824] border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
          : layer.visible
          ? 'bg-[#15151a] border-white/[0.08] hover:border-white/[0.16] hover:bg-[#18181f]'
          : 'bg-[#111114]/60 border-white/[0.04] opacity-60'
      }`}
    >
      {/* Header Row: Color Swatch + Name + Actions */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Color dot & Layer Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Native Color Picker Clickable Dot */}
          <div className="relative group/color shrink-0">
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className="w-4 h-4 rounded-full border border-white/20 transition-transform group-hover/color:scale-110 cursor-pointer shadow-sm"
              style={{ backgroundColor: layer.color }}
              title="Change color"
            />
            <input
              ref={colorInputRef}
              type="color"
              value={layer.color}
              onChange={(e) => onUpdate({ ...layer, color: e.target.value })}
              className="sr-only"
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-200 truncate" title={layer.name}>
                {layer.name}
              </span>
              <span className="text-[9.5px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 shrink-0">
                {typeLabel(layer.type)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Card Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Edit Plot in Right Panel */}
          <button
            type="button"
            onClick={() => onEditLayer?.(layer.id)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isEditing
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-indigo-300 hover:bg-white/[0.08]'
            }`}
            title="Edit / Change Plot parameters on right panel"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={() => onToggleVisible(layer.id)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              layer.visible
                ? 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.08]'
                : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]'
            }`}
            title={layer.visible ? 'Hide plot layer' : 'Show plot layer'}
          >
            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Duplicate Layer */}
          <button
            type="button"
            onClick={() => onDuplicate(layer.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Duplicate plot layer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Layer */}
          <button
            type="button"
            onClick={() => onDelete(layer.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Delete plot layer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KaTeX Math / Script preview */}
      <div className="flex items-center justify-between text-slate-300 bg-[#0d0d10] px-3.5 py-2.5 rounded-xl border border-white/[0.06] overflow-x-auto min-h-[38px]">
        {layer.type === 'script' ? (
          <div className="font-mono text-xs text-emerald-300 truncate w-full">
            {layer.script ? layer.script.split('\n').find((l) => l.trim() && !l.trim().startsWith('#')) || 'Python script active' : 'Python script active'}
          </div>
        ) : latexHtml ? (
          <div
            className="overflow-x-auto font-mono text-[15px] text-slate-100 [&_.katex]:text-[15.5px] [&_.katex]:leading-relaxed tracking-wide"
            dangerouslySetInnerHTML={{ __html: latexHtml }}
          />
        ) : (
          <span className="text-slate-500 italic text-xs">No equation specified</span>
        )}

        {isEditing && (
          <span className="text-[10.5px] font-mono font-medium text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md ml-2 shrink-0">
            Editing →
          </span>
        )}
      </div>
    </div>
  );
};
