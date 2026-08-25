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
  size?: 'normal' | 'large';
}

export const VisualMathField: React.FC<VisualMathFieldProps> = ({
  value,
  onChange,
  placeholder = 'Type equation, e.g. sin(sqrt(x^2 + y^2))',
  prefixLabel,
  className = '',
  showToolbar = true,
  onEnterPress,
  size = 'large',
}) => {
  const mfRef = useRef<MathfieldElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastEmittedLatex = useRef(value);

  // Synchronize external value to mathfield when changed externally (e.g. presets, layer select)
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    if (value !== lastEmittedLatex.current) {
      lastEmittedLatex.current = value;
      if (mf.value !== value) {
        mf.setValue(value || '', { silenceNotifications: true });
      }
    }
  }, [value]);

  // Configure mathfield options once mounted
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;

    mf.smartFence = true;
    mf.smartSuperscript = true;
    mf.smartMode = false; // Pure math mode: ensures variables & functions are not converted into text
    mf.virtualKeyboardMode = 'manual';
    if ((mf as any).mathVirtualKeyboardPolicy) {
      (mf as any).mathVirtualKeyboardPolicy = 'manual';
    }

    // Set virtual keyboard to dark mode
    if (typeof window !== 'undefined' && window.mathVirtualKeyboard) {
      (window.mathVirtualKeyboard as any).theme = 'dark';
    }

    if (value && mf.value !== value) {
      mf.setValue(value, { silenceNotifications: true });
    }

    const handleInput = () => {
      const latex = mf.getValue('latex-expanded') || mf.getValue('latex') || '';
      lastEmittedLatex.current = latex;
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
    mf.insert(latexCmd, { focus: true });
    const latex = mf.getValue('latex-expanded') || mf.getValue('latex') || '';
    lastEmittedLatex.current = latex;
    onChange(latex);
  };

  const toggleVirtualKeyboard = () => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.focus();
    if (window.mathVirtualKeyboard) {
      (window.mathVirtualKeyboard as any).theme = 'dark';
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
    lastEmittedLatex.current = '';
    mf.setValue('', { silenceNotifications: true });
    onChange('');
    mf.focus();
  };

  const isLarge = size === 'large';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Mathfield Input Container */}
      <div
        className={`relative flex items-center gap-2.5 rounded-2xl bg-[#111116] border transition-all duration-200 ${
          isLarge ? 'px-4 py-3 min-h-[58px]' : 'px-3.5 py-2.5 min-h-[46px]'
        } ${
          isFocused
            ? 'border-indigo-500 ring-2 ring-indigo-500/25 shadow-lg shadow-indigo-950/50 bg-[#14141c]'
            : 'border-white/[0.12] hover:border-white/[0.22]'
        }`}
      >
        {/* Optional Prefix Label (e.g. z =, r =, ρ =) */}
        {prefixLabel && (
          <span
            className={`font-mono font-bold text-indigo-400 select-none shrink-0 pr-2.5 border-r border-white/[0.1] ${
              isLarge ? 'text-[16px]' : 'text-xs'
            }`}
          >
            {prefixLabel}
          </span>
        )}

        {/* Scrollable Mathfield Wrapper to ensure smooth horizontal scrolling without overflow */}
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap py-1 flex items-center">
          <math-field
            ref={mfRef}
            class={`text-slate-100 font-mono outline-none inline-flex items-center min-w-full ${
              isLarge ? 'text-[18px] min-h-[44px]' : 'text-[15.5px] min-h-[34px]'
            }`}
            style={
              {
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                padding: '0',
                fontSize: isLarge ? '18px' : '15.5px',
                '--smart-fence-opacity': '0.75',
                '--caret-color': '#818cf8',
                '--selection-background-color': 'rgba(99, 102, 241, 0.4)',
                '--selection-color': '#ffffff',
                '--contains-highlight-background-color': 'rgba(99, 102, 241, 0.2)',
                '--placeholder-color': '#64748b',
              } as React.CSSProperties
            }
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-white/[0.08]">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 transition-all cursor-pointer"
              title="Clear equation"
            >
              <X className={isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            </button>
          )}

          <button
            type="button"
            onClick={toggleVirtualKeyboard}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer"
            title="Toggle Math On-Screen Keyboard"
          >
            <Keyboard className={isLarge ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </button>
        </div>
      </div>

      {/* Quick Visual Math Helper Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs text-slate-400 select-none">
          <span className="text-[10.5px] text-slate-500 font-mono mr-1 font-semibold uppercase tracking-wider">Quick:</span>

          <button
            type="button"
            onClick={() => insertSymbol('\\frac{#@}{#?}')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium"
            title="Fraction (type /)"
          >
            a/b
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('#@^{2}')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium"
            title="Power / Exponent (type ^)"
          >
            x²
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\sqrt{#0}')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium"
            title="Square root (type sqrt)"
          >
            √x
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\pi')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium"
            title="Pi (π)"
          >
            π
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\theta')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium"
            title="Theta (θ)"
          >
            θ
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\psi')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium text-amber-300/90"
            title="Psi (ψ) - Spherical polar angle"
          >
            ψ
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\rho')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium text-cyan-300/90"
            title="Rho (ρ) - Cylindrical radius"
          >
            ρ
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\sin(#0)')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-mono text-xs font-medium"
            title="Sine"
          >
            sin
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\cos(#0)')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-mono text-xs font-medium"
            title="Cosine"
          >
            cos
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\exp(#0)')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-mono text-xs font-medium"
            title="Exponential"
          >
            exp
          </button>

          <button
            type="button"
            onClick={() => insertSymbol('\\left|#0\\right|')}
            className="px-2.5 py-1 rounded-lg bg-[#181822] hover:bg-indigo-600/30 hover:text-indigo-200 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer font-serif text-xs font-medium"
            title="Absolute value |x|"
          >
            |x|
          </button>
        </div>
      )}
    </div>
  );
};
