/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { LayerItem, ParamItem, SceneSettings, StatusState, TimeState, ViewModeType } from './types';
import { extractParamNames, getLayerExprs, RESERVED_VARS } from './utils/mathUtils';
import { PALETTE, SCRIPT_PRESETS } from './constants/presets';
import { Topbar } from './components/Topbar';
import { LayerList } from './components/LayerList';
import { VariablesPanel } from './components/VariablesPanel';
import { SceneSettingsPanel } from './components/SceneSettingsPanel';
import { AddLayerPanel } from './components/AddLayerPanel';
import { PlotCanvas, PlotCanvasRef } from './components/PlotCanvas';
import { StatusBar } from './components/StatusBar';
import { TimeFlowController } from './components/TimeFlowController';
import { FullScriptIDE } from './components/FullScriptIDE';

export default function App() {
  const canvasRef = useRef<PlotCanvasRef>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewModeType>('plot');

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

  // Initial demo layers: a ripple surface + an orbiting sphere
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

  // Active Python script workspace state
  const [activeScriptCode, setActiveScriptCode] = useState<string>(
    SCRIPT_PRESETS.sinc ||
      `# Sinc 3D Surface Generator\nimport math\n\ndef sinc_surface(x, y):\n    r = math.sqrt(x**2 + y**2) + 0.001\n    return (math.sin(r) / r) * 3.0\n\nplot_surface(sinc_surface)`
  );
  const [activeScriptLayerId, setActiveScriptLayerId] = useState<number | null>(null);

  const [sceneSettings, setSceneSettings] = useState<SceneSettings>({
    ambientLight: 45,
    directionalLight: 90,
    surfaceOpacity: 88,
    colorTint: 45,
    showGrid: true,
    showAxes: true,
    showTicks: true,
    wireframe: false,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    useCustomBounds: false,
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    zMin: -5,
    zMax: 5,
    logScaleX: false,
    logScaleY: false,
    logScaleZ: false,
  });

  const [status, setStatus] = useState<StatusState>({
    message: 'Ready — 3D plotter active with Python script engine & time flow',
    isError: false,
  });

  const editingLayer = editingLayerId !== null ? layers.find((l) => l.id === editingLayerId) || null : null;

  // Check if any active layers have time variable 't' or 'time'
  const hasTimeDependentLayers = layers.some((l) => {
    if (l.type === 'script' && l.script) {
      return /\b(t|time)\b/.test(l.script);
    }
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
      usedVars.forEach((v) => {
        if (!next[v]) {
          next[v] = { value: 1, min: -10, max: 10, step: 0.1, manual: false };
        }
      });
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

      if (newLayer.type === 'script') {
        setActiveScriptLayerId(newLayer.id);
        setActiveScriptCode(newLayer.script || '');
      }

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
      if (activeScriptLayerId === id) {
        const remainingScript = filtered.find((l) => l.type === 'script');
        if (remainingScript) {
          setActiveScriptLayerId(remainingScript.id);
          setActiveScriptCode(remainingScript.script || '');
        } else {
          setActiveScriptLayerId(null);
        }
      }
      if (editingLayerId === id) {
        setEditingLayerId(null);
      }
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
    if (updated.id === activeScriptLayerId && updated.script) {
      setActiveScriptCode(updated.script);
    }
    setStatus({
      message: `Updated plot: ${updated.name}`,
      isError: false,
    });
  };

  const handleStartEditLayer = (id: number) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    setEditingLayerId(id);
    setIsAddMenuOpen(true);

    if (target.type === 'script') {
      setActiveScriptLayerId(id);
      if (target.script) {
        setActiveScriptCode(target.script);
      }
    }

    if (viewMode === 'script') {
      setViewMode('plot');
    }
  };

  const handleSaveEditedLayer = (updated: LayerItem) => {
    handleUpdateLayer(updated);
    setEditingLayerId(null);
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
  };

  // Sync Python script updates from FullScriptIDE to the active layer (or create one)
  const handleScriptChange = (newCode: string) => {
    setActiveScriptCode(newCode);
    if (activeScriptLayerId !== null) {
      setLayers((prev) =>
        prev.map((l) => (l.id === activeScriptLayerId ? { ...l, script: newCode } : l))
      );
    } else {
      const existingScript = layers.find((l) => l.type === 'script');
      if (existingScript) {
        setActiveScriptLayerId(existingScript.id);
        setLayers((prev) =>
          prev.map((l) => (l.id === existingScript.id ? { ...l, script: newCode } : l))
        );
      }
    }
  };

  const handleSelectScriptLayer = (id: number) => {
    const target = layers.find((l) => l.id === id);
    if (target && target.type === 'script') {
      setActiveScriptLayerId(id);
      setActiveScriptCode(target.script || '');
    }
  };

  const handleOpenFullIDE = (scriptCodeOrId?: string | number) => {
    if (typeof scriptCodeOrId === 'number') {
      handleSelectScriptLayer(scriptCodeOrId);
    } else if (typeof scriptCodeOrId === 'string') {
      setActiveScriptCode(scriptCodeOrId);
      const existingScript = layers.find((l) => l.type === 'script');
      if (existingScript) {
        setActiveScriptLayerId(existingScript.id);
        setLayers((prev) =>
          prev.map((l) => (l.id === existingScript.id ? { ...l, script: scriptCodeOrId } : l))
        );
      } else {
        handleAddLayer({
          type: 'script',
          name: 'Python Plot Script',
          color: PALETTE[layers.length % PALETTE.length],
          R: 5,
          N: 45,
          script: scriptCodeOrId,
        });
      }
    }
    setViewMode('script');
  };

  const handleOpenSplitView = (scriptCodeOrId?: string | number) => {
    if (typeof scriptCodeOrId === 'number') {
      handleSelectScriptLayer(scriptCodeOrId);
    } else if (typeof scriptCodeOrId === 'string') {
      setActiveScriptCode(scriptCodeOrId);
    }
    setViewMode('split');
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
        name: 'Traveling Circular Wave',
        R: 5,
        N: 55,
        eq: 'sin(2*sqrt(x^2+y^2) - t*2.5) / (1 + 0.35*sqrt(x^2+y^2))',
      },
      {
        id: 102,
        type: 'script',
        visible: true,
        color: '#4ecca3',
        name: 'Lorenz Attractor (Python)',
        R: 5,
        N: 45,
        script: SCRIPT_PRESETS.lorenz,
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
    setActiveScriptLayerId(102);
    setActiveScriptCode(SCRIPT_PRESETS.lorenz);
    setTimeState((prev) => ({ ...prev, isPlaying: true, time: 0 }));
    setStatus({
      message: 'Loaded time-varying showcase preset (Traveling Wave + Python Lorenz Attractor + Orbiting Sphere)',
      isError: false,
    });
  };

  const nextColor = PALETTE[layers.length % PALETTE.length];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0D0D0D] text-slate-300">
      {/* Top Navigation Bar with View Switcher */}
      <Topbar
        onResetView={() => canvasRef.current?.resetCamera()}
        onSnapshot={() => canvasRef.current?.takeSnapshot()}
        onLoadExample={handleLoadExample}
        layerCount={layers.length}
        isAddMenuOpen={isAddMenuOpen}
        onToggleAddMenu={() => {
          if (isAddMenuOpen) {
            setIsAddMenuOpen(false);
            setEditingLayerId(null);
          } else {
            setIsAddMenuOpen(true);
            setEditingLayerId(null);
          }
        }}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* Main Plotting & Scripting Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Control Panel (Available in 'plot' mode) */}
        {viewMode === 'plot' && (
          <aside className="w-[440px] min-w-[380px] max-w-[500px] flex flex-col border-r border-white/[0.08] bg-[#121215] overflow-hidden shrink-0">
            {/* Scrollable Layer Stack */}
            <LayerList
              layers={layers}
              onToggleVisible={handleToggleVisible}
              onDelete={handleDeleteLayer}
              onDuplicate={handleDuplicateLayer}
              onUpdate={handleUpdateLayer}
              onEditLayer={handleStartEditLayer}
              editingLayerId={editingLayerId}
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
        )}

        {/* View Layout 1: FULL SCRIPT IDE ("Hide Plot & View Script") */}
        {viewMode === 'script' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0c0f]">
            <FullScriptIDE
              script={activeScriptCode}
              onChangeScript={handleScriptChange}
              layers={layers}
              activeLayerId={activeScriptLayerId}
              onSelectLayer={handleSelectScriptLayer}
              onUpdateActiveLayerScript={(code) => handleScriptChange(code)}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              params={params}
              onUpdateParamValue={handleUpdateParamValue}
              currentTime={timeState.time}
            />
          </div>
        )}

        {/* View Layout 2: SPLIT SCREEN (Python Script IDE on Left 50%, 3D Canvas on Right 50%) */}
        {viewMode === 'split' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left 50%: Script IDE */}
            <div className="w-1/2 min-w-[380px] flex flex-col border-r border-white/[0.08] bg-[#0c0c0f] overflow-hidden">
              <FullScriptIDE
                script={activeScriptCode}
                onChangeScript={handleScriptChange}
                layers={layers}
                activeLayerId={activeScriptLayerId}
                onSelectLayer={handleSelectScriptLayer}
                onUpdateActiveLayerScript={(code) => handleScriptChange(code)}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                params={params}
                onUpdateParamValue={handleUpdateParamValue}
                currentTime={timeState.time}
              />
            </div>

            {/* Right 50%: Live Interactive 3D WebGL Canvas */}
            <main className="w-1/2 relative overflow-hidden flex flex-col bg-[#0D0D0D]">
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
            </main>
          </div>
        )}

        {/* View Layout 3: STANDARD 3D PLOT CANVAS VIEW */}
        {viewMode === 'plot' && (
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
                onClick={() => {
                  setEditingLayerId(null);
                  setIsAddMenuOpen(true);
                }}
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
        )}

        {/* Right Sidebar: Dedicated Add New Plot / Change Plot Menu (Collapsible / Hideable) */}
        {viewMode === 'plot' && isAddMenuOpen && (
          <aside className="w-[540px] min-w-[480px] max-w-[650px] flex flex-col border-l border-white/[0.08] bg-[#121216] overflow-hidden shrink-0 z-10 shadow-2xl">
            <AddLayerPanel
              onAddLayer={handleAddLayer}
              nextColor={nextColor}
              onClose={() => {
                setIsAddMenuOpen(false);
                setEditingLayerId(null);
              }}
              onOpenFullIDE={handleOpenFullIDE}
              onOpenSplitView={handleOpenSplitView}
              editingLayer={editingLayer}
              onUpdateLayer={handleSaveEditedLayer}
              onCancelEdit={handleCancelEdit}
            />
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar status={status} layerCount={layers.length} />
    </div>
  );
}
