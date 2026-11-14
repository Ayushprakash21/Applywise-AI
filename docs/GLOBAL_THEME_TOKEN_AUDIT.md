# ApplyVise AI — Global Theme Token Audit

**Specification:** Black Elite Semantic Token System  
**Author:** Principal Frontend Architect & Design System Engineer  
**Date:** November 14, 2026  
**Status:** Approved & Implemented  
**Branch:** `feat/light-mode-architecture-repair`

---

## 1. Token Architecture Overview

The ApplyVise Black Elite theme engine utilizes a two-tier token architecture:
1. **Semantic Layer:** Abstract names representing UI roles (`--surface-primary`, `--text-primary`, `--border-subtle`, `--accent-primary`).
2. **Palette Layer:** Concrete hex color definitions mapped to 5 curated luxury palettes (`Ocean`, `Dune`, `Dusk`, `Silk`, `Aurora`) across both `dark` and `light` appearance modes.

To ensure backward compatibility with existing components while supporting modern design tokens, every palette exports 27 standardized CSS custom properties applied to the root element.

---

## 2. Complete 27-Token Specification

| Token CSS Variable | Semantic Purpose | Light Mode Value (Dune Default) | Dark Mode Value (Dune Default) | WCAG Contrast Role |
| :--- | :--- | :--- | :--- | :--- |
| `--app-bg` | Full viewport background | `#F5F3EE` (Warm Sand) | `#0B0C0E` (Obsidian) | Baseline |
| `--surface-primary` | Main content container | `#F5F3EE` | `#0E1013` | Layer 0 |
| `--surface-secondary`| Sidebar & Navigation | `#F0EDE5` (Soft Cream) | `#12151A` (Graphite) | Layer 1 |
| `--surface-elevated` | Modal dialogs, dropdowns | `#FFFFFF` (Pure White) | `#191D24` | Layer 2 |
| `--surface-card` | Content cards & widgets | `#FFFFFF` | `#14171C` | Layer 1 |
| `--surface-input` | Form controls, search bars | `#FFFFFF` | `#101318` | Interactive |
| `--surface-overlay` | Modal backdrops & scrims | `rgba(20,23,28,0.4)` | `rgba(0,0,0,0.75)` | Backdrop |
| `--text-primary` | Body text, descriptions | `#20242B` (Charcoal) | `#E4E1D9` (Warm Gray) | Text (Min 4.5:1) |
| `--text-secondary` | Subheadings, metadata | `#555C66` (Slate Muted) | `#9DA3AE` (Muted) | Secondary (Min 4.5:1)|
| `--text-muted` | Placeholders, inactive | `#7A828E` | `#636B78` | Inactive |
| `--text-disabled` | Disabled controls | `#A0A5AE` | `#454C57` | Disabled |
| `--text-heading` | Page titles, KPI numbers | `#191D24` (Deep Black) | `#F2F0EA` (Alabaster) | Heading (Min 7:1) |
| `--text-inverse` | Text on dark buttons | `#FFFFFF` | `#0B0C0E` | Contrast |
| `--border-subtle` | Dividers, card boundaries | `#DEDAD0` (Warm Border) | `rgba(255,255,255,0.08)`| Boundary (Min 3:1) |
| `--border-default` | Active borders, inputs | `#C8C3B8` | `#232832` | Boundary (Min 3:1) |
| `--border-strong` | Emphasized containers | `#B0AAA0` | `#333945` | Boundary |
| `--border-focus` | Keyboard focus ring | `#A78343` (Champagne Gold) | `#D4AF37` (Gold Accent) | Focus Indicator |
| `--accent-primary` | Primary CTA, active badges| `#A78343` | `#D4AF37` | Brand Primary |
| `--accent-hover` | Button hover state | `#8E6F37` | `#E5C358` | Brand Interaction |
| `--accent-subtle` | Badge background | `rgba(167,131,67,0.12)` | `rgba(212,175,55,0.15)` | Subtle Fill |
| `--accent-contrast` | Text inside accent pills | `#FFFFFF` | `#0B0C0E` | Accent Text |
| `--status-success` | Verified, online, safe | `#147A58` (Forest Emerald)| `#2BB673` (Mint Emerald) | Feedback (Min 4.5:1)|
| `--status-warning` | Pending, limit reached | `#9A6517` (Deep Amber) | `#E5A83B` (Vibrant Amber)| Feedback (Min 4.5:1)|
| `--status-danger` | Error, revoked, critical | `#B43D43` (Crimson) | `#EF5350` (Coral Red) | Feedback (Min 4.5:1)|
| `--status-info` | Information, notice | `#315E9C` (Cobalt) | `#4A90E2` (Azure) | Feedback (Min 4.5:1)|
| `--shadow-card` | Card elevation shadow | `0 2px 8px rgba(0,0,0,0.06)` | `0 4px 16px rgba(0,0,0,0.4)`| Elevation |
| `--shadow-elevated` | Modal/popover shadow | `0 8px 30px rgba(0,0,0,0.12)` | `0 12px 40px rgba(0,0,0,0.7)`| Elevation |

---

## 3. Curated 5-Palette Color Matrix

### 1. Ocean (Corporate Marine)
- **Primary Accent:** `#1E6B9B` (Light) / `#38BDF8` (Dark)
- **Secondary Accent:** `#2D88C4` (Light) / `#0284C7` (Dark)
- **Surface Tint:** Crisp cool porcelain (`#F4F6F9`) / Deep navy obsidian (`#0A0F17`)
- **Use Case:** High-clarity enterprise and executive candidate portfolios.

### 2. Dune (Signature Black Elite Luxury)
- **Primary Accent:** `#A78343` (Light Champagne) / `#D4AF37` (Dark Metallic Gold)
- **Secondary Accent:** `#8E6F37` (Light Ochre) / `#F59E0B` (Dark Amber)
- **Surface Tint:** Warm sand and ivory (`#F5F3EE`) / Pure matte carbon (`#0B0C0E`)
- **Use Case:** Flagship ApplyVise Black Elite executive brand experience.

### 3. Dusk (Amethyst Twilight)
- **Primary Accent:** `#7B4BB7` (Light Amethyst) / `#A855F7` (Dark Purple)
- **Secondary Accent:** `#9466D6` (Light Lilac) / `#C084FC` (Dark Violet)
- **Surface Tint:** Soft lilac mist (`#F7F5FA`) / Deep midnight plum (`#0E0C16`)
- **Use Case:** Creative and modern technology candidates.

### 4. Silk (Minimalist Platinum Monolith)
- **Primary Accent:** `#4B5563` (Light Slate) / `#E5E7EB` (Dark Platinum)
- **Secondary Accent:** `#6B7280` (Light Cool Gray) / `#9CA3AF` (Dark Silver)
- **Surface Tint:** Pure neutral alabaster (`#F7F7F8`) / Ultra-clean charcoal (`#0C0D0E`)
- **Use Case:** Distraction-free high-density analytical and research environments.

### 5. Aurora (Nordic Emerald)
- **Primary Accent:** `#1B7C60` (Light Emerald) / `#34D399` (Dark Mint)
- **Secondary Accent:** `#259B79` (Light Jade) / `#10B981` (Dark Green)
- **Surface Tint:** Fresh morning mist (`#F3F8F5`) / Deep spruce shadow (`#0A120E`)
- **Use Case:** Growth intelligence, sustainability, and fintech sectors.

---

## 4. Token Resolution Rules & DOM Implementation

When a user selects an appearance mode or curated palette:
1. `setThemePalette(paletteName, mode)` updates `localStorage` (`applyvise_be_palette` and `applyvise_be_mode`).
2. `applyThemeToDOM(paletteName, mode)` assigns:
   - Root dataset attributes: `data-be-appearance="light|dark"`, `data-be-palette="ocean|dune|dusk|silk|aurora"`, `data-theme-mode="light|dark"`.
   - Root CSS classnames: `.theme-black` (always retained for design system compatibility) and `.theme-black-light` (when in light mode).
   - Inlines all 27 standard semantic properties and all 10 legacy `--be-*` properties onto `document.documentElement.style`.
3. Changes apply synchronously across all open tabs, windows, and rendered components without requiring a page reload.
