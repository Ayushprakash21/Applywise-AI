import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LanguageCatalogEntry,
  UserLanguagePreferences,
  TranslationResult,
} from '../types/localization.ts';
import {
  LANGUAGE_CATALOGUE,
  DEFAULT_LANGUAGE_PREFERENCES,
  getLanguageMetadata,
  isRtlLocale,
} from '../utils/languageCatalogue.ts';
import { translateKey } from '../utils/i18n/dictionaries.ts';
import {
  formatDate as fmtDate,
  formatTime as fmtTime,
  formatNumber as fmtNum,
  formatPercent as fmtPct,
  formatCurrency as fmtCurr,
} from '../utils/i18n/formatters.ts';

export const LANGUAGE_CHANGE_EVENT = 'applyvise:language_changed';
const STORAGE_KEY_LOCALE = 'applyvise_preferred_locale';
const STORAGE_KEY_PREFS = 'applyvise_language_preferences';

export interface LanguageContextValue {
  currentLocale: string;
  metadata: LanguageCatalogEntry;
  isRtl: boolean;
  preferences: UserLanguagePreferences;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (newLocale: string) => Promise<void>;
  updatePreferences: (updates: Partial<UserLanguagePreferences>) => Promise<void>;
  formatDate: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (val: number, isRatio?: boolean) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;
  translateDynamicText: (
    text: string,
    context?: 'job_description' | 'career_atlas' | 'interview' | 'copilot' | 'general'
  ) => Promise<TranslationResult>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocale, setCurrentLocaleState] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_LOCALE);
        if (stored && LANGUAGE_CATALOGUE[stored]) return stored;
      } catch {}
    }
    return 'en-US';
  });

  const [preferences, setPreferencesState] = useState<UserLanguagePreferences>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_PREFS);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return { ...DEFAULT_LANGUAGE_PREFERENCES, preferred_locale: currentLocale };
  });

  const metadata = getLanguageMetadata(currentLocale);
  const isRtl = metadata.direction === 'rtl';

  // Apply HTML document attributes for accessibility and styling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLocale;
      document.documentElement.dir = metadata.direction;
      if (metadata.fontFallback) {
        document.documentElement.style.setProperty('--font-script-fallback', metadata.fontFallback);
      }
    }
  }, [currentLocale, metadata]);

  // Synchronize with external events (e.g. from mobile or other tabs)
  useEffect(() => {
    const handleLangEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ locale: string }>;
      if (customEvent.detail?.locale && customEvent.detail.locale !== currentLocale) {
        setCurrentLocaleState(customEvent.detail.locale);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLangEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLangEvent);
      }
    };
  }, [currentLocale]);

  const setLocale = useCallback(async (newLocale: string) => {
    const validEntry = getLanguageMetadata(newLocale);
    const targetLocale = validEntry.code;

    setCurrentLocaleState(targetLocale);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_LOCALE, targetLocale);
        const nextPrefs: UserLanguagePreferences = {
          ...preferences,
          preferred_locale: targetLocale,
          translation_target_language: targetLocale,
          updated_at: new Date().toISOString(),
        };
        window.localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(nextPrefs));
        setPreferencesState(nextPrefs);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { locale: targetLocale } })
      );
    }

    // Try synchronizing with backend preferences endpoint if authenticated
    try {
      if (typeof window !== 'undefined' && window.localStorage?.getItem('applyvise_token')) {
        await fetch('/api/user/language-preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${window.localStorage.getItem('applyvise_token')}`,
          },
          body: JSON.stringify({ preferred_locale: targetLocale }),
        });
      }
    } catch {
      // Offline fallback: retains local storage
    }
  }, [preferences]);

  const updatePreferences = useCallback(async (updates: Partial<UserLanguagePreferences>) => {
    const next: UserLanguagePreferences = {
      ...preferences,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setPreferencesState(next);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(next));
      } catch {}
    }

    if (updates.preferred_locale && updates.preferred_locale !== currentLocale) {
      await setLocale(updates.preferred_locale);
    }
  }, [preferences, currentLocale, setLocale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      return translateKey(currentLocale, key, params);
    },
    [currentLocale]
  );

  const formatDate = useCallback(
    (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      return fmtDate(date, currentLocale, options);
    },
    [currentLocale]
  );

  const formatTime = useCallback(
    (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      return fmtTime(date, currentLocale, options);
    },
    [currentLocale]
  );

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions) => {
      return fmtNum(num, currentLocale, options);
    },
    [currentLocale]
  );

  const formatPercent = useCallback(
    (val: number, isRatio?: boolean) => {
      return fmtPct(val, currentLocale, isRatio);
    },
    [currentLocale]
  );

  const formatCurrency = useCallback(
    (amount: number, currencyCode?: string) => {
      return fmtCurr(amount, currencyCode || 'USD', currentLocale);
    },
    [currentLocale]
  );

  // Dynamic Content Machine Translation Gateway
  const translateDynamicText = useCallback(
    async (
      text: string,
      context?: 'job_description' | 'career_atlas' | 'interview' | 'copilot' | 'general'
    ): Promise<TranslationResult> => {
      // If already in target locale or English, return original
      if (currentLocale === 'en-US' || !text || !text.trim()) {
        return {
          translatedText: text,
          sourceLang: 'en',
          targetLang: 'en',
          fromCache: false,
          isMachineTranslated: false,
        };
      }

      const targetIso = metadata.iso639_1;

      try {
        const response = await fetch('/api/translation/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            targetLang: targetIso,
            context: context || 'general',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (err) {
        console.warn('Machine translation service notice:', err);
      }

      // Graceful degradation fallback: show original text with metadata
      return {
        translatedText: text,
        sourceLang: 'en',
        targetLang: targetIso,
        fromCache: false,
        isMachineTranslated: false,
        serviceUnavailable: true,
      };
    },
    [currentLocale, metadata.iso639_1]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLocale,
        metadata,
        isRtl,
        preferences,
        t,
        setLocale,
        updatePreferences,
        formatDate,
        formatTime,
        formatNumber,
        formatPercent,
        formatCurrency,
        translateDynamicText,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback safe mock when used outside provider
    const meta = LANGUAGE_CATALOGUE['en-US'];
    return {
      currentLocale: 'en-US',
      metadata: meta,
      isRtl: false,
      preferences: DEFAULT_LANGUAGE_PREFERENCES,
      t: (key: string, params?: Record<string, string | number>) => translateKey('en-US', key, params),
      setLocale: async () => {},
      updatePreferences: async () => {},
      formatDate: (d) => fmtDate(d, 'en-US'),
      formatTime: (d) => fmtTime(d, 'en-US'),
      formatNumber: (n) => fmtNum(n, 'en-US'),
      formatPercent: (v, r) => fmtPct(v, 'en-US', r),
      formatCurrency: (a, c) => fmtCurr(a, c || 'USD', 'en-US'),
      translateDynamicText: async (t) => ({
        translatedText: t,
        sourceLang: 'en',
        targetLang: 'en',
        fromCache: false,
        isMachineTranslated: false,
      }),
    };
  }
  return context;
}

export const useTranslation = useLanguage;
