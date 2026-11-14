import crypto from 'crypto';
import {
  TranslationRequest,
  TranslationResult,
  LanguageDetectionResult,
  LibreTranslateHealth,
  TranslationUsageStats,
} from '../src/types/localization.ts';
import { LANGUAGE_CATALOGUE } from '../src/utils/languageCatalogue.ts';

// Configurable LibreTranslate Gateway Settings
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000';
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const REQUEST_TIMEOUT_MS = 6000;
const MAX_TEXT_LENGTH = 10000;

interface CacheEntry {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

class BackendTranslationService {
  private cache = new Map<string, CacheEntry>();
  private maxCacheEntries = 10000;
  private stats: TranslationUsageStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    charactersTranslated: 0,
    failedRequests: 0,
    topTargetLanguages: [],
  };
  private targetLanguageCounts: Record<string, number> = {};
  private knownPairs: Set<string> = new Set();
  private lastHealthCheck: number = 0;
  private isServiceAvailable: boolean = false;
  private lastLatencyMs: number = 0;

  constructor() {
    this.refreshAvailablePairs().catch(() => {});
  }

  private computeHash(text: string, sourceLang: string, targetLang: string): string {
    return crypto
      .createHash('sha256')
      .update(`${sourceLang}:${targetLang}:${text}`)
      .digest('hex');
  }

  /**
   * Discover available language pairs from LibreTranslate instance
   */
  async refreshAvailablePairs(): Promise<void> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(`${LIBRETRANSLATE_URL}/languages`, {
        headers: LIBRETRANSLATE_API_KEY ? { 'api-key': LIBRETRANSLATE_API_KEY } : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      this.lastLatencyMs = Date.now() - start;

      if (res.ok) {
        const langs = await res.json();
        this.knownPairs.clear();
        if (Array.isArray(langs)) {
          for (const l of langs) {
            if (l.targets && Array.isArray(l.targets)) {
              for (const tgt of l.targets) {
                this.knownPairs.add(`${l.code}->${tgt}`);
              }
            } else {
              // Assume bidirectional with major languages if list of objects
              this.knownPairs.add(`${l.code}->en`);
              this.knownPairs.add(`en->${l.code}`);
            }
          }
        }
        this.isServiceAvailable = true;
      } else {
        this.isServiceAvailable = false;
      }
    } catch {
      this.isServiceAvailable = false;
      this.lastLatencyMs = Date.now() - start;
    }
    this.lastHealthCheck = Date.now();
  }

  /**
   * Health Check Inspection
   */
  async getHealth(): Promise<LibreTranslateHealth> {
    if (Date.now() - this.lastHealthCheck > 30000) {
      await this.refreshAvailablePairs();
    }

    return {
      status: this.isServiceAvailable ? 'online' : 'offline',
      endpoint: LIBRETRANSLATE_URL,
      availablePairsCount: this.knownPairs.size,
      activeModels: Array.from(
        new Set(Array.from(this.knownPairs).map((p) => p.split('->')[0]))
      ),
      responseTimeMs: this.lastLatencyMs,
      totalCachedTranslations: this.cache.size,
      errorRatePercentage:
        this.stats.totalRequests > 0
          ? Math.round((this.stats.failedRequests / this.stats.totalRequests) * 100)
          : 0,
    };
  }

  /**
   * Get Usage Analytics
   */
  getUsage(): TranslationUsageStats {
    const top = Object.entries(this.targetLanguageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ...this.stats,
      topTargetLanguages: top,
    };
  }

  /**
   * Main Translation Workflow with Caching & Safe Fallbacks
   */
  async translate(req: TranslationRequest): Promise<TranslationResult> {
    this.stats.totalRequests++;

    const textToTranslate = Array.isArray(req.text) ? req.text.join('\n') : req.text;
    const targetLang = (req.targetLang || 'en').toLowerCase().split('-')[0];
    const sourceLang = (req.sourceLang || 'auto').toLowerCase().split('-')[0];

    // Enforce text bounds
    if (!textToTranslate || !textToTranslate.trim()) {
      return {
        translatedText: req.text,
        sourceLang: 'en',
        targetLang,
        fromCache: false,
        isMachineTranslated: false,
      };
    }

    const boundedText = textToTranslate.slice(0, MAX_TEXT_LENGTH);
    const hash = this.computeHash(boundedText, sourceLang, targetLang);

    // 1. Check in-memory cache
    if (this.cache.has(hash)) {
      this.stats.cacheHits++;
      const cached = this.cache.get(hash)!;
      return {
        translatedText: cached.translatedText,
        sourceLang: cached.sourceLang,
        targetLang: cached.targetLang,
        fromCache: true,
        isMachineTranslated: true,
      };
    }

    this.stats.cacheMisses++;
    this.stats.charactersTranslated += boundedText.length;
    this.targetLanguageCounts[targetLang] = (this.targetLanguageCounts[targetLang] || 0) + 1;

    // 2. Query LibreTranslate Gateway
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const payload: Record<string, any> = {
        q: boundedText,
        source: sourceLang,
        target: targetLang,
        format: req.format || 'text',
      };
      if (LIBRETRANSLATE_API_KEY) {
        payload.api_key = LIBRETRANSLATE_API_KEY;
      }

      const res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const translatedText = data.translatedText || boundedText;
        const detectedSource = data.detectedLanguage?.language || sourceLang;

        // Store in cache
        if (this.cache.size >= this.maxCacheEntries) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(hash, {
          translatedText,
          sourceLang: detectedSource,
          targetLang,
          timestamp: Date.now(),
        });

        this.isServiceAvailable = true;

        return {
          translatedText,
          sourceLang: detectedSource,
          targetLang,
          detectedSourceLang: detectedSource,
          fromCache: false,
          isMachineTranslated: true,
        };
      } else {
        this.stats.failedRequests++;
        console.warn(`[Translation Gateway] Upstream HTTP ${res.status}`);
      }
    } catch (err: any) {
      this.stats.failedRequests++;
      this.isServiceAvailable = false;
      // Do not crash: graceful degradation
    }

    // 3. Resilient Fallback: Return original text with warning flags
    return {
      translatedText: req.text,
      sourceLang,
      targetLang,
      fromCache: false,
      isMachineTranslated: false,
      serviceUnavailable: true,
    };
  }

  /**
   * Language Detection
   */
  async detect(text: string): Promise<LanguageDetectionResult> {
    if (!text || !text.trim()) {
      return { detectedLanguage: 'en', confidence: 1.0, reliable: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(`${LIBRETRANSLATE_URL}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text.slice(0, 1000) }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return {
            detectedLanguage: data[0].language,
            confidence: data[0].confidence || 0.9,
            reliable: (data[0].confidence || 0) > 0.5,
          };
        }
      }
    } catch {}

    return { detectedLanguage: 'en', confidence: 0.8, reliable: false };
  }

  /**
   * Purge Cache
   */
  purgeCache(): { purgedEntries: number } {
    const size = this.cache.size;
    this.cache.clear();
    return { purgedEntries: size };
  }
}

export const translationService = new BackendTranslationService();
