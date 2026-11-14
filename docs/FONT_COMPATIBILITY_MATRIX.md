# ApplyVise AI — Font Compatibility & Weight Mapping Matrix

## 1. Matrix Overview

This document specifies the exact weight availability, clamping rules, tracking overrides, and recommended use cases for each of the 10 supported font families in ApplyVise AI.

---

## 2. Comprehensive Compatibility Table

| Font Family | Category | Native Weights | Thin (100-300) | Regular (400) | Medium (500) | Semibold (600) | Bold (700) | Extrabold (800+) | Custom Tracking | Anti-Distortion Handling |
|---|---|---|---|---|---|---|---|---|---|---|
| **Poppins** | Geometric Sans | 300, 400, 500, 600, 700, 800 | 300 | 400 | 500 | 600 | 700 | 800 | Headings: -0.02em, Badges: +0.04em | Full native weight scale support. |
| **Roboto** | Neo-Grotesque | 300, 400, 500, 700, 900 | 300 | 400 | 500 | 500 | 700 | 900 | Headings: -0.015em, Badges: +0.04em | Maps semibold to 500 cleanly without faux-bolding. |
| **Lato** | Humanist Sans | 300, 400, 700, 900 | 300 | 400 | 400 | 700 | 700 | 900 | Body: +0.005em, Badges: +0.05em | Maps medium to 400 and semibold to 700. |
| **Montserrat** | Geometric Display | 300, 400, 500, 600, 700, 800 | 300 | 400 | 500 | 600 | 700 | 800 | Headings: -0.025em, Badges: +0.06em | Tight heading tracking enhances urban signage boldness. |
| **Oswald** | Condensed Gothic | 300, 400, 500, 600, 700 | 300 | 400 | 500 | 600 | 700 | 700 | Body: +0.025em, Badges: +0.08em | Body tracking expanded; extrabold clamped to 700. |
| **Raleway** | Elegant Sans | 300, 400, 500, 600, 700 | 300 | 400 | 500 | 600 | 700 | 700 | Headings: +0.01em, Badges: +0.07em | Open counters preserve airiness; extrabold clamped to 700. |
| **Libre Franklin** | Editorial Gothic | 300, 400, 500, 600, 700, 800 | 300 | 400 | 500 | 600 | 700 | 800 | Headings: -0.02em, Badges: +0.05em | Full native scale; classic American newsprint weight. |
| **Josefin Sans** | Geometric Vintage | 300, 400, 600, 700 | 300 | 400 | 400 | 600 | 700 | 700 | Headings: +0.02em, Badges: +0.08em | Maps medium to 400 and extrabold to 700. |
| **Kanit** | Modern Grotesque | 300, 400, 500, 600, 700, 800 | 300 | 400 | 500 | 600 | 700 | 800 | Headings: -0.015em, Badges: +0.05em | Full native scale; curved stroke endings. |
| **Poiret One** | Art Deco Display | 400 Only | 400 | 400 | 400 | 400 | 400 | 400 | Headings: +0.06em, Buttons: +0.08em | **Strict Clamping:** All weights clamped to 400. No synthetic bolding. |

---

## 3. Detailed Font Profiles

### 1. Poppins (Default System Font)
- **CSS Family:** `'Poppins', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Ideal For:** Primary application shell, complex analytics, table data, and forms.
- **Why Default:** Extremely legible x-height and neutral geometric warmth prevent cognitive fatigue during long job discovery sessions.

### 2. Roboto
- **CSS Family:** `'Roboto', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`
- **Ideal For:** Technical administration, system health graphs, and server log monitors.
- **Characteristics:** Neo-grotesque precision engineered for high pixel density.

### 3. Lato
- **CSS Family:** `'Lato', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Ideal For:** Executive career summaries, cover letter review panes, and human-resources correspondence.
- **Characteristics:** Classical proportion with warm, rounded letter terminals.

### 4. Montserrat
- **CSS Family:** `'Montserrat', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Ideal For:** High-impact landing banners, milestone achievements, and BLACK ELITE tier branding.
- **Characteristics:** High personality, wide capital letters, commanding visual identity.

### 5. Oswald
- **CSS Family:** `'Oswald', sans-serif`
- **Fallback:** `Impact, "Arial Narrow", sans-serif`
- **Ideal For:** Financial metrics, candidate match percentages, and dense tabular columns.
- **Characteristics:** Condensed width allows 25% more character density per line without wrapping. Positive tracking is applied on body copy to ensure legibility.

### 6. Raleway
- **CSS Family:** `'Raleway', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Ideal For:** Portfolio views, luxury career twin summaries, and profile identity cards.
- **Characteristics:** Distinctive cross-stroke "W" and refined geometric elegance.

### 7. Libre Franklin
- **CSS Family:** `'Libre Franklin', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Ideal For:** Truthful fact verification registries, legal terms, and audit trails.
- **Characteristics:** Authoritative journalistic gothic inspired by the 1912 American classic.

### 8. Josefin Sans
- **CSS Family:** `'Josefin Sans', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Ideal For:** Creative design roles, product strategy applications, and modern resumes.
- **Characteristics:** Vintage 1930s Scandinavian geometry with high aesthetic distinction.

### 9. Kanit
- **CSS Family:** `'Kanit', sans-serif`
- **Fallback:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Ideal For:** Fast-paced scanning, mobile device displays, and candidate status notifications.
- **Characteristics:** Modern rounded grotesque with excellent readability in compact viewports.

### 10. Poiret One
- **CSS Family:** `'Poiret One', cursive, sans-serif`
- **Fallback:** `"Century Gothic", "Apple Gothic", sans-serif`
- **Ideal For:** Prestige badges, executive hero titles, and ceremonial headers.
- **Characteristics:** Pure Art Deco display geometry with slender lines.
- **Critical Weight Governance:** Poiret One exists ONLY in native weight 400. In standard browsers, specifying `font-weight: 700` produces synthetic bolding—a crude raster smear that compromises legibility. The typography engine intercepts all weight requests (`300` through `800`) and resolves them strictly to `400`. Hierarchy is established through tracked uppercase transformation (`letter-spacing: 0.06em`), subtle amber or gold accents, and size contrast.
