/**
 * APPLYVISE AI — Global Typography & Font Management System
 * 
 * Provides centralized font family selection, intelligent font-weight resolution,
 * non-destructive letter-spacing/tracking adjustments, and seamless Google Fonts injection.
 * 
 * 10 Curated Font Families:
 * 1. Poppins (Default)
 * 2. Roboto
 * 3. Lato
 * 4. Montserrat
 * 5. Oswald (Condensed Display)
 * 6. Raleway (Refined Tracking)
 * 7. Libre Franklin (Editorial Gothic)
 * 8. Josefin Sans (Geometric Vintage)
 * 9. Kanit (Modern Grotesque)
 * 10. Poiret One (Art Deco Display - Native 400 Only, No Synthetic Distortion)
 */

export type FontFamilyId =
  | 'poppins'
  | 'roboto'
  | 'lato'
  | 'montserrat'
  | 'oswald'
  | 'raleway'
  | 'libre-franklin'
  | 'josefin-sans'
  | 'kanit'
  | 'poiret-one';

export type SemanticTypographyRole =
  | 'heroHeading'
  | 'pageHeading'
  | 'sectionHeading'
  | 'cardHeading'
  | 'nav'
  | 'body'
  | 'supporting'
  | 'button'
  | 'input'
  | 'label'
  | 'tableHeader'
  | 'tableCell'
  | 'kpi'
  | 'badge'
  | 'code';

export interface FontProfile {
  id: FontFamilyId;
  name: string;
  family: string;
  fallback: string;
  category: 'Geometric Sans' | 'Neo-Grotesque' | 'Humanist Sans' | 'Condensed Gothic' | 'Geometric Vintage' | 'Art Deco Display' | 'Modern Grotesque' | 'Editorial Gothic';
  description: string;
  googleFontsQuery: string;
  supportedWeights: number[];
  defaultWeight: number;
  // Specific letter-spacing overrides for glyph harmony
  trackingAdjustments: {
    headings?: string;
    body?: string;
    buttons?: string;
    kpi?: string;
    badges?: string;
  };
  // Intelligent weight clamp mapping
  weightMap: {
    thin: number;
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  // Special styling flags
  isDisplayOnly?: boolean;
  capsHeadings?: boolean;
}

export const TYPOGRAPHY_PROFILES: Record<FontFamilyId, FontProfile> = {
  poppins: {
    id: 'poppins',
    name: 'Poppins',
    family: "'Poppins', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    category: 'Geometric Sans',
    description: 'Clean, balanced geometric curves engineered for clarity across modern digital workspaces.',
    googleFontsQuery: 'family=Poppins:wght@300;400;500;600;700;800',
    supportedWeights: [300, 400, 500, 600, 700, 800],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '-0.02em',
      body: '0em',
      buttons: '0.01em',
      kpi: '-0.03em',
      badges: '0.04em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  roboto: {
    id: 'roboto',
    name: 'Roboto',
    family: "'Roboto', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    category: 'Neo-Grotesque',
    description: 'Mechanical skeleton with largely geometric forms and open curves. High utility and legibility.',
    googleFontsQuery: 'family=Roboto:wght@300;400;500;700;900',
    supportedWeights: [300, 400, 500, 700, 900],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '-0.015em',
      body: '0em',
      buttons: '0.02em',
      kpi: '-0.02em',
      badges: '0.04em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 500,
      bold: 700,
      extrabold: 900,
    },
  },
  lato: {
    id: 'lato',
    name: 'Lato',
    family: "'Lato', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'Humanist Sans',
    description: 'Semi-rounded details delivering warmth while transparent structure maintains classical elegance.',
    googleFontsQuery: 'family=Lato:wght@300;400;700;900',
    supportedWeights: [300, 400, 700, 900],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '-0.01em',
      body: '0.005em',
      buttons: '0.02em',
      kpi: '-0.02em',
      badges: '0.05em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 400,
      semibold: 700,
      bold: 700,
      extrabold: 900,
    },
  },
  montserrat: {
    id: 'montserrat',
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'Geometric Sans',
    description: 'Inspired by traditional Buenos Aires urban signage. High personality with striking capital letters.',
    googleFontsQuery: 'family=Montserrat:wght@300;400;500;600;700;800',
    supportedWeights: [300, 400, 500, 600, 700, 800],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '-0.025em',
      body: '-0.005em',
      buttons: '0.025em',
      kpi: '-0.035em',
      badges: '0.06em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  oswald: {
    id: 'oswald',
    name: 'Oswald',
    family: "'Oswald', sans-serif",
    fallback: 'Impact, "Arial Narrow", sans-serif',
    category: 'Condensed Gothic',
    description: 'Reformatted Alternate Gothic style designed for digital screens. Imposing, space-efficient vertical rhythm.',
    googleFontsQuery: 'family=Oswald:wght@300;400;500;600;700',
    supportedWeights: [300, 400, 500, 600, 700],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '0.015em',
      body: '0.025em', // Added tracking so condensed body text breathes
      buttons: '0.04em',
      kpi: '0.01em',
      badges: '0.08em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 700,
    },
  },
  raleway: {
    id: 'raleway',
    name: 'Raleway',
    family: "'Raleway', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'Humanist Sans',
    description: 'Sophisticated neo-grotesque with signature criss-cross "W" and open, airy letterforms.',
    googleFontsQuery: 'family=Raleway:wght@300;400;500;600;700',
    supportedWeights: [300, 400, 500, 600, 700],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '0.01em',
      body: '0.015em',
      buttons: '0.04em',
      kpi: '0.005em',
      badges: '0.07em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 700,
    },
  },
  'libre-franklin': {
    id: 'libre-franklin',
    name: 'Libre Franklin',
    family: "'Libre Franklin', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'Editorial Gothic',
    description: 'Interpretation of Morris Fuller Benton classic 1912 typeface. Authoritative, journalistic gravitas.',
    googleFontsQuery: 'family=Libre+Franklin:wght@300;400;500;600;700;800',
    supportedWeights: [300, 400, 500, 600, 700, 800],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '-0.02em',
      body: '0em',
      buttons: '0.02em',
      kpi: '-0.025em',
      badges: '0.05em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  'josefin-sans': {
    id: 'josefin-sans',
    name: 'Josefin Sans',
    family: "'Josefin Sans', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'Geometric Vintage',
    description: 'Inspired by 1930s Scandinavian geometric sans serifs. Chic, delicate diagonals with high aesthetic flair.',
    googleFontsQuery: 'family=Josefin+Sans:wght@300;400;600;700',
    supportedWeights: [300, 400, 600, 700],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '0.02em',
      body: '0.025em',
      buttons: '0.05em',
      kpi: '0.01em',
      badges: '0.08em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 400, // Josefin Sans skips 500
      semibold: 600,
      bold: 700,
      extrabold: 700,
    },
  },
  kanit: {
    id: 'kanit',
    name: 'Kanit',
    family: "'Kanit', sans-serif",
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    category: 'Modern Grotesque',
    description: 'Contemporary Thai-Latin hybrid with softened flat terminals and high mechanical legibility.',
    googleFontsQuery: 'family=Kanit:wght@300;400;500;600;700;800',
    supportedWeights: [300, 400, 500, 600, 700, 800],
    defaultWeight: 400,
    trackingAdjustments: {
      headings: '-0.015em',
      body: '0em',
      buttons: '0.02em',
      kpi: '-0.02em',
      badges: '0.05em',
    },
    weightMap: {
      thin: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  'poiret-one': {
    id: 'poiret-one',
    name: 'Poiret One',
    family: "'Poiret One', cursive, sans-serif",
    fallback: '"Century Gothic", "Apple Gothic", sans-serif',
    category: 'Art Deco Display',
    description: 'Pure decorative Art Deco geometry with graceful slender curves. Clamped to native weight 400 to prevent distortion.',
    googleFontsQuery: 'family=Poiret+One',
    supportedWeights: [400],
    defaultWeight: 400,
    isDisplayOnly: true,
    capsHeadings: true,
    trackingAdjustments: {
      headings: '0.06em', // Elegant wide tracking essential for Art Deco grace
      body: '0.035em',
      buttons: '0.08em',
      kpi: '0.04em',
      badges: '0.10em',
    },
    // Intelligent weight clamp: All weights clamp to 400 so browser never synthesizes fake bold
    weightMap: {
      thin: 400,
      regular: 400,
      medium: 400,
      semibold: 400,
      bold: 400,
      extrabold: 400,
    },
  },
};

export const FONT_STORAGE_KEY = 'applyvise_font_family';
export const DEFAULT_FONT_FAMILY: FontFamilyId = 'poppins';

/**
 * Resolves font profile by id with fallback to default
 */
export function getFontProfile(id?: string | null): FontProfile {
  if (id && id in TYPOGRAPHY_PROFILES) {
    return TYPOGRAPHY_PROFILES[id as FontFamilyId];
  }
  return TYPOGRAPHY_PROFILES[DEFAULT_FONT_FAMILY];
}

/**
 * Returns all 10 selectable font families in structured display order
 */
export function getAllFontProfiles(): FontProfile[] {
  return [
    TYPOGRAPHY_PROFILES['poppins'],
    TYPOGRAPHY_PROFILES['roboto'],
    TYPOGRAPHY_PROFILES['lato'],
    TYPOGRAPHY_PROFILES['montserrat'],
    TYPOGRAPHY_PROFILES['oswald'],
    TYPOGRAPHY_PROFILES['raleway'],
    TYPOGRAPHY_PROFILES['libre-franklin'],
    TYPOGRAPHY_PROFILES['josefin-sans'],
    TYPOGRAPHY_PROFILES['kanit'],
    TYPOGRAPHY_PROFILES['poiret-one'],
  ];
}

/**
 * Injects or updates Google Fonts link tag dynamically in document head
 */
export function ensureGoogleFontLoaded(profile: FontProfile): void {
  if (typeof document === 'undefined') return;

  const linkId = 'applyvise-dynamic-font';
  let link = document.getElementById(linkId) as HTMLLinkElement | null;

  const fontUrl = `https://fonts.googleapis.com/css2?${profile.googleFontsQuery}&display=swap`;

  if (!link) {
    link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = fontUrl;
    document.head.appendChild(link);
  } else if (link.href !== fontUrl) {
    link.href = fontUrl;
  }
}

/**
 * Applies typography tokens as CSS variables on document.documentElement
 */
export function applyGlobalFontTokens(profile: FontProfile): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const style = root.style;

  // Font family stacks
  const fullFamilyStack = `${profile.family}, ${profile.fallback}`;
  style.setProperty('--font-family-ui', fullFamilyStack);
  style.setProperty('--font-family-display', fullFamilyStack);

  // Mapped weights
  style.setProperty('--font-weight-thin', String(profile.weightMap.thin));
  style.setProperty('--font-weight-regular', String(profile.weightMap.regular));
  style.setProperty('--font-weight-medium', String(profile.weightMap.medium));
  style.setProperty('--font-weight-semibold', String(profile.weightMap.semibold));
  style.setProperty('--font-weight-bold', String(profile.weightMap.bold));
  style.setProperty('--font-weight-extrabold', String(profile.weightMap.extrabold));

  // Tracking adjustments
  style.setProperty('--letter-spacing-headings', profile.trackingAdjustments.headings || '-0.02em');
  style.setProperty('--letter-spacing-body', profile.trackingAdjustments.body || '0em');
  style.setProperty('--letter-spacing-buttons', profile.trackingAdjustments.buttons || '0.02em');
  style.setProperty('--letter-spacing-kpi', profile.trackingAdjustments.kpi || '-0.02em');
  style.setProperty('--letter-spacing-badges', profile.trackingAdjustments.badges || '0.04em');

  // Hierarchy font size tokens (standardized rem values)
  style.setProperty('--font-size-2xs', '0.625rem'); // 10px
  style.setProperty('--font-size-xs', '0.75rem');   // 12px
  style.setProperty('--font-size-sm', '0.875rem');  // 14px
  style.setProperty('--font-size-base', '1rem');    // 16px
  style.setProperty('--font-size-lg', '1.125rem');  // 18px
  style.setProperty('--font-size-xl', '1.25rem');   // 20px
  style.setProperty('--font-size-2xl', '1.5rem');   // 24px
  style.setProperty('--font-size-3xl', '1.875rem'); // 30px
  style.setProperty('--font-size-4xl', '2.25rem');  // 36px

  // Line heights
  style.setProperty('--line-height-tight', '1.2');
  style.setProperty('--line-height-snug', '1.35');
  style.setProperty('--line-height-normal', '1.5');
  style.setProperty('--line-height-relaxed', '1.65');

  // Set active font class on body for target CSS rules
  root.setAttribute('data-font', profile.id);
}

/**
 * Complete activation routine: loads font stylesheet, sets CSS tokens, and stores preference
 */
export function applyGlobalFontFamily(id: FontFamilyId): FontProfile {
  const profile = getFontProfile(id);
  ensureGoogleFontLoaded(profile);
  applyGlobalFontTokens(profile);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(FONT_STORAGE_KEY, id);
    } catch {
      // Storage quota or private browsing safeguard
    }
  }

  return profile;
}

/**
 * Gets currently saved font or falls back to Poppins
 */
export function getSavedFontFamily(): FontFamilyId {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_FONT_FAMILY;
  }
  try {
    const saved = window.localStorage.getItem(FONT_STORAGE_KEY);
    if (saved && saved in TYPOGRAPHY_PROFILES) {
      return saved as FontFamilyId;
    }
  } catch {
    // Ignore storage read failures
  }
  return DEFAULT_FONT_FAMILY;
}

/**
 * Initialization routine for App boot: reads localStorage and activates tokens without FOUT
 */
export function initTypographySystem(): FontProfile {
  const savedId = getSavedFontFamily();
  return applyGlobalFontFamily(savedId);
}

/**
 * Semantic Style Resolver: Generates inline style objects for given semantic role
 */
export function getSemanticTypographyStyle(
  role: SemanticTypographyRole,
  profile: FontProfile = getFontProfile(getSavedFontFamily())
): React.CSSProperties {
  const family = `${profile.family}, ${profile.fallback}`;

  switch (role) {
    case 'heroHeading':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.bold,
        letterSpacing: profile.trackingAdjustments.headings,
        lineHeight: 1.15,
        textTransform: profile.capsHeadings ? 'uppercase' : undefined,
      };
    case 'pageHeading':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.bold,
        letterSpacing: profile.trackingAdjustments.headings,
        lineHeight: 1.25,
        textTransform: profile.capsHeadings ? 'uppercase' : undefined,
      };
    case 'sectionHeading':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.semibold,
        letterSpacing: profile.trackingAdjustments.headings,
        lineHeight: 1.3,
      };
    case 'cardHeading':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.semibold,
        letterSpacing: profile.trackingAdjustments.headings,
        lineHeight: 1.35,
      };
    case 'nav':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.medium,
        letterSpacing: profile.trackingAdjustments.body,
        lineHeight: 1.4,
      };
    case 'body':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.regular,
        letterSpacing: profile.trackingAdjustments.body,
        lineHeight: 1.5,
      };
    case 'supporting':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.regular,
        letterSpacing: profile.trackingAdjustments.body,
        lineHeight: 1.4,
      };
    case 'button':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.semibold,
        letterSpacing: profile.trackingAdjustments.buttons,
        lineHeight: 1.2,
      };
    case 'input':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.regular,
        letterSpacing: profile.trackingAdjustments.body,
        lineHeight: 1.4,
      };
    case 'label':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.medium,
        letterSpacing: profile.trackingAdjustments.badges,
        lineHeight: 1.3,
      };
    case 'tableHeader':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.semibold,
        letterSpacing: profile.trackingAdjustments.badges,
        lineHeight: 1.25,
      };
    case 'tableCell':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.regular,
        letterSpacing: profile.trackingAdjustments.body,
        lineHeight: 1.4,
      };
    case 'kpi':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.extrabold,
        letterSpacing: profile.trackingAdjustments.kpi,
        lineHeight: 1.1,
      };
    case 'badge':
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.bold,
        letterSpacing: profile.trackingAdjustments.badges,
        lineHeight: 1,
      };
    case 'code':
      return {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontWeight: 400,
        letterSpacing: '0.02em',
        lineHeight: 1.4,
      };
    default:
      return {
        fontFamily: family,
        fontWeight: profile.weightMap.regular,
      };
  }
}
