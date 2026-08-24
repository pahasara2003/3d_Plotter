import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  ArrowLeftRight,
  ArrowRight,
  Clock,
  Settings,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { TimeState } from '../types';

interface TimeFlowControllerProps {
  timeState: TimeState;
  onUpdateTimeState: (updater: (prev: TimeState) => TimeState) => void;
  hasTimeDependentLayers?: boolean;
}

export const TimeFlowController: React.FC<TimeFlowControllerProps> = ({
  timeState,
  onUpdateTimeState,
  hasTimeDependentLayers = false,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const { time, isPlaying, speed, min, max, step, loopMode } = timeState;

  const togglePlay = () => {
    onUpdateTimeState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleReset = () => {
    onUpdateTimeState((prev) => ({ ...prev, time: prev.min }));
  };

  const handleStep = (delta: number) => {
    onUpdateTimeState((prev) => {
      let next = prev.time + delta;
      if (next < prev.min) next = prev.min;
      if (next > prev.max) next = prev.max;
      return { ...prev, time: Math.round(next * 1000) / 1000 };
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateTimeState((prev) => ({ ...prev, time: val }));
  };

  const speeds = [0.25, 0.5, 1, 2, 4];

  const cycleLoopMode = () => {
    const modes: Array<'loop' | 'pingpong' | 'once'> = ['loop', 'pingpong', 'once'];
    const nextIdx = (modes.indexOf(loopMode) + 1) % modes.length;
    onUpdateTimeState((prev) => ({ ...prev, loopMode: modes[nextIdx] }));
  };

  const loopModeIcons = {
    loop: <Repeat className="w-3.5 h-3.5 text-indigo-400" title="Loop (Restarts at start)" />,
    pingpong: <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" title="Ping-Pong (Oscillates)" />,
    once: <ArrowRight className="w-3.5 h-3.5 text-amber-400" title="Play Once" />,
  };

  const loopModeLabels = {
    loop: 'Loop',
    pingpong: 'Bounce',
    once: 'Once',
  };

  if (isMinimized) {
    return (
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 bg-[#121216]/95 hover:bg-[#18181f] text-slate-200 backdrop-blur-md border border-white/[0.12] rounded-full px-4 py-2 shadow-2xl text-xs font-medium cursor-pointer transition-all hover:scale-105"
        >
          <Clock className={`w-3.5 h-3.5 ${isPlaying ? 'text-indigo-400 animate-spin' : 'text-slate-400'}`} />
          <span className="font-mono text-indigo-300 font-bold">t = {time.toFixed(2)}s</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-[620px]">
      <div className="bg-[#121217]/95 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 transition-all">
        {/* Top bar: Playback status, variable t readout, and helper tags */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Clock className={`w-3.5 h-3.5 ${isPlaying ? 'text-indigo-400 animate-pulse' : 'text-indigo-400'}`} />
              <span>Time Flow</span>
            </div>

            {hasTimeDependentLayers && (
              <span className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium animate-pulse">
                <Sparkles className="w-3 h-3" />
                <span>Active in Equations</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/40 border border-white/[0.08] px-2 py-0.5 rounded-lg">
              <span className="font-mono text-xs text-slate-400 font-bold">t =</span>
              <input
                type="number"
                step="any"
                value={Number(time.toFixed(3))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onUpdateTimeState((prev) => ({ ...prev, time: val }));
                }}
                className="w-16 bg-transparent font-mono text-xs font-bold text-indigo-300 text-right focus:outline-none focus:text-white"
              />
              <span className="text-[10px] text-slate-500 font-mono">s</span>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showSettings
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-slate-200'
              }`}
              title="Time Bounds Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Minimize Time Controller"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Middle Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-mono text-slate-500 w-8 text-right">{min}</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={time}
              onChange={handleSliderChange}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer appearance-none focus:outline-none"
            />
          </div>
          <span className="text-[10.5px] font-mono text-slate-500 w-8">{max}</span>
        </div>

        {/* Bottom Control Buttons */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Play, Step & Reset buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200 border border-white/[0.06] transition-colors cursor-pointer"
              title="Reset to Start (t = min)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleStep(-0.1)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200 border border-white/[0.06] transition-colors cursor-pointer"
              title="Step Backward (-0.1s)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={togglePlay}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shadow-lg cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-102'
              }`}
              title="Play / Pause Time Flow (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={() => handleStep(0.1)}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200 border border-white/[0.06] transition-colors cursor-pointer"
              title="Step Forward (+0.1s)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Loop Mode & Speed Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={cycleLoopMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              title={`Mode: ${loopModeLabels[loopMode]} (Click to cycle)`}
            >
              {loopModeIcons[loopMode]}
              <span className="text-[11px]">{loopModeLabels[loopMode]}</span>
            </button>

            {/* Speed buttons */}
            <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-0.5">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateTimeState((prev) => ({ ...prev, speed: s }))}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                    speed === s
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collapsible Range Bounds Settings */}
        {showSettings && (
          <div className="pt-2 mt-1 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-300 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Range:</span>
              <div className="flex items-center gap-1 bg-black/30 border border-white/[0.08] px-2 py-1 rounded-lg">
                <span className="text-slate-500 font-mono text-[10px]">min:</span>
                <input
                  type="number"
                  step="any"
                  value={min}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val < max) onUpdateTimeState((prev) => ({ ...prev, min: val }));
                  }}
                  className="w-12 bg-transparent font-mono text-[11px] text-slate-200 focus:outline-none"
                />
              </div>
              <span className="text-slate-500">to</span>
              <div className="flex items-center gap-1 bg-black/30 border border-white/[0.08] px-2 py-1 rounded-lg">
                <span className="text-slate-500 font-mono text-[10px]">max:</span>
                <input
                  type="number"
                  step="any"
                  value={max}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > min) onUpdateTimeState((prev) => ({ ...prev, max: val }));
                  }}
                  className="w-12 bg-transparent font-mono text-[11px] text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Quick Ranges:</span>
              <button
                onClick={() => onUpdateTimeState((prev) => ({ ...prev, min: 0, max: 6.283 }))}
                className="px-2 py-0.5 text-[10.5px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 cursor-pointer"
              >
                0 to 2π
              </button>
              <button
                onClick={() => onUpdateTimeState((prev) => ({ ...prev, min: -5, max: 5 }))}
                className="px-2 py-0.5 text-[10.5px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 cursor-pointer"
              >
                -5 to 5
              </button>
              <button
                onClick={() => onUpdateTimeState((prev) => ({ ...prev, min: 0, max: 10 }))}
                className="px-2 py-0.5 text-[10.5px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 cursor-pointer"
              >
                0 to 10
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
