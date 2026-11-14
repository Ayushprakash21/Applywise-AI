# ApplyVise AI — Avoid AI Design Remediation Log
**Framework:** `avoid-ai-design` 0.4.0  
**Target:** Eliminate generic AI frontend defaults and elevate ApplyVise AI to enterprise-grade bespoke product design.  
**Branch:** `feat/avoid-ai-design-transformation`

---

## 1. Overview of Remediation Strategy

The remediation followed a 6-phase engineering process:
1. **Cataloging:** Automated scan of all 145 project files using `tools/avoid-ai-design/scripts/detect.mjs`.
2. **Design Contract Formulation:** Established `DESIGN.md` specifying deliberate aesthetic direction, 5 curated palettes, 10 selectable typography families, and explicit refusals of AI tells.
3. **Core Utility Normalization:** Refactored `src/index.css` to strip unneeded `backdrop-filter: blur(16px)` on static containers, eliminate colored shadow glows, and tie all utility classes directly to semantic tokens.
4. **Layout & Hero Overhauls:** Converted centered hero + pill badge layouts into editorial split grids across landing, pricing, about, and auth pages.
5. **Component-Level Refactoring:** Replaced purple-violet gradients, colored side-stripes, and emoji interface icons with solid executive surfaces and SVG iconography.
6. **Regression Verification:** Updated existing test suites to enforce the new clean design contracts and validated 100% test pass rate.

---

## 2. File-by-File Remediation Details

### Public & Marketing Pages
- **`src/components/LandingPage.tsx`**:
  - *Previous Tells:* Centered pill badge, centered H1 with `text-blue-600` single-word accent, generic copy, floating purple orbs.
  - *Remediation:* Replaced with architectural split grid (`lg:grid-cols-12`). Integrated live verification status panel on right. Applied official brand statement: *"Your Career. Intelligently Orchestrated."*. Eliminated all stapled arrow characters.
- **`src/components/AboutPage.tsx`**:
  - *Previous Tells:* Centered pill badge, purple-violet gradient text on H1, 3 identical feature cards with radial glow.
  - *Remediation:* Converted into editorial masthead with asymmetric company overview. Bound cards to `var(--be-bg-card)` with neutral border tokens. Zero findings on rescan!
- **`src/components/PricingPage.tsx`**:
  - *Previous Tells:* Centered pill badge, gradient text on H1, `shadow-blue-500/25` on pro card CTA, stapled arrows on FAQ.
  - *Remediation:* Converted hero to editorial header with inline currency toggle. Replaced gradient text with solid high-contrast typography. Replaced colored shadow with `shadow-xs`.
- **`src/components/PublicResourcePage.tsx`**:
  - *Previous Tells:* Centered hero with floating badge.
  - *Remediation:* Converted to left-aligned editorial layout with clean category filtering.

### Authentication Suite
- **`src/components/FlowLogin.tsx`**:
  - *Previous Tells:* Centered pill badge above H1, purple-indigo gradient submit button, `← Return to sign in` stapled arrow, centered text layout matching L1 regex.
  - *Remediation:* Converted to left-aligned candidate sign-in card with gold accent label (`var(--be-accent)`), solid slate button, and clean navigation links.
- **`src/components/FlowSignup.tsx`**:
  - *Previous Tells:* Violet pill badge with generic "Get Started" label, purple gradient button.
  - *Remediation:* Replaced badge with architectural label *"Candidate Registration"*, replaced CTA with solid executive button.
- **`src/components/auth/AuthBackground.tsx`**:
  - *Previous Tells:* Purple/indigo radial gradient orbs (`bg-purple-500/20 blur-[120px]`).
  - *Remediation:* Replaced with subtle atmospheric slate/champagne lighting.
- **`src/components/auth/AuthVisualCanvas.tsx`**:
  - *Previous Tells:* Pink-violet radial glow ring behind 3D canvas.
  - *Remediation:* Replaced with warm gold/slate geometric wireframe rings.
- **`src/components/AdminLoginPage.tsx`**:
  - *Previous Tells:* Blue-indigo gradient security bar.
  - *Remediation:* Replaced with solid slate accent.

### Candidate Workspace & Navigation
- **`src/components/DashboardShell.tsx`**:
  - *Previous Tells:* Purple ambient background orbs, purple gradient active navigation indicator, stapled arrow on notifications link.
  - *Remediation:* Removed ambient orbs. Active nav indicator bound directly to `var(--be-accent)`. Replaced arrow on notifications link with clean text.
- **`src/components/AppHeader.tsx` & `src/components/Header.tsx`**:
  - *Previous Tells:* Gradient logo text, cyan-indigo gradient buttons, glowing notification indicator.
  - *Remediation:* Solid slate and champagne detailing. Integrated unified 40px height container group.
- **`src/components/CareerCommandCenter.tsx`**:
  - *Previous Tells:* "👋" wave emoji in H1 headline, blue-to-violet gradient next-action button, `shadow-violet-500/25`, `hover:shadow-violet-500/10`.
  - *Remediation:* Removed wave emoji, replaced next-action button with solid slate/accent button, removed colored hover shadows.
- **`src/components/CareerMomentumCard.tsx` & `CareerMomentumTimeline.tsx`**:
  - *Previous Tells:* `backdrop-blur-xl` on static cards, `hover:shadow-violet-500/10`, `shadow-emerald-500/30`, `shadow-violet-500/35 ring-violet-500/20`.
  - *Remediation:* Converted to solid cards with neutral borders and standard `shadow-xs`.
- **`src/components/NotificationsPage.tsx`**:
  - *Previous Tells:* `border-l-4 border-l-blue-600` side-stripe on unread cards, `backdrop-blur-2xl`, `bg-violet-400` ping indicator.
  - *Remediation:* Removed colored side-stripe and unnecessary backdrop blur. Bound unread card border to `var(--be-border-subtle)`. Replaced ping indicator with palette accent.
- **`src/components/ProfileTab.tsx`**:
  - *Previous Tells:* `border-l-2 border-indigo-500` side-stripe, `text-indigo-400`.
  - *Remediation:* Replaced with neutral timeline border and champagne accent icon.
- **`src/components/FounderSection.tsx`**:
  - *Previous Tells:* `bg-slate-950/70 backdrop-blur-2xl border-white/10` default dark SaaS card, gradient cyan top line, `shadow-cyan-500/20` button.
  - *Remediation:* Bound card to `var(--be-bg-card)` and `var(--be-border-subtle)`. Removed top gradient line. Replaced CTA with solid slate/gold button.
- **`src/components/JobDetailDrawer.tsx`**:
  - *Previous Tells:* `shadow-md shadow-blue-500/20` on apply and analysis buttons.
  - *Remediation:* Replaced with standard `shadow-xs`.

---

## 3. Stylesheet Cleanups (`src/index.css`)

1. **Refactored `.glass-card` & `.glass-panel`**:
   - Removed universal `backdrop-filter: blur(16px)` from static content cards.
   - Tied background and border colors directly to `var(--be-bg-card)` and `var(--be-border-subtle)`.
2. **Cleaned Neumorphic Shadows**:
   - Removed simulated double-shadow offsets that caused visual mud in dark mode.
   - Replaced with subtle 1px border contrast and standardized elevation tokens.
3. **Bound Primary Buttons**:
   - `.be-btn-primary` now derives background and hover states from `--be-accent` and `--be-accent-hover` rather than hardcoded indigo/violet.

---

## 4. Verification & Validation Summary

- **P0 Findings:** 0 (100% eliminated).
- **Test Suite Pass Rate:** 560/560 tests passing (100%).
- **Build Quality:** Clean build (`npm run build`), 0 compiler warnings/errors.
