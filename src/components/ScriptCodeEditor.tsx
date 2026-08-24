import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Copy, Check, Sparkles, BookOpen, ChevronDown, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { SCRIPT_PRESETS } from '../constants/presets';

interface ScriptCodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  heightClass?: string;
}

// Token types for custom syntax highlighting
type TokenType = 'keyword' | 'builtin' | 'number' | 'string' | 'comment' | 'operator' | 'punctuation' | 'text';

interface Token {
  type: TokenType;
  text: string;
}

function tokenizeJsCode(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  const keywords = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'new', 'try', 'catch', 'throw',
    'finally', 'class', 'typeof', 'instanceof', 'void', 'delete', 'in', 'of',
    'async', 'await', 'yield', 'import', 'export', 'default', 'true', 'false', 'null', 'undefined'
  ]);

  const builtins = new Set([
    'Math', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sqrt', 'exp',
    'log', 'log10', 'log2', 'pow', 'abs', 'floor', 'ceil', 'round', 'min', 'max',
    'PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT1_2', 'SQRT2',
    'plotSurface', 'plotSurfaceSph', 'plotSurfaceCyl', 'plotCurve', 'plotMesh',
    'plot3d', 'Float32Array', 'Array', 'Object', 'Number', 'String', 'console', 'params'
  ]);

  while (i < len) {
    const char = code[i];

    // Single line comment
    if (char === '/' && code[i + 1] === '/') {
      let start = i;
      while (i < len && code[i] !== '\n') {
        i++;
      }
      tokens.push({ type: 'comment', text: code.slice(start, i) });
      continue;
    }

    // Multi line comment
    if (char === '/' && code[i + 1] === '*') {
      let start = i;
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) {
        i++;
      }
      i = Math.min(len, i + 2);
      tokens.push({ type: 'comment', text: code.slice(start, i) });
      continue;
    }

    // Strings (single, double, backtick)
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      let start = i;
      i++;
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < len) {
          i += 2;
        } else {
          i++;
        }
      }
      if (i < len) i++; // consume closing quote
      tokens.push({ type: 'string', text: code.slice(start, i) });
      continue;
    }

    // Numbers (integers, floats, scientific)
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let start = i;
      while (i < len && /[0-9a-fA-FxX.eE_]/.test(code[i])) {
        i++;
      }
      tokens.push({ type: 'number', text: code.slice(start, i) });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(char)) {
      let start = i;
      while (i < len && /[a-zA-Z0-9_$]/.test(code[i])) {
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

    // Operators
    if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
      let start = i;
      while (i < len && /[+\-*/%=<>!&|^~?:]/.test(code[i])) {
        i++;
      }
      tokens.push({ type: 'operator', text: code.slice(start, i) });
      continue;
    }

    // Punctuation
    if (/[{}()[\];,.]/.test(char)) {
      tokens.push({ type: 'punctuation', text: char });
      i++;
      continue;
    }

    // Whitespace and others
    tokens.push({ type: 'text', text: char });
    i++;
  }

  return tokens;
}

export const ScriptCodeEditor: React.FC<ScriptCodeEditorProps> = ({
  value,
  onChange,
  heightClass = 'min-h-[260px] h-[300px]',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync scrolling between textarea and highlighted code overlay
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Syntax tokens
  const tokens = useMemo(() => tokenizeJsCode(value), [value]);

  // Line numbers calculation
  const lineCount = useMemo(() => {
    const lines = value.split('\n').length;
    return Math.max(lines, 1);
  }, [value]);

  // Syntax check indicator
  const syntaxStatus = useMemo(() => {
    try {
      // Basic JS parsing check using Function constructor check
      new Function('plotSurface', 'plotSurfaceSph', 'plotSurfaceCyl', 'plotCurve', 'plotMesh', 'plot3d', 'params', value);
      return { valid: true, error: null };
    } catch (e: any) {
      return { valid: false, error: e.message || 'Syntax error' };
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
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
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl bg-[#0D0D0D] border-indigo-500/40' : ''
      }`}
    >
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-[#121216] select-none text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            JavaScript 3D Script
          </div>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-[10.5px] text-slate-400">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          {syntaxStatus.valid ? (
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Valid
            </span>
          ) : (
            <span
              className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 truncate max-w-[160px]"
              title={syntaxStatus.error || ''}
            >
              Syntax Notice
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowApiDocs(!showApiDocs)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              showApiDocs
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
            }`}
            title="Toggle API Reference & Helpers"
          >
            <BookOpen className="w-3 h-3" />
            <span>API Docs</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onChange('')}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Clear Editor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title={isExpanded ? 'Minimize Editor' : 'Expand Editor'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible API Docs Bar */}
      {showApiDocs && (
        <div className="p-3 bg-[#16161c] border-b border-white/[0.08] text-[11px] text-slate-300 flex flex-col gap-2 max-h-48 overflow-y-auto">
          <div className="font-semibold text-indigo-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 3D Script Functions & Reference
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10.5px]">
            <div className="bg-[#101014] p-2 rounded border border-white/[0.06]">
              <span className="text-pink-400">plotSurface((x, y) =&gt; number)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">Plot Cartesian heightfield z = f(x, y)</p>
            </div>
            <div className="bg-[#101014] p-2 rounded border border-white/[0.06]">
              <span className="text-pink-400">plotCurve(t =&gt; [x, y, z])</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">Plot 3D parametric space curve</p>
            </div>
            <div className="bg-[#101014] p-2 rounded border border-white/[0.06]">
              <span className="text-pink-400">plotSurfaceSph((θ, φ) =&gt; ρ)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">Plot spherical radius surface</p>
            </div>
            <div className="bg-[#101014] p-2 rounded border border-white/[0.06]">
              <span className="text-pink-400">plotSurfaceCyl((θ, z) =&gt; r)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">Plot cylindrical radius surface</p>
            </div>
            <div className="bg-[#101014] p-2 rounded border border-white/[0.06]">
              <span className="text-pink-400">plot3d(x, y, z)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">Add individual point to scatter cloud</p>
            </div>
            <div className="bg-[#101014] p-2 rounded border border-white/[0.06]">
              <span className="text-pink-400">plotMesh(pts, N, M)</span>
              <p className="text-slate-400 text-[10px] font-sans mt-0.5">Plot custom Float32Array UV vertex mesh</p>
            </div>
          </div>
          <div className="text-[10px] text-slate-400">
            Variables from sliders can be read via <code className="text-amber-300">params.a</code>, <code className="text-amber-300">params.k</code> or global scope!
          </div>
        </div>
      )}

      {/* Editor Body: Line Numbers + Textarea + Syntax Pre */}
      <div className={`relative flex flex-1 overflow-hidden font-mono text-[12.5px] leading-relaxed ${isExpanded ? 'h-full min-h-[420px]' : heightClass}`}>
        {/* Line Numbers Gutter */}
        <div className="w-10 select-none py-3 pr-2 pl-1 bg-[#09090b] text-right font-mono text-[11px] text-slate-600 border-r border-white/[0.06] shrink-0 overflow-hidden">
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
              tabSize: 2,
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
              tabSize: 2,
              fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
            }}
          />
        </div>
      </div>

      {/* Preset Quick Chips Bar */}
      <div className="p-2.5 bg-[#121216] border-t border-white/[0.08] flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
        </span>
        {[
          { label: 'Sinc Surface', id: 'sinc' },
          { label: 'Möbius Strip', id: 'mobius' },
          { label: 'Lorenz Attractor', id: 'lorenz' },
          { label: 'Lissajous Knot', id: 'lissajous' },
          { label: 'Gaussian Cloud', id: 'scatter' },
          { label: 'Bumpy Shell', id: 'shell' },
          { label: 'Twisted Cylinder', id: 'twistedcyl' },
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
