# ApplyVise AI — Mobile Application Language Integration (Android & iOS)

**Framework:** React Native / Expo Compatible  
**Architecture Lead:** Mobile Engineering & Internationalization Lead  
**Module:** [`src/utils/mobileLocalization.ts`](file:///d:/ANtigravity/applywise%20AI/src/utils/mobileLocalization.ts)

---

## 1. Zero-Friction Mobile SDK Bridge

The Universal Mobile Localization Manager provides symmetric language handling across iOS and Android without webview dependencies:

```typescript
import { mobileLocalization } from './src/utils/mobileLocalization.ts';

// 1. Initialize on mobile app startup with native locale detector
await mobileLocalization.initialize({
  getLocales: () => [{ languageCode: 'hi', countryCode: 'IN' }]
});

// 2. Read current localized string
const label = mobileLocalization.t('nav.desk'); // 'करियर डेस्क'

// 3. Register UI re-render listener
const unsubscribe = mobileLocalization.addListener((newLocale) => {
  console.log('Mobile locale switched to:', newLocale);
});
```

---

## 2. Cross-Device Preference Synchronization

1. **Local Instant Startup:**
   - Locale preferences are cached in mobile persistent storage (`AsyncStorage` / `SecureStore`).
   - The app boots immediately in the cached locale without waiting for a network handshake.

2. **Authenticated Backend Sync:**
   - Upon authentication, the mobile app fetches `/api/user/language-preferences`.
   - If the candidate changed their language on the web platform, the mobile app automatically aligns.
   - If changed on mobile, `PUT /api/user/language-preferences` updates the web workspace in real time.
