import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Copy,
  Check,
  Trash2,
  BookOpen,
  Sparkles,
  Columns,
  Box,
  Terminal,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Code2,
  ChevronRight,
  Layers,
  Zap,
} from 'lucide-react';
import { LayerItem, ParamItem, ViewModeType } from '../types';
import { SCRIPT_PRESETS, PALETTE } from '../constants/presets';
import {
  tokenizePythonCode,
} from './ScriptCodeEditor';
import {
  runPythonScript,
  runPythonScriptSync,
  getPyodideStatus,
  subscribePyodideStatus,
  PyodideStatus,
  PythonPlotOutput,
} from '../utils/pythonRunner';

interface FullScriptIDEProps {
  script: string;
  onChangeScript: (code: string) => void;
  layers: LayerItem[];
  activeLayerId?: number | null;
  onSelectLayer?: (id: number) => void;
  onAddScriptLayer?: (code: string, name: string) => void;
  onUpdateActiveLayerScript?: (code: string) => void;
  viewMode: ViewModeType;
  onChangeViewMode: (mode: ViewModeType) => void;
  params: Record<string, ParamItem>;
  onUpdateParamValue?: (name: string, value: number) => void;
  currentTime?: number;
}

export const FullScriptIDE: React.FC<FullScriptIDEProps> = ({
  script,
  onChangeScript,
  layers,
  activeLayerId,
  onSelectLayer,
  onAddScriptLayer,
  onUpdateActiveLayerScript,
  viewMode,
  onChangeViewMode,
  params,
  onUpdateParamValue,
  currentTime = 0,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'console' | 'docs' | 'params'>('console');
  const [pyStatus, setPyStatus] = useState<PyodideStatus>(getPyodideStatus());
  const [isRunning, setIsRunning] = useState(false);
  const [lastOutput, setLastOutput] = useState<PythonPlotOutput | null>(null);

  // Subscribe to Pyodide status
  useEffect(() => {
    return subscribePyodideStatus(setPyStatus);
  }, []);

  // Sync scrolling
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Run script
  const handleRun = async () => {
    setIsRunning(true);
    try {
      const scope: Record<string, number> = { t: currentTime, time: currentTime };
      for (const k in params) {
        scope[k] = params[k].value;
      }
      const res = await runPythonScript(script, scope);
      setLastOutput(res);
      if (onUpdateActiveLayerScript) {
        onUpdateActiveLayerScript(script);
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Automatic quick validation
  const validation = useMemo(() => {
    try {
      const scope: Record<string, number> = { t: currentTime, time: currentTime };
      for (const k in params) {
        scope[k] = params[k].value;
      }
      return runPythonScriptSync(script, scope);
    } catch (e: any) {
      return {
        success: false,
        error: e.message || 'Syntax error',
        stdout: '',
        executionTimeMs: 0,
        surfaces: [],
        curves: [],
        points3d: [],
        meshes: [],
      };
    }
  }, [script, params, currentTime]);

  const tokens = useMemo(() => tokenizePythonCode(script), [script]);

  const lineCount = useMemo(() => {
    const lines = script.split('\n').length;
    return Math.max(lines, 1);
  }, [script]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRun();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const indent = '    ';
      const newValue = script.substring(0, start) + indent + script.substring(end);
      onChangeScript(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // List of script layers
  const scriptLayers = layers.filter((l) => l.type === 'script');

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0f] text-slate-300 select-none overflow-hidden font-sans">
      {/* Top IDE Navigation & Controls Toolbar */}
      <div className="h-12 border-b border-white/[0.08] bg-[#121216] px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Title, Layer selector, Engine badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-xs tracking-wider text-slate-100 font-mono">
              PYTHON SCRIPT IDE
            </span>
          </div>

          <div className="w-px h-4 bg-white/[0.08]" />

          {/* Layer Selector */}
          {scriptLayers.length > 0 && onSelectLayer && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px]">Layer:</span>
              <select
                value={activeLayerId || ''}
                onChange={(e) => onSelectLayer(Number(e.target.value))}
                className="bg-[#18181f] border border-white/[0.1] text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                {scriptLayers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Indicator */}
          {validation.success ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Ready ({validation.executionTimeMs}ms)</span>
            </div>
          ) : (
            <div
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 truncate max-w-[240px]"
              title={validation.error || ''}
            >
              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">{validation.error}</span>
            </div>
          )}

          {/* Pyodide Badge */}
          {pyStatus === 'ready' && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              <Zap className="w-2.5 h-2.5" /> Python 3.12 (Pyodide)
            </span>
          )}
          {pyStatus === 'loading' && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
              Loading Python Engine...
            </span>
          )}
        </div>

        {/* Right: Actions, Run, View Mode Toggles */}
        <div className="flex items-center gap-2">
          {/* Preset quick picker */}
          <div className="relative hidden lg:flex items-center">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onChangeScript(SCRIPT_PRESETS[e.target.value] || '');
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-[#18181f] border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="" disabled>
                Load Python Preset...
              </option>
              <option value="sinc">Sinc 3D Surface</option>
              <option value="mobius">Parametric Möbius Strip</option>
              <option value="lorenz">Lorenz Chaotic Attractor</option>
              <option value="lissajous">3D Lissajous Knot</option>
              <option value="numpyRipple">NumPy Meshgrid Ripple</option>
              <option value="torus">Parametric Torus Ring</option>
              <option value="shell">Spherical Bumpy Shell</option>
              <option value="scatter">Gaussian Particle Cloud</option>
              <option value="travelingWave">Time-Varying Wave</option>
            </select>
          </div>

          {/* Run Button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/50 transition-all cursor-pointer disabled:opacity-50"
            title="Execute Python Script (Shift + Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Running...' : 'Run Script'}</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#18181f] p-0.5 rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => onChangeViewMode('script')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'script'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full Script IDE (Hide 3D Plot)"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Script</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View (Script on Left, 3D Plot on Right)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('plot')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'plot'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Return to 3D Canvas Viewport"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">3D Plot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main IDE Workspace: Left Editor, Right Utility / Output Drawer */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Main Python Code Editor */}
        <div className="flex flex-1 flex-col overflow-hidden relative border-r border-white/[0.08]">
          {/* Sub Toolbar: Line info, Copy, Clear */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f0f13] border-b border-white/[0.04] text-[11px] text-slate-400 select-none">
            <div className="flex items-center gap-2">
              <span className="font-mono">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
              <span>·</span>
              <span className="font-mono text-slate-500">
                {script.length} characters
              </span>
              <span>·</span>
              <span className="text-slate-500">Python 3 Syntax</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy Script Code"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeScript('')}
                className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear Code"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="relative flex flex-1 overflow-hidden font-mono text-[13px] leading-relaxed">
            {/* Gutter */}
            <div className="w-12 select-none py-4 pr-3 pl-1 bg-[#09090b] text-right font-mono text-[11.5px] text-slate-600 border-r border-white/[0.06] shrink-0 overflow-hidden">
              {Array.from({ length: lineCount }).map((_, idx) => (
                <div key={idx} className="h-5 leading-5">
                  {idx + 1}
                </div>
              ))}
            </div>

            {/* Content area */}
            <div className="relative flex-1 h-full overflow-hidden bg-[#0c0c0f]">
              {/* Highlight layer */}
              <pre
                ref={preRef}
                aria-hidden="true"
                className="absolute inset-0 m-0 py-4 px-4 font-mono text-[13px] leading-5 whitespace-pre-wrap break-words pointer-events-none overflow-hidden select-none"
                style={{
                  tabSize: 4,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                }}
              >
                <code>
                  {tokens.map((token, index) => {
                    let colorClass = 'text-slate-200';
                    if (token.type === 'keyword') colorClass = 'text-purple-400 font-semibold';
                    else if (token.type === 'builtin') colorClass = 'text-sky-300';
                    else if (token.type === 'number') colorClass = 'text-amber-300';
                    else if (token.type === 'string') colorClass = 'text-emerald-300';
                    else if (token.type === 'comment') colorClass = 'text-slate-500 italic';
                    else if (token.type === 'operator') colorClass = 'text-pink-400';
                    else if (token.type === 'punctuation') colorClass = 'text-slate-400';

                    return (
                      <span key={index} className={colorClass}>
                        {token.text}
                      </span>
                    );
                  })}
                  {script.endsWith('\n') && '\n'}
                </code>
              </pre>

              {/* Input layer */}
              <textarea
                ref={textareaRef}
                value={script}
                onChange={(e) => onChangeScript(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                placeholder="# Write your Python 3D plotting script here..."
                className="absolute inset-0 w-full h-full m-0 py-4 px-4 font-mono text-[13px] leading-5 text-transparent caret-indigo-400 bg-transparent resize-none focus:outline-none border-none whitespace-pre-wrap break-words overflow-auto selection:bg-indigo-500/30 selection:text-transparent"
                style={{
                  tabSize: 4,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                }}
              />
            </div>
          </div>

          {/* Quick Preset Buttons Bar */}
          <div className="px-3 py-2 bg-[#121216] border-t border-white/[0.08] flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
            </span>
            {[
              { label: 'Sinc Surface', id: 'sinc' },
              { label: 'Möbius Strip', id: 'mobius' },
              { label: 'Lorenz Attractor', id: 'lorenz' },
              { label: 'Lissajous Knot', id: 'lissajous' },
              { label: 'NumPy Meshgrid', id: 'numpyRipple' },
              { label: 'Gaussian Cloud', id: 'scatter' },
              { label: 'Torus Ring', id: 'torus' },
              { label: 'Bumpy Shell', id: 'shell' },
              { label: 'Traveling Wave', id: 'travelingWave' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeScript(SCRIPT_PRESETS[preset.id] || '')}
                className="px-2 py-1 text-[11px] font-medium rounded-md border border-white/[0.08] bg-[#16161b] text-slate-400 hover:text-indigo-200 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Drawer: Console Output, API Reference, Live Variable Sliders */}
        <div className="w-[380px] min-w-[320px] max-w-[440px] flex flex-col bg-[#111115] overflow-hidden shrink-0">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-white/[0.08] bg-[#141419] px-2 pt-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'console'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console</span>
              {(lastOutput?.stdout || validation.stdout) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'docs'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>API Reference</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('params')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'params'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Variables</span>
              {Object.keys(params).length > 0 && (
                <span className="text-[10px] text-slate-500">
                  ({Object.keys(params).length})
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3.5 text-xs">
            {/* 1. Python Console Output */}
            {activeTab === 'console' && (
              <div className="flex flex-col gap-3 font-mono">
                <div className="flex items-center justify-between text-slate-500 pb-2 border-b border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    Standard Output & Results
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {validation.executionTimeMs}ms
                  </span>
                </div>

                {/* Geometry Stats */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[#16161c] border border-white/[0.06]">
                    <span className="text-slate-500 block text-[10px]">Surfaces</span>
                    <span className="font-semibold text-indigo-300">
                      {validation.surfaces?.length || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#16161c] border border-white/[0.06]">
                    <span className="text-slate-500 block text-[10px]">3D Curves</span>
                    <span className="font-semibold text-emerald-300">
                      {validation.curves?.length || 0}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#16161c] border border-white/[0.06]">
                    <span className="text-slate-500 block text-[10px]">Points Count</span>
                    <span className="font-semibold text-amber-300">
                      {Math.floor((validation.points3d?.length || 0) / 3)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#16161c] border border-white/[0.06]">
                    <span className="text-slate-500 block text-[10px]">Custom Meshes</span>
                    <span className="font-semibold text-pink-300">
                      {validation.meshes?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Stdout pre */}
                <div>
                  <span className="text-[10.5px] text-slate-500 block mb-1">
                    Python print() logs:
                  </span>
                  {validation.stdout ? (
                    <pre className="p-2.5 rounded-lg bg-[#08080a] border border-white/[0.08] text-emerald-300 text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto m-0">
                      {validation.stdout}
                    </pre>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#08080a] border border-white/[0.06] text-slate-600 text-[11px] italic">
                      No print output. Add print("...") in your Python script to log data.
                    </div>
                  )}
                </div>

                {/* Error log */}
                {!validation.success && validation.error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11.5px] flex flex-col gap-1">
                    <span className="font-semibold flex items-center gap-1 text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Execution Notice:
                    </span>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-rose-200 m-0">
                      {validation.error}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 2. Python 3D Plotting API Docs */}
            {activeTab === 'docs' && (
              <div className="flex flex-col gap-3 font-sans">
                <div className="pb-2 border-b border-white/[0.06]">
                  <h3 className="font-semibold text-slate-200 text-xs">
                    Python Plotting Reference
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Functions available directly in your script:
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 font-mono text-[11px]">
                  {/* plot_surface */}
                  <div className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-emerald-400 font-semibold">
                      plot_surface(fn)
                    </span>
                    <p className="text-slate-400 text-[10.5px] font-sans m-0">
                      Plots heightfield <code className="text-sky-300">z = fn(x, y)</code>.
                    </p>
                    <pre className="text-[10px] text-slate-400 bg-[#0c0c0f] p-1.5 rounded m-0">
                      def z(x, y):{'\n'}  return math.sin(x) * math.cos(y){'\n'}plot_surface(z)
                    </pre>
                  </div>

                  {/* plot_curve */}
                  <div className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-emerald-400 font-semibold">
                      plot_curve(fn)
                    </span>
                    <p className="text-slate-400 text-[10.5px] font-sans m-0">
                      Plots 3D space curve <code className="text-sky-300">t =&gt; (x, y, z)</code>.
                    </p>
                    <pre className="text-[10px] text-slate-400 bg-[#0c0c0f] p-1.5 rounded m-0">
                      def helix(t):{'\n'}  return (cos(t), sin(t), t/5.0){'\n'}plot_curve(helix)
                    </pre>
                  </div>

                  {/* plot_parametric_surface */}
                  <div className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-emerald-400 font-semibold">
                      plot_parametric_surface(fn, u_range, v_range)
                    </span>
                    <p className="text-slate-400 text-[10.5px] font-sans m-0">
                      Plots UV surface <code className="text-sky-300">(u, v) =&gt; (x, y, z)</code> (Möbius strip, Torus, Klein bottle).
                    </p>
                  </div>

                  {/* plot_grid */}
                  <div className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-emerald-400 font-semibold">
                      plot_grid(X, Y, Z)
                    </span>
                    <p className="text-slate-400 text-[10.5px] font-sans m-0">
                      Plots 2D matrix coordinates from <code className="text-sky-300">np.meshgrid</code>.
                    </p>
                  </div>

                  {/* plot3d */}
                  <div className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1">
                    <span className="text-emerald-400 font-semibold">
                      plot3d(x, y, z) / plot_points(pts)
                    </span>
                    <p className="text-slate-400 text-[10.5px] font-sans m-0">
                      Adds 3D points to scatter cloud or chaotic attractors.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Live Variable Sliders in IDE */}
            {activeTab === 'params' && (
              <div className="flex flex-col gap-3 font-sans">
                <div className="pb-2 border-b border-white/[0.06]">
                  <h3 className="font-semibold text-slate-200 text-xs">
                    Script Parameters & Variables
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Live variables accessible in Python scope:
                  </p>
                </div>

                {/* Time slider */}
                <div className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-amber-300">t (time)</span>
                    <span className="font-mono text-slate-400">{currentTime.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Updated automatically during animation playback.
                  </span>
                </div>

                {/* Custom variable sliders */}
                {Object.keys(params).length > 0 ? (
                  (Object.entries(params) as [string, ParamItem][]).map(([name, item]) => (
                    <div
                      key={name}
                      className="p-2.5 rounded-lg bg-[#16161c] border border-white/[0.06] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-indigo-300">{name}</span>
                        <span className="font-mono text-slate-300">{item.value}</span>
                      </div>
                      {onUpdateParamValue && (
                        <input
                          type="range"
                          min={item.min}
                          max={item.max}
                          step={item.step}
                          value={item.value}
                          onChange={(e) => onUpdateParamValue(name, parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 h-1.5 cursor-pointer"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-lg bg-[#141418] border border-white/[0.04] text-slate-500 text-[11px] italic">
                    No custom variables detected. Use <code className="text-amber-300">a</code>, <code className="text-amber-300">k</code> or add variables in the left sidebar.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
