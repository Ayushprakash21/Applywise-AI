# ApplyVise AI — Design System & Engineering Guide
**Identity:** BLACK ELITE & Curated Palette Architecture  
**Authoritative Contract:** [`DESIGN.md`](file:///d:/ANtigravity/applywise%20AI/DESIGN.md)  
**Framework Alignment:** `avoid-ai-design` 0.4.0

---

## 1. Design Philosophy

ApplyVise AI is an executive career intelligence and orchestration platform. Its visual language prioritizes:
1. **Factuality Over Decoration:** Interfaces prioritize verified data, candidate career trajectories, and honest ATS feedback over ornamental styling.
2. **Editorial Structure Over Stock Grids:** Dynamic asymmetric layouts and left-aligned architectural typography replace centered hero blocks and repetitive card grids.
3. **Intentional Palette Governance:** Strict adherence to 5 curated palettes across Dark and Light modes. No unchosen defaults.

---

## 2. Token Architecture & Semantic Variables

All components consume semantic CSS variables declared in `:root` and `.dark`:

### Core Color Tokens
```css
/* Background Surfaces */
--be-bg-canvas: #08090B;     /* Deepest platform ground */
--be-bg-card: #14171C;       /* Primary card surface */
--be-bg-surface: #181C22;    /* Interactive elements & secondary surface */
--be-bg-elevated: #1F242C;   /* Floating popovers, tooltips, and modals */

/* Text & Foreground */
--be-text-primary: #F2F0EA;  /* High-contrast body & headings */
--be-text-secondary: #92949A;/* Subheadings, metadata, and labels */
--be-text-muted: #64676E;    /* Disabled states and subtle hints */

/* Borders & Separators */
--be-border-subtle: rgba(255, 255, 255, 0.08);
--be-border-strong: rgba(255, 255, 255, 0.16);
```

### Curated Palette Presets
Each palette provides deliberate accent and accent-hover tokens:
1. **Ocean:** Modern Blue (`#2563EB` / `#1D4ED8`)
2. **Dune:** Warm Sand & Champagne Gold (`#A78343` / `#8E6F37` on `#F5F3EE`)
3. **Dusk:** Deep Slate & Twilight Violet (`#7C3AED` / `#6D28D9`)
4. **Silk:** High-Contrast Monochrome Graphite (`#E2E8F0` / `#CBD5E1`)
5. **Aurora:** Deep Emerald & Mint (`#10B981` / `#059669` on `#0A120E`)

---

## 3. Typography Architecture

ApplyVise provides 10 selectable typography families configured in `src/utils/typographyEngine.ts`:
1. **Roboto** (Neo-grotesque standard)
2. **Poppins** (Default geometric sans)
3. **Lato** (Warm humanist)
4. **Montserrat** (Expressive geometric)
5. **Oswald** (Condensed editorial display)
6. **Raleway** (Elegant lightweight sans)
7. **Libre Franklin** (Authoritative editorial)
8. **Josefin Sans** (Geometric vintage)
9. **Kanit** (Dynamic modern sans)
10. **Poiret One** (Art-deco luxury wireframe)

### Typography Rules
- **No Highlighted Words:** Headings must maintain single-color semantic contrast.
- **Poiret One Weight Clamping:** Clamped between 200 and 400 to prevent faux-bold distortion.
- **Oswald Letter Spacing:** Automatically tracked with positive letter-spacing (`tracking-wider`).

---

## 4. Component Implementation Rules

1. **Buttons (`.be-btn-primary`):**
   - Solid background using `--be-accent`.
   - Subtle neutral shadow (`shadow-xs`), never saturated colored glows.
   - Standardized height: `40px` for compact header/table buttons, `48px` for primary submission buttons.
2. **Cards (`.be-card`):**
   - Flat solid surface (`--be-bg-card`) with hairline border (`--be-border-subtle`).
   - Backdrop blur reserved exclusively for sticky headers and modals.
3. **Search & Command Bar:**
   - Unified search bar with integrated `⌘ K` / `Ctrl K` keycap.
   - Restrained border transition on focus (`focus-within:border-[var(--be-accent)]`).
