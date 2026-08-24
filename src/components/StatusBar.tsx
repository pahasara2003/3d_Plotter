import React from 'react';
import { StatusState } from '../types';

interface StatusBarProps {
  status: StatusState;
  layerCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, layerCount }) => {
  return (
    <footer className="h-7 border-t border-white/[0.08] bg-[#0E0E11] flex items-center px-3.5 gap-2.5 shrink-0 select-none text-[11px]">
      <div
        className={`w-2 h-2 rounded-full transition-colors ${
          status.isError ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
        }`}
      />
      <span
        className={`truncate ${
          status.isError ? 'text-rose-400 font-medium' : 'text-slate-400'
        }`}
      >
        {status.message}
      </span>
      <div className="flex-1" />
      <span className="text-slate-500 font-mono hidden sm:inline-block">
        {layerCount} {layerCount === 1 ? 'layer' : 'layers'} rendered
      </span>
    </footer>
  );
};
