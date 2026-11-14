# APPLYVISE AI — PLATFORM-WIDE UI READABILITY, DROPDOWN & RESPONSIVE AUDIT

**Target Repository:** `Ayushprakash21/Applywise-AI`  
**Dedicated Branch:** `fix/platform-ui-readability-responsive`  
**Audit Standard:** WCAG 2.2 AA (4.5:1 text contrast, 3:1 graphical controls, full keyboard accessibility)  
**Evaluator Roles:** Principal UI/UX Architect, Accessibility Lead, Frontend Systems Engineer

---

## 1. EVIDENCE AUDIT OF REPORTED SCREENSHOT DEFECTS

### Defect A: Career Momentum Dashboard — Dark Text on Dark Background
- **Screenshot Ref:** `media_1794682191647_ae1ebb9a.png`
- **Affected Route & Component:** Candidate Dashboard / Career Desk (`src/components/CareerMomentumCard.tsx`)
- **Severity:** P0 — Critical Accessibility & Contrast Failure
- **Visual Evidence:**
  - The card background was rendered in dark charcoal (`#15181E`) in Light Mode.
  - Heading "Career Momentum" and subtitle were rendered in dark charcoal (`#20242B`), producing an illegal contrast ratio of 1.1:1 (invisible).
  - Milestone numerical metrics ("1", "0", "0", "0/13") and labels ("Applications Prepared", "Submissions Recorded", etc.) were dark charcoal on dark charcoal.
  - Profile Depth badge (85%) was faint and unreadable.
- **Root Cause Analysis:**
  1. In `src/index.css`, a blunt selector `.theme-black [class*="rounded-3xl bg-white"]` targeted all rounded cards with `rounded-3xl bg-white/65`. Because `theme-black` is applied to root in both light and dark mode, the selector matched the card and set `background-color: var(--be-bg-modal, #15181E) !important;`.
  2. `--be-bg-modal` was not initialized in `src/utils/blackEliteTheme.ts`, causing it to fall back to `#15181E` (dark charcoal) in both light and dark mode.
  3. Light mode text safety rules (`[data-be-appearance="light"] .text-slate-900`) simultaneously forced text to `#20242B`, causing dark text to render on a dark background.
  4. `CareerMomentumCard.tsx` lacked explicit semantic token bindings.

---

### Defect B: Recruiter Review — Application Dropdown Unreadable
- **Screenshot Ref:** `media_1794682196664_f75b2057.png`
- **Affected Route & Component:** Recruiter Review (`src/components/RecruiterReview.tsx`) & Universal Select System (`src/components/ui/SelectSystem.tsx`)
- **Severity:** P0 — Critical Dropdown Legibility & Contrast Defect
- **Visual Evidence:**
  - Trigger button was styled with pitch-black background (`#0D1014`) and gold border.
  - The popup dropdown menu was portaled to `document.body` and styled with beige/white card background (`#FAF8F5`).
  - Option items used pale cream and gold text (`#E5E1D8`, `#E6C78B`) on a beige/white background, rendering text invisible (contrast ratio 1.2:1).
  - Selected checkmark and hovered states were poorly differentiated.
- **Root Cause Analysis:**
  1. In `src/components/ui/SelectSystem.tsx`, `detectResolvedTheme()` checked `document.body.classList.contains('theme-black')`. Because `theme-black` is present on `body` in both light and dark modes, it always returned `'black-elite'`.
  2. In light mode, `src/index.css` rules neutralized the portaled menu's background to `#FAF8F5`, but did not change the hardcoded light text classes (`text-[#E5E1D8]`), producing white-on-white text.
  3. `SelectSystem.tsx` did not bind to semantic CSS variables, causing palette changes to fail.
  4. Options lacked `title` tooltips for truncated role titles.

---

### Defect C: Language Selector — Breaking Modal Workspace Overlay
- **Screenshot Ref:** `media_1794682201523_634055b7.jpg`
- **Affected Route & Component:** Workspace Layout, Resume Studio, Profile Identity Component (`src/components/LanguageSelector.tsx`, `src/components/ProfileIdentityComponent.tsx`)
- **Severity:** P1 — Severe Layout & Usability Obstruction
- **Visual Evidence:**
  - An oversized centered modal overlay (`max-w-xl`, 85vh) obstructed Resume Studio and the candidate workspace.
  - Profile identity dropdown contained an embedded 6-button language grid and an "All 30 World Languages..." button that triggered the modal overlay.
- **Root Cause Analysis:**
  1. Language switching lacked a persistent, compact, accessible trigger in the global application header.
  2. Full 30-language catalogue was exclusively accessible via a centered modal dialog that captured screen focus.

---

### Defect D: Global Search Bar — Nested Rectangular Border & Low Contrast
- **Screenshot Ref:** `media_1794682185898_ab902cd7.png`
- **Affected Route & Component:** Global Header (`src/components/GlobalSearchBar.tsx`)
- **Severity:** P1 — Visual Polish & Header Inconsistency
- **Visual Evidence:**
  - A faint rectangular outline appeared inside the rounded search pill around the input field.
  - Search icon and placeholder text had insufficient contrast (< 2.5:1).
  - `CTRL K` shortcut badge had faint contrast and inconsistent styling.
  - Control height was 36px (`h-9`), misaligned with the 40px (`h-10`) header controls.
- **Root Cause Analysis:**
  1. In `src/index.css`, blunt selectors `.theme-black input` and `[data-be-appearance="light"] input` forced `background-color: #FFFFFF !important; border: 1px solid ... !important;` on all input tags, injecting an opaque rectangular box inside the transparent input.
  2. Height was set to `h-9` rather than the standardized `h-10`.

---

### Defect E: Homepage Zero-Hallucination Comparison — Dark Text on Dark Navy Column
- **Screenshot Ref:** `media_1794686052923_228c99bb.png`
- **Affected Route & Component:** Homepage (`src/components/LandingPage.tsx` Section D: `#integrity`)
- **Severity:** P0 — Critical Landing Page Readability & Brand Standard Failure
- **Visual Evidence:**
  - The comparison table's right-hand column, "APPLYVISE AI ENGINE", used a dark navy background (`#0B1528`).
  - Column row headings ("WORK EXPERIENCE INTEGRITY", "JOB SOURCING AUTHENTICITY", "MATCH TRANSPARENCY", "SUBMISSION ACCOUNTABILITY") rendered in dark blue (`#1D4ED8` / `#2563EB`) against dark navy (contrast ratio 1.1:1).
  - Supporting descriptions under every heading rendered in dark slate (`#1E293B`) against dark navy (contrast ratio 1.2:1).
  - Check icon and column header lacked independent high-contrast luminous styling.
- **Root Cause Analysis:**
  1. In `src/components/LandingPage.tsx`, the right column used `text-slate-800 bg-blue-50/20` and `text-blue-600` for titles.
  2. In `src/index.css`, `.theme-black [class*="bg-blue-50"]` turned `bg-blue-50/20` into semi-transparent navy over dark base surfaces.
  3. Light mode paragraph rules (`.theme-black-light p { color: var(--be-text-secondary, #555C66) !important; }`) indiscriminately overrode text colors inside elements that were intentionally dark surfaces.
  4. The container lacked an explicit `data-theme-surface="dark"` isolation boundary.
  5. The Hero section lacked dynamic `--be-bg-canvas` binding, causing text flattening in dark mode.

---

## 2. COMPREHENSIVE PLATFORM-WIDE AUDIT ACROSS WORKSPACES

| Workspace | Module / Screen | Audit Findings | Status |
| :--- | :--- | :--- | :--- |
| **Public / Home** | Zero-Hallucination | ApplyVise AI Engine column had unreadable dark text on dark navy; fixed via `data-theme-surface="dark"` and luminous foreground tokens (`text-sky-300`, `text-slate-100`, `text-white`). | **AUDITED & FIXED** |
| **Public / Home** | Hero Section & CTAs | Hero background bound to `--be-bg-canvas`; CTA banner button updated to `#0F172A` on `#FFFFFF` (contrast 18.5:1). | **AUDITED & FIXED** |
| **Public / Home** | Live Vacancies | Vacancy cards audited across light and dark modes; text hierarchy verified. | **AUDITED & PASSED** |
| **Public / Home** | Founder Section | Added dynamic theme detection so dark/light adapts seamlessly across palettes. | **AUDITED & FIXED** |
| **Candidate** | Career Desk | Career Momentum card text unreadable; fixed background token conflict. | **AUDITED & FIXED** |
| **Candidate** | Recruiter Review | SearchableSelect dropdown unreadable in light mode; fixed theme resolution. | **AUDITED & FIXED** |
| **Candidate** | Resume Studio | Obstructed by floating language modal; migrated to header selector. | **AUDITED & FIXED** |
| **Candidate** | Header Navigation | Search bar rectangular border; added transparent input override. | **AUDITED & FIXED** |
| **Candidate** | Opportunity Radar | High matches cards bound to semantic tokens; contrast verified. | **AUDITED & PASSED** |
| **Candidate** | Application Control | Status transition dropdowns and filter selectors verified. | **AUDITED & PASSED** |
| **Candidate** | Interview Studio | Category and format select dropdowns verified in both modes. | **AUDITED & PASSED** |
| **Candidate** | Career Atlas 2.0 | Domain exploration dropdowns verified with full keyboard navigation. | **AUDITED & PASSED** |
| **Candidate** | AI HR Outreach | Mailbox select and country filters verified across all palettes. | **AUDITED & PASSED** |
| **Admin** | Admin Console | Role select, user filters, and GCDE connector dropdowns verified. | **AUDITED & PASSED** |
| **Admin** | User Provisioning | Multi-select and tier provisioning dropdowns verified. | **AUDITED & PASSED** |
| **Shared** | Modal System | Dialog surfaces now strictly bound to `--be-bg-modal`. | **AUDITED & FIXED** |
