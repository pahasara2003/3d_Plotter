import React from 'react';
import { Layers } from 'lucide-react';
import { LayerItem } from '../types';
import { LayerCard } from './LayerCard';

interface LayerListProps {
  layers: LayerItem[];
  onToggleVisible: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onUpdate: (layer: LayerItem) => void;
  onEditLayer?: (id: number) => void;
  editingLayerId?: number | null;
}

export const LayerList: React.FC<LayerListProps> = ({
  layers,
  onToggleVisible,
  onDelete,
  onDuplicate,
  onUpdate,
  onEditLayer,
  editingLayerId,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3.5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Layers
          </span>
        </div>
        <span className="text-xs font-medium text-slate-300 bg-[#18181e] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
          {layers.length}
        </span>
      </div>

      <div className="flex-1">
        {layers.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500 text-xs leading-relaxed border border-dashed border-white/[0.1] rounded-xl bg-[#141418]/50">
            No active 3D plots.
            <br />
            Add surfaces, fields, or curves below.
            <div className="text-lg opacity-40 mt-2 font-mono">↓</div>
          </div>
        ) : (
          layers.map((layer) => (
            <LayerCard
              key={layer.id}
              layer={layer}
              onToggleVisible={onToggleVisible}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onUpdate={onUpdate}
              onEditLayer={onEditLayer}
              isEditing={editingLayerId === layer.id}
            />
          ))
        )}
      </div>
    </div>
  );
};
