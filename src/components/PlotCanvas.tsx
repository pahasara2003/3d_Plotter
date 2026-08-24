import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { Maximize2, Minimize2, RotateCcw, Box, Hash } from 'lucide-react';
import { LayerItem, ParamItem, SceneSettings } from '../types';
import { buildLayerThreeObject, disposeThreeObject, mapMathToThree } from '../utils/threePlotters';

export interface PlotCanvasRef {
  resetCamera: () => void;
  takeSnapshot: () => void;
}

interface PlotCanvasProps {
  layers: LayerItem[];
  params: Record<string, ParamItem>;
  settings: SceneSettings;
  onUpdateSettings?: (settings: SceneSettings) => void;
}

function createTextSprite(text: string, color: string, isSmall: boolean = false): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 64);
    ctx.font = isSmall ? '600 22px system-ui, sans-serif' : '700 28px system-ui, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(isSmall ? 0.75 : 1.1, isSmall ? 0.375 : 0.55, 1);
  return sprite;
}

export const PlotCanvas = forwardRef<PlotCanvasRef, PlotCanvasProps>(
  ({ layers, params, settings, onUpdateSettings }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Three.js instances
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const ambLightRef = useRef<THREE.AmbientLight | null>(null);
    const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
    const gridRef = useRef<THREE.GridHelper | null>(null);
    const axesGrpRef = useRef<THREE.Group | null>(null);

    // Track active 3D layer objects by layer id
    const layerObjectsRef = useRef<Map<number, THREE.Object3D>>(new Map());

    // Orbit camera parameters
    const sphRef = useRef({ theta: 0.7, phi: 0.9, r: 14 });
    const isDraggingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const shiftDragRef = useRef(false);
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const updateCameraPos = () => {
      if (!cameraRef.current) return;
      const { theta, phi, r } = sphRef.current;
      cameraRef.current.position.set(
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.cos(theta)
      );
      cameraRef.current.lookAt(0, 0, 0);
    };

    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        sphRef.current = { theta: 0.7, phi: 0.9, r: 14 };
        if (sceneRef.current) {
          sceneRef.current.position.set(0, 0, 0);
        }
        updateCameraPos();
      },
      takeSnapshot: () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `3d-plot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      },
    }));

    // Build or rebuild axes group with 3D lines, tick marks, and coordinate numbers
    const rebuildAxes = (scene: THREE.Scene, curSettings: SceneSettings) => {
      if (axesGrpRef.current) {
        scene.remove(axesGrpRef.current);
        disposeThreeObject(axesGrpRef.current);
        axesGrpRef.current = null;
      }

      if (!curSettings.showAxes) return;

      const axesGrp = new THREE.Group();

      const mkLine = (a: [number, number, number], b: [number, number, number], color: number) => {
        const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...a),
          new THREE.Vector3(...b),
        ]);
        return new THREE.Line(g, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
      };

      const maxR = curSettings.useCustomBounds
        ? Math.max(
            Math.abs(curSettings.xMin),
            Math.abs(curSettings.xMax),
            Math.abs(curSettings.yMin),
            Math.abs(curSettings.yMax),
            Math.abs(curSettings.zMin),
            Math.abs(curSettings.zMax)
          )
        : 6;

      const AX = Math.max(6, maxR * 1.15);

      // Math X axis -> Three.js X (Blue)
      const pXmin = mapMathToThree(-AX, 0, 0, curSettings);
      const pXmax = mapMathToThree(AX, 0, 0, curSettings);
      axesGrp.add(mkLine(pXmin, pXmax, 0x3b82f6));

      // Math Y axis (in-plane depth) -> Three.js Z (Emerald)
      const pYmin = mapMathToThree(0, -AX, 0, curSettings);
      const pYmax = mapMathToThree(0, AX, 0, curSettings);
      axesGrp.add(mkLine(pYmin, pYmax, 0x10b981));

      // Math Z axis (height) -> Three.js Y (Rose)
      const pZmin = mapMathToThree(0, 0, -AX, curSettings);
      const pZmax = mapMathToThree(0, 0, AX, curSettings);
      axesGrp.add(mkLine(pZmin, pZmax, 0xf43f5e));

      // Axis Title Sprites
      const xTitle = curSettings.logScaleX ? 'log X' : 'X';
      const yTitle = curSettings.logScaleY ? 'log Y' : 'Y';
      const zTitle = curSettings.logScaleZ ? 'log Z' : 'Z';

      const sprX = createTextSprite(xTitle, '#60a5fa');
      sprX.position.set(pXmax[0] + 0.6, pXmax[1], pXmax[2]);
      axesGrp.add(sprX);

      const sprY = createTextSprite(yTitle, '#34d399');
      sprY.position.set(pYmax[0], pYmax[1], pYmax[2] + 0.6);
      axesGrp.add(sprY);

      const sprZ = createTextSprite(zTitle, '#fb7185');
      sprZ.position.set(pZmax[0], pZmax[1] + 0.6, pZmax[2]);
      axesGrp.add(sprZ);

      // Coordinate Ticks & Numbers
      if (curSettings.showTicks) {
        const tickStep = AX > 10 ? 4 : AX > 5 ? 2 : 1;
        const tickLen = 0.18;

        for (let val = -Math.floor(AX); val <= Math.floor(AX); val += tickStep) {
          if (Math.abs(val) < 0.001) continue; // skip 0 to prevent overlap

          const label = val.toString();

          // X ticks
          const posPx = mapMathToThree(val, 0, 0, curSettings);
          axesGrp.add(
            mkLine(
              [posPx[0], posPx[1] - tickLen, posPx[2]],
              [posPx[0], posPx[1] + tickLen, posPx[2]],
              0x60a5fa
            )
          );
          const sprTx = createTextSprite(label, '#93c5fd', true);
          sprTx.position.set(posPx[0], posPx[1] - 0.42, posPx[2]);
          axesGrp.add(sprTx);

          // Y ticks (Math Y -> Three.js Z)
          const posPy = mapMathToThree(0, val, 0, curSettings);
          axesGrp.add(
            mkLine(
              [posPy[0] - tickLen, posPy[1], posPy[2]],
              [posPy[0] + tickLen, posPy[1], posPy[2]],
              0x34d399
            )
          );
          const sprTy = createTextSprite(label, '#6ee7b7', true);
          sprTy.position.set(posPy[0] + 0.42, posPy[1], posPy[2]);
          axesGrp.add(sprTy);

          // Z ticks (Math Z -> Three.js Y)
          const posPz = mapMathToThree(0, 0, val, curSettings);
          axesGrp.add(
            mkLine(
              [posPz[0] - tickLen, posPz[1], posPz[2]],
              [posPz[0] + tickLen, posPz[1], posPz[2]],
              0xfb7185
            )
          );
          const sprTz = createTextSprite(label, '#fda4af', true);
          sprTz.position.set(posPz[0] + 0.42, posPz[1], posPz[2]);
          axesGrp.add(sprTz);
        }
      }

      scene.add(axesGrp);
      axesGrpRef.current = axesGrp;
    };

    // Initialize Three.js scene
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0d0d0d);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 600);
      cameraRef.current = camera;
      updateCameraPos();

      // Lights
      const amb = new THREE.AmbientLight(0xffffff, settings.ambientLight / 100);
      scene.add(amb);
      ambLightRef.current = amb;

      const dir = new THREE.DirectionalLight(0xffffff, settings.directionalLight / 100);
      dir.position.set(6, 10, 6);
      scene.add(dir);
      dirLightRef.current = dir;

      // Grid
      const grid = new THREE.GridHelper(16, 16, 0x27272e, 0x16161a);
      scene.add(grid);
      gridRef.current = grid;

      // Initial Axes
      rebuildAxes(scene, settings);

      // Resize observer
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      handleResize();

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      // Render loop
      let animId: number;
      const animate = () => {
        animId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animId);
        resizeObserver.disconnect();
        renderer.dispose();
      };
    }, []);

    // Update lighting & scene settings & axes
    useEffect(() => {
      if (ambLightRef.current) {
        ambLightRef.current.intensity = settings.ambientLight / 100;
      }
      if (dirLightRef.current) {
        dirLightRef.current.intensity = settings.directionalLight / 100;
      }
      if (gridRef.current) {
        gridRef.current.visible = settings.showGrid;
      }
      if (sceneRef.current) {
        rebuildAxes(sceneRef.current, settings);
      }
    }, [
      settings.ambientLight,
      settings.directionalLight,
      settings.showGrid,
      settings.showAxes,
      settings.showTicks,
      settings.scaleX,
      settings.scaleY,
      settings.scaleZ,
      settings.logScaleX,
      settings.logScaleY,
      settings.logScaleZ,
      settings.useCustomBounds,
      settings.xMin,
      settings.xMax,
      settings.yMin,
      settings.yMax,
      settings.zMin,
      settings.zMax,
    ]);

    // Rebuild layer 3D objects whenever layers, params, or mesh settings change
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      const currentMap = layerObjectsRef.current;
      const currentIds = new Set(layers.map((l) => l.id));

      // Remove objects for deleted layers
      for (const [id, obj] of currentMap.entries()) {
        if (!currentIds.has(id)) {
          scene.remove(obj);
          disposeThreeObject(obj);
          currentMap.delete(id);
        }
      }

      // Build or update 3D object for each layer
      layers.forEach((layer) => {
        const oldObj = currentMap.get(layer.id);
        if (oldObj) {
          scene.remove(oldObj);
          disposeThreeObject(oldObj);
          currentMap.delete(layer.id);
        }

        const newObj = buildLayerThreeObject(layer, params, settings);
        if (newObj) {
          scene.add(newObj);
          currentMap.set(layer.id, newObj);
        }
      });
    }, [
      layers,
      params,
      settings.surfaceOpacity,
      settings.colorTint,
      settings.wireframe,
      settings.scaleX,
      settings.scaleY,
      settings.scaleZ,
      settings.logScaleX,
      settings.logScaleY,
      settings.logScaleZ,
      settings.useCustomBounds,
      settings.xMin,
      settings.xMax,
      settings.yMin,
      settings.yMax,
      settings.zMin,
      settings.zMax,
    ]);

    // Interactive Camera Event Listeners
    const handleMouseDown = (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      shiftDragRef.current = e.shiftKey;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      if (shiftDragRef.current && sceneRef.current) {
        sceneRef.current.position.x += dx * 0.012;
        sceneRef.current.position.y -= dy * 0.012;
      } else {
        sphRef.current.theta -= dx * 0.01;
        sphRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, sphRef.current.phi + dy * 0.01)
        );
        updateCameraPos();
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      sphRef.current.r = Math.max(1.5, Math.min(60, sphRef.current.r + e.deltaY * 0.02));
      updateCameraPos();
    };

    // Touch support
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 1 && touchStartPos.current) {
        const dx = e.touches[0].clientX - touchStartPos.current.x;
        const dy = e.touches[0].clientY - touchStartPos.current.y;
        sphRef.current.theta -= dx * 0.01;
        sphRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI - 0.05, sphRef.current.phi + dy * 0.01)
        );
        updateCameraPos();
        touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const toggleFullscreen = () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    };

    return (
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[#0D0D0D] h-full select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

        {/* Floating Quick Action Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#141418]/85 backdrop-blur border border-white/[0.1] rounded-xl p-1 z-10 shadow-lg">
          <button
            onClick={() => {
              sphRef.current = { theta: 0.7, phi: 0.9, r: 14 };
              if (sceneRef.current) sceneRef.current.position.set(0, 0, 0);
              updateCameraPos();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
            title="Reset View Orientation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onUpdateSettings && (
            <>
              <button
                onClick={() => onUpdateSettings({ ...settings, showTicks: !settings.showTicks })}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  settings.showTicks
                    ? 'text-indigo-300 bg-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.08]'
                }`}
                title="Toggle Axis Numbers & Ticks"
              >
                <Hash className="w-4 h-4" />
              </button>

              <button
                onClick={() => onUpdateSettings({ ...settings, wireframe: !settings.wireframe })}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  settings.wireframe
                    ? 'text-indigo-300 bg-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.08]'
                }`}
                title="Toggle Wireframe Mesh"
              >
                <Box className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Axis Legend Overlay */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 pointer-events-none bg-[#141418]/85 backdrop-blur border border-white/[0.08] rounded-lg px-2.5 py-1.5 select-none shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-4 h-1 rounded-sm bg-blue-500" />
            <span className="text-blue-400 font-semibold">
              {settings.logScaleX ? 'log X' : 'X'} (×{(settings.scaleX ?? 1).toFixed(1)})
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-4 h-1 rounded-sm bg-emerald-500" />
            <span className="text-emerald-400 font-semibold">
              {settings.logScaleY ? 'log Y' : 'Y'} (×{(settings.scaleY ?? 1).toFixed(1)})
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-4 h-1 rounded-sm bg-rose-500" />
            <span className="text-rose-400 font-semibold">
              {settings.logScaleZ ? 'log Z' : 'Z'} (×{(settings.scaleZ ?? 1).toFixed(1)})
            </span>
          </div>
        </div>

        {/* Scientific Volumetric Density Colormap Legend (ParaView style) */}
        {layers.filter(
          (l) =>
            l.visible &&
            (l.type === 'density' || l.type === 'densitySph' || l.type === 'densityCyl')
        ).map((dl) => {
          const minVal = dl.calculatedMin ?? 0;
          const maxVal = dl.calculatedMax ?? 1;
          const cmap = dl.colorMap || 'thermal';

          let gradient = 'linear-gradient(to top, #050508 0%, #b30d00 30%, #ff8000 60%, #fff233 85%, #ffffff 100%)';
          if (cmap === 'turbo') {
            gradient = 'linear-gradient(to top, #30123b, #4145ab, #28bbec, #62fc38, #f8c932, #e03b13, #7a0403)';
          } else if (cmap === 'plasma') {
            gradient = 'linear-gradient(to top, #0d0887, #6a00a8, #b12a90, #e16462, #fca636, #f0f921)';
          } else if (cmap === 'viridis') {
            gradient = 'linear-gradient(to top, #440154, #3b528b, #21908d, #5dc863, #fde725)';
          } else if (cmap === 'magma') {
            gradient = 'linear-gradient(to top, #000004, #51127c, #b73779, #fb8761, #fcfdbf)';
          } else if (cmap === 'coolwarm') {
            gradient = 'linear-gradient(to top, #3b4cc0, #8cb2e9, #ddd, #f49a7b, #b40426)';
          }

          return (
            <div
              key={dl.id}
              className="absolute top-14 right-3 pointer-events-none bg-[#121216]/90 backdrop-blur border border-white/[0.1] rounded-lg p-2 flex flex-col items-center select-none shadow-lg"
            >
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-300 font-semibold mb-1.5">
                density
              </span>
              <div className="flex items-stretch gap-1.5 h-36">
                <div
                  className="w-4 rounded-sm border border-white/20 shadow-inner"
                  style={{ background: gradient }}
                />
                <div className="flex flex-col justify-between text-[9.5px] font-mono text-slate-300">
                  <span>{maxVal >= 100 ? maxVal.toFixed(1) : maxVal.toFixed(3)}</span>
                  <span>{((maxVal + minVal) * 0.75).toFixed(2)}</span>
                  <span>{((maxVal + minVal) * 0.5).toFixed(2)}</span>
                  <span>{((maxVal + minVal) * 0.25).toFixed(2)}</span>
                  <span>{minVal >= 100 ? minVal.toFixed(1) : minVal.toFixed(3)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);
PlotCanvas.displayName = 'PlotCanvas';
