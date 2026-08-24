/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { LayerItem, ParamItem, SceneSettings, StatusState } from './types';
import { extractParamNames, getLayerExprs, RESERVED_VARS } from './utils/mathUtils';
import { PALETTE } from './constants/presets';
import { Topbar } from './components/Topbar';
import { LayerList } from './components/LayerList';
import { VariablesPanel } from './components/VariablesPanel';
import { SceneSettingsPanel } from './components/SceneSettingsPanel';
import { AddLayerPanel } from './components/AddLayerPanel';
import { PlotCanvas, PlotCanvasRef } from './components/PlotCanvas';
import { StatusBar } from './components/StatusBar';

export default function App() {
  const canvasRef = useRef<PlotCanvasRef>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(true);

  // Initial demo layers: a ripple surface + a 3D helix curve
  const [layers, setLayers] = useState<LayerItem[]>([
    {
      id: 1,
      type: 'surface',
      visible: true,
      color: '#9d8fff',
      name: 'Ripple Surface',
      R: 5,
      N: 55,
      eq: 'sin(sqrt(x^2+y^2))',
    },
    {
      id: 2,
      type: 'param',
      visible: true,
      color: '#ffd060',
      name: 'Helix Curve',
      R: 5,
      N: 55,
      px: 'cos(t)*3',
      py: 'sin(t)*3',
      pz: 't/4',
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
    message: 'Ready — interactive multi-layer 3D plotter active',
    isError: false,
  });

  // Re-synchronize variable sliders whenever layer expressions change
  useEffect(() => {
    const usedVars = new Set<string>();
    layers.forEach((l) => {
      getLayerExprs(l).forEach((expr) => {
        extractParamNames(expr).forEach((v) => usedVars.add(v));
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

  // Load demo example showcase
  const handleLoadExample = () => {
    const demos: LayerItem[] = [
      {
        id: 101,
        type: 'surface',
        visible: true,
        color: '#9d8fff',
        name: 'Harmonic Ripple',
        R: 5,
        N: 55,
        eq: 'sin(a*sqrt(x^2+y^2)) / (0.5 + sqrt(x^2+y^2))',
      },
      {
        id: 102,
        type: 'field',
        visible: true,
        color: '#4ecca3',
        name: 'Vortex Vector Field',
        R: 4,
        N: 30,
        eq: '[-y, x, 0.4*sin(z)]',
      },
      {
        id: 103,
        type: 'param',
        visible: true,
        color: '#ffd060',
        name: 'Trefoil Knot',
        R: 5,
        N: 55,
        px: 'sin(t)+2*sin(2*t)',
        py: 'cos(t)-2*cos(2*t)',
        pz: '-sin(3*t)',
      },
    ];

    setLayers(demos);
    setNextId(104);
    setParams({
      a: { value: 1.5, min: 0.1, max: 4, step: 0.1, manual: false },
    });
    setStatus({
      message: 'Loaded multi-coordinate showcase preset (Surface + Vector Field + Trefoil Knot)',
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
            onUpdateSettings={setSceneSettings}
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
