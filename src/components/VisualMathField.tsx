import React, { useEffect, useRef, useState } from 'react';
import 'mathlive';
import { Keyboard, X, Sparkles } from 'lucide-react';
import type { MathfieldElement } from 'mathlive';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'math-field': any;
      }
    }
  }
}

interface VisualMathFieldProps {
  value: string;
  onChange: (latex: string) => void;
  placeholder?: string;
  prefixLabel?: string;
  className?: string;
  showToolbar?: boolean;
  onEnterPress?: () => void;
}

export const VisualMathField: React.FC<VisualMathFieldProps> = ({
  value,
  onChange,
  placeholder = 'Type equation, e.g. sin(sqrt(x^2 + y^2))',
  prefixLabel,
  className = '',
  showToolbar = true,
  onEnterPress,
}) => {
  const mfRef = useRef<MathfieldElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Synchronize external value to mathfield when changed externally
  useEffect(() => {
    const mf = mfRef.current;
    if (mf && mf.value !== value) {
      mf.setValue(value || '', { silenceNotifications: true });
    }
  }, [value]);

  // Configure mathfield options once mounted
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    mf.smartFence = true;
    mf.smartSuperscript = true;
    mf.smartMode = true;
    mf.virtualKeyboardMode = 'manual';

    const handleInput = () => {
      const latex = mf.getValue('latex-expanded') || mf.getValue('latex') || '';
      onChange(latex);
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onEnterPress) {
        onEnterPress();
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('focus', handleFocus);
    mf.addEventListener('blur', handleBlur);
    mf.addEventListener('keydown', handleKeyDown);

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('focus', handleFocus);
      mf.removeEventListener('blur', handleBlur);
      mf.removeEventListener('keydown', handleKeyDown);
    };
  }, [onChange, onEnterPress]);

  const insertSymbol = (latexCmd: string) => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    mf.insert(latexCmd);
  };

  const toggleVirtualKeyboard = () => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (window.mathVirtualKeyboard) {
      if (window.mathVirtualKeyboard.visible) {
        window.mathVirtualKeyboard.hide();
      } else {
        window.mathVirtualKeyboard.show();
      }
    }
  };

  const handleClear = () => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.setValue('', { silenceNotifications: true });
    onChange('');
    mf.focus();
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Mathfield Input Container */}
      <div
        className={`relative flex items-center gap-2 rounded-xl bg-[#141418] border transition-all duration-200 px-3 py-2 ${
          isFocused
            ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-950/30'
            : 'border-white/[0.1] hover:border-white/[0.2]'
        }`}
      >
        {/* Optional Prefix Label (e.g. z =, ρ =) */}
        {prefixLabel && (
          <span className="font-mono font-semibold text-xs text-indigo-400 select-none shrink-0 pr-1 border-r border-white/[0.08]">
            {prefixLabel}
          </span>
        )}

        {/* The MathLive Interactive Mathfield Custom Element */}
        <math-field
          ref={mfRef}
          class="flex-1 text-slate-100 font-mono text-[13.5px] outline-none min-h-[26px] flex items-center"
          style={
            {
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              padding: '0',
              '--smart-fence-opacity': '0.75',
              '--selection-background-color': '#4338ca',
              '--selection-color': '#ffffff',
              '--contains-highlight-background-color': 'rgba(99, 102, 241, 0.15)',
              '--placeholder-color': '#64748b',
            } as React.CSSProperties
          }
        >
          {value}
        </math-field>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Clear equation"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleVirtualKeyboard}
            className="p-1 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Toggle Math On-Screen Keyboard"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Visual Math Helper Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5 text-[11px] text-slate-400 select-none">
          <span className="text-[10px] text-slate-500 font-mono mr-1">Quick:</span>

          <button
            type="button"
            onClick={() => insertSymbol('\\frac{#@}{#?}')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Fraction (type /)"
          >
            a/b
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('#@^{2}')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Power / Exponent (type ^)"
          >
            x²
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\sqrt{#0}')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Square root (type sqrt)"
          >
            √x
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\pi')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Pi (π)"
          >
            π
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\theta')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Theta (θ)"
          >
            θ
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\phi')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Phi (φ)"
          >
            φ
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\sin(#0)')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-mono text-[10.5px]"
            title="Sine"
          >
            sin
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\cos(#0)')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-mono text-[10.5px]"
            title="Cosine"
          >
            cos
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\exp(#0)')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-mono text-[10.5px]"
            title="Exponential"
          >
            exp
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\left|#0\\right|')}
            className="px-1.5 py-0.5 rounded bg-[#18181f] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer font-serif"
            title="Absolute value |x|"
          >
            |x|
          </button>
        </div>
      )}
    </div>
  );
};
