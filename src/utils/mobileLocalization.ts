/**
 * ApplyVise AI — Universal Mobile Localization Contract & SDK Adapter
 * Provides zero-dependency cross-platform bridging for React Native & Expo (Android / iOS)
 * Works symmetrically with the web runtime and shares the identical 30-language catalogue.
 */

import { LanguageCatalogEntry, UserLanguagePreferences } from '../types/localization.ts';
import {
  LANGUAGE_CATALOGUE,
  DEFAULT_LANGUAGE_PREFERENCES,
  getLanguageMetadata,
  isRtlLocale,
} from './languageCatalogue.ts';
import { DICTIONARIES, translateKey } from './i18n/dictionaries.ts';

export interface MobileStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface MobileLocaleDetector {
  getLocales: () => Array<{ languageCode: string; countryCode?: string }>;
}

export class UniversalMobileLocalizationManager {
  private currentLocale: string = 'en-US';
  private preferences: UserLanguagePreferences = DEFAULT_LANGUAGE_PREFERENCES;
  private storage: MobileStorageAdapter | null = null;
  private listeners: Array<(locale: string) => void> = [];

  constructor(storage?: MobileStorageAdapter) {
    if (storage) {
      this.storage = storage;
    }
  }

  /**
   * Initialize on Mobile App boot: checks storage -> detects system locale -> falls back to en-US
   */
  async initialize(detector?: MobileLocaleDetector): Promise<string> {
    try {
      if (this.storage) {
        const storedLocale = await this.storage.getItem('applyvise_preferred_locale');
        if (storedLocale && LANGUAGE_CATALOGUE[storedLocale]) {
          this.currentLocale = storedLocale;
          return this.currentLocale;
        }
      }

      // Auto-detect from mobile device OS (react-native-localize / expo-localization)
      if (detector) {
        const systemLocales = detector.getLocales();
        if (systemLocales && systemLocales.length > 0) {
          const sys = systemLocales[0];
          const candidateCode = sys.countryCode
            ? `${sys.languageCode}-${sys.countryCode.toUpperCase()}`
            : sys.languageCode;
          const match = getLanguageMetadata(candidateCode);
          if (match && match.code) {
            this.currentLocale = match.code;
            return this.currentLocale;
          }
        }
      }
    } catch (e) {
      console.warn('Mobile localization initialization fallback notice:', e);
    }

    this.currentLocale = 'en-US';
    return this.currentLocale;
  }

  getCurrentLocale(): string {
    return this.currentLocale;
  }

  getMetadata(): LanguageCatalogEntry {
    return getLanguageMetadata(this.currentLocale);
  }

  isRTL(): boolean {
    return isRtlLocale(this.currentLocale);
  }

  async setLocale(localeCode: string): Promise<void> {
    const validMeta = getLanguageMetadata(localeCode);
    this.currentLocale = validMeta.code;

    if (this.storage) {
      await this.storage.setItem('applyvise_preferred_locale', this.currentLocale);
      this.preferences.preferred_locale = this.currentLocale;
      this.preferences.updated_at = new Date().toISOString();
      await this.storage.setItem(
        'applyvise_language_preferences',
        JSON.stringify(this.preferences)
      );
    }

    // Notify registered React Native UI listeners
    this.listeners.forEach((fn) => fn(this.currentLocale));
  }

  addListener(listener: (locale: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  t(key: string, params?: Record<string, string | number>): string {
    return translateKey(this.currentLocale, key, params);
  }

  /**
   * Export all dictionary resources for mobile offline bundling or i18next integration
   */
  exportResourcesForI18next(): Record<string, { translation: Record<string, string> }> {
    const resources: Record<string, { translation: Record<string, string> }> = {};
    for (const [loc, dict] of Object.entries(DICTIONARIES)) {
      resources[loc] = { translation: dict };
    }
    return resources;
  }
}

export const mobileLocalization = new UniversalMobileLocalizationManager();
