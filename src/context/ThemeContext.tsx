// src/context/ThemeContext.tsx
// Centralized, Reactive Theme Provider & Hook for ApplyVise AI
// Enforces 100% platform-wide Light/Dark appearance & palette consistency across all routes and components.

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  BlackElitePalette,
  BlackEliteAppearance,
  BLACK_ELITE_PALETTES,
  getStoredPalette,
  getStoredAppearance,
  setBlackElitePalette,
  setBlackEliteAppearance,
  applyThemeToDOM,
  THEME_CHANGE_EVENT,
} from '../utils/blackEliteTheme.ts';

export interface ThemeContextValue {
  appearance: BlackEliteAppearance;
  palette: BlackElitePalette;
  isDark: boolean;
  isLight: boolean;
  setAppearance: (appearance: BlackEliteAppearance) => void;
  setPalette: (palette: BlackElitePalette) => void;
  toggleAppearance: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [appearance, setAppearanceState] = useState<BlackEliteAppearance>(() => {
    if (typeof window !== 'undefined') {
      return getStoredAppearance();
    }
    return 'light'; // Default to light if SSR/unspecified
  });

  const [palette, setPaletteState] = useState<BlackElitePalette>(() => {
    if (typeof window !== 'undefined') {
      return getStoredPalette();
    }
    return 'dune';
  });

  // Apply to DOM immediately and on changes
  useEffect(() => {
    applyThemeToDOM(palette, appearance, true);
  }, [palette, appearance]);

  // Listen for cross-component or cross-tab theme changes
  useEffect(() => {
    const handleThemeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ palette?: BlackElitePalette; appearance?: BlackEliteAppearance }>;
      if (customEvent.detail) {
        if (customEvent.detail.appearance && customEvent.detail.appearance !== appearance) {
          setAppearanceState(customEvent.detail.appearance);
        }
        if (customEvent.detail.palette && customEvent.detail.palette !== palette) {
          setPaletteState(customEvent.detail.palette);
        }
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'applyvise_black_appearance' && e.newValue) {
        if (e.newValue === 'light' || e.newValue === 'dark') {
          setAppearanceState(e.newValue);
        }
      }
      if (e.key === 'applyvise_black_palette' && e.newValue) {
        const val = e.newValue as BlackElitePalette;
        if (BLACK_ELITE_PALETTES[val]) {
          setPaletteState(val);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  }, [appearance, palette]);

  const updateAppearance = useCallback((next: BlackEliteAppearance) => {
    setAppearanceState(next);
    setBlackEliteAppearance(next, true);
  }, []);

  const updatePalette = useCallback((next: BlackElitePalette) => {
    setPaletteState(next);
    setBlackElitePalette(next, true);
  }, []);

  const toggleAppearance = useCallback(() => {
    const next: BlackEliteAppearance = appearance === 'light' ? 'dark' : 'light';
    updateAppearance(next);
  }, [appearance, updateAppearance]);

  const isDark = appearance === 'dark';
  const isLight = appearance === 'light';

  const value = useMemo<ThemeContextValue>(() => ({
    appearance,
    palette,
    isDark,
    isLight,
    setAppearance: updateAppearance,
    setPalette: updatePalette,
    toggleAppearance,
  }), [appearance, palette, isDark, isLight, updateAppearance, updatePalette, toggleAppearance]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components rendered outside provider (e.g. in standalone tests)
    const storedApp = typeof window !== 'undefined' ? getStoredAppearance() : 'light';
    const storedPal = typeof window !== 'undefined' ? getStoredPalette() : 'dune';
    return {
      appearance: storedApp,
      palette: storedPal,
      isDark: storedApp === 'dark',
      isLight: storedApp === 'light',
      setAppearance: (a) => setBlackEliteAppearance(a, true),
      setPalette: (p) => setBlackElitePalette(p, true),
      toggleAppearance: () => setBlackEliteAppearance(storedApp === 'light' ? 'dark' : 'light', true),
    };
  }
  return context;
}
