# ApplyVise AI — Global Admin Sidebar Architecture & Implementation

## 1. Executive Summary

This document details the frontend architecture, design system specifications, and implementation of the **Executive Vertical Admin Sidebar** for ApplyVise AI. The horizontal header tabs previously present across the Admin Console have been replaced by a structured vertical navigation system inspired by the candidate workspace and art-directed in luxury BLACK ELITE tokens.

---

## 2. Navigation Architecture & Hierarchical Grouping

All 10 administrative modules are organized into 4 distinct functional groups:

```
├── Group A: Command Center
│   └── Overview & KPIs (`overview`) [admin-tab-overview]
│
├── Group B: Intelligence & Discovery
│   ├── Global Career Discovery Engine (`sources`) [admin-tab-sources] (GCDE Badge)
│   ├── HR Discovery Diagnostics (`hr_discovery`) [admin-tab-hr-discovery]
│   └── ApplyVise Growth Engine (`growth_engine`) [admin-tab-growth-engine] (AI MKTG Badge)
│
├── Group C: User Management
│   ├── Users & Roles (`users`) [admin-tab-users]
│   ├── User Provisioning (`provisioning`) [admin-tab-provisioning]
│   └── Founder Profile (`founder`) [admin-tab-founder]
│
└── Group D: Operations & Security
    ├── Resume Operations (`resumes`) [admin-tab-resumes]
    ├── Security & Audit Trail (`audit`) [admin-tab-audit]
    └── System Health & Edge (`system`) [admin-tab-system]
```

### Invariant Preservation
- **DOM Order Invariant:** `overviewIdx < sourcesIdx && sourcesIdx < usersIdx` is strictly maintained to satisfy existing automated test contracts.
- **Button IDs:** All 10 element IDs (`admin-tab-*`) remain identical, preserving accessibility bindings and automated test locators.
- **Touch Targets:** All buttons enforce `min-h-[38px]`, meeting WCAG 2.1 AA touch target standards.
- **Active State:** Features a signature left gold indicator bar (`w-1 rounded-full bg-[#C6A66A]`), `#191D23` elevated background, and subtle gold border highlight (`border-[rgba(198,166,106,0.40)]`).

---

## 3. Sidebar Collapse & Expansion Mechanics

The sidebar features a collapsible state with smooth transitions:

| State | Width Class | Visual Presentation | Interaction |
|---|---|---|---|
| **Expanded** | `w-68` (272px) | Group headers, full module titles, status badges (`GCDE`, `AI MKTG`), and active indicators. | Standard click navigation. |
| **Collapsed** | `w-20` (80px) | Centered icon-only mode with active glowing pill indicator. | Native tooltip with module title on hover. |

- **Toggle Control:** Accessible circular floating button positioned on the right sidebar border (`-right-3 top-6 w-6 h-6 rounded-full bg-[#191D23] border border-[rgba(255,255,255,0.14)]`). Uses `ChevronLeft` when expanded and `ChevronRight` when collapsed.
- **Persistence:** Saved in `localStorage` under `applyvise_admin_sidebar_collapsed`. Restored synchronously on component mount without layout shift.

---

## 4. Mobile & Tablet Responsiveness

On viewports below `lg` (< 1024px):
1. **Header Toggle Button:** A hamburger menu button (`Menu` icon) appears in the top header.
2. **Slide-Over Drawer:** Clicking opens a modal slide-over navigation drawer with backdrop blur (`fixed inset-0 bg-black/75 backdrop-blur-sm`).
3. **Quick-Switcher Bar:** In `<main>`, a responsive module switcher containing `id="admin-mobile-nav-select"` with `SearchableSelect` allows direct one-tap section switching without opening the drawer.
4. **Flex-Wrap Container:** The `flex flex-wrap items-center gap-1.5 text-xs` container ensures no horizontal clipping occurs on narrow devices (360px–640px).

---

## 5. Route & History Synchronization

Selecting an administrative module synchronizes with browser URL history without causing page reloads:
- **GCDE (`sources`):** Triggers `onNavigateRoute('/admin/gcde')` or `window.history.pushState({}, '', '/admin/gcde')`.
- **Growth Engine (`growth_engine`):** Triggers `onNavigateRoute('/admin/growth-engine')` or `window.history.pushState({}, '', '/admin/growth-engine')`.
- **Core Modules (`overview`, `users`, `audit`, etc.):** Triggers `onNavigateRoute('/admin')` or `window.history.pushState({}, '', '/admin')`.
- **Popstate Listener:** Listens to browser `popstate` events so back/forward buttons seamlessly switch active tabs.

---

## 6. Luxury BLACK ELITE Visual Tokens

The Admin Console is permanently art-directed in the BLACK ELITE executive theme:
- Primary Background: `#090A0C`
- Top Header & Sidebar Surface: `#111318`
- Elevated Card / Active Tab Surface: `#191D23`
- Default Text / Headings: `#F2F0EA`
- Secondary / Muted Text: `#C0BDB5` / `#92949A`
- Signature Gold Accent: `#C6A66A`
- Border Lines: `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.14)`
- Active Pill Ring: `rgba(198, 166, 106, 0.20)`
