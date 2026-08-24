import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { Maximize2, Minimize2, RotateCcw, Box, Eye } from 'lucide-react';
import { LayerItem, ParamItem, SceneSettings } from '../types';
import { buildLayerThreeObject, disposeThreeObject } from '../utils/threePlotters';

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
      scene.background = new THREE.Color(0x0D0D0D);
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

      // Axes
      const axesGrp = new THREE.Group();
      const mkLine = (a: [number, number, number], b: [number, number, number], c: number) => {
        const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...a),
          new THREE.Vector3(...b),
        ]);
        return new THREE.Line(g, new THREE.LineBasicMaterial({ color: c, linewidth: 2 }));
      };
      const AX = 8;
      axesGrp.add(mkLine([-AX, 0, 0], [AX, 0, 0], 0x3b82f6)); // X axis - Blue
      axesGrp.add(mkLine([0, -AX, 0], [0, AX, 0], 0x10b981)); // Y axis - Emerald
      axesGrp.add(mkLine([0, 0, -AX], [0, 0, AX], 0xf43f5e)); // Z axis - Rose
      scene.add(axesGrp);
      axesGrpRef.current = axesGrp;

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

    // Update lighting & scene settings
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
      if (axesGrpRef.current) {
        axesGrpRef.current.visible = settings.showAxes;
      }
    }, [settings.ambientLight, settings.directionalLight, settings.showGrid, settings.showAxes]);

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
    }, [layers, params, settings.surfaceOpacity, settings.colorTint, settings.wireframe]);

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
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#141418]/80 backdrop-blur border border-white/[0.1] rounded-xl p-1 z-10 shadow-lg">
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
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 pointer-events-none bg-[#141418]/80 backdrop-blur border border-white/[0.08] rounded-lg px-2.5 py-1.5 select-none shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-4 h-1 rounded-sm bg-blue-500" />
            <span className="text-blue-400 font-semibold">X</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-4 h-1 rounded-sm bg-emerald-500" />
            <span className="text-emerald-400 font-semibold">Y</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="w-4 h-1 rounded-sm bg-rose-500" />
            <span className="text-rose-400 font-semibold">Z</span>
          </div>
        </div>
      </div>
    );
  }
);
PlotCanvas.displayName = 'PlotCanvas';
