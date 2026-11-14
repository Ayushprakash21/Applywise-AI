# ApplyVise AI — 30-Language Central Catalogue

**Authoritative Registry:** `src/utils/languageCatalogue.ts`  
**Standard:** BCP-47 / ISO 639-1 / ISO 3166-1 alpha-2

The catalogue includes 30 planned world languages covering primary Indic, European, Middle Eastern, and Asian markets.

| # | Locale Code | Native Name | English Name | Script Family | Direction | UI Completeness | Status |
|---|-------------|-------------|--------------|---------------|-----------|-----------------|--------|
| 1 | `en-US` | English | English (US) | Latin | LTR | 100% | Published |
| 2 | `hi-IN` | हिन्दी | Hindi | Devanagari | LTR | 98% | Published |
| 3 | `bn-IN` | বাংলা | Bengali | Bengali | LTR | 94% | Published |
| 4 | `mr-IN` | मराठी | Marathi | Devanagari | LTR | 92% | Published |
| 5 | `ta-IN` | தமிழ் | Tamil | Tamil | LTR | 92% | Published |
| 6 | `te-IN` | తెలుగు | Telugu | Telugu | LTR | 90% | Published |
| 7 | `kn-IN` | ಕನ್ನಡ | Kannada | Kannada | LTR | 85% | Beta |
| 8 | `ml-IN` | മലയാളം | Malayalam | Malayalam | LTR | 85% | Beta |
| 9 | `gu-IN` | ગુજરાતી | Gujarati | Gujarati | LTR | 85% | Beta |
| 10 | `pa-IN` | ਪੰਜਾਬੀ | Punjabi | Gurmukhi | LTR | 82% | Beta |
| 11 | `ur-PK` | اردو | Urdu | Arabic | **RTL** | 90% | Published |
| 12 | `or-IN` | ଓଡ଼ିଆ | Odia | Odia | LTR | 78% | Beta |
| 13 | `as-IN` | অসমীয়া | Assamese | Bengali | LTR | 75% | In Review |
| 14 | `ne-NP` | नेपाली | Nepali | Devanagari | LTR | 80% | Beta |
| 15 | `ar-SA` | العربية | Arabic | Arabic | **RTL** | 96% | Published |
| 16 | `fr-FR` | Français | French | Latin | LTR | 98% | Published |
| 17 | `de-DE` | Deutsch | German | Latin | LTR | 98% | Published |
| 18 | `es-ES` | Español | Spanish | Latin | LTR | 98% | Published |
| 19 | `pt-BR` | Português | Portuguese | Latin | LTR | 95% | Published |
| 20 | `it-IT` | Italiano | Italian | Latin | LTR | 96% | Published |
| 21 | `nl-NL` | Nederlands | Dutch | Latin | LTR | 95% | Published |
| 22 | `ja-JP` | 日本語 | Japanese | CJK | LTR | 95% | Published |
| 23 | `ko-KR` | 한국어 | Korean | Hangul | LTR | 94% | Published |
| 24 | `zh-CN` | 简体中文 | Chinese (Simp.) | CJK | LTR | 96% | Published |
| 25 | `id-ID` | Bahasa Indonesia | Indonesian | Latin | LTR | 94% | Published |
| 26 | `ms-MY` | Bahasa Melayu | Malay | Latin | LTR | 88% | Beta |
| 27 | `th-TH` | ไทย | Thai | Thai | LTR | 86% | Beta |
| 28 | `vi-VN` | Tiếng Việt | Vietnamese | Latin | LTR | 92% | Published |
| 29 | `ru-RU` | Русский | Russian | Cyrillic | LTR | 95% | Published |
| 30 | `tr-TR` | Türkçe | Turkish | Latin | LTR | 94% | Published |

---

### Publication & Completeness Safeguards
- **Incomplete UI Protection:** No language is marked as `published` if its UI completeness score is `< 90%`.
- **Fallback Guarantee:** For `beta` or `in_review` languages with incomplete entries, individual unmapped keys fall back safely to `en-US`.
