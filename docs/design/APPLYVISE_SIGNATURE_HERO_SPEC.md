# APPLYVISE AI — SIGNATURE BRAND EXPERIENCE & HOMEPAGE HERO SPECIFICATION

## 1. Executive Summary & Design Challenge

ApplyVise AI is an intelligent Career Operating System engineered to organize, verify, and accelerate professional careers. It stands in direct contrast to conventional generative AI job tools that fabricate resumes, inflate scores, and flood applicant tracking systems (ATS) with hallucinated spam.

### The Problem with Previous Implementations
- **Generic AI SaaS Paradigm**: The conventional left-column headline, right-column pseudo-dashboard UI with artificial statistic pills ("94% Match", "100% Accuracy") felt clinical, fabricated, and forgettable.
- **Protocol AI Tropes Rejection**: Protocol's aesthetic (pitch-black background, fiery orange cave portal, shadowy lone figure ascending stairs toward a blinding light, floating stock tickers) is high-drama sci-fi, but impersonal, alienating, and disconnected from genuine professional dignity.
- **The ApplyVise Opportunity**: To craft a **signature, original, human-centered brand experience** that evokes ambition, quiet confidence, mathematical clarity, and authentic career progress.

---

## 2. Strict Design Principles & Anti-Patterns Rejected

| Principle | Rejected Anti-Pattern | ApplyVise Signature Standard |
| :--- | :--- | :--- |
| **Visual Metaphor** | Sci-Fi cave portals, glowing monoliths, neon wireframes | Architectural **Living Career Dossier** opening outward to real market horizons |
| **Atmosphere & Lighting** | Pitch-black with neon orange / violet laser beams | Warm champagne, ivory, executive deep slate, and hand-finished bronze gold |
| **Data Integrity** | Fabricated "94% Match" pills and fake candidate avatars | Verified Fact Registry: chronological truth, zero-hallucination constraint |
| **Typography** | Generic tech sans-serif screaming hyperbole | Editorial typography: commanding display headlines paired with grounded human prose |
| **Search Gateway** | Buried search bar or intrusive modal | Integrated responsive search capsule with instant role tags |
| **Theme Fidelity** | Dark mode leakage into light mode, unreadable contrast | Full bilateral token integration: `--be-bg-canvas`, `--be-bg-card`, `--be-accent` |

---

## 3. Creative Direction: Exploration of Three Concepts

### Concept A: The Career Continuum
- **Premise**: An architectural linear timeline representing professional history evolving into horizon opportunities.
- **Visuals**: A horizontal architectural datum line that splits into diverging career paths, showing verified milestones anchoring each branch.
- **Critique**: Strong and structural, but overly horizontal and can feel technical rather than emotional.

### Concept B: The Next Chapter (Selected Signature Direction)
- **Premise**: An editorial, tactile, deeply human visual experience centered on career transformation. A candidate's real-world history is not mere data points; it is a hard-won, verified life story deserving of an elevated future.
- **Visual Metaphor**: **The Living Career Dossier & Horizon Portal** — A sculpted, dimensional dossier of verified human experience (chronological milestones, proven capabilities, architectural standards) radiating forward into live, verified market demand.
- **Atmospheric Palette**: 
  - *Light Mode*: Warm Alabaster/Ivory canvas (`#F5F3EE`), Crisp Porcelain cards (`#FFFFFF`), Deep Ink Slate text (`#191D24`), Brushed Bronze/Warm Gold accents (`#A78343`).
  - *Dark Mode*: Obsidian Slate canvas (`#0F1318`), Graphite card surfaces (`#161B22`), Champagne Gold accents (`#C6A66A`), Radiant Sky highlights (`#7DD3FC`).
- **Emotional Resonance**: Dignity, Ambition, Possibility, Grounded Truth.

### Concept C: The Opportunity Landscape
- **Premise**: A 3D topographical map of skills and market demand contours.
- **Visuals**: Contour elevation lines representing experience depth, intersecting with glowing opportunity coordinates.
- **Critique**: Visually striking, but risks drifting into abstract geography rather than candidate agency.

---

## 4. Architectural Anatomy: The Living Career Dossier

The central centerpiece of the redesigned hero is an architectural, multi-dimensional stage that demonstrates the **Four Operating Dimensions** of ApplyVise without synthetic fluff:

```
+-----------------------------------------------------------------------------------+
|  [● Live System Status] APPLYVISE AI · UNIFIED CAREER OPERATING SYSTEM             |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   Your Career.                                                                    |
|   Intelligently Orchestrated.                                                     |
|                                                                                   |
|   Bring your professional experience, skills, opportunities and applications     |
|   into one intelligent career workspace. Grounded in mathematical truth.          |
|                                                                                   |
|   [ Build My Career Strategy -> ]    [ Explore the Platform (Compass) ]           |
|                                                                                   |
|   [ Search by title, skill, or role...                    ] [ Find Jobs ]         |
|   Popular: Software Engineer · Product Manager · Data Analyst · DevOps           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   THE CAREER OPERATING SYSTEM ARCHITECTURE (Living Dossier Stage)                 |
|   +-------------------+ +-------------------+ +-------------------+ +------------+
|   | 01 Experience     | | 02 Competency     | | 03 Opportunity    | | 04 Control |
|   | Architecture      | | Modeling          | | Ingestion         | | (Docs/ATS) |
|   +-------------------+ +-------------------+ +-------------------+ +------------+
|   +-----------------------------------------------------------------------------+ |
|   | ACTIVE DIMENSION: Verified Operating Contract & Fact Grounding Matrix       | |
|   | · Master Profile Grounding       · Direct ATS Connectors (Greenhouse/Lever) | |
|   | · System Architecture Vector     · Native DOCX ATS Formatting               | |
|   | · Truthfulness Guarantee         · Mathematical Fact Grounding Standard     | |
|   +-----------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 5. Token & Theme Integration Matrix

All elements bind dynamically to the Black Elite / Semantic Token architecture:

| Component Token | Light Mode Value | Dark Mode Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--be-bg-canvas` | `#F5F3EE` (Ivory Canvas) | `#0F1318` (Obsidian Canvas) | Hero background surface |
| `--be-bg-card` | `#FFFFFF` (Porcelain Card) | `#161B22` (Graphite Card) | Primary dossier surface |
| `--be-bg-elevated` | `#FAF8F5` (Warm Cream) | `#1C2128` (Charcoal Slate) | Secondary contract card |
| `--be-border-subtle`| `#DEDAD0` (Warm Sand) | `#30363D` (Subtle Muted Line)| Architectural borders |
| `--be-accent` | `#A78343` (Brushed Gold) | `#C6A66A` (Champagne Gold) | Primary brand accent |
| `--be-text-primary` | `#191D24` (Deep Ink) | `#F0F6FC` (Luminous White) | Main headings & titles |
| `--be-text-secondary`| `#555C66` (Slate Muted)| `#8B949E` (Neutral Gray) | Editorial body paragraphs |

---

## 6. Motion & Accessibility Standards

1. **Reduced Motion Compliance**: Evaluates `window.matchMedia('(prefers-reduced-motion: reduce)')`. When active, all ambient pulses and transitions collapse to zero duration.
2. **Contrast Standards**: WCAG 2.2 AA compliant across all text, borders, and interactive buttons (minimum 4.5:1 for body, 3:1 for large display text and controls).
3. **Responsive Stacking**: Fluid flex-column stacking below 640px viewport width, full single-row integration on tablet and desktop.
4. **Zero Layout Shift (CLS)**: Fixed minimum aspect ratios and dimension bounding boxes prevent jumping during tab switching.

---

## 7. Quality Assurance & Regression Constraints

- **Strict Test Passing**: All 634 test cases in the test suite must pass without regression.
- **Zero Fabrication**: No synthetic match percentages ("94% Match") or fake candidate cards.
- **No Cloudflare Deployment / No Main Branch Merge**: Development and verification confined strictly to `feat/applyvise-signature-brand-experience`.
