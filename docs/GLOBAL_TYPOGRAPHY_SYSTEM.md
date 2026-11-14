# ApplyVise AI — Global Typography & Font Management System

## 1. Architecture Overview

ApplyVise AI incorporates a centralized, token-based global typography system. This engine decouples font definition, dynamic Google Fonts injection, intelligent font-weight mapping, and semantic role styling from ad-hoc component styles.

Located at: `src/utils/typographySystem.ts`
CSS Tokens at: `src/index.css`
User Interface at: `src/components/TypographySettingsModal.tsx`

---

## 2. Core Token Specification

The system defines standard CSS Custom Properties assigned dynamically to `:root` / `document.documentElement`:

```css
:root {
  /* Font Family Stacks */
  --font-family-ui: 'Poppins', sans-serif, system-ui, -apple-system, sans-serif;
  --font-family-display: 'Poppins', sans-serif, system-ui, -apple-system, sans-serif;

  /* Intelligent Mapped Weights */
  --font-weight-thin: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;

  /* Letter Spacing & Tracking */
  --letter-spacing-headings: -0.02em;
  --letter-spacing-body: 0em;
  --letter-spacing-buttons: 0.01em;
  --letter-spacing-kpi: -0.03em;
  --letter-spacing-badges: 0.04em;

  /* Typography Scale */
  --font-size-2xs: 0.625rem;  /* 10px */
  --font-size-xs:  0.75rem;   /* 12px */
  --font-size-sm:  0.875rem;  /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg:  1.125rem;  /* 18px */
  --font-size-xl:  1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-snug: 1.35;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.65;
}
```

---

## 3. The 10 Selectable Font Families

| ID | Font Name | Classification | Default Weights | Distinctive Role |
|---|---|---|---|---|
| `poppins` | **Poppins** (Default) | Geometric Sans | 300, 400, 500, 600, 700, 800 | Default platform UI typeface. Exceptional clarity and modern curves. |
| `roboto` | **Roboto** | Neo-Grotesque | 300, 400, 500, 700, 900 | High utility and mechanical precision for data-heavy dashboards. |
| `lato` | **Lato** | Humanist Sans | 300, 400, 700, 900 | Semi-rounded details providing executive warmth and balance. |
| `montserrat` | **Montserrat** | Geometric Sans | 300, 400, 500, 600, 700, 800 | Striking urban geometric personality inspired by Buenos Aires. |
| `oswald` | **Oswald** | Condensed Gothic | 300, 400, 500, 600, 700 | Space-efficient vertical rhythm with custom letter-spacing expansion. |
| `raleway` | **Raleway** | Humanist Sans | 300, 400, 500, 600, 700 | Neo-grotesque elegance with signature criss-cross "W" and open tracking. |
| `libre-franklin` | **Libre Franklin** | Editorial Gothic | 300, 400, 500, 600, 700, 800 | Morris Fuller Benton classic interpretation; authoritative journalism tone. |
| `josefin-sans` | **Josefin Sans** | Geometric Vintage | 300, 400, 600, 700 | 1930s Scandinavian geometric elegance with refined positive tracking. |
| `kanit` | **Kanit** | Modern Grotesque | 300, 400, 500, 600, 700, 800 | Contemporary curved terminals with high mechanical legibility. |
| `poiret-one` | **Poiret One** | Art Deco Display | 400 (Native Only) | Decorative Art Deco geometry with strict weight clamping to prevent distortion. |

---

## 4. Intelligent Weight Clamping & Anti-Distortion Engine

Browsers synthesize "faux bold" when a CSS `font-weight: 700` is requested for a typeface that only provides regular glyphs (such as Poiret One). This synthetically offsets and smears strokes, destroying letterforms.

### Poiret One Clamping
The typography system explicitly clamps all weights for `poiret-one`:
```ts
weightMap: {
  thin: 400,
  regular: 400,
  medium: 400,
  semibold: 400,
  bold: 400,
  extrabold: 400,
}
```
Visual prominence is achieved through wide letter-spacing (`0.06em`), uppercase transformation, and subtle contrast boundaries rather than distorted fake bolding.

### Oswald Condensed Tracking
Condensed typefaces can cause glyph crowding when rendered in body copy or form inputs. The engine introduces positive letter-spacing (`0.025em` for body, `0.04em` for buttons) so that condensed text remains comfortable to read.

---

## 5. Zero-FOUT Dynamic Font Loading

To eliminate Flash of Unstyled Text (FOUT):
1. **Preconnects:** `index.html` connects to `fonts.googleapis.com` and `fonts.gstatic.com` at the earliest stage.
2. **Dynamic Injection:** `ensureGoogleFontLoaded(profile)` dynamically creates or updates `<link id="applyvise-dynamic-font">` with `display=swap`.
3. **Synchronous Boot:** `initTypographySystem()` executes in `src/main.tsx` prior to `createRoot().render()`, immediately applying the stored font tokens from `localStorage.getItem('applyvise_font_family')`.

---

## 6. Semantic Style Resolver API

Components can resolve consistent typography styles using `getSemanticTypographyStyle(role, profile)`:

```ts
import { getSemanticTypographyStyle } from '../utils/typographySystem.ts';

// Usage in JSX
<h1 style={getSemanticTypographyStyle('heroHeading')}>Career Intelligence Redefined</h1>
<button style={getSemanticTypographyStyle('button')}>Apply with Autopilot</button>
<span style={getSemanticTypographyStyle('badge')}>ACTIVE SAFE</span>
```

Supported Semantic Roles:
`heroHeading`, `pageHeading`, `sectionHeading`, `cardHeading`, `nav`, `body`, `supporting`, `button`, `input`, `label`, `tableHeader`, `tableCell`, `kpi`, `badge`, `code`.

---

## 7. Strict Resume Export Isolation Guarantee

UI font selections apply to web views (`body`, `main`, headings, badges, dashboards). Candidate resume and cover letter exports generated in ATS Document Studio (`src/components/ResumeStudioTab.tsx`, `src/utils/docxExtractor.ts`, etc.) remain strictly isolated:
- DOCX files format exclusively in standard ATS-compatible typefaces (Calibri, Arial, Times New Roman) as mandated by employer tracking systems.
- Dynamic web font changes never bleed into generated application documents.
