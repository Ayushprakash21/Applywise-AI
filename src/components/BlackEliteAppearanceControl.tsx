import React, { useState, useEffect } from 'react';
import { Sun, Moon, Check, Sparkles } from 'lucide-react';
import {
  BlackElitePalette,
  BlackEliteAppearance,
  BLACK_ELITE_PALETTES,
  getStoredPalette,
  getStoredAppearance,
  setBlackElitePalette,
  setBlackEliteAppearance,
  THEME_CHANGE_EVENT,
} from '../utils/blackEliteTheme.ts';

export interface BlackEliteAppearanceControlProps {
  className?: string;
  onThemeChanged?: (palette: BlackElitePalette, appearance: BlackEliteAppearance) => void;
}

export const BlackEliteAppearanceControl: React.FC<BlackEliteAppearanceControlProps> = ({
  className = '',
  onThemeChanged,
}) => {
  const [currentPalette, setCurrentPalette] = useState<BlackElitePalette>(getStoredPalette);
  const [currentAppearance, setCurrentAppearance] = useState<BlackEliteAppearance>(getStoredAppearance);

  useEffect(() => {
    const handleThemeUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ palette: BlackElitePalette; appearance: BlackEliteAppearance }>;
      if (customEvent.detail) {
        if (customEvent.detail.palette) setCurrentPalette(customEvent.detail.palette);
        if (customEvent.detail.appearance) setCurrentAppearance(customEvent.detail.appearance);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(THEME_CHANGE_EVENT, handleThemeUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(THEME_CHANGE_EVENT, handleThemeUpdate);
      }
    };
  }, []);

  const handleModeChange = (mode: BlackEliteAppearance) => {
    setCurrentAppearance(mode);
    setBlackEliteAppearance(mode, true);
    if (onThemeChanged) onThemeChanged(currentPalette, mode);
  };

  const handlePaletteSelect = (palId: BlackElitePalette) => {
    setCurrentPalette(palId);
    setBlackElitePalette(palId, true);
    if (onThemeChanged) onThemeChanged(palId, currentAppearance);
  };

  const palettesList = Object.values(BLACK_ELITE_PALETTES);

  return (
    <div className={`space-y-3 p-3 rounded-2xl border transition-colors ${className}`}
      style={{
        backgroundColor: 'var(--be-bg-primary, #0D0F12)',
        borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.08))',
      }}
    >
      {/* 1. Appearance Mode: 2-Position Segmented Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span style={{ color: 'var(--be-text-muted, #92949A)' }} className="uppercase tracking-wider font-mono text-[10px]">
            Appearance
          </span>
          <span style={{ color: 'var(--be-accent, #C6A66A)' }} className="text-[10px] font-mono capitalize">
            {currentAppearance} Mode
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Theme appearance"
          className="relative grid grid-cols-2 p-1 rounded-xl border select-none transition-colors"
          style={{
            backgroundColor: 'var(--be-bg-secondary, #111318)',
            borderColor: 'var(--be-border-subtle, rgba(255, 255, 255, 0.06))',
          }}
        >
          {/* Dark Mode Segment */}
          <button
            type="button"
            role="radio"
            aria-checked={currentAppearance === 'dark'}
            onClick={() => handleModeChange('dark')}
            className={`flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              currentAppearance === 'dark'
                ? 'shadow-xs font-semibold'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: currentAppearance === 'dark' ? 'var(--be-bg-elevated, #1A1D24)' : 'transparent',
              color: currentAppearance === 'dark' ? 'var(--be-text-primary, #F2F0EA)' : 'var(--be-text-muted, #92949A)',
              border: currentAppearance === 'dark' ? '1px solid var(--be-border-focus, rgba(198, 166, 106, 0.35))' : '1px solid transparent',
            }}
          >
            <Moon className="w-3.5 h-3.5" style={{ color: currentAppearance === 'dark' ? 'var(--be-accent, #C6A66A)' : 'inherit' }} />
            <span>Dark</span>
          </button>

          {/* Light Mode Segment */}
          <button
            type="button"
            role="radio"
            aria-checked={currentAppearance === 'light'}
            onClick={() => handleModeChange('light')}
            className={`flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              currentAppearance === 'light'
                ? 'shadow-xs font-semibold'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: currentAppearance === 'light' ? 'var(--be-bg-elevated, #FFFFFF)' : 'transparent',
              color: currentAppearance === 'light' ? 'var(--be-text-primary, #0F172A)' : 'var(--be-text-muted, #92949A)',
              border: currentAppearance === 'light' ? '1px solid var(--be-border-focus, rgba(160, 124, 62, 0.40))' : '1px solid transparent',
            }}
          >
            <Sun className="w-3.5 h-3.5" style={{ color: currentAppearance === 'light' ? 'var(--be-accent, #D97724)' : 'inherit' }} />
            <span>Light</span>
          </button>
        </div>
      </div>

      {/* 2. Curated Palettes List (Directly inspired by Screenshot 3) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span style={{ color: 'var(--be-text-muted, #92949A)' }} className="uppercase tracking-wider font-mono text-[10px]">
            Curated Palettes
          </span>
          <span style={{ color: 'var(--be-text-muted, #92949A)' }} className="text-[10px] font-mono">
            5 Presets
          </span>
        </div>

        <div className="space-y-1" role="radiogroup" aria-label="Curated Palettes">
          {palettesList.map((palette) => {
            const isSelected = currentPalette === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handlePaletteSelect(palette.id)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all duration-150 cursor-pointer group ${
                  isSelected ? 'shadow-xs' : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: isSelected
                    ? 'var(--be-bg-elevated, #191D23)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid var(--be-border-focus, rgba(198, 166, 106, 0.35))'
                    : '1px solid transparent',
                }}
              >
                {/* Left: Swatch circles + Palette Name */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Swatch 3-dot cluster */}
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    {palette.swatches.map((color, idx) => (
                      <span
                        key={idx}
                        className="inline-block w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Name */}
                  <span
                    className="text-xs font-semibold tracking-tight truncate transition-colors"
                    style={{
                      color: isSelected
                        ? 'var(--be-text-primary, #F2F0EA)'
                        : 'var(--be-text-secondary, #C0BDB5)',
                    }}
                  >
                    {palette.name}
                  </span>
                </div>

                {/* Right: Amplitude/Swell Metric & Selection Check */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className="font-mono text-[9px] tracking-tight opacity-75 hidden xs:inline-block"
                    style={{ color: 'var(--be-text-muted, #92949A)' }}
                  >
                    {palette.amplitude}
                  </span>
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: 'var(--be-accent, #C6A66A)' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
