/**
 * Job Description Content Normalization & Processing Service for ApplyVise AI
 * 
 * Securely handles:
 * A. Valid HTML: Preserves semantic structure (h1-h4, p, ul, ol, li, strong, a, table, etc.) and sanitizes.
 * B. Plain text: Preserves paragraphs, indentation, and list items.
 * C. HTML-encoded text: Safely decodes single and double-encoded entities.
 * D. Malformed HTML: Normalizes and repairs markup.
 * E. Mixed content: Preserves headings and lists without flattening.
 * F. Backward compatibility: Recovers structure from legacy flattened descriptions where tags were stripped.
 * 
 * Strict XSS defense: Blocks script execution, style injection, iframes, and dangerous attributes.
 */

import DOMPurify from 'dompurify';

export interface ProcessedJobDescription {
  isStructuredHtml: boolean;
  sanitizedHtml: string;
  plainText: string;
  hasUnsafeContent: boolean;
  wordCount: number;
}

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'a', 'blockquote', 'pre', 'code', 'hr', 'br',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div', 'section', 'article'
];

const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel', 'class', 'id', 'alt'
];

/**
 * Safely decodes HTML entities (e.g. &lt;p&gt; -> <p>, &amp;nbsp; -> ' ')
 * Handles single, numeric, and double-encoded strings without executing code.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let decoded = input;

  const entityMap: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x2F;': '/',
    '&#47;': '/',
    '&ndash;': '–',
    '&mdash;': '—',
    '&bull;': '•',
    '&hellip;': '…',
  };

  // Decode double-encoded entities first (e.g. &amp;lt; -> &lt;)
  if (/&amp;(lt|gt|amp|quot|#39|apos|nbsp);/i.test(decoded)) {
    decoded = decoded.replace(/&amp;(lt|gt|amp|quot|#39|apos|nbsp);/gi, (_match, ent) => `&${ent};`);
  }

  // Replace standard named entities
  decoded = decoded.replace(/&(nbsp|amp|lt|gt|quot|#39|apos|#x2F|#47|ndash|mdash|bull|hellip);/gi, (match) => {
    return entityMap[match.toLowerCase()] || match;
  });

  // Decode decimal entities (e.g. &#60; -> <)
  decoded = decoded.replace(/&#(\d+);/g, (_match, dec) => {
    try {
      const code = parseInt(dec, 10);
      if (code > 31 && code < 127) {
        return String.fromCharCode(code);
      }
    } catch {}
    return '';
  });

  return decoded;
}

/**
 * Detects whether a string contains semantic HTML markup
 */
export function containsHtmlTags(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const tagPattern = /<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|a|br|div|span|table|tr|td|th|blockquote|pre|code|section)[^>]*>/i;
  return tagPattern.test(input);
}

/**
 * Headless AST / Regex sanitizer for Node.js, SSR, and Cloudflare Worker runtimes
 */
function sanitizeHeadless(html: string): { clean: string; hadUnsafe: boolean } {
  let hadUnsafe = false;

  // 1. Remove dangerous block elements and their inner content
  const fullBlockTags = /<(?:script|style|iframe|object|embed|svg|math|applet|form|input|button|textarea|select|link|meta)\b[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|svg|math|applet|form|input|button|textarea|select|link|meta)>/gi;
  if (fullBlockTags.test(html)) {
    hadUnsafe = true;
    html = html.replace(fullBlockTags, '');
  }

  // 2. Remove remaining orphan opening or closing dangerous tags
  const dangerousTags = /<\/?(?:script|iframe|style|object|embed|form|input|button|textarea|select|link|meta|applet|svg|math)[^>]*>/gi;
  if (dangerousTags.test(html)) {
    hadUnsafe = true;
  }
  let clean = html.replace(dangerousTags, '');

  // 3. Remove inline event handlers (onload, onerror, onclick, etc.)
  const eventHandlers = /\s+on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
  if (eventHandlers.test(clean)) {
    hadUnsafe = true;
    clean = clean.replace(eventHandlers, '');
  }

  // 4. Sanitize dangerous link protocols (javascript:, data:, vbscript:)
  const dangerousUrls = /href\s*=\s*['"]\s*(?:javascript|data|vbscript):[^'"]*['"]/gi;
  if (dangerousUrls.test(clean)) {
    hadUnsafe = true;
    clean = clean.replace(dangerousUrls, 'href="#"');
  }

  // 5. Ensure external links have target="_blank" and rel="noopener noreferrer nofollow"
  clean = clean.replace(/<a\s+([^>]*?)>/gi, (_match, attrs) => {
    let cleanAttrs = attrs.replace(/\b(target|rel)\s*=\s*['"][^'"]*['"]/gi, '').trim();
    return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer nofollow">`;
  });

  return { clean, hadUnsafe };
}

/**
 * Extracts clean, human-readable plain text while preserving paragraph breaks
 */
export function extractPlainText(htmlOrText: string): string {
  if (!htmlOrText || typeof htmlOrText !== 'string') return '';

  const decoded = decodeHtmlEntities(htmlOrText);
  if (!containsHtmlTags(decoded)) {
    return decoded.trim();
  }

  return decoded
    .replace(/<\/(?:p|h[1-6]|div|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Known section header patterns for legacy flattened text recovery
 */
const KNOWN_SECTION_PATTERNS = [
  'About The Opportunity',
  'About The Role',
  'About The Company',
  'About Us',
  "What You'll Deliver",
  "What You'll Do",
  "What You Bring",
  'Key Responsibilities',
  'Responsibilities',
  'Qualifications',
  'Requirements',
  'Preferred Qualifications',
  'What We Look For',
  'What We Offer',
  'Benefits',
  'Compensation & Perks',
  'Why Collaborate with [^.?!\\n]+?\\?',
  'Why Collaborate with [^.?!\\n]+',
  'Why Join Us\\??',
  'Our Mission'
];

/**
 * Backward compatibility parser:
 * Recovers document hierarchy from legacy records where HTML was previously stripped into plain text.
 */
export function recoverFlattenedDocument(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim();
  if (containsHtmlTags(trimmed)) {
    return trimmed;
  }

  // Build a regex matching known section headers at word boundaries
  const headerRegex = new RegExp(
    `(^|\\s)(${KNOWN_SECTION_PATTERNS.join('|')})\\s+([A-Z])`,
    'g'
  );

  // If known headers are found concatenated within the text
  if (headerRegex.test(trimmed)) {
    // Reset regex index
    headerRegex.lastIndex = 0;

    // Segment the text by section headings
    const matches: Array<{ heading: string; index: number; fullLength: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(trimmed)) !== null) {
      const headingText = match[2].trim();
      const matchStart = match.index + match[1].length;
      matches.push({
        heading: headingText,
        index: matchStart,
        fullLength: headingText.length
      });
    }

    if (matches.length > 0) {
      const sections: Array<{ heading: string; body: string }> = [];

      // Preamble if text exists before first header
      if (matches[0].index > 0) {
        const preamble = trimmed.slice(0, matches[0].index).trim();
        if (preamble) {
          sections.push({ heading: '', body: preamble });
        }
      }

      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const next = matches[i + 1];
        const bodyStart = current.index + current.fullLength;
        const bodyEnd = next ? next.index : trimmed.length;
        const body = trimmed.slice(bodyStart, bodyEnd).trim();
        sections.push({ heading: current.heading, body });
      }

      // Format sections into semantic HTML
      const htmlSections = sections.map(sec => {
        let secHtml = '';
        if (sec.heading) {
          secHtml += `<h2 class="section-heading">${sec.heading}</h2>\n`;
        }

        // Check if body has explicit newlines with bullet points
        const lines = sec.body.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const hasExplicitBullets = lines.some(l => /^(?:[•\-*]|\d+[.)])\s+/.test(l));

        if (hasExplicitBullets) {
          let inList = false;
          lines.forEach(line => {
            const isBullet = /^(?:[•\-*]|\d+[.)])\s+(.*)$/.test(line);
            if (isBullet) {
              if (!inList) {
                secHtml += '<ul class="section-list">\n';
                inList = true;
              }
              const itemText = line.replace(/^(?:[•\-*]|\d+[.)])\s+/, '');
              secHtml += `  <li>${itemText}</li>\n`;
            } else {
              if (inList) {
                secHtml += '</ul>\n';
                inList = false;
              }
              if (line.endsWith(':') || /^[A-Z][A-Za-z0-9\s&/'-]+$/.test(line)) {
                secHtml += `  <h2 class="section-heading">${line.replace(/:$/, '')}</h2>\n`;
              } else {
                secHtml += `  <p>${line}</p>\n`;
              }
            }
          });
          if (inList) {
            secHtml += '</ul>\n';
          }
        } else {
          // Flattened paragraph recovery: split by sentence terminators
          const isListSection = /deliver|do|responsibilit|qualificat|requirement|offer|benefit|collaborate|why/i.test(sec.heading);

          if (isListSection && sec.body.includes('.')) {
            const sentences = sec.body
              .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
              .map(s => s.trim())
              .filter(Boolean);

            if (sentences.length > 1) {
              secHtml += '<ul class="section-list">\n';
              sentences.forEach(s => {
                secHtml += `  <li>${s}</li>\n`;
              });
              secHtml += '</ul>\n';
            } else {
              secHtml += `<p>${sec.body}</p>\n`;
            }
          } else {
            const paras = sec.body.split(/\n+/).map(p => p.trim()).filter(Boolean);
            paras.forEach(p => {
              secHtml += `<p>${p}</p>\n`;
            });
          }
        }

        return secHtml;
      });

      return `<section class="job-description">\n${htmlSections.join('\n')}\n</section>`;
    }
  }

  // Standard plain text: format paragraphs and list markers
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let html = '<section class="job-description">\n';
  let inList = false;

  lines.forEach(line => {
    const isBullet = /^(?:[•\-*]|\d+[.)])\s+(.*)$/.test(line);

    if (isBullet) {
      if (!inList) {
        html += '<ul class="section-list">\n';
        inList = true;
      }
      const itemText = line.replace(/^(?:[•\-*]|\d+[.)])\s+/, '');
      html += `  <li>${itemText}</li>\n`;
    } else {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (line.length < 60 && (line.endsWith(':') || /^[A-Z][A-Za-z0-9\s&/'-]+$/.test(line))) {
        html += `  <h2 class="section-heading">${line.replace(/:$/, '')}</h2>\n`;
      } else {
        html += `  <p>${line}</p>\n`;
      }
    }
  });

  if (inList) {
    html += '</ul>\n';
  }

  html += '</section>';
  return html;
}

/**
 * Main Content Normalization Service
 */
export function normalizeJobDescription(rawInput: string | null | undefined): ProcessedJobDescription {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return {
      isStructuredHtml: false,
      sanitizedHtml: '<section class="job-description"><p class="text-slate-500 italic">No detailed description provided by employer.</p></section>',
      plainText: 'No detailed description provided by employer.',
      hasUnsafeContent: false,
      wordCount: 0
    };
  }

  // Step 1: Decode entities
  const decoded = decodeHtmlEntities(rawInput);
  const hasHtml = containsHtmlTags(decoded) || containsHtmlTags(rawInput);

  let markupToSanitize = '';
  if (hasHtml) {
    markupToSanitize = decoded;
  } else {
    // Backward compatibility: attempt recovery of flattened or plain text
    markupToSanitize = recoverFlattenedDocument(decoded);
  }

  // Step 2: Sanitize markup
  let sanitized = '';
  let hadUnsafe = false;

  if (typeof window !== 'undefined') {
    try {
      const purify = typeof DOMPurify === 'function' ? (DOMPurify as any)(window) : DOMPurify;

      purify.addHook('afterSanitizeAttributes', (node: any) => {
        if ('target' in node) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer nofollow');
        }
      });

      sanitized = purify.sanitize(markupToSanitize, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'svg'],
        FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
      });

      hadUnsafe = purify.removed && purify.removed.length > 0;
    } catch {
      const fallback = sanitizeHeadless(markupToSanitize);
      sanitized = fallback.clean;
      hadUnsafe = fallback.hadUnsafe;
    }
  } else {
    const headless = sanitizeHeadless(markupToSanitize);
    sanitized = headless.clean;
    hadUnsafe = headless.hadUnsafe;
  }

  // Normalize heading tags (convert body h1 to h2 to preserve document title hierarchy)
  sanitized = sanitized
    .replace(/<h1(\b[^>]*)>/gi, '<h2$1>')
    .replace(/<\/h1>/gi, '</h2>');

  // Wrap in semantic section if not already wrapped
  if (!sanitized.includes('<section class="job-description"') && !sanitized.includes('<section class="job-description>')) {
    sanitized = `<section class="job-description">\n${sanitized}\n</section>`;
  }

  const plainText = extractPlainText(sanitized);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return {
    isStructuredHtml: true,
    sanitizedHtml: sanitized,
    plainText,
    hasUnsafeContent: hadUnsafe,
    wordCount
  };
}
