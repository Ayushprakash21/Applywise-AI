// src/utils/docxExtractor.ts
// Unified, Runtime-Portable Resume Binary Validator & DOCX Text Extractor
// Works identically in both Node.js and Cloudflare Workers V8 isolates (no filesystem writes).

import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { StructuredDocumentBlock } from '../types';

export const MAX_RESUME_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export type ResumeExtractionErrorCode =
  | 'DOCX_INVALID_ARCHIVE'
  | 'DOCX_MISSING_DOCUMENT_XML'
  | 'DOCX_ENCRYPTED'
  | 'DOCX_EMPTY_DOCUMENT'
  | 'DOCX_PARSE_FAILURE'
  | 'DOCX_UNSUPPORTED_FEATURE'
  | 'DOCX_UPLOAD_CORRUPTED'
  | 'PDF_PARSE_FAILURE'
  | 'UPLOAD_TOO_LARGE';

export class ResumeExtractionError extends Error {
  public readonly code: ResumeExtractionErrorCode;
  public readonly httpStatus: number;

  constructor(code: ResumeExtractionErrorCode, message: string, httpStatus = 422) {
    super(message);
    this.name = 'ResumeExtractionError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function toUint8Array(input: ArrayBuffer | Uint8Array | Buffer): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  return new Uint8Array(input);
}

export function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength && bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer;
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function containsUtf16OrAsciiMarker(bytes: Uint8Array, marker: string): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 65536));
  const ascii = new TextDecoder('latin1').decode(sample);
  if (ascii.includes(marker)) return true;
  // Microsoft Office OLE2 directory entries encode names in UTF-16LE (every other byte is \x00 for ASCII chars)
  const utf16Spaced = marker.split('').join('\u0000');
  return ascii.includes(utf16Spaced);
}

/**
 * Validates size, extension/MIME, and actual magic binary signature before parsing.
 * Throws ResumeExtractionError with structured error code when invalid or unsupported.
 */
export function validateAndDetectResumeFormat(
  bytes: Uint8Array,
  originalName: string,
  mimeType: string
): 'pdf' | 'docx' {
  if (!bytes || bytes.length === 0) {
    const lower = (originalName || '').toLowerCase();
    throw new ResumeExtractionError(
      lower.endsWith('.docx') ? 'DOCX_EMPTY_DOCUMENT' : 'PDF_PARSE_FAILURE',
      'Uploaded document is empty (0 bytes).',
      400
    );
  }

  if (bytes.length > MAX_RESUME_UPLOAD_BYTES) {
    throw new ResumeExtractionError(
      'UPLOAD_TOO_LARGE',
      'File size exceeds the 10MB limit.',
      413
    );
  }

  const lowerName = (originalName || '').toLowerCase().trim();
  const cleanMime = (mimeType || '').toLowerCase().trim();

  // Detect legacy OLE2 binary container (legacy .doc OR password-protected encrypted .docx container)
  const isOle2Header =
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1;

  if (isOle2Header) {
    if (containsUtf16OrAsciiMarker(bytes, 'EncryptedPackage') || containsUtf16OrAsciiMarker(bytes, 'EncryptionInfo')) {
      throw new ResumeExtractionError(
        'DOCX_ENCRYPTED',
        'Failed to extract text from Word document: This document is password-protected or encrypted. Please remove password protection and re-upload.',
        422
      );
    }
    throw new ResumeExtractionError(
      'DOCX_UNSUPPORTED_FEATURE',
      'Unsupported legacy Word format (.doc). Please save or export your resume as modern .docx or PDF and try again.',
      415
    );
  }

  const isLegacyDocDeclared =
    (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) ||
    cleanMime === 'application/msword';

  if (isLegacyDocDeclared) {
    throw new ResumeExtractionError(
      'DOCX_UNSUPPORTED_FEATURE',
      'Unsupported legacy Word format (.doc). Please convert your document to .docx or PDF and try again.',
      415
    );
  }

  const isPdfDeclared = lowerName.endsWith('.pdf') || cleanMime === 'application/pdf';
  const isDocxDeclared =
    lowerName.endsWith('.docx') ||
    cleanMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (!isPdfDeclared && !isDocxDeclared) {
    throw new ResumeExtractionError(
      'DOCX_UNSUPPORTED_FEATURE',
      'Unsupported file format. Please upload a PDF (.pdf) or Microsoft Word (.docx) document.',
      415
    );
  }

  if (isPdfDeclared) {
    const header = new TextDecoder('ascii').decode(bytes.subarray(0, 5));
    if (!header.startsWith('%PDF-')) {
      throw new ResumeExtractionError(
        'PDF_PARSE_FAILURE',
        'Malformed PDF file: Invalid PDF header signature.',
        422
      );
    }
    return 'pdf';
  }

  // Must start with ZIP local file header PK\x03\x04 (or empty ZIP end marker PK\x05\x06)
  const hasZipHeader =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06));

  if (!hasZipHeader) {
    throw new ResumeExtractionError(
      'DOCX_INVALID_ARCHIVE',
      'Failed to extract text from Word document: Malformed DOCX file (invalid ZIP archive header).',
      422
    );
  }

  return 'docx';
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#([0-9]+);/g, (_m, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseWordParagraphXml(
  pInner: string,
  index: number,
  sourcePart: string
): StructuredDocumentBlock | null {
  const pPrMatch = pInner.match(/<w:pPr\b[^>]*>([\s\S]*?)<\/w:pPr>/i);
  const pPr = pPrMatch?.[1] || '';

  const hasNumPr = /<w:numPr\b/i.test(pPr);
  const styleMatch = pPr.match(/<w:pStyle\b[^>]*w:val=["']([^"']+)["']/i);
  const styleName = styleMatch?.[1] || '';
  const isHeading = /^(Heading|Title|Subtitle|Section)/i.test(styleName);

  // Check if runs in the paragraph carry bold styling (excluding explicit bold=0/false)
  const rMatches = Array.from(pInner.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gi));
  let isBold = false;
  if (rMatches.length > 0) {
    const textRuns = rMatches.filter((m) => /<w:t\b/i.test(m[1]));
    if (textRuns.length > 0) {
      isBold = textRuns.every(
        (m) => /<w:b(?:\s+w:val=["'](?:true|1)["'])?\s*\/?>/i.test(m[1]) &&
          !/<w:b\s+w:val=["'](?:false|0)["']\s*\/?>/i.test(m[1])
      );
    }
  } else if (/<w:b(?:\s+w:val=["'](?:true|1)["'])?\s*\/?>/i.test(pPr)) {
    isBold = true;
  }

  // Preserve tabs, line breaks, and <w:t> runs in document order
  const tokenized = pInner
    .replace(/<w:tab\s*\/>/gi, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, '\n')
    .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi, (_m, t) => decodeXmlEntities(t))
    .replace(/<[^>]+>/g, '');

  const rawText = tokenized.replace(/\r/g, '').trim();
  if (!rawText) return null;

  const startsWithBullet = /^[•●▪▸▹◦‣⁃\-–—*]\s+/.test(rawText) || /^\d+[.)]\s+/.test(rawText);
  const isBullet = hasNumPr || startsWithBullet;
  const text = hasNumPr && !startsWithBullet ? `• ${rawText}` : rawText;

  return {
    id: `${sourcePart}_blk_${index}`,
    text,
    index,
    isBullet,
    isHeading,
    isBold,
    isTableRow: false,
    sourcePart,
  };
}

/**
 * Extracts structured WordprocessingML blocks (paragraphs, list numbering, headings,
 * bold lines, and table cells) in document order without losing <w:numPr> bullets
 * or <w:tr>/<w:tc> table structure.
 */
export function extractStructuredWordXmlBlocks(
  xmlString: string,
  sourcePart = 'document.xml'
): StructuredDocumentBlock[] {
  if (!xmlString) return [];

  // Remove deleted track-changes & instruction text to avoid extracting field codes
  const cleaned = xmlString
    .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/gi, '')
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/gi, '');

  const blocks: StructuredDocumentBlock[] = [];
  const tokenRegex = /(<w:tr\b[^>]*>[\s\S]*?<\/w:tr>)|(<w:p\b[^>]*>[\s\S]*?<\/w:p>)/gi;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    if (match[1]) {
      // Table row: inspect cells cleanly without duplicating inner <w:p>
      const rowXml = match[1];
      const cellParagraphs: StructuredDocumentBlock[][] = [];
      const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/gi;
      let tcMatch: RegExpExecArray | null;

      while ((tcMatch = tcRegex.exec(rowXml)) !== null) {
        const cellBlocks: StructuredDocumentBlock[] = [];
        const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;
        let pMatch: RegExpExecArray | null;
        while ((pMatch = pRegex.exec(tcMatch[1])) !== null) {
          const parsed = parseWordParagraphXml(pMatch[1], blocks.length, sourcePart);
          if (parsed) cellBlocks.push(parsed);
        }
        cellParagraphs.push(cellBlocks);
      }

      const nonEmptyCells = cellParagraphs.filter((c) => c.length > 0);
      if (nonEmptyCells.length === 0) continue;

      const isSingleLinePerCell = nonEmptyCells.every((c) => c.length === 1);
      if (isSingleLinePerCell && nonEmptyCells.length > 1) {
        const tableCells = nonEmptyCells.map((c) => c[0].text);
        const rowText = tableCells.join(' | ');
        blocks.push({
          id: `${sourcePart}_row_${blocks.length}`,
          text: rowText,
          index: blocks.length,
          isBullet: false,
          isHeading: nonEmptyCells.every((c) => c[0].isHeading),
          isBold: nonEmptyCells.every((c) => c[0].isBold),
          isTableRow: true,
          tableCells,
          sourcePart,
        });
      } else {
        // Multi-paragraph table columns (e.g. 2-column resume sidebar layout)
        for (const cell of nonEmptyCells) {
          for (const b of cell) {
            blocks.push({
              ...b,
              index: blocks.length,
            });
          }
        }
      }
    } else if (match[2]) {
      const parsed = parseWordParagraphXml(match[2], blocks.length, sourcePart);
      if (parsed) blocks.push(parsed);
    }
  }

  return blocks;
}

/**
 * Deterministic pure-JS OpenXML WordprocessingML extractor for headers, footers,
 * tables (<w:tr>/<w:tc>), textboxes, and paragraph fallback.
 */
export function extractWordXmlText(xmlString: string): string {
  if (!xmlString) return '';

  const blocks = extractStructuredWordXmlBlocks(xmlString);
  if (blocks.length > 0) {
    return blocks.map((b) => b.text).join('\n');
  }

  const cleaned = xmlString
    .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/gi, '')
    .replace(/<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>/gi, '');

  // Inline fallback if text is wrapped in non-standard runs outside <w:p>
  const runs: string[] = [];
  const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
  let tMatch: RegExpExecArray | null;
  while ((tMatch = tRegex.exec(cleaned)) !== null) {
    const val = decodeXmlEntities(tMatch[1]).trim();
    if (val) runs.push(val);
  }
  return runs.join(' ');
}

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ ]{2,}/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveMainDocumentPath(relsXml: string | null, zip: JSZip): string | null {
  if (relsXml) {
    const relMatch = relsXml.match(
      /<Relationship\b[^>]*Type=["'][^"']*\/officeDocument["'][^>]*Target=["']([^"']+)["']/i
    );
    if (relMatch?.[1]) {
      const target = relMatch[1].replace(/^\/+/, '');
      if (zip.file(target)) return target;
    }
  }
  if (zip.file('word/document.xml')) return 'word/document.xml';
  // Fallback scan for case variations
  const found = Object.keys(zip.files).find((k) => k.toLowerCase() === 'word/document.xml');
  return found || null;
}

export interface DocxExtractionResult {
  text: string;
  blocks?: StructuredDocumentBlock[];
  isScanned: boolean;
  format: 'docx';
  errorCode?: ResumeExtractionErrorCode;
  warning?: string;
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number, code: ResumeExtractionErrorCode, msg: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ResumeExtractionError(code, msg, 422)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Extracts clean UTF-8 text from an uploaded .docx binary buffer across both Node & Cloudflare Workers.
 * Passes BOTH `buffer` (Node mammoth lib/unzip.js) and `arrayBuffer` (Cloudflare Workers browser/unzip.js),
 * validates OpenXML ZIP structure, and extracts headers/footers & fallback XML safely in memory.
 */
export async function extractDocxResumeText(input: ArrayBuffer | Uint8Array | Buffer): Promise<DocxExtractionResult> {
  const bytes = toUint8Array(input);
  validateAndDetectResumeFormat(bytes, 'resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const exactArrayBuffer = toExactArrayBuffer(bytes);

  let zip: JSZip;
  try {
    zip = await runWithTimeout(
      JSZip.loadAsync(exactArrayBuffer),
      12_000,
      'DOCX_PARSE_FAILURE',
      'Failed to extract text from Word document: DOCX parsing timed out.'
    );
  } catch (err: unknown) {
    if (err instanceof ResumeExtractionError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (/encrypt|password|aes/i.test(msg)) {
      throw new ResumeExtractionError(
        'DOCX_ENCRYPTED',
        'Failed to extract text from Word document: This document is encrypted or password-protected.',
        422
      );
    }
    throw new ResumeExtractionError(
      'DOCX_UPLOAD_CORRUPTED',
      `Failed to extract text from Word document: Corrupted ZIP archive (${msg}).`,
      422
    );
  }

  if (zip.file('EncryptionInfo') || zip.file('EncryptedPackage')) {
    throw new ResumeExtractionError(
      'DOCX_ENCRYPTED',
      'Failed to extract text from Word document: Password-protected Word documents cannot be parsed.',
      422
    );
  }

  const relsFile = zip.file('_rels/.rels');
  const relsXml = relsFile ? await relsFile.async('text').catch(() => null) : null;
  const mainDocPath = resolveMainDocumentPath(relsXml, zip);

  if (!mainDocPath) {
    throw new ResumeExtractionError(
      'DOCX_MISSING_DOCUMENT_XML',
      'Failed to extract text from Word document: Invalid DOCX package (missing word/document.xml).',
      422
    );
  }

  // Primary extraction via Mammoth passing BOTH `buffer` (Node) and `arrayBuffer` (Cloudflare Workers browser/unzip.js)
  let bodyText = '';
  let mammothFailedMsg: string | null = null;
  try {
    const mammothInput: Record<string, unknown> = {
      arrayBuffer: exactArrayBuffer,
    };
    if (typeof Buffer !== 'undefined') {
      mammothInput.buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    const mammothRes = await runWithTimeout(
      mammoth.extractRawText(mammothInput as any),
      12_000,
      'DOCX_PARSE_FAILURE',
      'Failed to extract text from Word document: Mammoth timed out.'
    );
    bodyText = mammothRes?.value ? mammothRes.value.trim() : '';
  } catch (err: unknown) {
    mammothFailedMsg = err instanceof Error ? err.message : String(err);
  }

  // Direct XML extraction for word/document.xml (preserves <w:numPr> bullets, <w:tr>/<w:tc> tables, bold/heading hints & textboxes)
  const mainXml = await zip.file(mainDocPath)!.async('text').catch(() => '');
  const mainBlocks = extractStructuredWordXmlBlocks(mainXml, mainDocPath);
  const xmlBodyText = mainBlocks.length > 0 ? mainBlocks.map((b) => b.text).join('\n') : extractWordXmlText(mainXml);

  const xmlPreservesLostBullets =
    mainBlocks.some((b) => b.isBullet && b.text.startsWith('• ')) &&
    !bodyText.includes('• ');
  const xmlPreservesLostTables =
    mainBlocks.some((b) => b.isTableRow) &&
    !bodyText.includes(' | ');

  if (
    !bodyText ||
    xmlPreservesLostBullets ||
    xmlPreservesLostTables ||
    (xmlBodyText.length > bodyText.length + 25 && !bodyText.includes(xmlBodyText.slice(0, 30)))
  ) {
    bodyText = xmlBodyText || bodyText;
  }

  // Extract headers and footers in deterministic numeric order (e.g. header1.xml, header2.xml)
  const headerKeys = Object.keys(zip.files)
    .filter((k) => /^word\/header\d*\.xml$/i.test(k))
    .sort();
  const footerKeys = Object.keys(zip.files)
    .filter((k) => /^word\/footer\d*\.xml$/i.test(k))
    .sort();

  const headerLines: string[] = [];
  const headerBlocks: StructuredDocumentBlock[] = [];
  for (const hk of headerKeys) {
    const hXml = await zip.file(hk)?.async('text').catch(() => '');
    const hBlocks = extractStructuredWordXmlBlocks(hXml || '', hk);
    const hText = hBlocks.length > 0 ? hBlocks.map((b) => b.text).join('\n') : extractWordXmlText(hXml || '');
    if (hText && !bodyText.includes(hText)) {
      headerLines.push(hText);
      headerBlocks.push(...hBlocks);
    }
  }

  const footerLines: string[] = [];
  const footerBlocks: StructuredDocumentBlock[] = [];
  for (const fk of footerKeys) {
    const fXml = await zip.file(fk)?.async('text').catch(() => '');
    const fBlocks = extractStructuredWordXmlBlocks(fXml || '', fk);
    const fText = fBlocks.length > 0 ? fBlocks.map((b) => b.text).join('\n') : extractWordXmlText(fXml || '');
    if (fText && !bodyText.includes(fText)) {
      footerLines.push(fText);
      footerBlocks.push(...fBlocks);
    }
  }

  const allBlocks = [...headerBlocks, ...mainBlocks, ...footerBlocks].map((b, idx) => ({
    ...b,
    index: idx,
  }));

  const combined = normalizeExtractedText(
    [...headerLines, bodyText, ...footerLines].filter(Boolean).join('\n\n')
  );

  if (!combined && mammothFailedMsg) {
    throw new ResumeExtractionError(
      'DOCX_PARSE_FAILURE',
      `Failed to extract text from Word document: ${mammothFailedMsg}`,
      422
    );
  }

  if (combined.length < 40) {
    return {
      text: '',
      blocks: allBlocks,
      isScanned: true,
      format: 'docx',
      errorCode: 'DOCX_EMPTY_DOCUMENT',
      warning: 'This Word document contains minimal or no extractable text.',
    };
  }

  return {
    text: combined,
    blocks: allBlocks,
    isScanned: false,
    format: 'docx',
  };
}
