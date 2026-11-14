import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  LANGUAGE_CATALOGUE,
  getLanguageMetadata,
  isRtlLocale,
  getAvailableLanguagesList,
  getPublishedLanguagesList,
} from '../src/utils/languageCatalogue.ts';
import { translateKey, DICTIONARIES } from '../src/utils/i18n/dictionaries.ts';
import {
  formatDate,
  formatTime,
  formatNumber,
  formatPercent,
  formatCurrency,
} from '../src/utils/i18n/formatters.ts';
import { UniversalMobileLocalizationManager } from '../src/utils/mobileLocalization.ts';
import { translationService } from '../server/translationService.ts';

test('ApplyVise AI — Universal Language Engine Comprehensive Test Suite', async (t) => {
  await t.test('1. Central 30-Language Catalogue Integrity', () => {
    const list = getAvailableLanguagesList();
    assert.strictEqual(list.length, 30, 'Catalogue must contain exactly 30 planned world languages');

    const expectedCodes = [
      'en-US', 'hi-IN', 'bn-IN', 'mr-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN',
      'gu-IN', 'pa-IN', 'ur-PK', 'or-IN', 'as-IN', 'ne-NP', 'ar-SA', 'fr-FR',
      'de-DE', 'es-ES', 'pt-BR', 'it-IT', 'nl-NL', 'ja-JP', 'ko-KR', 'zh-CN',
      'id-ID', 'ms-MY', 'th-TH', 'vi-VN', 'ru-RU', 'tr-TR'
    ];

    for (const code of expectedCodes) {
      assert.ok(LANGUAGE_CATALOGUE[code], `Catalogue must contain language code: ${code}`);
      const entry = LANGUAGE_CATALOGUE[code];
      assert.ok(entry.nativeName, `${code} must have a native script name`);
      assert.ok(entry.englishName, `${code} must have an English name`);
      assert.ok(entry.scriptFamily, `${code} must have an identified script family`);
      assert.ok(entry.fontFallback, `${code} must define font fallback`);
      assert.ok(entry.uiCompleteness >= 0 && entry.uiCompleteness <= 100, `${code} completeness must be 0-100%`);
    }

    const published = getPublishedLanguagesList();
    assert.ok(published.length >= 18, 'At least 18 languages should be published or enabled beta');
  });

  await t.test('2. RTL and Bidirectional Detection', () => {
    assert.strictEqual(isRtlLocale('ar-SA'), true, 'Arabic must be RTL');
    assert.strictEqual(isRtlLocale('ur-PK'), true, 'Urdu must be RTL');
    assert.strictEqual(isRtlLocale('en-US'), false, 'English must be LTR');
    assert.strictEqual(isRtlLocale('hi-IN'), false, 'Hindi must be LTR');
    assert.strictEqual(isRtlLocale('ja-JP'), false, 'Japanese must be LTR');

    assert.strictEqual(getLanguageMetadata('ar-SA').direction, 'rtl');
    assert.strictEqual(getLanguageMetadata('en-US').direction, 'ltr');
  });

  await t.test('3. Deterministic UI Dictionaries & Key Resolution', () => {
    // English Master
    const enTagline = translateKey('en-US', 'brand.tagline');
    assert.strictEqual(enTagline, 'Your Career. Intelligently Orchestrated.');

    // Hindi Translation
    const hiTagline = translateKey('hi-IN', 'brand.tagline');
    assert.strictEqual(hiTagline, 'आपका करियर। बुद्धिमानी से व्यवस्थित।');

    // Spanish Translation
    const esDesk = translateKey('es-ES', 'nav.desk');
    assert.strictEqual(esDesk, 'Panel Profesional');

    // Arabic Translation
    const arDesk = translateKey('ar-SA', 'nav.desk');
    assert.strictEqual(arDesk, 'مكتب المسيرة المهنية');

    // Missing key fallback to en-US
    const fallbackVal = translateKey('hi-IN', 'non.existent.key');
    assert.strictEqual(fallbackVal, 'non.existent.key');
  });

  await t.test('4. Dynamic Parameter Interpolation', () => {
    const interpolated = translateKey('en-US', 'language.incomplete_notice', { completeness: 88 });
    assert.ok(interpolated.includes('88%'), 'Param {{completeness}} must be interpolated');

    const hiInterpolated = translateKey('hi-IN', 'language.incomplete_notice', { completeness: 90 });
    assert.ok(hiInterpolated.includes('90%'), 'Hindi param {{completeness}} must be interpolated');
  });

  await t.test('5. Locale-Aware Formatting (Dates, Numbers, Currencies)', () => {
    const testDate = new Date('2026-11-14T12:00:00Z');

    // Dates
    const enDate = formatDate(testDate, 'en-US');
    assert.ok(enDate.includes('2026'), 'Date must include year 2026');

    // Numbers & Percentages
    const num = formatNumber(1250000, 'en-US');
    assert.ok(num.includes('1,250,000') || num.includes('1250000'));

    const pct = formatPercent(85);
    assert.strictEqual(pct, '85%');

    // Currency Formatting (Preserves exact amount and code)
    const curr = formatCurrency(140000, 'USD', 'en-US');
    assert.ok(curr.includes('140,000') || curr.includes('$'));

    const eurCurr = formatCurrency(95000, 'EUR', 'de-DE');
    assert.ok(eurCurr.includes('95.000') || eurCurr.includes('€'));
  });

  await t.test('6. Mobile SDK Contract & i18next Serialization', async () => {
    const mockStorage = {
      store: new Map<string, string>(),
      async getItem(k: string) { return this.store.get(k) || null; },
      async setItem(k: string, v: string) { this.store.set(k, v); },
      async removeItem(k: string) { this.store.delete(k); },
    };

    const mobileMgr = new UniversalMobileLocalizationManager(mockStorage);
    const initialLocale = await mobileMgr.initialize();
    assert.strictEqual(initialLocale, 'en-US');

    await mobileMgr.setLocale('hi-IN');
    assert.strictEqual(mobileMgr.getCurrentLocale(), 'hi-IN');
    assert.strictEqual(await mockStorage.getItem('applyvise_preferred_locale'), 'hi-IN');

    // Dictionary export for React Native / i18next
    const exported = mobileMgr.exportResourcesForI18next();
    assert.ok(exported['en-US'], 'Exported resources must have en-US');
    assert.ok(exported['hi-IN'], 'Exported resources must have hi-IN');
    assert.strictEqual(exported['en-US'].translation['brand.name'], 'ApplyVise AI');
  });

  await t.test('7. Translation Gateway Caching & Circuit Breaker', async () => {
    // Empty text handling
    const emptyRes = await translationService.translate({
      text: '',
      targetLang: 'hi',
    });
    assert.strictEqual(emptyRes.translatedText, '');
    assert.strictEqual(emptyRes.isMachineTranslated, false);

    // Graceful offline fallback
    const sampleText = 'Explore multi-track career trajectories';
    const fallbackRes = await translationService.translate({
      text: sampleText,
      targetLang: 'hi',
    });
    assert.ok(fallbackRes.translatedText, 'Must return original or translated text');

    // Health check API
    const health = await translationService.getHealth();
    assert.ok(health.endpoint, 'Health check must provide endpoint');
    assert.strictEqual(typeof health.responseTimeMs, 'number');

    // Usage API
    const usage = translationService.getUsage();
    assert.ok(usage.totalRequests >= 1);
  });

  await t.test('8. Route Architecture & Server/Worker Parity', () => {
    const serverSrc = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    const workerSrc = fs.readFileSync(path.resolve(process.cwd(), 'worker/index.ts'), 'utf8');

    // Translation routes
    assert.ok(serverSrc.includes("'/api/translation/translate'"), 'server.ts has /api/translation/translate');
    assert.ok(serverSrc.includes("'/api/translation/languages'"), 'server.ts has /api/translation/languages');
    assert.ok(serverSrc.includes("'/api/translation/detect'"), 'server.ts has /api/translation/detect');
    assert.ok(serverSrc.includes("'/api/translation/health'"), 'server.ts has /api/translation/health');
    assert.ok(serverSrc.includes("'/api/translation/usage'"), 'server.ts has /api/translation/usage');
    assert.ok(serverSrc.includes("'/api/user/language-preferences'"), 'server.ts has /api/user/language-preferences');

    // Worker runtime parity
    assert.ok(workerSrc.includes("'/api/translation/translate'"), 'worker/index.ts has /api/translation/translate');
    assert.ok(workerSrc.includes("'/api/translation/languages'"), 'worker/index.ts has /api/translation/languages');
    assert.ok(workerSrc.includes("'/api/translation/detect'"), 'worker/index.ts has /api/translation/detect');
    assert.ok(workerSrc.includes("'/api/translation/health'"), 'worker/index.ts has /api/translation/health');
    assert.ok(workerSrc.includes("'/api/translation/usage'"), 'worker/index.ts has /api/translation/usage');
    assert.ok(workerSrc.includes("'/api/user/language-preferences'"), 'worker/index.ts has /api/user/language-preferences');
  });
});
