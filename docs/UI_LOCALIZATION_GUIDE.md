# ApplyVise AI — UI Localization Guide

## 1. Developer Usage in React Components

All UI components have access to the translation context via `useLanguage()` or `useTranslation()`:

```tsx
import React from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';

export const MyComponent: React.FC = () => {
  const { t, formatDate, formatCurrency, currentLocale } = useLanguage();

  return (
    <div>
      <h1>{t('brand.name')}</h1>
      <p>{t('brand.tagline')}</p>
      
      {/* Parameter Interpolation */}
      <span>{t('language.incomplete_notice', { completeness: 95 })}</span>
      
      {/* Locale-Aware Formatting */}
      <span>{formatDate(new Date())}</span>
      <span>{formatCurrency(120000, 'USD')}</span>
    </div>
  );
};
```

---

## 2. Naming Conventions for Translation Keys

Keys follow hierarchical dot-notation:
- `brand.*` — Brand names, trademarks, universal taglines
- `common.*` — Actions, buttons, common states (save, cancel, edit, delete, status)
- `nav.*` — Navigation destinations (desk, autopilot, radar, control, atlas)
- `atlas.*` — Career Atlas terms (current_position, target_position, transferable_skills)
- `jobs.*` — Job board & search filters (all_openings, match_fit, remote, hybrid)
- `language.*` — Language selector strings and indicators
- `admin.*` — Administrative modules and controls

---

## 3. Strict Rules: What NOT to Translate

The following categories must NEVER be modified or translated:
1. **Candidate-Owned Facts:** Company names where candidate worked, school names, dates.
2. **Technical Identifiers:** Language names in code (`TypeScript`, `Node.js`, `Docker`, `PostgreSQL`).
3. **Employer Names & Job Board URLs:** Greenhouse/Lever endpoints.
4. **Monetary Currencies:** Currency ISO codes (`USD`, `EUR`, `INR`) and exact numbers.
