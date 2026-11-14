import {
  TranslationRequest,
  TranslationResult,
  LanguageDetectionResult,
  LibreTranslateHealth,
  TranslationUsageStats,
} from '../src/types/localization.ts';

const REQUEST_TIMEOUT_MS = 6000;
const MAX_TEXT_LENGTH = 10000;

interface CacheEntry {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export class WorkerTranslationService {
  private cache = new Map<string, CacheEntry>();
  private maxCacheEntries = 5000;
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
  private upstreamUrl: string = 'http://localhost:5000';
  private apiKey: string = '';

  constructor(env?: any) {
    if (env?.LIBRETRANSLATE_URL) {
      this.upstreamUrl = env.LIBRETRANSLATE_URL;
    }
    if (env?.LIBRETRANSLATE_API_KEY) {
      this.apiKey = env.LIBRETRANSLATE_API_KEY;
    }
  }

  private async computeHash(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${sourceLang}:${targetLang}:${text}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async refreshAvailablePairs(): Promise<void> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(`${this.upstreamUrl}/languages`, {
        headers: this.apiKey ? { 'api-key': this.apiKey } : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      this.lastLatencyMs = Date.now() - start;

      if (res.ok) {
        const langs: any = await res.json();
        this.knownPairs.clear();
        if (Array.isArray(langs)) {
          for (const l of langs) {
            if (l.targets && Array.isArray(l.targets)) {
              for (const tgt of l.targets) {
                this.knownPairs.add(`${l.code}->${tgt}`);
              }
            } else {
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

  async getHealth(): Promise<LibreTranslateHealth> {
    if (Date.now() - this.lastHealthCheck > 30000) {
      await this.refreshAvailablePairs();
    }

    return {
      status: this.isServiceAvailable ? 'online' : 'offline',
      endpoint: this.upstreamUrl,
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

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    this.stats.totalRequests++;

    const textToTranslate = Array.isArray(req.text) ? req.text.join('\n') : req.text;
    const targetLang = (req.targetLang || 'en').toLowerCase().split('-')[0];
    const sourceLang = (req.sourceLang || 'auto').toLowerCase().split('-')[0];

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
    const hash = await this.computeHash(boundedText, sourceLang, targetLang);

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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const payload: Record<string, any> = {
        q: boundedText,
        source: sourceLang,
        target: targetLang,
        format: req.format || 'text',
      };
      if (this.apiKey) {
        payload.api_key = this.apiKey;
      }

      const res = await fetch(`${this.upstreamUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const translatedText = data.translatedText || boundedText;
        const detectedSource = data.detectedLanguage?.language || sourceLang;

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
      }
    } catch {
      this.stats.failedRequests++;
      this.isServiceAvailable = false;
    }

    return {
      translatedText: req.text,
      sourceLang,
      targetLang,
      fromCache: false,
      isMachineTranslated: false,
      serviceUnavailable: true,
    };
  }

  async detect(text: string): Promise<LanguageDetectionResult> {
    if (!text || !text.trim()) {
      return { detectedLanguage: 'en', confidence: 1.0, reliable: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(`${this.upstreamUrl}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text.slice(0, 1000) }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
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

  purgeCache(): { purgedEntries: number } {
    const size = this.cache.size;
    this.cache.clear();
    return { purgedEntries: size };
  }
}
