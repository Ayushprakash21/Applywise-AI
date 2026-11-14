# ApplyVise AI — Right-to-Left (RTL) & Typography Compatibility

## 1. RTL Layout Support

Languages written from right to left (such as Arabic `ar-SA` and Urdu `ur-PK`) require structural bidirectional layout handling:

1. **Document Root Binding:**
   - Setting `currentLocale = 'ar-SA'` immediately sets:
     ```html
     <html lang="ar-SA" dir="rtl">
     ```
2. **Flex & Grid Reversal:**
   - CSS logical properties (`margin-inline-start`, `padding-inline-end`) ensure symmetric margins.
   - Chevron indicators flip direction automatically.
   - Text alignments adapt to the start of the reading line.

---

## 2. Script Families & Font Fallbacks

Latin-only fonts cannot correctly shape Indic (Devanagari, Bengali, Tamil, Telugu) or Arabic scripts. The Universal Language Engine assigns script-specific font fallbacks:

| Script Family | Target Locales | Recommended Font Stack |
| :--- | :--- | :--- |
| **Latin** | `en-US`, `es-ES`, `fr-FR`, `de-DE` | `'Poppins', 'Inter', -apple-system, sans-serif` |
| **Devanagari** | `hi-IN`, `mr-IN`, `ne-NP` | `'Noto Sans Devanagari', 'Poppins', sans-serif` |
| **Arabic** | `ar-SA`, `ur-PK` | `'Noto Sans Arabic', 'Noto Nastaliq Urdu', Tahoma, sans-serif` |
| **Bengali** | `bn-IN`, `as-IN` | `'Noto Sans Bengali', 'Poppins', sans-serif` |
| **Tamil** | `ta-IN` | `'Noto Sans Tamil', 'Poppins', sans-serif` |
| **Telugu** | `te-IN` | `'Noto Sans Telugu', 'Poppins', sans-serif` |
| **CJK** | `ja-JP`, `zh-CN` | `'Noto Sans JP', 'Noto Sans SC', Meiryo, sans-serif` |
| **Hangul** | `ko-KR` | `'Noto Sans KR', 'Malgun Gothic', sans-serif` |

Fallback CSS token:
```css
--font-script-fallback: var(--font-script-fallback, 'Poppins', sans-serif);
```
