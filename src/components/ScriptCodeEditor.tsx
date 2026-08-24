import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Maximize2,
  Minimize2,
  Trash2,
  Play,
  Terminal,
  Columns,
  Maximize,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { SCRIPT_PRESETS } from '../constants/presets';
import {
  runPythonScriptSync,
  getPyodideStatus,
  subscribePyodideStatus,
  PyodideStatus,
} from '../utils/pythonRunner';

interface ScriptCodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  heightClass?: string;
  onRun?: () => void;
  onOpenFullIDE?: () => void;
  onOpenSplitView?: () => void;
  showLayoutButtons?: boolean;
}

// Token types for custom Python syntax highlighting
type TokenType =
  | 'keyword'
  | 'builtin'
  | 'number'
  | 'string'
  | 'comment'
  | 'operator'
  | 'punctuation'
  | 'text';

interface Token {
  type: TokenType;
  text: string;
}

export function tokenizePythonCode(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  const keywords = new Set([
    'def',
    'class',
    'return',
    'lambda',
    'if',
    'elif',
    'else',
    'for',
    'while',
    'in',
    'is',
    'not',
    'and',
    'or',
    'import',
    'from',
    'as',
    'try',
    'except',
    'finally',
    'raise',
    'with',
    'yield',
    'pass',
    'break',
    'continue',
    'global',
    'nonlocal',
    'async',
    'await',
    'True',
    'False',
    'None',
  ]);

  const builtins = new Set([
    'plot_surface',
    'plot_surface_sph',
    'plot_surface_cyl',
    'plot_curve',
    'plot_curve_sph',
    'plot_curve_cyl',
    'plot3d',
    'plot_point',
    'plot_points',
    'plot_parametric_surface',
    'plot_grid',
    'plot_mesh',
    'plotSurface',
    'plotSurfaceSph',
    'plotSurfaceCyl',
    'plotCurve',
    'plotMesh',
    'sph2cart',
    'cyl2cart',
    'print',
    'range',
    'len',
    'math',
    'numpy',
    'np',
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'atan2',
    'sinh',
    'cosh',
    'tanh',
    'sqrt',
    'exp',
    'log',
    'log10',
    'log2',
    'pi',
    'e',
    'PI',
    'E',
    'abs',
    'floor',
    'ceil',
    'round',
    'min',
    'max',
    'linspace',
    'meshgrid',
    'params',
    'float',
    'int',
    'str',
    'bool',
    'list',
    'dict',
    'set',
    'tuple',
    'zip',
    'enumerate',
    'map',
    'filter',
    'sum',
    'random',
    'uniform',
    'Float32Array',
  ]);

  while (i < len) {
    const char = code[i];

    // Python single-line comment: #
    if (char === '#') {
      const start = i;
      while (i < len && code[i] !== '\n') {
        i++;
      }
      tokens.push({ type: 'comment', text: code.slice(start, i) });
      continue;
    }

    // Triple-quoted multi-line strings / docstrings: """ or '''
    if (
      (char === '"' && code[i + 1] === '"' && code[i + 2] === '"') ||
      (char === "'" && code[i + 1] === "'" && code[i + 2] === "'")
    ) {
      const quote = code.slice(i, i + 3);
      const start = i;
      i += 3;
      while (i < len && code.slice(i, i + 3) !== quote) {
        if (code[i] === '\\') {
          i += 2;
        } else {
          i++;
        }
      }
      i = Math.min(len, i + 3);
      tokens.push({ type: 'comment', text: code.slice(start, i) });
      continue;
    }

    // Strings (single or double quotes, f-strings, r-strings)
    if (
      char === '"' ||
      char === "'" ||
      ((char === 'f' || char === 'r' || char === 'b') && (code[i + 1] === '"' || code[i + 1] === "'"))
    ) {
      const start = i;
      if (char === 'f' || char === 'r' || char === 'b') i++;
      const quote = code[i];
      i++;
      while (i < len && code[i] !== quote && code[i] !== '\n') {
        if (code[i] === '\\' && i + 1 < len) {
          i += 2;
        } else {
          i++;
        }
      }
      if (i < len && code[i] === quote) i++;
      tokens.push({ type: 'string', text: code.slice(start, i) });
      continue;
    }

    // Numbers (integers, floats, exponents, hex, binary)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      const start = i;
      while (i < len && /[0-9a-fA-FxX.eE_oObB]/.test(code[i])) {
        i++;
      }
      tokens.push({ type: 'number', text: code.slice(start, i) });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_]/.test(char)) {
      const start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(code[i])) {
        i++;
      }
      const word = code.slice(start, i);
      if (keywords.has(word)) {
        tokens.push({ type: 'keyword', text: word });
      } else if (builtins.has(word)) {
        tokens.push({ type: 'builtin', text: word });
      } else {
        tokens.push({ type: 'text', text: word });
      }
      continue;
    }

    // Multi-char operators like **, //, ==, !=, <=, >=, +=, -=
    if (
      (char === '*' && code[i + 1] === '*') ||
      (char === '/' && code[i + 1] === '/') ||
      (char === '=' && code[i + 1] === '=') ||
      (char === '!' && code[i + 1] === '=') ||
      (char === '<' && code[i + 1] === '=') ||
      (char === '>' && code[i + 1] === '=') ||
      (char === '+' && code[i + 1] === '=') ||
      (char === '-' && code[i + 1] === '=')
    ) {
      tokens.push({ type: 'operator', text: code.slice(i, i + 2) });
      i += 2;
      continue;
    }

    // Single-char operators
    if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
      tokens.push({ type: 'operator', text: char });
      i++;
      continue;
    }

    // Punctuation
    if (/[{}()[\];,.]/.test(char)) {
      tokens.push({ type: 'punctuation', text: char });
      i++;
      continue;
    }

    // Whitespace and other characters
    tokens.push({ type: 'text', text: char });
    i++;
  }

  return tokens;
}

export const ScriptCodeEditor: React.FC<ScriptCodeEditorProps> = ({
  value,
  onChange,
  heightClass = 'min-h-[280px] h-[340px]',
  onRun,
  onOpenFullIDE,
  onOpenSplitView,
  showLayoutButtons = true,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pyStatus, setPyStatus] = useState<PyodideStatus>(getPyodideStatus());

  useEffect(() => {
    return subscribePyodideStatus(setPyStatus);
  }, []);

  // Sync scrolling between textarea and highlighted pre overlay
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Syntax tokens
  const tokens = useMemo(() => tokenizePythonCode(value), [value]);

  // Line numbers calculation
  const lineCount = useMemo(() => {
    const lines = value.split('\n').length;
    return Math.max(lines, 1);
  }, [value]);

  // Execute and test Python code for validity and stdout
  const evalResult = useMemo(() => {
    try {
      return runPythonScriptSync(value, {});
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
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run script on Shift+Enter or Ctrl+Enter
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onRun?.();
      return;
    }

    // Handle Tab key (4 spaces for Python indentation standard)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const indent = '    '; // 4 spaces for Python
      const newValue = value.substring(0, start) + indent + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex flex-col rounded-xl border border-white/[0.1] bg-[#0c0c0f] overflow-hidden transition-all duration-200 ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl bg-[#0D0D0D] border-indigo-500/50' : ''
      }`}
    >
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-[#121216] select-none text-xs flex-wrap gap-2">
        {/* Left Status & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Python 3D Script
          </div>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-[10.5px] text-slate-400">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>

          {/* Engine / Status badge */}
          {evalResult.success ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Valid Python ({evalResult.executionTimeMs}ms)
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 truncate max-w-[200px]"
              title={evalResult.error || ''}
            >
              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">{evalResult.error || 'Syntax Notice'}</span>
            </span>
          )}

          {pyStatus === 'ready' && (
            <span className="hidden sm:inline text-[9.5px] text-indigo-400/80 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">
              Pyodide WASM
            </span>
          )}
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1">
          {/* Quick Layout Mode Buttons */}
          {showLayoutButtons && onOpenFullIDE && (
            <button
              type="button"
              onClick={onOpenFullIDE}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer"
              title="Hide 3D Plot and View Full Python Script IDE"
            >
              <Maximize className="w-3 h-3 text-indigo-400" />
              <span className="hidden sm:inline">Full Script View</span>
            </button>
          )}

          {showLayoutButtons && onOpenSplitView && (
            <button
              type="button"
              onClick={onOpenSplitView}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer"
              title="View Split Screen (Script on left, 3D plot on right)"
            >
              <Columns className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Split View</span>
            </button>
          )}

          {/* Run button */}
          {onRun && (
            <button
              type="button"
              onClick={onRun}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
              title="Run Python Script (Shift + Enter)"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run</span>
            </button>
          )}

          {/* Console toggle */}
          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              showConsole
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
            title="Toggle Python Output Console"
          >
            <Terminal className="w-3 h-3" />
            <span className="hidden sm:inline">Output</span>
            {evalResult.stdout && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            )}
          </button>

          {/* API Docs toggle */}
          <button
            type="button"
            onClick={() => setShowApiDocs(!showApiDocs)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              showApiDocs
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
            title="Toggle Python API Reference & Cheat Sheet"
          >
            <BookOpen className="w-3 h-3" />
            <span>Docs</span>
          </button>

          {/* Copy code */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear editor */}
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Expand toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize Editor' : 'Expand Editor to Fullscreen Modal'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Python API Docs Bar */}
      {showApiDocs && (
        <div className="p-3.5 bg-[#16161c] border-b border-white/[0.08] text-[11px] text-slate-300 flex flex-col gap-2.5 max-h-56 overflow-y-auto">
          <div className="font-semibold text-indigo-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Python 3D Plotting API Functions</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Press Shift+Enter to Run
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10.5px]">
            <div className="bg-[#101014] p-2 rounded-lg border border-white/[0.06]">
              <span className="text-emerald-400 font-semibold">plot_surface(fn)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">
                Cartesian surface <code className="text-sky-300">z = f(x, y)</code> via Python function or lambda.
              </p>
            </div>

            <div className="bg-[#101014] p-2 rounded-lg border border-white/[0.06]">
              <span className="text-emerald-400 font-semibold">plot_curve(fn)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">
                3D space curve <code className="text-sky-300">t =&gt; (x, y, z)</code>.
              </p>
            </div>

            <div className="bg-[#101014] p-2 rounded-lg border border-white/[0.06]">
              <span className="text-emerald-400 font-semibold">plot_parametric_surface(fn, u_range, v_range)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">
                Parametric UV surface <code className="text-sky-300">(u, v) =&gt; (x, y, z)</code> (Möbius strip, Torus, Klein bottle).
              </p>
            </div>

            <div className="bg-[#101014] p-2 rounded-lg border border-white/[0.06]">
              <span className="text-emerald-400 font-semibold">plot_grid(X, Y, Z)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">
                NumPy coordinate matrices from <code className="text-sky-300">np.meshgrid(x, y)</code>.
              </p>
            </div>

            <div className="bg-[#101014] p-2 rounded-lg border border-white/[0.06]">
              <span className="text-emerald-400 font-semibold">plot3d(x, y, z) / plot_points(pts)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">
                Add points to 3D scatter particle cloud or chaotic attractors (Lorenz, Rössler).
              </p>
            </div>

            <div className="bg-[#101014] p-2 rounded-lg border border-white/[0.06]">
              <span className="text-emerald-400 font-semibold">plot_surface_sph(fn) / plot_surface_cyl(fn)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">
                Spherical <code className="text-sky-300">rho = f(theta, phi)</code> or Cylindrical <code className="text-sky-300">r = f(theta, z)</code>.
              </p>
            </div>
          </div>

          <div className="text-[10.5px] text-slate-400 flex items-center gap-2 flex-wrap">
            <span>
              Variables from sliders can be read directly via <code className="text-amber-300">a</code>, <code className="text-amber-300">k</code> or <code className="text-amber-300">params['a']</code>.
            </span>
            <span>
              Time variable is <code className="text-amber-300">t</code>.
            </span>
          </div>
        </div>
      )}

      {/* Collapsible Python Stdout Console */}
      {showConsole && (
        <div className="p-3 bg-[#0a0a0d] border-b border-white/[0.08] text-xs font-mono max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between text-slate-500 mb-1.5 pb-1 border-b border-white/[0.04]">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <Terminal className="w-3 h-3 text-amber-400" /> Python Console Output (stdout)
            </span>
            <span className="text-[10px] text-slate-600">
              {evalResult.executionTimeMs}ms
            </span>
          </div>
          {evalResult.stdout ? (
            <pre className="text-emerald-300 text-[11px] whitespace-pre-wrap leading-relaxed m-0">
              {evalResult.stdout}
            </pre>
          ) : (
            <p className="text-slate-600 text-[11px] italic m-0">
              No print() output yet. Use print(...) in your Python code to log messages here.
            </p>
          )}
          {evalResult.error && (
            <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
              {evalResult.error}
            </div>
          )}
        </div>
      )}

      {/* Editor Body: Line Numbers + Textarea + Syntax Pre */}
      <div
        className={`relative flex flex-1 overflow-hidden font-mono text-[12.5px] leading-relaxed ${
          isExpanded ? 'h-full min-h-[420px]' : heightClass
        }`}
      >
        {/* Line Numbers Gutter */}
        <div className="w-11 select-none py-3 pr-2.5 pl-1 bg-[#09090b] text-right font-mono text-[11px] text-slate-600 border-r border-white/[0.06] shrink-0 overflow-hidden">
          {Array.from({ length: lineCount }).map((_, idx) => (
            <div key={idx} className="h-5 leading-5">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Editor Content Area */}
        <div className="relative flex-1 h-full overflow-hidden bg-[#0c0c0f]">
          {/* Syntax Highlighted Render Layer */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 py-3 px-3.5 font-mono text-[12.5px] leading-5 whitespace-pre-wrap break-words pointer-events-none overflow-hidden select-none"
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
              {/* Extra newline preservation for ending whitespace */}
              {value.endsWith('\n') && '\n'}
            </code>
          </pre>

          {/* Interactive Textarea Layer */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="absolute inset-0 w-full h-full m-0 py-3 px-3.5 font-mono text-[12.5px] leading-5 text-transparent caret-indigo-400 bg-transparent resize-none focus:outline-none border-none whitespace-pre-wrap break-words overflow-auto selection:bg-indigo-500/30 selection:text-transparent"
            style={{
              tabSize: 4,
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
            }}
          />
        </div>
      </div>

      {/* Preset Quick Chips Bar */}
      <div className="p-2.5 bg-[#121216] border-t border-white/[0.08] flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Python Presets:
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
            onClick={() => onChange(SCRIPT_PRESETS[preset.id] || '')}
            className="px-2 py-1 text-[10.5px] font-medium rounded-md border border-white/[0.08] bg-[#16161b] text-slate-400 hover:text-indigo-200 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};
