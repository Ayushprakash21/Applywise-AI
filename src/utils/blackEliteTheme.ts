/**
 * APPLYVISE BLACK ELITE — Curated Palettes & Appearance Token Engine
 * 
 * Defines the 5 signature art-directed palettes (Ocean, Dune, Dusk, Silk, Aurora)
 * across both Dark and Light appearance modes for BLACK ELITE members.
 */

export type BlackElitePalette = 'ocean' | 'dune' | 'dusk' | 'silk' | 'aurora';
export type BlackEliteAppearance = 'dark' | 'light';

export interface PaletteTokens {
  bgPrimary: string;
  bgSecondary: string;
  bgSidebar: string;
  bgHeader?: string;
  bgCard: string;
  bgElevated: string;
  bgInput?: string;
  borderSubtle: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentMuted: string;
  accentContrast: string;
  hoverBg?: string;
  navActiveBg?: string;
  navActiveBorder?: string;
  navActiveText?: string;
  chartGrid?: string;
  chartPrimary?: string;
  chartSecondary?: string;
  statusSuccess?: string;
  statusWarning?: string;
  statusError?: string;
}

export interface PaletteMeta {
  id: BlackElitePalette;
  name: string;
  description: string;
  amplitude: string; // Metric inspired by creative palettes (e.g., 'amplitude 1.8 · swell 25')
  swatches: [string, string, string];
  dark: PaletteTokens;
  light: PaletteTokens;
}

export const BLACK_ELITE_PALETTES: Record<BlackElitePalette, PaletteMeta> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep maritime navy, cool silver & pale ice blue',
    amplitude: 'amplitude 1.8 · swell 25',
    swatches: ['#0F274A', '#0284C7', '#BAE6FD'],
    dark: {
      bgPrimary: '#070B12',
      bgSecondary: '#0B111A',
      bgSidebar: '#0C131E',
      bgHeader: '#0C131E',
      bgCard: '#101926',
      bgElevated: '#152234',
      bgInput: '#0B111A',
      borderSubtle: 'rgba(56, 189, 248, 0.12)',
      borderFocus: 'rgba(56, 189, 248, 0.40)',
      textPrimary: '#F0F6FC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      accent: '#38BDF8',
      accentLight: '#7DD3FC',
      accentMuted: 'rgba(56, 189, 248, 0.15)',
      accentContrast: '#070B12',
      hoverBg: 'rgba(56, 189, 248, 0.08)',
      navActiveBg: 'rgba(56, 189, 248, 0.12)',
      navActiveBorder: 'rgba(56, 189, 248, 0.35)',
      navActiveText: '#38BDF8',
      chartGrid: 'rgba(56, 189, 248, 0.08)',
      chartPrimary: '#38BDF8',
      chartSecondary: '#0284C7',
      statusSuccess: '#35B887',
      statusWarning: '#D9AA61',
      statusError: '#D67575',
    },
    light: {
      bgPrimary: '#F0F6FA',
      bgSecondary: '#E4EEF5',
      bgSidebar: '#E1ECF4',
      bgHeader: '#E1ECF4',
      bgCard: '#FFFFFF',
      bgElevated: '#F4F9FD',
      bgInput: '#FFFFFF',
      borderSubtle: 'rgba(2, 132, 199, 0.16)',
      borderFocus: 'rgba(2, 132, 199, 0.45)',
      textPrimary: '#0C1929',
      textSecondary: '#334155',
      textMuted: '#64748B',
      accent: '#0284C7',
      accentLight: '#0369A1',
      accentMuted: 'rgba(2, 132, 199, 0.12)',
      accentContrast: '#FFFFFF',
      hoverBg: 'rgba(2, 132, 199, 0.06)',
      navActiveBg: 'rgba(2, 132, 199, 0.10)',
      navActiveBorder: 'rgba(2, 132, 199, 0.35)',
      navActiveText: '#0284C7',
      chartGrid: 'rgba(2, 132, 199, 0.08)',
      chartPrimary: '#0284C7',
      chartSecondary: '#0369A1',
      statusSuccess: '#16A34A',
      statusWarning: '#D97706',
      statusError: '#DC2626',
    },
  },
  dune: {
    id: 'dune',
    name: 'Dune',
    description: 'Warm obsidian, sand bronze, champagne & ivory',
    amplitude: 'amplitude 3.2 · swell 40',
    swatches: ['#5C2C16', '#D97724', '#FDEED9'],
    dark: {
      bgPrimary: '#090A0C',
      bgSecondary: '#0D0F12',
      bgSidebar: '#111318',
      bgHeader: '#111318',
      bgCard: '#14171C',
      bgElevated: '#191D23',
      bgInput: '#0D1014',
      borderSubtle: 'rgba(255, 255, 255, 0.09)',
      borderFocus: 'rgba(198, 166, 106, 0.40)',
      textPrimary: '#F2F0EA',
      textSecondary: '#C0BDB5',
      textMuted: '#92949A',
      accent: '#C6A66A',
      accentLight: '#E2C58A',
      accentMuted: 'rgba(198, 166, 106, 0.15)',
      accentContrast: '#17130C',
      hoverBg: 'rgba(198, 166, 106, 0.08)',
      navActiveBg: 'rgba(198, 166, 106, 0.10)',
      navActiveBorder: 'rgba(198, 166, 106, 0.35)',
      navActiveText: '#C6A66A',
      chartGrid: 'rgba(198, 166, 106, 0.08)',
      chartPrimary: '#C6A66A',
      chartSecondary: '#E2C58A',
      statusSuccess: '#35B887',
      statusWarning: '#D9AA61',
      statusError: '#D67575',
    },
    light: {
      bgPrimary: '#F8F6F2',
      bgSecondary: '#EFECE5',
      bgSidebar: '#EDE8DF',
      bgHeader: '#EDE8DF',
      bgCard: '#FFFFFF',
      bgElevated: '#FAF8F5',
      bgInput: '#FFFFFF',
      borderSubtle: 'rgba(180, 140, 75, 0.20)',
      borderFocus: 'rgba(180, 140, 75, 0.50)',
      textPrimary: '#1E1B18',
      textSecondary: '#57524A',
      textMuted: '#878177',
      accent: '#A07C3E',
      accentLight: '#85642B',
      accentMuted: 'rgba(160, 124, 62, 0.12)',
      accentContrast: '#FFFFFF',
      hoverBg: 'rgba(160, 124, 62, 0.06)',
      navActiveBg: 'rgba(160, 124, 62, 0.10)',
      navActiveBorder: 'rgba(160, 124, 62, 0.35)',
      navActiveText: '#A07C3E',
      chartGrid: 'rgba(160, 124, 62, 0.08)',
      chartPrimary: '#A07C3E',
      chartSecondary: '#85642B',
      statusSuccess: '#16A34A',
      statusWarning: '#D97706',
      statusError: '#DC2626',
    },
  },
  dusk: {
    id: 'dusk',
    name: 'Dusk',
    description: 'Deep plum, muted violet, soft mauve & off-white',
    amplitude: 'amplitude 2.5 · swell 35',
    swatches: ['#4B32C3', '#D988F2', '#FFFFFF'],
    dark: {
      bgPrimary: '#0C0814',
      bgSecondary: '#120D1D',
      bgSidebar: '#161024',
      bgHeader: '#161024',
      bgCard: '#1A132B',
      bgElevated: '#221A37',
      bgInput: '#120D1D',
      borderSubtle: 'rgba(192, 132, 252, 0.12)',
      borderFocus: 'rgba(192, 132, 252, 0.40)',
      textPrimary: '#F5F3FF',
      textSecondary: '#C4B5FD',
      textMuted: '#8B5CF6',
      accent: '#C084FC',
      accentLight: '#E9D5FF',
      accentMuted: 'rgba(192, 132, 252, 0.15)',
      accentContrast: '#0C0814',
      hoverBg: 'rgba(192, 132, 252, 0.08)',
      navActiveBg: 'rgba(192, 132, 252, 0.12)',
      navActiveBorder: 'rgba(192, 132, 252, 0.35)',
      navActiveText: '#C084FC',
      chartGrid: 'rgba(192, 132, 252, 0.08)',
      chartPrimary: '#C084FC',
      chartSecondary: '#E9D5FF',
      statusSuccess: '#35B887',
      statusWarning: '#D9AA61',
      statusError: '#D67575',
    },
    light: {
      bgPrimary: '#F6F4FA',
      bgSecondary: '#ECE8F4',
      bgSidebar: '#E7E1F2',
      bgHeader: '#E7E1F2',
      bgCard: '#FFFFFF',
      bgElevated: '#FAF8FD',
      bgInput: '#FFFFFF',
      borderSubtle: 'rgba(126, 34, 206, 0.16)',
      borderFocus: 'rgba(126, 34, 206, 0.45)',
      textPrimary: '#1E1333',
      textSecondary: '#4C3969',
      textMuted: '#79659A',
      accent: '#7E22CE',
      accentLight: '#6B21A8',
      accentMuted: 'rgba(126, 34, 206, 0.12)',
      accentContrast: '#FFFFFF',
      hoverBg: 'rgba(126, 34, 206, 0.06)',
      navActiveBg: 'rgba(126, 34, 206, 0.10)',
      navActiveBorder: 'rgba(126, 34, 206, 0.35)',
      navActiveText: '#7E22CE',
      chartGrid: 'rgba(126, 34, 206, 0.08)',
      chartPrimary: '#7E22CE',
      chartSecondary: '#6B21A8',
      statusSuccess: '#16A34A',
      statusWarning: '#D97706',
      statusError: '#DC2626',
    },
  },
  silk: {
    id: 'silk',
    name: 'Silk',
    description: 'Graphite, soft pearl, muted silver & pure neutrals',
    amplitude: 'amplitude 2.2 · swell 30',
    swatches: ['#2B2D31', '#7E828C', '#F2F3F5'],
    dark: {
      bgPrimary: '#0B0C0E',
      bgSecondary: '#101114',
      bgSidebar: '#14161A',
      bgHeader: '#14161A',
      bgCard: '#181A20',
      bgElevated: '#1F222A',
      bgInput: '#101114',
      borderSubtle: 'rgba(255, 255, 255, 0.09)',
      borderFocus: 'rgba(226, 232, 240, 0.35)',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      accent: '#E2E8F0',
      accentLight: '#FFFFFF',
      accentMuted: 'rgba(226, 232, 240, 0.12)',
      accentContrast: '#0F172A',
      hoverBg: 'rgba(255, 255, 255, 0.06)',
      navActiveBg: 'rgba(226, 232, 240, 0.10)',
      navActiveBorder: 'rgba(226, 232, 240, 0.30)',
      navActiveText: '#E2E8F0',
      chartGrid: 'rgba(226, 232, 240, 0.08)',
      chartPrimary: '#E2E8F0',
      chartSecondary: '#94A3B8',
      statusSuccess: '#35B887',
      statusWarning: '#D9AA61',
      statusError: '#D67575',
    },
    light: {
      bgPrimary: '#F7F7F8',
      bgSecondary: '#EEEEF0',
      bgSidebar: '#E8E9EC',
      bgHeader: '#E8E9EC',
      bgCard: '#FFFFFF',
      bgElevated: '#FAFAFB',
      bgInput: '#FFFFFF',
      borderSubtle: 'rgba(15, 23, 42, 0.12)',
      borderFocus: 'rgba(15, 23, 42, 0.35)',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      accent: '#334155',
      accentLight: '#1E293B',
      accentMuted: 'rgba(51, 65, 85, 0.10)',
      accentContrast: '#FFFFFF',
      hoverBg: 'rgba(15, 23, 42, 0.05)',
      navActiveBg: 'rgba(51, 65, 85, 0.08)',
      navActiveBorder: 'rgba(51, 65, 85, 0.30)',
      navActiveText: '#334155',
      chartGrid: 'rgba(15, 23, 42, 0.08)',
      chartPrimary: '#334155',
      chartSecondary: '#1E293B',
      statusSuccess: '#16A34A',
      statusWarning: '#D97706',
      statusError: '#DC2626',
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Deep forest obsidian, muted emerald, jade & mint',
    amplitude: 'amplitude 2.6 · swell 38',
    swatches: ['#084C38', '#10B981', '#A7F3D0'],
    dark: {
      bgPrimary: '#060E0A',
      bgSecondary: '#091610',
      bgSidebar: '#0C1D16',
      bgHeader: '#0C1D16',
      bgCard: '#10261D',
      bgElevated: '#163327',
      bgInput: '#091610',
      borderSubtle: 'rgba(52, 211, 153, 0.12)',
      borderFocus: 'rgba(52, 211, 153, 0.40)',
      textPrimary: '#F0FDF4',
      textSecondary: '#A7F3D0',
      textMuted: '#6EE7B7',
      accent: '#34D399',
      accentLight: '#6EE7B7',
      accentMuted: 'rgba(52, 211, 153, 0.15)',
      accentContrast: '#060E0A',
      hoverBg: 'rgba(52, 211, 153, 0.08)',
      navActiveBg: 'rgba(52, 211, 153, 0.12)',
      navActiveBorder: 'rgba(52, 211, 153, 0.35)',
      navActiveText: '#34D399',
      chartGrid: 'rgba(52, 211, 153, 0.08)',
      chartPrimary: '#34D399',
      chartSecondary: '#10B981',
      statusSuccess: '#35B887',
      statusWarning: '#D9AA61',
      statusError: '#D67575',
    },
    light: {
      bgPrimary: '#F1F8F4',
      bgSecondary: '#E3F1EA',
      bgSidebar: '#DCEDE4',
      bgHeader: '#DCEDE4',
      bgCard: '#FFFFFF',
      bgElevated: '#F5FAF7',
      bgInput: '#FFFFFF',
      borderSubtle: 'rgba(5, 150, 105, 0.16)',
      borderFocus: 'rgba(5, 150, 105, 0.45)',
      textPrimary: '#0B2317',
      textSecondary: '#224F3A',
      textMuted: '#42785D',
      accent: '#059669',
      accentLight: '#047857',
      accentMuted: 'rgba(5, 150, 105, 0.12)',
      accentContrast: '#FFFFFF',
      hoverBg: 'rgba(5, 150, 105, 0.06)',
      navActiveBg: 'rgba(5, 150, 105, 0.10)',
      navActiveBorder: 'rgba(5, 150, 105, 0.35)',
      navActiveText: '#059669',
      chartGrid: 'rgba(5, 150, 105, 0.08)',
      chartPrimary: '#059669',
      chartSecondary: '#047857',
      statusSuccess: '#16A34A',
      statusWarning: '#D97706',
      statusError: '#DC2626',
    },
  },
};

const STORAGE_PALETTE_KEY = 'applyvise_be_palette';
const STORAGE_APPEARANCE_KEY = 'applyvise_be_appearance';
export const THEME_CHANGE_EVENT = 'applyvise-black-elite-theme-change';

export function getStoredPalette(): BlackElitePalette {
  if (typeof localStorage === 'undefined') return 'dune';
  try {
    const val = localStorage.getItem(STORAGE_PALETTE_KEY) as BlackElitePalette;
    if (val && BLACK_ELITE_PALETTES[val]) {
      return val;
    }
  } catch {
    // Ignore storage read error
  }
  return 'dune';
}

export function getStoredAppearance(): BlackEliteAppearance {
  if (typeof localStorage === 'undefined') return 'dark';
  try {
    const val = localStorage.getItem(STORAGE_APPEARANCE_KEY) as BlackEliteAppearance;
    if (val === 'light' || val === 'dark') {
      return val;
    }
  } catch {
    // Ignore storage read error
  }
  return 'dark';
}

export function applyThemeToDOM(
  palette: BlackElitePalette = getStoredPalette(),
  appearance: BlackEliteAppearance = getStoredAppearance(),
  isBlackElite: boolean = true
): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Always mark active theme attributes
  root.setAttribute('data-theme', 'black');
  root.setAttribute('data-be-palette', palette);
  root.setAttribute('data-be-appearance', appearance);
  body.setAttribute('data-be-palette', palette);
  body.setAttribute('data-be-appearance', appearance);

  root.classList.add('theme-black');
  body.classList.add('theme-black');

  // Resolve palette metadata & tokens
  const meta = BLACK_ELITE_PALETTES[palette] || BLACK_ELITE_PALETTES.dune;
  const tokens = meta[appearance];

  const varMap: Record<string, string> = {
    '--be-bg-primary': tokens.bgPrimary,
    '--be-bg-secondary': tokens.bgSecondary,
    '--be-bg-sidebar': tokens.bgSidebar,
    '--be-bg-header': tokens.bgHeader || tokens.bgSidebar,
    '--be-bg-card': tokens.bgCard,
    '--be-bg-elevated': tokens.bgElevated,
    '--be-bg-input': tokens.bgInput || (appearance === 'light' ? '#FFFFFF' : tokens.bgSecondary),
    '--be-border-subtle': tokens.borderSubtle,
    '--be-border-focus': tokens.borderFocus,
    '--be-text-primary': tokens.textPrimary,
    '--be-text-secondary': tokens.textSecondary,
    '--be-text-muted': tokens.textMuted,
    '--be-accent': tokens.accent,
    '--be-accent-light': tokens.accentLight,
    '--be-accent-muted': tokens.accentMuted,
    '--be-accent-contrast': tokens.accentContrast,
    '--be-hover-bg': tokens.hoverBg || (appearance === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)'),
    '--be-nav-active-bg': tokens.navActiveBg || tokens.accentMuted,
    '--be-nav-active-border': tokens.navActiveBorder || tokens.borderFocus,
    '--be-nav-active-text': tokens.navActiveText || tokens.accent,
    '--be-chart-grid': tokens.chartGrid || (appearance === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'),
    '--be-chart-primary': tokens.chartPrimary || tokens.accent,
    '--be-chart-secondary': tokens.chartSecondary || tokens.accentLight,
    '--be-status-success': tokens.statusSuccess || '#35B887',
    '--be-status-warning': tokens.statusWarning || '#D9AA61',
    '--be-status-error': tokens.statusError || '#D67575',
    '--be-swatch-1': meta.swatches[0],
    '--be-swatch-2': meta.swatches[1],
    '--be-swatch-3': meta.swatches[2],
  };

  Object.entries(varMap).forEach(([k, v]) => {
    root.style.setProperty(k, v);
    body.style.setProperty(k, v);
  });

  // Switch dark vs light classes cleanly
  if (appearance === 'light') {
    root.classList.add('theme-black-light');
    body.classList.add('theme-black-light');
    root.classList.remove('theme-black-dark');
    body.classList.remove('theme-black-dark');
  } else {
    root.classList.add('theme-black-dark');
    body.classList.add('theme-black-dark');
    root.classList.remove('theme-black-light');
    body.classList.remove('theme-black-light');
  }
}

export function setBlackElitePalette(palette: BlackElitePalette, isBlackElite: boolean = true): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PALETTE_KEY, palette);
    } catch {}
  }
  const appearance = getStoredAppearance();
  applyThemeToDOM(palette, appearance, isBlackElite);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { palette, appearance } }));
  }
}

export function setBlackEliteAppearance(appearance: BlackEliteAppearance, isBlackElite: boolean = true): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_APPEARANCE_KEY, appearance);
    } catch {}
  }
  const palette = getStoredPalette();
  applyThemeToDOM(palette, appearance, isBlackElite);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { palette, appearance } }));
  }
}

export function initBlackEliteTheme(plan?: string): { palette: BlackElitePalette; appearance: BlackEliteAppearance } {
  const palette = getStoredPalette();
  const appearance = getStoredAppearance();
  applyThemeToDOM(palette, appearance, true);
  return { palette, appearance };
}
