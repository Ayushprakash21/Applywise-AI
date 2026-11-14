---
version: 1.0.0
name: ApplyVise AI Design Contract
description: Unified design contract for ApplyVise AI — an AI-powered Career Operating System uniting career intelligence, verified job discovery, ATS tailoring, application tracking, and executive career progression with professional credibility and restrained luxury.
colors:
  ground: "var(--app-bg, #090A0C)"
  ground-light: "var(--app-bg, #F5F3EE)"
  surface: "var(--surface-card, #14171C)"
  surface-light: "var(--surface-card, #FFFFFF)"
  surface-elevated: "var(--surface-elevated, #191D23)"
  surface-elevated-light: "var(--surface-elevated, #FFFFFF)"
  ink: "var(--text-primary, #F2F0EA)"
  ink-light: "var(--text-primary, #20242B)"
  muted: "var(--text-secondary, #C0BDB5)"
  muted-light: "var(--text-secondary, #555C66)"
  border-subtle: "var(--border-subtle, rgba(255, 255, 255, 0.09))"
  border-subtle-light: "var(--border-subtle, #DEDAD0)"
  signal: "var(--accent-primary, #C6A66A)"
  signal-light: "var(--accent-primary, #A78343)"
  status-success: "var(--status-success, #35B887)"
  status-warning: "var(--status-warning, #D99B32)"
  status-danger: "var(--status-danger, #E05252)"
  status-info: "var(--status-info, #4C88E0)"
typography:
  display:
    fontFamily: "var(--font-family-display, 'Poppins', sans-serif)"
    fontSize: "1.875rem"
    fontWeight: "700"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "var(--font-family-ui, 'Poppins', sans-serif)"
    fontSize: "0.875rem"
    lineHeight: "1.5"
rounded:
  none: "0px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "#08090B"
    rounded: "{rounded.md}"
    padding: "0.625rem 1.25rem"
  button-secondary:
    backgroundColor: "transparent"
    borderColor: "{colors.border-subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1.25rem"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border-subtle}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
---

# APPLYVISE AI — DESIGN CONTRACT (avoid-ai-design v0.4.0)

## 1. Product Identity

ApplyVise is a career intelligence and growth platform uniting job discovery, resume intelligence, career pathways, recruiter outreach, and supervised career workflows.

Its design communicates:
- **Professional Credibility:** Grounded in verified employment records and factual market metrics.
- **Accuracy & Factual Integrity:** Zero-hallucination data presentation with transparent data provenance.
- **Career Progression:** Clear trajectory visualizations without decorative noise.
- **Decision Clarity:** Information density optimized for career choices rather than marketing fluff.
- **Executive Restraint:** High-end BLACK ELITE obsidian luxury and warm sand clarity, avoiding generic SaaS clichés.

---

## 2. Core Design Principles

1. **Information Hierarchy Before Decoration:** Content importance dictates layout, font scale, and visual weight.
2. **Specific Decisions Before Generic Defaults:** Every color, surface, and line exists for a clear functional role.
3. **Real Product Data Before Decorative Graphics:** Real vacancy data, verified candidate history, and authentic milestones instead of fake terminal mocks or stock illustrations.
4. **Distinct Structures for Distinct Workflows:** Job discovery uses filter-and-result rails; Application Control uses lifecycle kanbans and tables; Career Atlas uses comparative pathway matrices; Admin Console uses high-density data grids.
5. **Readability Before Visual Effects:** Strict adherence to WCAG 2.2 AA contrast (minimum 4.5:1 for body, 7:1 for headings). No unreadable light gray on white or dark grey on obsidian.
6. **Application-Wide Consistency:** One shared design token engine across candidate workspace, public portals, and admin console. Zero design-system drift (catalog X1).
7. **Purposeful Color Discipline:** 60/30/10 distribution. Dominant ground (60%), structured surface (30%), single functional accent (10%). No multicolor confetti gradients.
8. **Restrained Motion:** Purposeful micro-interactions with smooth ease-out curves (no bounce overshoot, no uniform fadeInUp on every section). 100% compliance with `prefers-reduced-motion`.
9. **Accessible Interactions:** 44px minimum touch targets on mobile, visible focus rings on keyboard navigation, semantic HTML form controls.
10. **Premium Execution Without Visual Excess:** Luxury expressed through typographic proportion, precision borders, and intentional spacing rather than heavy drop shadows, colored glows, or reflexive glassmorphism.

---

## 3. Curated Palettes & Color System

The system strictly supports two appearance modes (Dark, Light) and five curated palettes. No unchosen purple-to-blue gradients or emerald escapes:

### 1. Dune (Signature Black Elite Luxury)
- **Dark Mode:** Ground `#090A0C`, Card `#14171C`, Elevated `#191D23`, Accent Champagne `#C6A66A`.
- **Light Mode:** Ground `#F5F3EE`, Card `#FFFFFF`, Elevated `#FFFFFF`, Accent Champagne `#A78343`.

### 2. Ocean (Executive Marine)
- **Dark Mode:** Ground `#0A0F17`, Card `#111823`, Elevated `#182232`, Accent Marine `#38BDF8`.
- **Light Mode:** Ground `#F4F6F9`, Card `#FFFFFF`, Elevated `#FFFFFF`, Accent Marine `#1E6B9B`.

### 3. Dusk (Twilight Amethyst)
- **Dark Mode:** Ground `#0E0C16`, Card `#161324`, Elevated `#1F1B30`, Accent Amethyst `#A855F7`.
- **Light Mode:** Ground `#F7F5FA`, Card `#FFFFFF`, Elevated `#FFFFFF`, Accent Amethyst `#7B4BB7`.

### 4. Silk (Platinum Minimalist)
- **Dark Mode:** Ground `#0C0D0E`, Card `#131416`, Elevated `#1A1C1E`, Accent Platinum `#E5E7EB`.
- **Light Mode:** Ground `#F7F7F8`, Card `#FFFFFF`, Elevated `#FFFFFF`, Accent Slate `#4B5563`.

### 5. Aurora (Nordic Emerald)
- **Dark Mode:** Ground `#0A120E`, Card `#101A15`, Elevated `#16241D`, Accent Emerald `#34D399`.
- **Light Mode:** Ground `#F3F8F5`, Card `#FFFFFF`, Elevated `#FFFFFF`, Accent Emerald `#1B7C60`.

---

## 4. Typography Contract

Ten user-selectable font families are preserved with intentional role profiles:
1. **Poppins:** Geometric modern clarity (System default).
2. **Roboto:** Neutral engineering precision.
3. **Lato:** Balanced warm humanist sans.
4. **Montserrat:** Architectural display presence.
5. **Oswald:** High-density condensed tabular clarity.
6. **Raleway:** Elegant luxury styling.
7. **Libre Franklin:** Editorial authority.
8. **Josefin Sans:** Geometric vintage elegance.
9. **Kanit:** Dynamic athletic modern sans.
10. **Poiret One:** Ultra-light artistic display.

**Rules:**
- Headings use `--font-family-display` with tight tracking (`-0.025em`).
- Body text uses `--font-family-ui` with normal tracking (`0em`) and 1.5 line-height.
- No Geist without explicit pairing. No Inter as an unchosen default.

---

## 5. Layout Architecture & Workflows

- **Candidate Command Center (Career Desk):** Prioritized action queue + verified career baseline + active application milestones.
- **Job Discovery (Opportunity Radar):** Search & filter rail + structured job comparison cards with transparent evidence tags.
- **Career Pathways (Career Atlas):** Comparative career trajectory matrix + ground-truth milestone roadmap.
- **Application Control:** Multi-stage lifecycle kanban + tabular timeline view.
- **Resume Studio:** Real document preview pane + structural section controls + zero-hallucination verification diagnostics.
- **Admin Console:** Vertical navigation sidebar + operational KPI overview + structured data tables + security audit stream.

---

## 6. What ApplyVise Refuses (Avoid-AI-Design Guardrails)

- **No Purple Gradients (C1):** No `from-indigo` or `to-violet` gradients across backgrounds, headers, or buttons.
- **No Gradient-Filled Headlines (C6):** Headings are solid contrast text (`#F2F0EA` in dark, `#191D24` in light).
- **No Centered-Hero-Over-Three-Cards Template (L1, L2):** Content dictates layout structure; asymmetrical, split-pane, and dashboard grids are used instead.
- **No Colored Left-Border Ribbon Cards (K4):** Emphasis is communicated through contrast, weight, and hierarchy.
- **No Reflexive Glassmorphism Everywhere (K3):** Blur effects are restricted exclusively to sticky navigation headers over scrolling content. Card surfaces are solid.
- **No Decorative 01/02/03 Markers (SD6):** Numbers are used only for real chronological steps or rankings.
- **No Tracked ALL-CAPS Eyebrow Overkill (SD4):** Section openers provide real context or are omitted.
- **No Arrow Glyphs Glued to Buttons (CP3):** No "Get Started →" or "Explore →". Clean verbs only ("Explore Opportunities", "Compare Pathways").
- **No Generic Superlatives (CP1, CP2):** No "Unlock your potential" or "All-in-one powerful solution".
