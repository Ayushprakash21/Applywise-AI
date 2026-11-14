/**
 * ApplyVise AI — Universal Language Engine Types
 * Multiplatform Localization (Web, Android, iOS) & Dynamic Translation
 */

export type TextDirection = 'ltr' | 'rtl';

export type LanguagePublicationStatus = 'published' | 'beta' | 'in_review' | 'planned';

export type ScriptFamily =
  | 'Latin'
  | 'Devanagari'
  | 'Bengali'
  | 'Tamil'
  | 'Telugu'
  | 'Kannada'
  | 'Malayalam'
  | 'Gujarati'
  | 'Gurmukhi'
  | 'Arabic'
  | 'Odia'
  | 'CJK'
  | 'Hangul'
  | 'Thai'
  | 'Cyrillic';

export interface LanguageCatalogEntry {
  /** Standard BCP-47 / ISO locale tag (e.g. 'en-US', 'hi-IN', 'ar-SA') */
  code: string;
  /** ISO 639-1 two-letter code for LibreTranslate / Argos Translate (e.g. 'en', 'hi', 'ar') */
  iso639_1: string;
  /** Endonym / Native script representation (e.g. 'हिन्दी', 'العربية') */
  nativeName: string;
  /** English language name */
  englishName: string;
  /** Text direction */
  direction: TextDirection;
  /** Script Family */
  scriptFamily: ScriptFamily;
  /** UI Dictionary translation completeness percentage (0 - 100) */
  uiCompleteness: number;
  /** Whether UI is officially enabled */
  isUiEnabled: boolean;
  /** Whether LibreTranslate machine translation is verified for this language */
  isMachineTranslationSupported: boolean;
  /** Publication lifecycle status */
  status: LanguagePublicationStatus;
  /** Default Font Fallback stack suited for script rendering */
  fontFallback: string;
  /** Curated regional country flag or symbol */
  regionTag: string;
}

export interface UserLanguagePreferences {
  preferred_locale: string;
  fallback_locale: string;
  auto_detect_language: boolean;
  content_translation_enabled: boolean;
  translation_target_language: string;
  rtl_preference: 'auto' | 'ltr' | 'rtl';
  updated_at: string;
}

export interface TranslationRequest {
  text: string | string[];
  sourceLang?: string;
  targetLang: string;
  format?: 'text' | 'html';
  context?: 'job_description' | 'career_atlas' | 'interview' | 'copilot' | 'general';
}

export interface TranslationResult {
  translatedText: string | string[];
  sourceLang: string;
  targetLang: string;
  detectedSourceLang?: string;
  confidence?: number;
  fromCache: boolean;
  isMachineTranslated: boolean;
  serviceUnavailable?: boolean;
}

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  reliable: boolean;
}

export interface LibreTranslateHealth {
  status: 'online' | 'degraded' | 'offline';
  endpoint: string;
  version?: string;
  availablePairsCount: number;
  activeModels: string[];
  responseTimeMs: number;
  totalCachedTranslations: number;
  errorRatePercentage: number;
}

export interface TranslationUsageStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  charactersTranslated: number;
  failedRequests: number;
  topTargetLanguages: Array<{ language: string; count: number }>;
}
