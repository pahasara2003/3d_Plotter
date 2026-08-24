/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { LayerItem, ParamItem, SceneSettings, StatusState, TimeState } from './types';
import { extractParamNames, getLayerExprs, RESERVED_VARS } from './utils/mathUtils';
import { PALETTE } from './constants/presets';
import { Topbar } from './components/Topbar';
import { LayerList } from './components/LayerList';
import { VariablesPanel } from './components/VariablesPanel';
import { SceneSettingsPanel } from './components/SceneSettingsPanel';
import { AddLayerPanel } from './components/AddLayerPanel';
import { PlotCanvas, PlotCanvasRef } from './components/PlotCanvas';
import { StatusBar } from './components/StatusBar';
import { TimeFlowController } from './components/TimeFlowController';

export default function App() {
  const canvasRef = useRef<PlotCanvasRef>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(true);

  // Time-Varying Animation State
  const [timeState, setTimeState] = useState<TimeState>({
    time: 0,
    isPlaying: false,
    speed: 1,
    min: 0,
    max: 10,
    step: 0.05,
    loopMode: 'loop',
  });

  const pingPongDirRef = useRef<1 | -1>(1);

  // Initial demo layers: a ripple surface + a 3D helix curve
  const [layers, setLayers] = useState<LayerItem[]>([
    {
      id: 1,
      type: 'surface',
      visible: true,
      color: '#9d8fff',
      name: 'Harmonic Ripple',
      R: 5,
      N: 55,
      eq: 'sin(sqrt(x^2+y^2) - t*2) / (0.5 + sqrt(x^2+y^2))',
    },
    {
      id: 2,
      type: 'shape',
      visible: true,
      color: '#ffd060',
      name: 'Orbiting Sphere',
      R: 5,
      N: 32,
      shapeType: 'sphere',
      shapeRadius: '0.8',
      shapeCenterX: '3.2*cos(t*1.5)',
      shapeCenterY: '3.2*sin(t*1.5)',
      shapeCenterZ: 'sin(t*3)*0.8',
      shapeWireframe: false,
      shapeOpacity: 90,
    },
  ]);

  const [nextId, setNextId] = useState(3);
  const [params, setParams] = useState<Record<string, ParamItem>>({});

  const [sceneSettings, setSceneSettings] = useState<SceneSettings>({
    ambientLight: 45,
    directionalLight: 90,
    surfaceOpacity: 88,
    colorTint: 45,
    showGrid: true,
    showAxes: true,
    wireframe: false,
  });

  const [status, setStatus] = useState<StatusState>({
    message: 'Ready — 3D plotter active with basic shapes & time flow',
    isError: false,
  });

  // Check if any active layers have time variable 't' or 'time'
  const hasTimeDependentLayers = layers.some((l) => {
    const exprs = getLayerExprs(l);
    return exprs.some((e) => /\b(t|time)\b/.test(e));
  });

  // Continuous animation loop for time flow
  useEffect(() => {
    if (!timeState.isPlaying) return;

    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const deltaSec = Math.min(0.1, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      setTimeState((prev) => {
        if (!prev.isPlaying) return prev;
        const dt = deltaSec * prev.speed;
        let nextTime = prev.time;

        if (prev.loopMode === 'pingpong') {
          nextTime += dt * pingPongDirRef.current;
          if (nextTime >= prev.max) {
            nextTime = prev.max;
            pingPongDirRef.current = -1;
          } else if (nextTime <= prev.min) {
            nextTime = prev.min;
            pingPongDirRef.current = 1;
          }
        } else if (prev.loopMode === 'loop') {
          nextTime += dt;
          if (nextTime > prev.max) {
            const range = prev.max - prev.min;
            nextTime = prev.min + (range > 0 ? (nextTime - prev.min) % range : 0);
          }
        } else {
          // once
          nextTime += dt;
          if (nextTime >= prev.max) {
            nextTime = prev.max;
            return { ...prev, time: nextTime, isPlaying: false };
          }
        }

        return { ...prev, time: Math.round(nextTime * 1000) / 1000 };
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [timeState.isPlaying, timeState.speed, timeState.loopMode]);

  // Re-synchronize variable sliders whenever layer expressions change (ignoring 't' and 'time')
  useEffect(() => {
    const usedVars = new Set<string>();
    layers.forEach((l) => {
      getLayerExprs(l).forEach((expr) => {
        extractParamNames(expr).forEach((v) => {
          if (!RESERVED_VARS.has(v) && v !== 't' && v !== 'time') {
            usedVars.add(v);
          }
        });
      });
    });

    setParams((prev) => {
      const next = { ...prev };
      // Add newly referenced variables
      usedVars.forEach((v) => {
        if (!next[v]) {
          next[v] = { value: 1, min: -10, max: 10, step: 0.1, manual: false };
        }
      });
      // Remove automatically created vars that are no longer referenced
      Object.keys(next).forEach((v) => {
        if (!usedVars.has(v) && !next[v].manual) {
          delete next[v];
        }
      });
      return next;
    });
  }, [layers]);

  // Layer handlers
  const handleAddLayer = (layerData: Omit<LayerItem, 'id' | 'visible'>) => {
    try {
      const newLayer: LayerItem = {
        ...layerData,
        id: nextId,
        visible: true,
      };
      setNextId((id) => id + 1);
      setLayers((prev) => [...prev, newLayer]);
      setStatus({
        message: `Added plot layer: ${newLayer.name}`,
        isError: false,
      });
    } catch (err: any) {
      setStatus({
        message: `Error adding layer: ${err.message || String(err)}`,
        isError: true,
      });
    }
  };

  const handleToggleVisible = (id: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleDeleteLayer = (id: number) => {
    setLayers((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      setStatus({
        message: `${filtered.length} plot layer${filtered.length !== 1 ? 's' : ''} remaining`,
        isError: false,
      });
      return filtered;
    });
  };

  const handleDuplicateLayer = (id: number) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const clone: LayerItem = {
      ...JSON.parse(JSON.stringify(target)),
      id: nextId,
      name: `${target.name} (copy)`,
      color: PALETTE[layers.length % PALETTE.length],
    };
    setNextId((id) => id + 1);
    setLayers((prev) => [...prev, clone]);
    setStatus({
      message: `Duplicated: ${clone.name}`,
      isError: false,
    });
  };

  const handleUpdateLayer = (updated: LayerItem) => {
    setLayers((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setStatus({
      message: `Updated: ${updated.name}`,
      isError: false,
    });
  };

  // Variable parameter handlers
  const handleUpdateParamValue = (name: string, value: number) => {
    setParams((prev) => {
      if (!prev[name]) return prev;
      return {
        ...prev,
        [name]: { ...prev[name], value },
      };
    });
  };

  const handleUpdateParamBounds = (name: string, min: number, max: number) => {
    setParams((prev) => {
      const p = prev[name];
      if (!p) return prev;
      let newMin = min;
      let newMax = max;
      if (newMin >= newMax) {
        newMax = newMin + 1;
      }
      const val = Math.max(newMin, Math.min(newMax, p.value));
      return {
        ...prev,
        [name]: { ...p, min: newMin, max: newMax, value: val },
      };
    });
  };

  const handleAddManualParam = (name: string) => {
    if (RESERVED_VARS.has(name)) return;
    setParams((prev) => ({
      ...prev,
      [name]: { value: 1, min: -10, max: 10, step: 0.1, manual: true },
    }));
    setStatus({
      message: `Added custom variable: ${name}`,
      isError: false,
    });
  };

  const handleRemoveParam = (name: string) => {
    setParams((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Load demo example showcase with time-varying fields and basic shapes
  const handleLoadExample = () => {
    const demos: LayerItem[] = [
      {
        id: 101,
        type: 'surface',
        visible: true,
        color: '#9d8fff',
        name: 'Traveling Circular Wave',
        R: 5,
        N: 55,
        eq: 'sin(2*sqrt(x^2+y^2) - t*2.5) / (1 + 0.35*sqrt(x^2+y^2))',
      },
      {
        id: 102,
        type: 'field',
        visible: true,
        color: '#4ecca3',
        name: 'Vortex Vector Field',
        R: 4,
        N: 24,
        eq: '[-y + 0.3*sin(t), x + 0.3*cos(t), 0.5*sin(z - t)]',
        fieldDisplay: 'both',
        streamlineCount: 16,
        showArrowHeads: true,
      },
      {
        id: 103,
        type: 'shape',
        visible: true,
        color: '#ffd060',
        name: 'Orbiting Core Sphere',
        R: 5,
        N: 32,
        shapeType: 'sphere',
        shapeRadius: '0.75',
        shapeCenterX: '2.6 * cos(t * 1.2)',
        shapeCenterY: '2.6 * sin(t * 1.2)',
        shapeCenterZ: '0.8 * sin(t * 2.4)',
        shapeWireframe: false,
        shapeOpacity: 95,
      },
    ];

    setLayers(demos);
    setNextId(104);
    setTimeState((prev) => ({ ...prev, isPlaying: true, time: 0 }));
    setStatus({
      message: 'Loaded time-varying showcase preset (Traveling Wave + Dynamic Vector Field + Orbiting Sphere)',
      isError: false,
    });
  };

  const nextColor = PALETTE[layers.length % PALETTE.length];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0D0D0D] text-slate-300">
      {/* Top Navigation Bar */}
      <Topbar
        onResetView={() => canvasRef.current?.resetCamera()}
        onSnapshot={() => canvasRef.current?.takeSnapshot()}
        onLoadExample={handleLoadExample}
        layerCount={layers.length}
        isAddMenuOpen={isAddMenuOpen}
        onToggleAddMenu={() => setIsAddMenuOpen((prev) => !prev)}
      />

      {/* Main Plotting Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Control Panel: Active Layers, Variables & Scene Controls */}
        <aside className="w-[380px] min-w-[340px] max-w-[420px] flex flex-col border-r border-white/[0.08] bg-[#121215] overflow-hidden shrink-0">
          {/* Scrollable Layer Stack */}
          <LayerList
            layers={layers}
            onToggleVisible={handleToggleVisible}
            onDelete={handleDeleteLayer}
            onDuplicate={handleDuplicateLayer}
            onUpdate={handleUpdateLayer}
          />

          {/* Dynamic Variable Sliders */}
          <VariablesPanel
            params={params}
            onUpdateParamValue={handleUpdateParamValue}
            onUpdateParamBounds={handleUpdateParamBounds}
            onAddManualParam={handleAddManualParam}
            onRemoveParam={handleRemoveParam}
          />

          {/* Lighting & Scene Controls */}
          <SceneSettingsPanel
            settings={sceneSettings}
            onChange={setSceneSettings}
          />
        </aside>

        {/* 3D WebGL Visualization Viewport */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-[#0D0D0D]">
          <PlotCanvas
            ref={canvasRef}
            layers={layers}
            params={params}
            settings={sceneSettings}
            currentTime={timeState.time}
            onUpdateSettings={setSceneSettings}
          />

          {/* Time Flow Playback Controller Floating HUD */}
          <TimeFlowController
            timeState={timeState}
            onUpdateTimeState={setTimeState}
            hasTimeDependentLayers={hasTimeDependentLayers}
          />

          {/* Floating button to reopen Add Plot panel when closed */}
          {!isAddMenuOpen && (
            <button
              onClick={() => setIsAddMenuOpen(true)}
              className="absolute top-3 left-3 flex items-center gap-2 bg-[#141418]/90 hover:bg-indigo-600 text-slate-200 hover:text-white backdrop-blur border border-white/[0.12] hover:border-indigo-400/40 rounded-xl px-3.5 py-1.5 z-10 shadow-xl text-xs font-semibold transition-all cursor-pointer group"
              title="Open Add New Plot Menu"
            >
              <div className="w-4 h-4 rounded-md bg-indigo-500/20 group-hover:bg-white/20 flex items-center justify-center text-indigo-400 group-hover:text-white">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Add New Plot</span>
            </button>
          )}
        </main>

        {/* Right Sidebar: Dedicated Add New Plot Menu (Collapsible / Hideable) */}
        {isAddMenuOpen && (
          <aside className="w-[450px] min-w-[380px] max-w-[500px] flex flex-col border-l border-white/[0.08] bg-[#121216] overflow-hidden shrink-0 z-10 shadow-2xl">
            <AddLayerPanel
              onAddLayer={handleAddLayer}
              nextColor={nextColor}
              onClose={() => setIsAddMenuOpen(false)}
            />
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar status={status} layerCount={layers.length} />
    </div>
  );
}
