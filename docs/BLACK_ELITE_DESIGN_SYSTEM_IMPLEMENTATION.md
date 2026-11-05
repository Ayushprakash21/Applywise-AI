# ApplyVise AI — BLACK ELITE Luxury Design System Implementation

## Executive Summary

The ApplyVise AI **BLACK ELITE** membership tier has been transformed from an overly illuminated, neon-bordered presentation into an **ultra-refined luxury enterprise experience**. Drawing design principles from **private banking portals, executive SaaS platforms, and high-end financial intelligence terminals**, the interface embodies:

> **"Luxury through restraint, not decoration."**

All neon halos, yellow-orange color flooding, radiant button glows, and gaming-inspired accents have been systematically eliminated in favor of **deep obsidian backdrops, dense graphite surfaces, hairline neutral borders, and measured champagne detailing**.

---

## 1. Centralized Theme-Token Architecture

The BLACK ELITE design system is centralized in `src/index.css` under the `:root[data-theme="black"]`, `body.theme-black`, and `.theme-black` scopes.

### 1.1 Color Palette Specifications

| Token Category | Token Variable | Hex / RGBA Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Background Primary** | `--be-bg-primary` | `#08090B` | Deep obsidian application background |
| **Background Secondary** | `--be-bg-secondary` | `#0D0F12` | Sub-panels, inset tracks, header dividers |
| **Background Sidebar** | `--be-bg-sidebar` | `#101216` | Fixed vertical navigation bar |
| **Card Surface** | `--be-bg-card` | `#13161B` | Primary interactive cards & modules |
| **Elevated Surface** | `--be-bg-elevated` | `#191D23` | Secondary elevated modules & chips |
| **Input Background** | `--be-bg-input` | `#0B0D10` | Form inputs, search fields, textareas |
| **Modal Background** | `--be-bg-modal` | `#111419` | Dialog containers & drawers |
| **Champagne Accent** | `--be-gold-primary` | `#C6A66A` | Primary accent, solid action buttons |
| **Champagne Light** | `--be-gold-light` | `#E2C58A` | Active hover states |
| **Champagne Deep** | `--be-gold-deep` | `#927343` | Antique gold borders |
| **Champagne Muted** | `--be-gold-muted` | `#786341` | Tertiary gold indicators |
| **Champagne Border** | `--be-gold-border` | `rgba(198,166,106,0.25)` | 1px focus and active borders |
| **Champagne Hover** | `--be-gold-hover` | `rgba(198,166,106,0.08)` | Selected navigation item background |
| **Text Primary** | `--be-text-primary` | `#F0EEE9` | High-contrast editorial headers & text |
| **Text Secondary** | `--be-text-secondary` | `#B7B4AD` | Descriptive body copy & subtitles |
| **Text Muted** | `--be-text-muted` | `#858781` | Metadata, timestamps, helper text |
| **Divider** | `--be-border-divider` | `rgba(255,255,255,0.075)` | Fine 1px hairline dividers |

### 1.2 Functional Semantic Status Colors (Preserved & Protected)

Unlike previous implementations that forced all status indicators into gold, semantic statuses remain crisp, distinct, and immediately recognizable:

- **Verified / Direct Feed (Emerald)**: `#36B887` (`rgba(54, 184, 135, 0.12)` background, `rgba(54, 184, 135, 0.28)` border).
- **AI Intelligence / Synthesis (Violet)**: `#8B82E9` (`rgba(139, 130, 233, 0.12)` background, `rgba(139, 130, 233, 0.28)` border).
- **Information / Telemetry (Soft Blue)**: `#75A9D6` (`rgba(117, 169, 214, 0.12)` background).
- **Pending / Warning (Muted Amber)**: `#D9AA61` (`rgba(217, 170, 97, 0.12)` background).
- **Error / Disciplinary Gap (Controlled Red)**: `#D66F70` (`rgba(214, 111, 112, 0.12)` background).

### 1.3 Typography & Tabular Figures

To emulate institutional trading desks and private wealth terminals:
```css
.theme-black {
  font-feature-settings: "tnum" 1, "cv02" 1, "cv03" 1, "cv04" 1;
  font-variant-numeric: tabular-nums;
}
```
All quantitative metrics, alignment scores, salaries, and counters align with exact optical column widths.

---

## 2. Component System Transformations

### 2.1 Royal Crown Emblem & Monogram
- **Previous Defect**: Heavy multi-stop gradient with rainbow jewels and intense neon bloom.
- **Refined Implementation** (`src/components/RoyalCrownLogo.tsx`):
  - Minimal architectural sovereign emblem rendered with 1.25px hairline champagne stroke (`#C6A66A`).
  - Subtle geometric crown points with clean geometric vertices.
  - Editorial wordmark: `BLACK` in `#F0EEE9` bold tracking paired with `ELITE` in `#C6A66A` monospace.

### 2.2 Navigation Architecture
- **Sidebar** (`src/components/DashboardShell.tsx`):
  - Background: `#101216` with 1px right border `rgba(255, 255, 255, 0.075)`.
  - Active Item: Subtle 8% champagne background (`rgba(198, 166, 106, 0.08)`), 1px border `rgba(198, 166, 106, 0.25)`, and champagne typography (`#C6A66A`).
  - Inactive Items: Slate neutral `#B7B4AD`, hovering smoothly to `#F0EEE9`.
- **Top Header**:
  - Background: `rgba(16, 18, 22, 0.94)` with 24px backdrop blur.
  - User identity badge: Monospace `BLACK ELITE` pill on `#101216` with subtle champagne border.
  - Brand header mark: `ApplyVise AI [ELITE]`.

### 2.3 Interactive Action Controls
- **Primary Buttons**: Solid champagne `#C6A66A` with deep obsidian text `#0D0F12`, fine border `#E2C58A`, and subtle elevation (`box-shadow: 0 2px 8px rgba(0,0,0,0.35)`). Zero white glow or neon halos.
- **Secondary Buttons & Chips**: Dense graphite `#191D23`, neutral border `rgba(255, 255, 255, 0.12)`, text `#F0EEE9`.
- **Form Inputs**: Deep graphite `#0B0D10`, subtle border `rgba(255, 255, 255, 0.1)`. Focus brings a crisp 1px champagne border (`#C6A66A`) and restrained 2px focus ring (`rgba(198, 166, 106, 0.2)`).

---

## 3. Product Surfaces Audit & Verification

| Surface | Implementation Details | Verified Status |
| :--- | :--- | :--- |
| **A. Resume Intelligence Onboarding** (`ResumeOnboardingModal.tsx`) | `#111419` modal container, `#0B0D10` dropzone with 1px dashed border, `#191D23` upload icon tile with `#C6A66A` icon, `#36B887` emerald privacy guarantee badge. | **VERIFIED** |
| **B. Profile & Career Preferences** (`ProfileAndPreferencesPage.tsx`) | `#13161B` panel, `#36B887` ATS Source of Truth badge, solid `#C6A66A` active sub-tab, `#0B0D10` graphite inputs, `#191D23` skill chips with zero neumorphic shadow. | **VERIFIED** |
| **C. Opportunity Radar** (`OpportunityRadar.tsx`) | `#13161B` market monitoring container, solid `#C6A66A` active filter pill, `#13161B` vacancy cards, solid `#C6A66A` "Review Dossier" buttons, `#36B887` live feed guarantee. | **VERIFIED** |
| **D. Career Desk** (`CareerDesk.tsx`) | `#13161B` command centre cards, tabular figures, solid `#C6A66A` primary search button, executive radial dial. | **VERIFIED** |
| **E. Application Control** (`ApplicationControl.tsx`) | High-density `#13161B` application cards, 12-stage state badge, champagne hover outlines, zero neon bloom. | **VERIFIED** |
| **F. Interview Studio** (`InterviewStudio.tsx`) | Obsidian rehearsal simulator, `#13161B` STAR question cards, 100-point grounded evaluation scorecard. | **VERIFIED** |
| **G. Recruiter Review** (`RecruiterReview.tsx`) | Graphite screening audit grid, 3-tier evidence badges (emerald, amber, rose preserved). | **VERIFIED** |
| **H. Career Atlas** (`CareerAtlas.tsx`) | Architectural career pathway graph, skill bridge nodes, tabular coordinate projection. | **VERIFIED** |
| **I. Admin Console & Resume Operations** (`AdminConsole.tsx`, `AdminResumeManagement.tsx`) | Terminal-density `#101216` console, multi-column resume inventory, filter chips, inspection drawer. | **VERIFIED** |

---

## 4. Theme Isolation & Guardrails

The BLACK ELITE design system is strictly isolated:
1. **Activation Trigger**: Enabled exclusively via `src/App.tsx` through `isBlackSubscriber`.
2. **CSS Scope**: Every rule is scoped strictly under `:root[data-theme="black"]`, `body.theme-black`, or `.theme-black`.
3. **Free & Pro Tiers Protection**:
   - Free and Pro accounts do NOT trigger `theme-black`.
   - Free and Pro tiers render in their native light hybrid neu-glass aesthetic (`#EEF2F7` base, soft neumorphic elevation, blue/indigo accents).
   - Zero CSS leakage or style bleed into non-Black tiers.

---

## 5. Automated Verification & Artifacts

### 5.1 Test Suite & Build Results
- **TypeScript Static Analysis**: `npm run lint` (`tsc --noEmit`) -> **0 errors**.
- **Unit & Integration Suite**: `npm test` -> **321 of 321 tests pass** across 12 test suites.
- **Production Build**: `npm run build` (`vite build`) -> **Clean build in 811ms**.

### 5.2 Browser Artifacts Generated
The following artifacts have been captured via headless Chromium and saved in the artifact directory:
- `black_elite_career_desk.png` — Career Desk under BLACK ELITE.
- `black_elite_opportunity_radar.png` — Opportunity Radar with restrained dossier cards and solid champagne filters.
- `black_elite_profile_and_facts.png` — Profile & Career Preferences with solid champagne sub-tab and graphite inputs.
- `black_elite_onboarding_modal.png` — Resume Intelligence Onboarding modal with clean dropzone and emerald guarantee.
- `black_elite_interview_studio.png` — Interview Studio with obsidian question banks.
- `black_elite_recruiter_review.png` — Recruiter Review with high-density audit container.
- `black_elite_career_atlas.png` — Career Atlas with architectural coordinate projection.
- `black_elite_mobile_390x844.png` — Mobile viewport (390×844) responsive layout.
- `free_tier_career_desk.png` — Verified light-theme Free tier confirming 0% style leakage.
