# ApplyVise AI — Translation Security & Privacy Safeguards

## 1. Candidate Privacy Preservation

Translation requests may include candidate job search preferences, query context, or notes. To prevent third-party profiling or data leaks:

1. **Zero External Translation API Leakage:**
   - Candidate content is NEVER forwarded to public consumer APIs (e.g. Google Translate, Bing Translator, DeepL free tiers) without explicit candidate opt-in.
   - All machine translation requests route strictly through the self-hosted LibreTranslate microservice.

2. **Cache Isolation & Anonymization:**
   - The SHA-256 cache stores text-to-translated-text mappings indexed solely by `hash(sourceLang:targetLang:content)`.
   - The cache does NOT record User IDs, IP addresses, or personal candidate metadata.
   - Cache entries auto-expire after 7 days.

3. **Input Sanitization & Abuse Boundaries:**
   - Requests are clamped to a maximum of 10,000 characters.
   - Public translation endpoints enforce per-IP rate limiting (120 requests / min).
   - Administrative cache purge controls require `role === 'admin'`.

4. **Document Integrity & Immutability:**
   - Candidate resumes stored in the database are NEVER overwritten or altered by translation jobs.
   - Any translated copy is preserved as a separate derivative document explicitly flagged as machine-translated.
