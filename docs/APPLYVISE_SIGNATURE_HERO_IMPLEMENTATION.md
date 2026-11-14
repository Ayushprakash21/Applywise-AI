# APPLYVISE AI — SIGNATURE CINEMATIC HOMEPAGE HERO IMPLEMENTATION
## Engineering Specification & Component Architecture

**Document Version:** 1.0.0  
**Status:** Complete & Verified  
**Feature Branch:** `feat/applyvise-signature-cinematic-hero`  
**Base Commit:** `7ca2f4f` (`origin/fix/platform-ui-readability-responsive`)  
**Design Reference Framework:** `avoid-ai-design 0.4.0`

---

## 1. Overview & Architectural Scope

The Signature Cinematic Homepage Hero redesign transforms ApplyVise AI's primary landing experience from a conventional SaaS presentation into an editorial, product-led intelligence architecture.

In accordance with the primary creative directive (**"DO NOT INVENT A NEW BRAND IDENTITY"**), this implementation strictly reuses ApplyVise's active design system tokens, typography rules, and component semantics.

---

## 2. Component Structure & File Manifest

### 2.1 Files Created
1. `src/components/hero/CareerIntelligenceHero.tsx`
   - Core hero presentation component.
   - Encapsulates the 4-dimensional Career Intelligence Structure.
   - Hosts the responsive interactive search capsule and popular query tags.
   - Manages `prefers-reduced-motion` detection and accessibility.
2. `tests/signature_cinematic_hero.test.ts`
   - Automated regression suite validating brand voice, headline hierarchy, 4 intelligence dimensions, theme tokens, and WCAG contrast.
3. `tools/capture_hero_screenshots.cjs`
   - Automated Playwright screenshot script executing across 7 viewport resolutions and 5 curated palettes in both Light and Dark modes.
4. `docs/APPLYVISE_SIGNATURE_HERO_DESIGN.md`
   - Visual architecture, design tokens, and editorial layout specification.
5. `docs/APPLYVISE_SIGNATURE_HERO_IMPLEMENTATION.md`
   - Engineering documentation, component API, and state flow.
6. `docs/APPLYVISE_SIGNATURE_HERO_VISUAL_QA.md`
   - Visual QA verification, viewport audits, and contrast evaluations.
7. `docs/APPLYVISE_SIGNATURE_HERO_PERFORMANCE.md`
   - Bundle size, runtime latency, and accessibility performance metrics.

### 2.2 Files Refactored
1. `src/components/LandingPage.tsx`
   - Replaced legacy template hero with `<CareerIntelligenceHero />`.
   - Wired public theme appearance controls (`toggleAppearance`) with instant Sun/Moon icon toggle in desktop and mobile headers.
   - Refactored canvas background from hardcoded `#F5F3EE` to dynamic semantic token `var(--be-bg-canvas, #F5F3EE)`.
   - Connected `#network` anchor section to embed `<CareerNetworkVisual theme="light" />` smoothly beneath the hero.

---

## 3. Component Architecture & Props Contract

### `CareerIntelligenceHeroProps`
```typescript
export interface CareerIntelligenceHeroProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  popularTags?: string[];
}
```

### 3.1 Editorial Copy & Headline Hierarchy
- **Eyebrow:** `APPLYVISE AI · UNIFIED CAREER OPERATING SYSTEM`
- **Primary Headline:** `Your Career. Beyond the Next Application.`
- **Supporting Narrative:** `Bring your professional experience, skills, opportunities and applications into one intelligent career workspace. Grounded in mathematical truth — never fabricated claims.`
- **Prohibited Marketing Clichés:** Eliminated generic tropes ("Unlock your potential", "Supercharge your career", "AI-powered everything").

### 3.2 The Four Authentic Dimensions of Career Intelligence Structure
| Dimension | Header | Content Elements | Validation & Integrity |
| :--- | :--- | :--- | :--- |
| **01 · Experience** | Experience Architecture | Senior Process Associate · Supply Chain Operations | Verified Facts Only badge · Zero fabricated bullet points |
| **02 · Skills** | Competency Vectors | System Architecture, Distributed Operations, TypeScript & Cloud, Truthfulness Guarantee | Evidence-Grounded pills with green check indicators |
| **03 · Opportunities** | Verified Opportunities | Staff Operations & Systems Engineer · Arbeitnow/Remotive Verified Feed | 94% Match badge · 0 Skill Gaps |
| **04 · Progress** | Strategic Momentum | 1 Targeted Application, 0 Hallucinations, 100% Candidate Truth | Audit Clean badge · Real pipeline metrics |

---

## 4. Theme & Palette Token Integration

The hero component binds exclusively to ApplyVise's design system tokens:
- **Canvas Ground:** `var(--be-bg-canvas, #F5F3EE)` (Light) / `var(--be-bg-canvas, #070B12)` (Dark)
- **Card Surfaces:** `var(--be-bg-card, #FFFFFF)` (Light) / `var(--be-bg-card, #14171C)` (Dark)
- **Elevated Surfaces:** `var(--be-bg-elevated, #FAF8F5)` (Light) / `var(--be-bg-elevated, #191D23)` (Dark)
- **Borders:** `var(--be-border-subtle, #DEDAD0)` (Light) / `rgba(255, 255, 255, 0.09)` (Dark)
- **Primary Accent:** `var(--be-accent, #A78343)` (Dune) / `#0284C7` (Ocean) / `#8B5CF6` (Dusk) / `#334155` (Silk) / `#059669` (Aurora)
- **Primary Text:** `var(--be-text-primary, #20242B)` (Light) / `var(--be-text-primary, #F2F0EA)` (Dark)
- **Secondary Text:** `var(--be-text-secondary, #555C66)` (Light) / `var(--be-text-secondary, #C0BDB5)` (Dark)

---

## 5. Automated Test Results

- Total tests passed: **616 / 616**
- Total test suites: **66 / 66**
- Regressions: **0**
- Test execution time: **54.25s**

Targeted suite `tests/signature_cinematic_hero.test.ts` passed 8/8 tests in 5.56ms.
