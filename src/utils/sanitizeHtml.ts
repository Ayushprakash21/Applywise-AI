/**
 * HTML Sanitization and Rendering Utilities for ApplyVise AI
 * 
 * Securely decodes, cleanses, and prepares employer job descriptions for safe display.
 * Defends against XSS, unescaped entity strings, malformed markup, and script injection.
 */

import DOMPurify from 'dompurify';

export interface SanitizationResult {
  isHtml: boolean;
  sanitizedHtml: string;
  plainTextFallback: string;
  hasScriptOrUnsafeTags: boolean;
}

const SAFE_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'a', 'blockquote', 'pre', 'code', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div'
];

const SAFE_ATTR = ['href', 'title', 'target', 'rel', 'class', 'id', 'alt'];

/**
 * Safely decodes HTML entities (e.g. &lt;p&gt; -> <p>, &amp;nbsp; -> ' ')
 * Handles single and double-encoded strings without executing code.
 */
export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let decoded = input;

  // Replace common named entities
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

  // If text contains double-encoded entities like &amp;lt; or &amp;amp;
  if (/&amp;(lt|gt|amp|quot|#39|apos|nbsp);/i.test(decoded)) {
    decoded = decoded.replace(/&amp;(lt|gt|amp|quot|#39|apos|nbsp);/gi, (_match, ent) => `&${ent};`);
  }

  // Replace standard entities
  decoded = decoded.replace(/&(nbsp|amp|lt|gt|quot|#39|apos|#x2F|#47|ndash|mdash|bull|hellip);/gi, (match) => {
    return entityMap[match.toLowerCase()] || match;
  });

  // Numeric decimal entities (e.g. &#60; -> <)
  decoded = decoded.replace(/&#(\d+);/g, (_match, dec) => {
    try {
      const code = parseInt(dec, 10);
      // Avoid null bytes or control chars
      if (code > 31 && code < 127) {
        return String.fromCharCode(code);
      }
    } catch {}
    return '';
  });

  return decoded;
}

/**
 * Detects whether a string contains HTML markup or encoded HTML tags
 */
export function isHtmlContent(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const trimmed = input.trim();
  // Check for common tags (opening or closing)
  const tagPattern = /<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|a|br|div|span|table|tr|td|th|blockquote|pre|code)[^>]*>/i;
  // Check for encoded tags
  const encodedTagPattern = /&lt;\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|a|br|div|span)[^&]*&gt;/i;

  return tagPattern.test(trimmed) || encodedTagPattern.test(trimmed);
}

/**
 * Strips all HTML tags and returns clean, human-readable plain text
 */
export function stripHtmlToText(html: string): string {
  if (!html || typeof html !== 'string') return '';

  const decoded = decodeHtmlEntities(html);

  return decoded
    // Replace block elements with linebreaks
    .replace(/<\/(p|h[1-6]|div|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    // Remove all remaining tags
    .replace(/<[^>]*>?/gm, '')
    // Replace multiple spaces and newlines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Server-safe fallback sanitizer using strict regular expressions
 * when DOMPurify is executed in headless/Node.js environments without a DOM window.
 */
function sanitizeHeadless(html: string): { clean: string; hadUnsafe: boolean } {
  let hadUnsafe = false;

  // 1. Detect and strip scripts, styles, iframes along with their inner content
  const fullBlockTags = /<(?:script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/(?:script|style|iframe|object|embed|svg|math)>/gi;
  if (fullBlockTags.test(html)) {
    hadUnsafe = true;
    html = html.replace(fullBlockTags, '');
  }

  // 2. Strip any remaining dangerous orphan opening or closing tags
  const dangerousTags = /<\/?(?:script|iframe|style|object|embed|form|input|button|textarea|select|link|meta|applet|svg|math)[^>]*>/gi;
  if (dangerousTags.test(html)) {
    hadUnsafe = true;
  }
  let clean = html.replace(dangerousTags, '');

  // 3. Strip event handlers (onload, onerror, onclick, etc.)
  const eventHandlers = /\s+on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
  if (eventHandlers.test(clean)) {
    hadUnsafe = true;
    clean = clean.replace(eventHandlers, '');
  }

  // 4. Strip dangerous URL protocols in href (javascript:, data:, vbscript:)
  const dangerousUrls = /href\s*=\s*['"]\s*(?:javascript|data|vbscript):[^'"]*['"]/gi;
  if (dangerousUrls.test(clean)) {
    hadUnsafe = true;
    clean = clean.replace(dangerousUrls, 'href="#"');
  }

  // 5. Ensure links have target="_blank" and rel="noopener noreferrer nofollow"
  clean = clean.replace(/<a\s+([^>]*?)>/gi, (_match, attrs) => {
    // Remove existing target and rel to avoid duplicates
    let cleanAttrs = attrs.replace(/\b(target|rel)\s*=\s*['"][^'"]*['"]/gi, '').trim();
    return `<a ${cleanAttrs} target="_blank" rel="noopener noreferrer nofollow">`;
  });

  return { clean, hadUnsafe };
}

/**
 * Core HTML Sanitizer for job descriptions.
 * Safely decodes entities, applies DOMPurify (in browser) or headless AST sanitizer (in Node),
 * enforces external link safety, and returns both sanitized HTML and plain-text fallback.
 */
export function sanitizeJobDescription(rawInput: string | null | undefined): SanitizationResult {
  if (!rawInput || typeof rawInput !== 'string' || !rawInput.trim()) {
    return {
      isHtml: false,
      sanitizedHtml: '<p class="text-slate-500 italic">No detailed description provided by employer.</p>',
      plainTextFallback: 'No detailed description provided by employer.',
      hasScriptOrUnsafeTags: false,
    };
  }

  // Step 1: Decode entities first so encoded and double-encoded tags are normalized
  const decoded = decodeHtmlEntities(rawInput);
  const isHtml = isHtmlContent(decoded) || isHtmlContent(rawInput);
  const plainText = stripHtmlToText(decoded);

  if (!isHtml) {
    // If pure plain text, preserve line breaks as readable paragraphs
    const paragraphs = rawInput
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p class="mb-4">${p.replace(/\n/g, '<br />')}</p>`)
      .join('');

    return {
      isHtml: false,
      sanitizedHtml: paragraphs || `<p class="mb-4">${rawInput}</p>`,
      plainTextFallback: rawInput.trim(),
      hasScriptOrUnsafeTags: false,
    };
  }

  let sanitized = '';
  let hadUnsafe = false;

  // Step 2: In browser with window available, use DOMPurify
  if (typeof window !== 'undefined') {
    try {
      const purify = typeof DOMPurify === 'function' ? (DOMPurify as any)(window) : DOMPurify;

      // Add hook to enforce safe link attributes
      purify.addHook('afterSanitizeAttributes', (node: any) => {
        if ('target' in node) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer nofollow');
        }
      });

      sanitized = purify.sanitize(decoded, {
        ALLOWED_TAGS: SAFE_TAGS,
        ALLOWED_ATTR: SAFE_ATTR,
        FORBID_TAGS: ['script', 'iframe', 'style', 'object', 'embed', 'form', 'link', 'meta', 'svg'],
        FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
      });

      // Check if unsafe tags were removed
      hadUnsafe = purify.removed && purify.removed.length > 0;
    } catch {
      // Fallback if DOMPurify fails
      const fallback = sanitizeHeadless(decoded);
      sanitized = fallback.clean;
      hadUnsafe = fallback.hadUnsafe;
    }
  } else {
    // Step 3: Headless environment (Node tests, SSR, edge)
    const headless = sanitizeHeadless(decoded);
    sanitized = headless.clean;
    hadUnsafe = headless.hadUnsafe;
  }

  // Ensure content isn't empty after sanitization
  if (!sanitized.trim()) {
    sanitized = `<p class="mb-4">${plainText}</p>`;
  }

  return {
    isHtml: true,
    sanitizedHtml: sanitized,
    plainTextFallback: plainText,
    hasScriptOrUnsafeTags: hadUnsafe,
  };
}

/**
 * Semantic section extractor to help organize long job descriptions
 */
export interface JobSemanticSections {
  aboutRole: string | null;
  companyOverview: string | null;
  responsibilities: string[];
  qualifications: string[];
  preferredQualifications: string[];
  benefits: string[];
  hasDetectedSections: boolean;
}

export function extractSemanticSections(rawDescription: string): JobSemanticSections {
  const plain = stripHtmlToText(rawDescription);
  const lines = plain.split('\n').map(l => l.trim()).filter(Boolean);

  const sections: JobSemanticSections = {
    aboutRole: null,
    companyOverview: null,
    responsibilities: [],
    qualifications: [],
    preferredQualifications: [],
    benefits: [],
    hasDetectedSections: false,
  };

  let currentMode: 'none' | 'about' | 'company' | 'resp' | 'req' | 'pref' | 'bene' = 'none';

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Check headings
    if (lower.includes('about the role') || lower.includes("what you'll do") || lower.includes('day to day') || lower.includes('the position')) {
      currentMode = 'resp';
      sections.hasDetectedSections = true;
      continue;
    }
    if (lower.includes('about us') || lower.includes('about the company') || lower.startsWith('about jetbrains') || lower.startsWith('company overview')) {
      currentMode = 'company';
      sections.hasDetectedSections = true;
      continue;
    }
    if (lower.includes('responsibilities') || lower.includes('what you will be doing') || lower.includes('your responsibilities')) {
      currentMode = 'resp';
      sections.hasDetectedSections = true;
      continue;
    }
    if (lower.includes('requirements') || lower.includes('qualifications') || lower.includes('what you bring') || lower.includes('what we look for') || lower.includes('must have')) {
      currentMode = 'req';
      sections.hasDetectedSections = true;
      continue;
    }
    if (lower.includes('nice to have') || lower.includes('preferred') || lower.includes('bonus qualifications') || lower.includes('bonus points')) {
      currentMode = 'pref';
      sections.hasDetectedSections = true;
      continue;
    }
    if (lower.includes('benefits') || lower.includes('what we offer') || lower.includes('perks') || lower.includes('compensation')) {
      currentMode = 'bene';
      sections.hasDetectedSections = true;
      continue;
    }

    // Capture items based on current mode
    if (currentMode === 'company' && line.length > 20) {
      sections.companyOverview = sections.companyOverview ? `${sections.companyOverview} ${line}` : line;
    } else if (currentMode === 'resp') {
      if (line.startsWith('•') || line.startsWith('-') || line.length < 180) {
        sections.responsibilities.push(line.replace(/^[•\-\*]\s*/, ''));
      }
    } else if (currentMode === 'req') {
      if (line.startsWith('•') || line.startsWith('-') || line.length < 180) {
        sections.qualifications.push(line.replace(/^[•\-\*]\s*/, ''));
      }
    } else if (currentMode === 'pref') {
      if (line.startsWith('•') || line.startsWith('-') || line.length < 180) {
        sections.preferredQualifications.push(line.replace(/^[•\-\*]\s*/, ''));
      }
    } else if (currentMode === 'bene') {
      if (line.startsWith('•') || line.startsWith('-') || line.length < 180) {
        sections.benefits.push(line.replace(/^[•\-\*]\s*/, ''));
      }
    }
  }

  return sections;
}
